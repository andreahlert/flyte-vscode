FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg2 \
    ca-certificates \
    python3 \
    ffmpeg \
    bc \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash demo
USER demo
WORKDIR /home/demo

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --method standalone 2>/dev/null

# code-server config (no auth, no telemetry)
RUN mkdir -p /home/demo/.config/code-server && \
    echo 'bind-addr: 0.0.0.0:8080\nauth: none\ncert: false' > /home/demo/.config/code-server/config.yaml

# VS Code settings (clean UI)
RUN mkdir -p "/home/demo/.local/share/code-server/User" && \
    echo '{\
  "workbench.startupEditor": "none",\
  "workbench.tips.enabled": false,\
  "workbench.welcomePage.walkthroughs.openOnInstall": false,\
  "telemetry.telemetryLevel": "off",\
  "update.mode": "none",\
  "extensions.autoUpdate": false,\
  "workbench.colorTheme": "Default Dark+",\
  "editor.fontSize": 14,\
  "editor.lineHeight": 22,\
  "security.workspace.trust.enabled": false,\
  "chat.commandCenter.enabled": false\
}' > "/home/demo/.local/share/code-server/User/settings.json"

# Install the Flyte extension into code-server
COPY --chown=demo:demo flyte-vscode-0.1.0.vsix /tmp/flyte-vscode.vsix
RUN /home/demo/.local/lib/code-server-*/bin/code-server --install-extension /tmp/flyte-vscode.vsix 2>/dev/null || true

# Copy example project
COPY --chown=demo:demo examples/ml-pipeline /home/demo/project

# Copy playwright recorder
COPY --chown=demo:demo demo-video/playwright/package.json /home/demo/recorder/package.json
COPY --chown=demo:demo demo-video/playwright/record.mjs /home/demo/recorder/record.mjs

# Install node deps
WORKDIR /home/demo/recorder
RUN npm install

# Install Playwright browser deps as root, then browser as user
USER root
RUN npx playwright install-deps chromium
USER demo
RUN npx playwright install chromium

# Copy entrypoint
COPY --chown=demo:demo demo-video/playwright/entrypoint.sh /home/demo/entrypoint.sh
RUN chmod +x /home/demo/entrypoint.sh

WORKDIR /home/demo

# Expose code-server for optional VNC-like access via browser
EXPOSE 8080

ENTRYPOINT ["/home/demo/entrypoint.sh"]
