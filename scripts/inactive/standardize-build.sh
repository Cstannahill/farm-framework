#!/bin/bash

echo "🔧 Standardizing all packages to use tsup for faster builds..."

# Function to update package.json to use tsup
update_package_to_tsup() {
    local package_path=$1
    local package_name=$2
    
    if [ -f "$package_path/package.json" ]; then
        echo "📝 Updating $package_name to use tsup..."
        
        # Backup original
        cp "$package_path/package.json" "$package_path/package.json.bak"
        
        # Update build script and add tsup dependency
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$package_path/package.json', 'utf8'));
        
        // Update scripts
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.build = 'tsup';
        pkg.scripts['build:watch'] = 'tsup --watch';
        pkg.scripts.clean = 'rm -rf dist';
        pkg.scripts['type-check'] = 'tsc --noEmit';
        
        // Add tsup to devDependencies
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies.tsup = '^8.0.0';
        
        fs.writeFileSync('$package_path/package.json', JSON.stringify(pkg, null, 2));
        "
        
        echo "✅ Updated $package_name"
    else
        echo "❌ $package_name: package.json not found"
    fi
}

# Create tsup config for each package
create_tsup_config() {
    local package_path=$1
    local package_name=$2
    local is_react=${3:-false}
    
    echo "📝 Creating tsup config for $package_name..."
    
    if [ "$is_react" = "true" ]; then
        # React component package config
        cat > "$package_path/tsup.config.ts" << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  jsx: 'react-jsx'
});
EOF
    else
        # Standard package config
        cat > "$package_path/tsup.config.ts" << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true
});
EOF
    fi
}

# Update all packages
echo "🔄 Updating packages..."

update_package_to_tsup "packages/types" "@farm/types"
create_tsup_config "packages/types" "@farm/types"

update_package_to_tsup "packages/core" "@farm/core"
create_tsup_config "packages/core" "@farm/core"

update_package_to_tsup "packages/cli" "@farm/cli"
create_tsup_config "packages/cli" "@farm/cli"

update_package_to_tsup "packages/ui-components" "@farm/ui-components"
create_tsup_config "packages/ui-components" "@farm/ui-components" true

echo ""
echo "✅ All packages updated to use tsup!"
echo "📦 Run 'pnpm install' to install tsup dependencies"
echo "🏗️ Then run './scripts/clean-build.sh' to test the new build system"