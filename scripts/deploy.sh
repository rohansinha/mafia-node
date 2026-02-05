#!/bin/bash
# Mafia Game - Deployment Script
# This script pulls latest code, rebuilds, and restarts the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CURRENT_USER="${SUDO_USER:-$USER}"
APP_DIR="${APP_DIR:-/home/$CURRENT_USER/mafia-node}"
SERVICE_NAME="mafia-game"
LOG_FILE="/var/log/mafia-deploy.log"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Navigate to app directory
cd "$APP_DIR" || { error "Failed to cd to $APP_DIR"; exit 1; }

log "Starting deployment..."

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    warn "Uncommitted changes detected. Stashing..."
    git stash
fi

# Fetch and pull latest changes
log "Pulling latest changes from GitHub..."
git fetch origin main

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Already up to date. No deployment needed."
    exit 0
fi

log "Updates found. Deploying..."
git pull origin main

# Install dependencies (only if package.json changed)
if git diff HEAD~1 --name-only | grep -q "package.json\|package-lock.json"; then
    log "Package changes detected. Installing dependencies..."
    npm ci --production=false
else
    log "No package changes. Skipping npm install."
fi

# Build the application
log "Building Next.js application..."
npm run build

# Restart the service
log "Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

# Wait a moment and check status
sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "✅ Deployment successful! Service is running."
else
    error "❌ Service failed to start. Check logs with: journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi

log "Deployment completed successfully!"
