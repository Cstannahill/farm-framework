#!/bin/bash

# Template Registry Check Script
# Compares registry entries against actual template files

set -e

echo "🔍 Checking Template Registry vs Actual Files"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TEMPLATES_DIR="packages/cli/templates"
REGISTRY_FILE="packages/cli/src/template/registry.ts"

echo -e "${BLUE}📁 Templates directory: ${TEMPLATES_DIR}${NC}"
echo -e "${BLUE}📄 Registry file: ${REGISTRY_FILE}${NC}"
echo ""

# Function to check if a file exists
check_file_exists() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        echo -e "  ✅ ${GREEN}$file_path${NC}"
        return 0
    else
        echo -e "  ❌ ${RED}$file_path${NC} (MISSING)"
        return 1
    fi
}

# Function to extract template paths from registry
extract_template_paths() {
    local template_name="$1"
    echo -e "${YELLOW}🔍 Checking template: $template_name${NC}"
    
    # Extract template paths from registry.ts
    # Look for lines like: { path: "apps/api/src/main.py", templatePath: "base/apps/api/src/main.py.hbs", required: true },
    local template_paths=$(grep -A 1000 "registerBaseTemplate\|registerTemplates" "$REGISTRY_FILE" | \
        grep -E "templatePath.*$template_name" | \
        sed -n 's/.*templatePath: "\([^"]*\)".*/\1/p')
    
    if [ -z "$template_paths" ]; then
        echo -e "  ⚠️  ${YELLOW}No template paths found for $template_name in registry${NC}"
        return
    fi
    
    local missing_count=0
    local total_count=0
    
    echo "$template_paths" | while read -r template_path; do
        if [ -n "$template_path" ]; then
            total_count=$((total_count + 1))
            full_path="$TEMPLATES_DIR/$template_path"
            if ! check_file_exists "$full_path"; then
                missing_count=$((missing_count + 1))
            fi
        fi
    done
    
    echo -e "  📊 ${BLUE}Total files: $total_count, Missing: $missing_count${NC}"
    echo ""
}

# Function to find all actual template files
find_actual_files() {
    local template_name="$1"
    echo -e "${YELLOW}🔍 Actual files in $template_name template:${NC}"
    
    local template_dir="$TEMPLATES_DIR/$template_name"
    if [ ! -d "$template_dir" ]; then
        echo -e "  ❌ ${RED}Template directory not found: $template_dir${NC}"
        return
    fi
    
    # Find all .hbs files and convert to registry format
    find "$template_dir" -name "*.hbs" -type f | sort | while read -r file; do
        # Convert absolute path to relative path from templates directory
        relative_path=$(echo "$file" | sed "s|^$TEMPLATES_DIR/||")
        echo -e "  📄 ${GREEN}$relative_path${NC}"
    done
    echo ""
}

# Check base template
echo -e "${BLUE}🏗️  BASE TEMPLATE CHECK${NC}"
echo "=================="
extract_template_paths "base"
find_actual_files "base"

# Check basic template
echo -e "${BLUE}🏗️  BASIC TEMPLATE CHECK${NC}"
echo "==================="
extract_template_paths "basic"
find_actual_files "basic"

# Check for files in basic that should be inherited from base
echo -e "${BLUE}🔄 INHERITANCE CHECK${NC}"
echo "=================="
echo -e "${YELLOW}Checking if basic template files override base template files:${NC}"

basic_dir="$TEMPLATES_DIR/basic"
base_dir="$TEMPLATES_DIR/base"

if [ -d "$basic_dir" ] && [ -d "$base_dir" ]; then
    find "$basic_dir" -name "*.hbs" -type f | while read -r basic_file; do
        # Get relative path from basic directory
        relative_path=$(echo "$basic_file" | sed "s|^$basic_dir/||")
        base_file="$base_dir/$relative_path"
        
        if [ -f "$base_file" ]; then
            echo -e "  🔄 ${YELLOW}$relative_path${NC} (overrides base)"
        else
            echo -e "  ➕ ${GREEN}$relative_path${NC} (basic-specific)"
        fi
    done
fi

echo ""
echo -e "${BLUE}✅ Template registry check complete!${NC}"