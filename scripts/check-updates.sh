#!/bin/bash
# Mafia Game - Auto-Update Checker
# Run this via cron to automatically deploy updates

CURRENT_USER="${SUDO_USER:-$USER}"
APP_DIR="${APP_DIR:-/home/$CURRENT_USER/mafia-node}"
DEPLOY_SCRIPT="$APP_DIR/scripts/deploy.sh"
LOG_FILE="/var/log/mafia-updates.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

cd "$APP_DIR" || exit 1

# Fetch latest from remote
git fetch origin main --quiet

# Compare local and remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    log "Updates available. Starting deployment..."
    bash "$DEPLOY_SCRIPT" >> "$LOG_FILE" 2>&1
else
    # Only log every hour to avoid spam
    MINUTE=$(date +%M)
    if [ "$MINUTE" = "00" ]; then
        log "No updates available."
    fi
fi
