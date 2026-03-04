#!/bin/bash

# Quick Deploy - Start everything now
set -e

echo "🚀 Quick Deploy - Starting Innonet..."
echo ""

cd "/Users/yeonjune.kim.27/Desktop/Innonet Prototype"

# Clean up
echo "📦 Cleaning up old containers..."
docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true

# Start everything
echo ""
echo "🔨 Building and starting all services..."
echo "This will take 5-10 minutes on first run..."
echo ""

docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application:"
echo "   Frontend: http://localhost"
echo "   API Docs: http://localhost/api/v1/docs"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop all:     docker-compose -f docker-compose.prod.yml down"
echo "   Restart:      docker-compose -f docker-compose.prod.yml restart"
echo ""
