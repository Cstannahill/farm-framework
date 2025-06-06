#!/bin/bash

echo "🔍 Validating FARM Framework setup..."

# Check if required files exist
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 missing"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1 directory exists"
    else
        echo "❌ $1 directory missing"
        return 1
    fi
}

echo "📋 Checking project structure..."

# Root files
check_file "tsconfig.base.json" || exit 1
check_file "pnpm-workspace.yaml" || exit 1
check_file "turbo.json" || exit 1

# Package directories
check_dir "packages/types" || exit 1
check_dir "packages/core" || exit 1
check_dir "packages/cli" || exit 1
check_dir "packages/ui-components" || exit 1

# Types package files
check_file "packages/types/package.json" || exit 1
check_file "packages/types/tsconfig.json" || exit 1
check_file "packages/types/src/index.ts" || exit 1
check_file "packages/types/src/config.ts" || exit 1
check_file "packages/types/src/cli.ts" || exit 1
check_file "packages/types/src/templates.ts" || exit 1

echo ""
echo "🔍 Checking for TypeScript compilation issues..."

# Quick type check for types package
cd packages/types
if pnpm tsc --noEmit; then
    echo "✅ Types package compiles without errors"
else
    echo "❌ Types package has compilation errors"
    exit 1
fi

cd ../..

echo ""
echo "✅ Setup validation passed! You can now run the build."