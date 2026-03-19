#!/usr/bin/env bash
#
# Setup a local Flyte V2 cluster for development.
#
# Prerequisites: Docker running
# Installs: k3d, Go 1.24 (if missing)
# Creates: k3d cluster + Flyte Manager (Runs, Queue, Executor)
#
# Usage:
#   ./scripts/setup-local-cluster.sh          # Start cluster
#   ./scripts/setup-local-cluster.sh stop     # Stop cluster
#   ./scripts/setup-local-cluster.sh status   # Check status
#   ./scripts/setup-local-cluster.sh destroy  # Remove everything
#
set -euo pipefail
trap '' INT

CLUSTER_NAME="flyte"
REGISTRY_NAME="flyte-registry"
REGISTRY_PORT=5050
FLYTE_DATA_DIR="${HOME}/.flyte-local"
MANAGER_PID_FILE="/tmp/flyte-manager.pid"
MANAGER_LOG="/tmp/flyte-manager.log"

FLYTE_REPO="$FLYTE_DATA_DIR/flyte"
MANAGER_DIR="$FLYTE_REPO/manager"
MANAGER_BIN="$MANAGER_DIR/bin/flyte-manager"
MANAGER_CONFIG="$MANAGER_DIR/config-local.yaml"
CRD_PATH="$FLYTE_REPO/executor/config/crd/bases/flyte.org_taskactions.yaml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[+]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; }

check_prereqs() {
  if ! command -v docker &>/dev/null; then
    error "Docker not found. Install Docker first."
    exit 1
  fi

  if ! docker info &>/dev/null; then
    error "Docker is not running. Start Docker first."
    exit 1
  fi

  # Always use a clean clone from the v2 branch
  local LOCAL_CLONE="$FLYTE_DATA_DIR/flyte"
  if [ -d "$LOCAL_CLONE/.git" ]; then
    info "Updating Flyte repo from v2 branch..."
    git -C "$LOCAL_CLONE" fetch origin v2 --depth 1 2>/dev/null
    git -C "$LOCAL_CLONE" checkout FETCH_HEAD 2>/dev/null
  else
    info "Cloning Flyte repo (v2 branch)..."
    mkdir -p "$FLYTE_DATA_DIR"
    git clone --depth 1 --branch v2 https://github.com/flyteorg/flyte.git "$LOCAL_CLONE"
  fi
  FLYTE_REPO="$LOCAL_CLONE"
  MANAGER_DIR="$FLYTE_REPO/manager"
  MANAGER_BIN="$MANAGER_DIR/bin/flyte-manager"
  MANAGER_CONFIG="$MANAGER_DIR/config-local.yaml"
  CRD_PATH="$FLYTE_REPO/executor/config/crd/bases/flyte.org_taskactions.yaml"
}

install_k3d() {
  if command -v k3d &>/dev/null; then
    info "k3d already installed: $(k3d version | head -1)"
    return
  fi
  info "Installing k3d..."
  curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
}

install_go() {
  if command -v go &>/dev/null; then
    info "Go already installed: $(go version)"
    return
  fi
  if [ -x /usr/local/go/bin/go ]; then
    export PATH=$PATH:/usr/local/go/bin
    info "Go found at /usr/local/go: $(go version)"
    return
  fi
  info "Installing Go 1.24..."
  curl -sL https://go.dev/dl/go1.24.4.linux-amd64.tar.gz | sudo tar -C /usr/local -xzf -
  export PATH=$PATH:/usr/local/go/bin
  info "Go installed: $(go version)"
}

create_config() {
  if [ -f "$MANAGER_CONFIG" ]; then
    return
  fi
  info "Creating manager config..."
  cat > "$MANAGER_CONFIG" <<'EOF'
manager:
  server:
    host: "0.0.0.0"
    port: 8090

  executor:
    healthProbePort: 8081

  kubernetes:
    namespace: "flyte"

database:
  sqlite:
    file: "flyte-local.db"

runs:
  database:
    sqlite:
      file: "flyte-runs.db"

logger:
  level: 4
  show-source: true

storage:
  type: mem
  container: "flyte-data"
  enable-multicontainer: false
EOF
}

build_manager() {
  if [ -f "$MANAGER_BIN" ]; then
    info "Flyte Manager binary already built."
    return
  fi
  info "Building Flyte Manager (this may take a few minutes on first run)..."
  cd "$MANAGER_DIR"
  export PATH=$PATH:/usr/local/go/bin
  make build
  info "Flyte Manager built."
}

start_cluster() {
  if k3d cluster list -o json 2>/dev/null | grep -q "\"$CLUSTER_NAME\""; then
    info "k3d cluster '$CLUSTER_NAME' already exists. Ensuring it's running..."
    k3d cluster start "$CLUSTER_NAME" 2>/dev/null || true
  else
    info "Creating k3d cluster '$CLUSTER_NAME' with local registry..."
    k3d cluster create "$CLUSTER_NAME" \
      --registry-create "$REGISTRY_NAME:0.0.0.0:$REGISTRY_PORT"
  fi

  # Merge kubeconfig so kubectl works in any terminal
  info "Configuring kubectl context..."
  k3d kubeconfig merge "$CLUSTER_NAME" --kubeconfig-switch-context 2>/dev/null || true

  # Wait for kubectl to connect
  info "Waiting for Kubernetes to be ready..."
  for i in $(seq 1 30); do
    if kubectl cluster-info &>/dev/null; then
      break
    fi
    sleep 2
  done

  if ! kubectl cluster-info &>/dev/null; then
    error "Kubernetes cluster failed to become ready."
    exit 1
  fi

  info "Setting up Kubernetes namespace and CRD..."
  kubectl create namespace flyte 2>/dev/null || true
  kubectl apply -f "$CRD_PATH" >/dev/null

  info "Kubernetes cluster ready."
}

start_manager() {
  if [ -f "$MANAGER_PID_FILE" ] && kill -0 "$(cat "$MANAGER_PID_FILE")" 2>/dev/null; then
    info "Flyte Manager already running (PID $(cat "$MANAGER_PID_FILE"))."
    return
  fi

  # Check if port 8080 is free (needed by executor metrics)
  if ss -tln | grep -q ':8080 '; then
    warn "Port 8080 is in use. The executor metrics server needs it."
    warn "Trying to identify the process..."
    sudo ss -tlnp 2>/dev/null | grep ':8080 ' || true
    echo ""
    read -p "Stop the process using port 8080? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      CONTAINER=$(docker ps --format '{{.Names}}' --filter "publish=8080" 2>/dev/null | head -1)
      if [ -n "$CONTAINER" ]; then
        info "Stopping container: $CONTAINER"
        docker stop "$CONTAINER"
      else
        error "Could not identify the process. Free port 8080 manually."
        exit 1
      fi
    else
      error "Port 8080 is required. Free it and try again."
      exit 1
    fi
  fi

  # Check if port 8090 is free
  if ss -tln | grep -q ':8090 '; then
    error "Port 8090 is already in use. Free it and try again."
    exit 1
  fi

  info "Starting Flyte Manager as background daemon..."
  cd "$MANAGER_DIR"
  nohup "$MANAGER_BIN" --config config-local.yaml > "$MANAGER_LOG" 2>&1 &
  disown
  echo $! > "$MANAGER_PID_FILE"

  # Wait for health
  for i in $(seq 1 10); do
    if curl -sf http://localhost:8090/healthz &>/dev/null; then
      break
    fi
    sleep 1
  done

  if curl -sf http://localhost:8090/healthz &>/dev/null; then
    info "Flyte Manager running (PID $(cat "$MANAGER_PID_FILE"))"
  else
    error "Flyte Manager failed to start. Check $MANAGER_LOG"
    cat "$MANAGER_LOG"
    exit 1
  fi
}

do_start() {
  check_prereqs
  install_k3d
  install_go
  build_manager
  create_config
  start_cluster
  start_manager

  echo ""
  info "Flyte V2 local cluster is ready!"
  echo ""
  echo "  Runs/Queue/State API:  http://localhost:8090"
  echo "  Executor health:       http://localhost:8081"
  echo "  Docker Registry:       localhost:$REGISTRY_PORT"
  echo "  Logs:                  $MANAGER_LOG"
  echo ""
  echo "  Connect the SDK:"
  echo "    flyte init --endpoint dns:///localhost:8090 --insecure"
  echo ""
  echo "  Use registry in TaskEnvironment:"
  echo "    flyte.Image.from_debian_base(registry=\"localhost:$REGISTRY_PORT\")"
  echo ""
  echo "  Stop:"
  echo "    $0 stop"
  echo ""
}

do_stop() {
  if [ -f "$MANAGER_PID_FILE" ] && kill -0 "$(cat "$MANAGER_PID_FILE")" 2>/dev/null; then
    info "Stopping Flyte Manager (PID $(cat "$MANAGER_PID_FILE"))..."
    kill "$(cat "$MANAGER_PID_FILE")"
    rm -f "$MANAGER_PID_FILE"
  else
    warn "Flyte Manager not running."
  fi
  info "k3d cluster remains running. Use '$0 destroy' to remove it."
}

do_status() {
  echo "=== k3d Cluster ==="
  if k3d cluster list 2>/dev/null | grep -q "$CLUSTER_NAME"; then
    echo "  Status: running"
    kubectl get nodes 2>/dev/null | sed 's/^/  /'
  else
    echo "  Status: not created"
  fi
  echo ""

  echo "=== Flyte Manager ==="
  if [ -f "$MANAGER_PID_FILE" ] && kill -0 "$(cat "$MANAGER_PID_FILE")" 2>/dev/null; then
    echo "  Status: running (PID $(cat "$MANAGER_PID_FILE"))"
    curl -sf http://localhost:8090/healthz && echo "  API :8090 healthy" || echo "  API :8090 unhealthy"
    curl -sf http://localhost:8081/healthz && echo "  Executor :8081 healthy" || echo "  Executor :8081 unhealthy"
  else
    echo "  Status: stopped"
  fi
  echo ""

  echo "=== Docker Registry ==="
  if curl -sf "http://localhost:$REGISTRY_PORT/v2/" &>/dev/null; then
    echo "  Status: running on localhost:$REGISTRY_PORT"
  else
    echo "  Status: not running"
  fi
  echo ""

  echo "=== TaskActions ==="
  kubectl get taskactions -n flyte 2>/dev/null || echo "  No TaskActions"
}

do_destroy() {
  do_stop
  if k3d cluster list 2>/dev/null | grep -q "$CLUSTER_NAME"; then
    info "Deleting k3d cluster '$CLUSTER_NAME'..."
    k3d cluster delete "$CLUSTER_NAME"
  fi
  if k3d registry list 2>/dev/null | grep -q "$REGISTRY_NAME"; then
    info "Deleting registry '$REGISTRY_NAME'..."
    k3d registry delete "$REGISTRY_NAME" 2>/dev/null || true
  fi
  rm -f "$MANAGER_DIR/flyte-local.db" "$MANAGER_DIR/flyte-runs.db"
  info "Everything cleaned up."
}

case "${1:-start}" in
  start)   do_start ;;
  stop)    do_stop ;;
  status)  do_status ;;
  destroy) do_destroy ;;
  *)
    echo "Usage: $0 {start|stop|status|destroy}"
    exit 1
    ;;
esac
