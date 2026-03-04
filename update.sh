#!/bin/bash

# ============================================
# Quick Update Script
# ============================================
# Run this after making code changes to deploy updates
# Usage: ./update.sh
# ============================================

set -e

SERVER="47.86.249.5"
PASSWORD="oCGt2doevjNcxE1w"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Updating Innonet on server...${NC}"
echo ""

# Upload changes
echo "📤 Uploading code changes..."
sshpass -p "$PASSWORD" rsync -avz \
    --exclude 'node_modules' --exclude '.git' --exclude '__pycache__' \
    --exclude 'venv' --exclude 'dist' --exclude '*.pyc' \
    -e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    ./ root@$SERVER:/root/innonet/ 2>&1 | grep -E "(sending|total)" | tail -5

echo ""
echo "🔨 Rebuilding and restarting services..."

sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml up -d --build 2>&1 | tail -10
"

echo ""
echo "⏳ Waiting for services to restart (30 seconds)..."
sleep 30

echo ""
echo "✅ Checking services..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps | grep -E 'NAME|Up'
"

echo ""
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo "🌐 Visit: http://47.86.249.5"
echo ""
