#!/bin/bash
# Mafia Game - Raspberry Pi Setup Script
# Run this once to configure everything

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Auto-detect user and app directory
CURRENT_USER="${SUDO_USER:-$USER}"
APP_DIR="/home/$CURRENT_USER/mafia-node"
SERVICE_FILE="$APP_DIR/scripts/mafia-game.service"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           MAFIA GAME - RASPBERRY PI SETUP                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Running as user: $CURRENT_USER${NC}"

# Check Node.js version
echo -e "${GREEN}Checking Node.js...${NC}"
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ is required. Current: $(node -v 2>/dev/null || echo 'not installed')${NC}"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi
echo -e "Node.js version: $(node -v) ✓"

# Navigate to app directory
cd "$APP_DIR" || { echo -e "${RED}App directory not found: $APP_DIR${NC}"; exit 1; }

# Make scripts executable
echo -e "${GREEN}Making scripts executable...${NC}"
chmod +x scripts/*.sh

# Create log files
echo -e "${GREEN}Setting up log files...${NC}"
sudo touch /var/log/mafia-deploy.log /var/log/mafia-updates.log
sudo chown $CURRENT_USER:$CURRENT_USER /var/log/mafia-deploy.log /var/log/mafia-updates.log

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm ci

# Build the application
echo -e "${GREEN}Building Next.js application...${NC}"
npm run build

# Generate and install systemd service with correct user
echo -e "${GREEN}Installing systemd service...${NC}"
cat << EOF | sudo tee /etc/systemd/system/mafia-game.service > /dev/null
[Unit]
Description=Mafia Game Server
Documentation=https://github.com/rohansinha/mafia-node
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$APP_DIR

ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP \$MAINPID

Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

Environment=NODE_ENV=production
Environment=PORT=3000
Environment=WS_PORT=3001

StandardOutput=journal
StandardError=journal
SyslogIdentifier=mafia-game

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mafia-game

# Configure firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    echo -e "${GREEN}Configuring firewall...${NC}"
    sudo ufw allow 3000/tcp comment 'Mafia Game Web'
    sudo ufw allow 3001/tcp comment 'Mafia Game WebSocket'
fi

# Setup auto-update cron job
echo -e "${GREEN}Setting up auto-update cron job...${NC}"
CRON_JOB="*/5 * * * * /bin/bash $APP_DIR/scripts/check-updates.sh"
(crontab -l 2>/dev/null | grep -v "check-updates.sh"; echo "$CRON_JOB") | crontab -

# Start the service
echo -e "${GREEN}Starting the service...${NC}"
sudo systemctl start mafia-game

# Wait and check status
sleep 3
if systemctl is-active --quiet mafia-game; then
    # Get IP address
    IP_ADDR=$(hostname -I | awk '{print $1}')
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    SETUP COMPLETE! ✓                       ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║                                                            ║"
    echo "║  Web App:     http://$IP_ADDR:3000                    ║"
    echo "║  WebSocket:   ws://$IP_ADDR:3001                      ║"
    echo "║                                                            ║"
    echo "║  Auto-updates: Every 5 minutes from GitHub                 ║"
    echo "║                                                            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Useful Commands:                                          ║"
    echo "║    View logs:     journalctl -u mafia-game -f              ║"
    echo "║    Restart:       sudo systemctl restart mafia-game        ║"
    echo "║    Stop:          sudo systemctl stop mafia-game           ║"
    echo "║    Manual deploy: ./scripts/deploy.sh                      ║"
    echo "║    Update logs:   tail -f /var/log/mafia-updates.log       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo -e "${RED}Service failed to start. Check logs with: journalctl -u mafia-game -n 50${NC}"
    exit 1
fi
