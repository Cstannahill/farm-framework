#!/bin/bash

# Script to rename all @farm-framework references to @farm-framework
# This handles package.json files, TypeScript/JavaScript imports, and template files

echo "🔄 Starting rename from @farm-framework to @farm-framework..."

# Function to replace in a single file
replace_in_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        echo "  📝 Processing: $file"
        # Use sed to replace @farm-framework with @farm-framework
        sed -i 's/@farm-framework/@farm-framework/g' "$file"
    fi
}

# Function to process files by pattern
process_files() {
    local pattern="$1"
    local description="$2"
    
    echo "🔍 Processing $description..."
    
    while IFS= read -r -d '' file; do
        replace_in_file "$file"
    done < <(find . -name "$pattern" -type f -print0)
}

# Change to the project root
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"

# 1. Process all package.json files
echo "📦 Processing package.json files..."
process_files "package.json" "package.json files"

# 2. Process TypeScript files
echo "🔷 Processing TypeScript files..."
process_files "*.ts" "TypeScript files"

# 3. Process TypeScript declaration files
echo "🔷 Processing TypeScript declaration files..."
process_files "*.d.ts" "TypeScript declaration files"

# 4. Process JavaScript files
echo "🟨 Processing JavaScript files..."
process_files "*.js" "JavaScript files"

# 5. Process template files (.hbs)
echo "📄 Processing template files..."
process_files "*.hbs" "Handlebars template files"

# 6. Process config files
echo "⚙️  Processing config files..."
process_files "*.json" "JSON config files"
process_files "tsconfig*.json" "TypeScript config files"

# 7. Process markdown files (for documentation)
echo "📚 Processing Markdown files..."
process_files "*.md" "Markdown files"

# 8. Process specific config files by name
echo "🔧 Processing specific config files..."
files_to_process=(
    "vitest.config.ts"
    "tsconfig.base.json" 
    "turbo.json"
    "pnpm-workspace.yaml"
)

for file in "${files_to_process[@]}"; do
    if [[ -f "$file" ]]; then
        replace_in_file "$file"
    fi
done

echo "✅ Rename complete!"
echo ""
echo "📋 Summary of changes made:"
echo "   • All package.json 'name' fields: @farm-framework → @farm-framework"
echo "   • All import statements: @farm-framework → @farm-framework" 
echo "   • All TypeScript path mappings: @farm-framework → @farm-framework"
echo "   • All template references: @farm-framework → @farm-framework"
echo "   • All config file references: @farm-framework → @farm-framework"
echo ""
echo "🔄 Next steps:"
echo "   1. Run: pnpm install (to update lockfile)"
echo "   2. Run: pnpm build (to rebuild with new names)"
echo "   3. Test: pnpm test (to verify everything works)"
echo ""
echo "⚠️  Note: You may need to update any external references or documentation"
echo "   that specifically mentions @farm-framework package names."
