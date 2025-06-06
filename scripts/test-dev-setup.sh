#!/bin/bash
# scripts/test-dev-setup.sh

set -e

echo "🧪 Testing FARM Development Setup"

# Clean up any existing test projects
rm -rf /tmp/farm-test-*

# Test basic template
echo "📦 Testing Basic Template..."
cd /tmp
farm create farm-test-basic --template basic --no-install --no-interactive
cd farm-test-basic

echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏱️ Waiting for services to be ready..."
timeout 60 bash -c 'until curl -s http://localhost:27017 > /dev/null; do sleep 1; done'
timeout 60 bash -c 'until curl -s http://localhost:8000/health > /dev/null; do sleep 1; done'

echo "✅ Basic template Docker setup successful"

# Test AI template
echo "🤖 Testing AI Chat Template..."
cd /tmp
farm create farm-test-ai --template ai-chat --no-install --no-interactive
cd farm-test-ai

docker-compose up -d

echo "⏱️ Waiting for AI services..."
timeout 120 bash -c 'until curl -s http://localhost:11434/api/tags > /dev/null; do sleep 1; done'

echo "🎯 Testing Ollama model pull..."
docker exec farm-test-ai-ollama-1 ollama pull llama3.1

echo "✅ AI template Docker setup successful"

# Cleanup
echo "🧹 Cleaning up..."
cd /tmp/farm-test-basic && docker-compose down -v
cd /tmp/farm-test-ai && docker-compose down -v
rm -rf /tmp/farm-test-*

echo "🎉 All Docker tests passed!"