#!/bin/bash

echo "🌾 Building FARM Framework (Simple)..."

# Install dependencies first
echo "📥 Installing dependencies..."
pnpm install

echo ""
echo "🏗️ Building packages in order..."

# Build each package directly
echo "📦 Building @farm/types..."
cd packages/types
pnpm build
if [ $? -eq 0 ]; then
    echo "✅ @farm/types built successfully"
else
    echo "❌ @farm/types build failed"
    exit 1
fi
cd ../..

echo ""
echo "📦 Building @farm/core..."
cd packages/core  
pnpm build
if [ $? -eq 0 ]; then
    echo "✅ @farm/core built successfully"
else
    echo "❌ @farm/core build failed"
    exit 1
fi
cd ../..

echo ""
echo "📦 Building @farm/cli..."
cd packages/cli
pnpm build
if [ $? -eq 0 ]; then
    echo "✅ @farm/cli built successfully"
else
    echo "❌ @farm/cli build failed"
    exit 1
fi
cd ../..

echo ""
echo "📦 Building @farm/ui-components..."
cd packages/ui-components
pnpm build
if [ $? -eq 0 ]; then
    echo "✅ @farm/ui-components built successfully"
else
    echo "❌ @farm/ui-components build failed"
    exit 1
fi
cd ../..

echo ""
echo "🎉 All packages built successfully!"
echo ""
echo "📚 To test the CLI:"
echo "   cd packages/cli"
echo "   pnpm dev --help"