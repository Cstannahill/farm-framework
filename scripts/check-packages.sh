#!/bin/bash

echo "🔍 Checking package.json files for build scripts..."

check_package_json() {
    local package_path=$1
    local package_name=$2
    
    if [ ! -f "$package_path/package.json" ]; then
        echo "❌ $package_name: No package.json found"
        return 1
    fi
    
    if grep -q '"build"' "$package_path/package.json"; then
        echo "✅ $package_name: Has build script"
        # Show the build script
        grep -A1 '"build"' "$package_path/package.json" | head -1 | sed 's/^/   /'
    else
        echo "❌ $package_name: Missing build script"
        echo "   Creating build script..."
        # This would be where we'd add the build script if missing
        return 1
    fi
}

echo ""
check_package_json "packages/types" "@farm/types"
check_package_json "packages/core" "@farm/core" 
check_package_json "packages/cli" "@farm/cli"
check_package_json "packages/ui-components" "@farm/ui-components"

echo ""
echo "🔍 Checking if TypeScript configs exist..."

for pkg in types core cli ui-components; do
    if [ -f "packages/$pkg/tsconfig.json" ]; then
        echo "✅ packages/$pkg/tsconfig.json exists"
    else
        echo "❌ packages/$pkg/tsconfig.json missing"
    fi
done