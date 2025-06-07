#!/bin/bash

# FARM Framework Build Script
echo "🌾 Building FARM Framework..."

# Function to build a package
build_package() {
    local package_name=$1
    local package_path=$2
    
    echo "📦 Building $package_name..."
    cd "$package_path"
    
    if [ ! -f "package.json" ]; then
        echo "❌ No package.json found in $package_path"
        return 1
    fi
    
    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # Build package
    if pnpm build; then
        echo "✅ $package_name built successfully"
    else
        echo "❌ Failed to build $package_name"
        return 1
    fi
    
    cd - > /dev/null
}

# Ensure we're in the project root
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ Please run this script from the project root"
    exit 1
fi

# Install dependencies first
echo "📥 Installing dependencies..."
if ! pnpm install; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build packages in dependency order
echo "🏗️ Building packages in dependency order..."

# 1. Types (no dependencies)
build_package "@farm/types" "packages/types"

# 2. Core (depends on types)  
build_package "@farm/core" "packages/core"

# 3. CLI (depends on types)
build_package "@farm/cli" "packages/cli"

# 4. UI Components (depends on types)
build_package "@farm/ui-components" "packages/ui-components"

echo "🎉 All packages built successfully!"
echo ""
echo "📚 Next steps:"
echo "   cd packages/cli"
echo "   pnpm dev --help"