#!/bin/bash
# RRedating Backend Deploy Script
# Run on the Vultr server: bash /opt/rredating/deploy/deploy.sh
#
# Prerequisites (one-time setup):
#   1. git clone <your-repo> /opt/rredating
#   2. Place env file at: /opt/rredating/backend/.env
#      (dotenv loads relative to cwd, which PM2 sets to backend/)
#   3. npm install -g pm2
#   4. After first successful start: pm2 startup systemd && pm2 save
#      (so the API auto-restarts on reboot)
set -e

APP_DIR="/opt/rredating"

echo "🔄 Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "📦 Installing dependencies (workspace root)..."
npm ci

echo "🔨 Building backend..."
npm run build -w backend

echo "🚀 Restarting PM2..."
pm2 startOrRestart "$APP_DIR/deploy/ecosystem.config.js" --env production

echo "✅ Deploy complete!"
pm2 status
