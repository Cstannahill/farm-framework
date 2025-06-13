#!/bin/bash

# FARM Framework Dependency Checker and Updater
# This script checks for outdated dependencies and optionally updates them

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print section headers
print_header() {
    echo ""
    print_color $CYAN "=============================================="
    print_color $CYAN "$1"
    print_color $CYAN "=============================================="
    echo ""
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get package info from npm registry
get_latest_version() {
    local package_name=$1
    local latest_version
    
    # Try to get latest version from npm registry
    latest_version=$(npm view "$package_name" version 2>/dev/null || echo "unknown")
    echo "$latest_version"
}

# Function to compare versions
version_compare() {
    local current=$1
    local latest=$2
    
    if [ "$current" = "$latest" ]; then
        echo "up-to-date"
    elif [ "$current" = "unknown" ] || [ "$latest" = "unknown" ]; then
        echo "unknown"
    else
        # Use npm semver comparison if available
        if command_exists npx; then
            if npx semver "$current" -r ">=$latest" 2>/dev/null; then
                echo "up-to-date"
            else
                echo "outdated"
            fi
        else
            echo "check-needed"
        fi
    fi
}

# Function to check dependencies in a package.json
check_package_deps() {
    local package_json_path=$1
    local package_name=$2
    
    if [ ! -f "$package_json_path" ]; then
        print_color $RED "❌ package.json not found at: $package_json_path"
        return 1
    fi
    
    print_header "Checking: $package_name"
    
    local outdated_count=0
    local total_count=0
    local updates_available=()
    
    # Check dependencies
    if jq -e '.dependencies // empty' "$package_json_path" > /dev/null 2>&1; then
        print_color $BLUE "📦 Dependencies:"
        echo ""
        
        # Get all dependency names
        local deps=$(jq -r '.dependencies // {} | keys[]' "$package_json_path" 2>/dev/null)
        
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                local current_version=$(jq -r ".dependencies[\"$dep\"]" "$package_json_path" | sed 's/[^0-9.]//g')
                local latest_version=$(get_latest_version "$dep")
                local status=$(version_compare "$current_version" "$latest_version")
                
                total_count=$((total_count + 1))
                
                case $status in
                    "up-to-date")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $GREEN "✓")"
                        ;;
                    "outdated")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $YELLOW "⚠")"
                        outdated_count=$((outdated_count + 1))
                        updates_available+=("$dep:$latest_version")
                        ;;
                    *)
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $PURPLE "?")"
                        ;;
                esac
            fi
        done <<< "$deps"
    fi
    
    # Check devDependencies
    if jq -e '.devDependencies // empty' "$package_json_path" > /dev/null 2>&1; then
        echo ""
        print_color $BLUE "🔧 Dev Dependencies:"
        echo ""
        
        local dev_deps=$(jq -r '.devDependencies // {} | keys[]' "$package_json_path" 2>/dev/null)
        
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                local current_version=$(jq -r ".devDependencies[\"$dep\"]" "$package_json_path" | sed 's/[^0-9.]//g')
                local latest_version=$(get_latest_version "$dep")
                local status=$(version_compare "$current_version" "$latest_version")
                
                total_count=$((total_count + 1))
                
                case $status in
                    "up-to-date")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $GREEN "✓")"
                        ;;
                    "outdated")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $YELLOW "⚠")"
                        outdated_count=$((outdated_count + 1))
                        updates_available+=("$dep:$latest_version")
                        ;;
                    *)
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $PURPLE "?")"
                        ;;
                esac
            fi
        done <<< "$dev_deps"
    fi
    
    # Check peerDependencies
    if jq -e '.peerDependencies // empty' "$package_json_path" > /dev/null 2>&1; then
        echo ""
        print_color $BLUE "🤝 Peer Dependencies:"
        echo ""
        
        local peer_deps=$(jq -r '.peerDependencies // {} | keys[]' "$package_json_path" 2>/dev/null)
        
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                local current_version=$(jq -r ".peerDependencies[\"$dep\"]" "$package_json_path" | sed 's/[^0-9.]//g')
                local latest_version=$(get_latest_version "$dep")
                local status=$(version_compare "$current_version" "$latest_version")
                
                total_count=$((total_count + 1))
                
                case $status in
                    "up-to-date")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $GREEN "✓")"
                        ;;
                    "outdated")
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $YELLOW "⚠")"
                        outdated_count=$((outdated_count + 1))
                        updates_available+=("$dep:$latest_version")
                        ;;
                    *)
                        printf "  %-40s %s -> %s %s\n" "$dep" "$current_version" "$latest_version" "$(print_color $PURPLE "?")"
                        ;;
                esac
            fi
        done <<< "$peer_deps"
    fi
    
    echo ""
    print_color $CYAN "Summary for $package_name:"
    print_color $GREEN "  ✓ Up to date: $((total_count - outdated_count))"
    if [ $outdated_count -gt 0 ]; then
        print_color $YELLOW "  ⚠ Outdated: $outdated_count"
    fi
    print_color $BLUE "  📊 Total dependencies: $total_count"
    
    # Store updates for this package
    if [ ${#updates_available[@]} -gt 0 ]; then
        echo "${updates_available[@]}" > "/tmp/updates_${package_name//\//_}.txt"
    fi
    
    return $outdated_count
}

# Function to update dependencies for a package (pnpm workspace optimized)
update_package_deps() {
    local package_dir=$1
    local package_name=$2
    
    print_header "Updating dependencies for: $package_name"
    
    cd "$package_dir"
    
    # First try with pnpm (preferred for this workspace)
    if command_exists pnpm; then
        print_color $BLUE "🔄 Using pnpm workspace commands"
        
        # For workspace packages, use specific pnpm workspace commands
        if [ "$package_name" != "Root Workspace" ]; then
            # Update specific package using workspace filter
            cd "$WORKSPACE_ROOT"
            print_color $BLUE "🔄 Running: pnpm update --latest --filter $package_name"
            pnpm update --latest --filter "$package_name" 2>/dev/null || {
                # Fallback: update from within the package directory
                cd "$package_dir"
                print_color $BLUE "🔄 Fallback: Running pnpm update --latest in package directory"
                pnpm update --latest
            }
        else
            # Root workspace update
            print_color $BLUE "🔄 Running: pnpm update --latest (root workspace)"
            pnpm update --latest
        fi
        
    # Fallback to npm
    elif command_exists npm; then
        print_color $BLUE "🔄 Running: npm update to latest"
        
        # Get all dependencies and update them to @latest
        local all_deps=$(jq -r '.dependencies // {}, .devDependencies // {} | keys[]' package.json 2>/dev/null | sort -u)
        if [ -n "$all_deps" ]; then
            while IFS= read -r dep; do
                if [ -n "$dep" ]; then
                    # Skip workspace dependencies (they shouldn't be updated to @latest)
                    if [[ "$dep" == "@farm-framework/"* ]] || [[ "$dep" == "@farm/"* ]]; then
                        print_color $PURPLE "  ↳ Skipping workspace dependency: $dep"
                        continue
                    fi
                    print_color $BLUE "  ↳ Updating $dep to @latest"
                    npm install "$dep@latest" 2>/dev/null || true
                fi
            done <<< "$all_deps"
        else
            # Fallback to regular update
            npm update
        fi
    else
        print_color $RED "❌ Neither pnpm nor npm found!"
        return 1
    fi
    
    print_color $GREEN "✅ Dependencies updated for $package_name"
}

# Function to force update all dependencies to @latest
force_update_to_latest() {
    local package_dir=$1
    local package_name=$2
    
    print_header "Force updating ALL dependencies to @latest for: $package_name"
    
    cd "$package_dir"
    
    if [ ! -f "package.json" ]; then
        print_color $RED "❌ package.json not found in $package_dir"
        return 1
    fi
    
    # Get all dependencies
    local deps=$(jq -r '.dependencies // {} | keys[]' package.json 2>/dev/null)
    local dev_deps=$(jq -r '.devDependencies // {} | keys[]' package.json 2>/dev/null)
    local peer_deps=$(jq -r '.peerDependencies // {} | keys[]' package.json 2>/dev/null)
    
    # Update dependencies to @latest
    if [ -n "$deps" ]; then
        print_color $BLUE "📦 Updating dependencies to @latest:"
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                # Skip workspace dependencies (they shouldn't be updated to @latest)
                if [[ "$dep" == "@farm-framework/"* ]] || [[ "$dep" == "@farm/"* ]]; then
                    print_color $PURPLE "  ↳ Skipping workspace dependency: $dep"
                    continue
                fi
                
                print_color $BLUE "  ↳ $dep@latest"
                if command_exists pnpm; then
                    pnpm add "$dep@latest" 2>/dev/null || print_color $YELLOW "  ⚠ Failed to update $dep"
                elif command_exists npm; then
                    npm install "$dep@latest" 2>/dev/null || print_color $YELLOW "  ⚠ Failed to update $dep"
                fi
            fi
        done <<< "$deps"
    fi
    
    # Update devDependencies to @latest
    if [ -n "$dev_deps" ]; then
        echo ""
        print_color $BLUE "🔧 Updating devDependencies to @latest:"
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                # Skip workspace dependencies (they shouldn't be updated to @latest)
                if [[ "$dep" == "@farm-framework/"* ]] || [[ "$dep" == "@farm/"* ]]; then
                    print_color $PURPLE "  ↳ Skipping workspace dependency: $dep"
                    continue
                fi
                
                print_color $BLUE "  ↳ $dep@latest"
                if command_exists pnpm; then
                    pnpm add -D "$dep@latest" 2>/dev/null || print_color $YELLOW "  ⚠ Failed to update $dep"
                elif command_exists npm; then
                    npm install --save-dev "$dep@latest" 2>/dev/null || print_color $YELLOW "  ⚠ Failed to update $dep"
                fi
            fi
        done <<< "$dev_deps"
    fi
    
    # Note: We don't auto-update peerDependencies as they need to be compatible with host packages
    if [ -n "$peer_deps" ]; then
        echo ""
        print_color $YELLOW "🤝 Peer dependencies found (not auto-updated):"
        while IFS= read -r dep; do
            if [ -n "$dep" ]; then
                print_color $YELLOW "  • $dep"
            fi
        done <<< "$peer_deps"
    fi
    
    print_color $GREEN "✅ All dependencies force-updated to @latest for $package_name"
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -c, --check             Check dependencies only (default)"
    echo "  -u, --update            Update all outdated dependencies"
    echo "  -f, --force-latest      Force update ALL dependencies to @latest"
    echo "  -p, --package <name>    Check/update specific package only"
    echo "  -r, --root              Check/update root workspace only"
    echo "  -i, --interactive       Interactive mode - ask before each update"
    echo "  -v, --verbose           Verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                      # Check all packages"
    echo "  $0 -u                   # Update all packages"
    echo "  $0 -f                   # Force update all packages to @latest"
    echo "  $0 -p observability     # Check only observability package"
    echo "  $0 -p observability -u  # Update only observability package"
    echo "  $0 -p observability -f  # Force update observability to @latest"
    echo "  $0 -r -u                # Update only root workspace"
}

# Parse command line arguments
CHECK_ONLY=true
UPDATE_ALL=false
FORCE_LATEST=false
SPECIFIC_PACKAGE=""
ROOT_ONLY=false
INTERACTIVE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -c|--check)
            CHECK_ONLY=true
            UPDATE_ALL=false
            FORCE_LATEST=false
            shift
            ;;
        -u|--update)
            CHECK_ONLY=false
            UPDATE_ALL=true
            FORCE_LATEST=false
            shift
            ;;
        -f|--force-latest)
            CHECK_ONLY=false
            UPDATE_ALL=false
            FORCE_LATEST=true
            shift
            ;;
        -p|--package)
            SPECIFIC_PACKAGE="$2"
            shift 2
            ;;
        -r|--root)
            ROOT_ONLY=true
            shift
            ;;
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_color $RED "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header "FARM Framework Dependency Checker"
    
    # Check required tools
    if ! command_exists jq; then
        print_color $RED "❌ jq is required but not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_color $RED "❌ npm is required but not installed. Please install it first."
        exit 1
    fi
    
    cd "$WORKSPACE_ROOT"
    
    local total_outdated=0
    local packages_to_update=()
    
    # Check root workspace
    if [ "$ROOT_ONLY" = true ] || [ -z "$SPECIFIC_PACKAGE" ]; then
        check_package_deps "$WORKSPACE_ROOT/package.json" "Root Workspace"
        local root_outdated=$?
        total_outdated=$((total_outdated + root_outdated))
        
        # For force latest, always add to update list regardless of outdated status
        if [ $root_outdated -gt 0 ] || [ "$FORCE_LATEST" = true ]; then
            packages_to_update+=("$WORKSPACE_ROOT:Root Workspace")
        fi
    fi
    
    # Check specific package or all packages
    if [ "$ROOT_ONLY" = false ]; then
        if [ -n "$SPECIFIC_PACKAGE" ]; then
            # Check specific package
            local package_path="$WORKSPACE_ROOT/packages/$SPECIFIC_PACKAGE"
            if [ -d "$package_path" ]; then
                check_package_deps "$package_path/package.json" "$SPECIFIC_PACKAGE"
                local pkg_outdated=$?
                total_outdated=$((total_outdated + pkg_outdated))
                
                # For force latest, always add to update list regardless of outdated status
                if [ $pkg_outdated -gt 0 ] || [ "$FORCE_LATEST" = true ]; then
                    packages_to_update+=("$package_path:$SPECIFIC_PACKAGE")
                fi
            else
                print_color $RED "❌ Package not found: $SPECIFIC_PACKAGE"
                exit 1
            fi
        else
            # Check all packages
            for package_dir in "$WORKSPACE_ROOT"/packages/*/; do
                if [ -d "$package_dir" ]; then
                    local package_name=$(basename "$package_dir")
                    check_package_deps "$package_dir/package.json" "$package_name"
                    local pkg_outdated=$?
                    total_outdated=$((total_outdated + pkg_outdated))
                    
                    # For force latest, always add to update list regardless of outdated status
                    if [ $pkg_outdated -gt 0 ] || [ "$FORCE_LATEST" = true ]; then
                        packages_to_update+=("$package_dir:$package_name")
                    fi
                fi
            done
        fi
    fi
    
    # Final summary
    print_header "FINAL SUMMARY"
    if [ $total_outdated -eq 0 ]; then
        print_color $GREEN "🎉 All dependencies are up to date!"
    else
        print_color $YELLOW "⚠️  Found $total_outdated outdated dependencies across ${#packages_to_update[@]} packages"
        
        # Show packages with updates available
        if [ ${#packages_to_update[@]} -gt 0 ]; then
            echo ""
            print_color $BLUE "Packages with updates available:"
            for package_info in "${packages_to_update[@]}"; do
                local package_name="${package_info#*:}"
                print_color $YELLOW "  • $package_name"
            done
        fi
        
        # Update logic
        if [ "$UPDATE_ALL" = true ] || [ "$FORCE_LATEST" = true ]; then
            echo ""
            if [ "$INTERACTIVE" = true ]; then
                if [ "$FORCE_LATEST" = true ]; then
                    read -p "Do you want to force update ALL dependencies to @latest? (y/N): " -n 1 -r
                else
                    read -p "Do you want to update all outdated dependencies? (y/N): " -n 1 -r
                fi
                echo ""
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    UPDATE_ALL=true
                else
                    UPDATE_ALL=false
                    FORCE_LATEST=false
                fi
            fi
            
            if [ "$UPDATE_ALL" = true ] || [ "$FORCE_LATEST" = true ]; then
                if [ "$FORCE_LATEST" = true ]; then
                    print_header "FORCE UPDATING ALL DEPENDENCIES TO @LATEST"
                else
                    print_header "UPDATING DEPENDENCIES"
                fi
                
                for package_info in "${packages_to_update[@]}"; do
                    local package_path="${package_info%:*}"
                    local package_name="${package_info#*:}"
                    
                    if [ "$INTERACTIVE" = true ]; then
                        if [ "$FORCE_LATEST" = true ]; then
                            read -p "Force update $package_name to @latest? (y/N): " -n 1 -r
                        else
                            read -p "Update $package_name? (y/N): " -n 1 -r
                        fi
                        echo ""
                        if [[ $REPLY =~ ^[Yy]$ ]]; then
                            if [ "$FORCE_LATEST" = true ]; then
                                force_update_to_latest "$package_path" "$package_name"
                            else
                                update_package_deps "$package_path" "$package_name"
                            fi
                        fi
                    else
                        if [ "$FORCE_LATEST" = true ]; then
                            force_update_to_latest "$package_path" "$package_name"
                        else
                            update_package_deps "$package_path" "$package_name"
                        fi
                    fi
                done
                
                print_color $GREEN "✅ All updates completed!"
            fi
        else
            echo ""
            print_color $CYAN "💡 To update all dependencies, run:"
            print_color $CYAN "   $0 --update"
            echo ""
            print_color $CYAN "💡 To force update all dependencies to @latest, run:"
            print_color $CYAN "   $0 --force-latest"
            echo ""
            print_color $CYAN "💡 To update interactively, run:"
            print_color $CYAN "   $0 --update --interactive"
        fi
    fi
}

# Cleanup function
cleanup() {
    # Remove temporary files
    rm -f /tmp/updates_*.txt 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

# Run main function
main "$@"
