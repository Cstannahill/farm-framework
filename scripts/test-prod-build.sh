#!/bin/bash
# scripts/test-prod-build.sh

set -e

echo "🏗️ Testing Production Build"

cd /tmp
farm create farm-test-prod --template ai-chat --no-interactive
cd farm-test-prod

echo "🐳 Building production images..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 Testing production deployment..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏱️ Waiting for production services..."
timeout 60 bash -c 'until curl -s http://localhost/health > /dev/null; do sleep 1; done'

echo "✅ Production build test successful"

# Cleanup
docker-compose -f docker-compose.prod.yml down -v
docker rmi $(docker images farm-test-prod* -q) || true