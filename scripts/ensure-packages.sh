#!/bin/bash

echo "🔧 Ensuring all packages have proper package.json files..."

# Function to create package.json if missing
ensure_package_json() {
    local package_name=$1
    local package_path=$2
    local package_json_content=$3
    
    if [ ! -f "$package_path/package.json" ]; then
        echo "📝 Creating package.json for $package_name..."
        mkdir -p "$package_path"
        echo "$package_json_content" > "$package_path/package.json"
    else
        echo "✅ $package_name package.json exists"
    fi
}

# Types package
types_json='{
  "name": "@farm/types",
  "version": "0.1.0",
  "description": "Shared TypeScript types for FARM framework",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}'

ensure_package_json "@farm/types" "packages/types" "$types_json"

# Core package  
core_json='{
  "name": "@farm/core",
  "version": "0.1.0",
  "description": "Core functionality for FARM framework",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@farm/types": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}'

ensure_package_json "@farm/core" "packages/core" "$core_json"

echo "✅ Package files ensured. Run pnpm install to update dependencies."