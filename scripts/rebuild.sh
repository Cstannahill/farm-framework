#!/bin/bash

echo "🧹 Cleaning and rebuilding FARM Framework..."

# Ensure we're in the project root
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ Please run this script from the project root"
    exit 1
fi

# Clean all existing dist folders and node_modules
echo "🧹 Cleaning existing builds..."
find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find packages -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf node_modules

# Install all dependencies
echo "📥 Installing dependencies..."
pnpm install

# Build packages in order with error handling
build_package() {
    local package_name=$1
    local package_path=$2
    
    echo "📦 Building $package_name..."
    
    if [ ! -d "$package_path" ]; then
        echo "⚠️ Package directory $package_path does not exist, skipping..."
        return 0
    fi
    
    cd "$package_path"
    
    if [ ! -f "package.json" ]; then
        echo "⚠️ No package.json found in $package_path, skipping..."
        cd - > /dev/null
        return 0
    fi
    
    # Check if build script exists
    if ! pnpm run build --dry-run >/dev/null 2>&1; then
        echo "⚠️ No build script found for $package_name, skipping..."
        cd - > /dev/null
        return 0
    fi
    
    # Clean any existing dist
    rm -rf dist
    
    # Build package
    if pnpm build; then
        echo "✅ $package_name built successfully"
    else
        echo "❌ Failed to build $package_name"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    return 0
}

echo "🏗️ Building packages in dependency order..."

# Build in dependency order
build_package "@farm/types" "packages/types" || exit 1
build_package "@farm/core" "packages/core" || exit 1
build_package "@farm/cli" "packages/cli" || exit 1
build_package "@farm/ui-components" "packages/ui-components" || exit 1

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "📚 To test the CLI:"
echo "   cd packages/cli"
echo "   pnpm dev --help"