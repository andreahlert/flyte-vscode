FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV DBUS_SESSION_BUS_ADDRESS=/dev/null

# System deps + VNC
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    xdotool \
    xdg-utils \
    x11-utils \
    ffmpeg \
    curl \
    wget \
    gnupg2 \
    ca-certificates \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    libasound2t64 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libcairo2 \
    libdbus-1-3 \
    libsecret-1-0 \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-color-emoji \
    imagemagick \
    x11-apps \
    bc \
    procps \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install VS Code
RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list \
    && apt-get update \
    && apt-get install -y code \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash demo
USER demo
WORKDIR /home/demo

# VS Code settings
RUN mkdir -p /home/demo/.config/Code/User && \
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
  "window.newWindowDimensions": "maximized",\
  "window.titleBarStyle": "custom",\
  "chat.commandCenter.enabled": false,\
  "github.copilot.enable": {"*": false},\
  "workbench.activityBar.location": "default",\
  "security.workspace.trust.enabled": false,\
  "workbench.panel.defaultLocation": "bottom",\
  "workbench.sideBar.location": "left"\
}' > /home/demo/.config/Code/User/settings.json

# Install the Flyte extension and remove noisy built-in extensions
COPY --chown=demo:demo flyte-vscode-0.1.0.vsix /tmp/flyte-vscode.vsix
RUN code --install-extension /tmp/flyte-vscode.vsix --force 2>/dev/null || true
RUN code --uninstall-extension github.copilot 2>/dev/null || true && \
    code --uninstall-extension github.copilot-chat 2>/dev/null || true && \
    code --uninstall-extension github.vscode-github-authentication 2>/dev/null || true

# Copy example project and recording scripts
COPY --chown=demo:demo examples/ml-pipeline /home/demo/project
COPY --chown=demo:demo demo-video/record-docker.sh /home/demo/record.sh
COPY --chown=demo:demo demo-video/zoom-edit.sh /home/demo/zoom-edit.sh
RUN chmod +x /home/demo/record.sh /home/demo/zoom-edit.sh

RUN mkdir -p /home/demo/output

# VNC on 5900, noVNC on 6080
EXPOSE 5900 6080

ENTRYPOINT ["/home/demo/record.sh"]
