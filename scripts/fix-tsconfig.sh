#!/bin/bash

echo "🔧 Fixing TypeScript configurations for tsup compatibility..."

# Function to create simple tsconfig.json for each package
create_simple_tsconfig() {
    local package_path=$1
    local package_name=$2
    
    echo "📝 Creating simple tsconfig for $package_name..."
    
    cat > "$package_path/tsconfig.json" << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": [
    "src/**/*"
  ]
}
EOF
    
    echo "✅ Updated $package_name tsconfig"
}

# Update all package tsconfigs
create_simple_tsconfig "packages/types" "@farm/types"
create_simple_tsconfig "packages/core" "@farm/core"
create_simple_tsconfig "packages/cli" "@farm/cli"
create_simple_tsconfig "packages/ui-components" "@farm/ui-components"

echo ""
echo "✅ All TypeScript configurations updated!"
echo "🏗️ Now try building again with: ./scripts/simple-build.sh"