#!/bin/bash
# scripts/validate.sh
# Validate FARM Framework development setup
# Run from project root: ./scripts/validate.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

log_check() {
    echo -e "${CYAN}🔍 $1${NC}"
}

# Get the absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Counters for validation results
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0
TOTAL_CHECKS=0

# Function to track check results
track_check() {
    local result=$1
    local message=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $result in
        "pass")
            log_success "$message"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            return 0
            ;;
        "fail")
            log_error "$message"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
            return 1
            ;;
        "warn")
            log_warning "$message"
            CHECKS_WARNING=$((CHECKS_WARNING + 1))
            return 0
            ;;
    esac
}

# Enhanced file checking function
check_file() {
    local file_path="$1"
    local description="${2:-$file_path}"
    local required="${3:-true}"
    
    if [ -f "$PROJECT_ROOT/$file_path" ]; then
        track_check "pass" "$description exists"
        return 0
    else
        if [ "$required" = "true" ]; then
            track_check "fail" "$description missing (required)"
            return 1
        else
            track_check "warn" "$description missing (optional)"
            return 0
        fi
    fi
}

# Enhanced directory checking function
check_dir() {
    local dir_path="$1"
    local description="${2:-$dir_path directory}"
    local required="${3:-true}"
    
    if [ -d "$PROJECT_ROOT/$dir_path" ]; then
        track_check "pass" "$description exists"
        return 0
    else
        if [ "$required" = "true" ]; then
            track_check "fail" "$description missing (required)"
            return 1
        else
            track_check "warn" "$description missing (optional)"
            return 0
        fi
    fi
}

# Check file content for specific patterns
check_file_content() {
    local file_path="$1"
    local pattern="$2"
    local description="$3"
    
    if [ ! -f "$PROJECT_ROOT/$file_path" ]; then
        track_check "fail" "$description - file not found"
        return 1
    fi
    
    if grep -q "$pattern" "$PROJECT_ROOT/$file_path"; then
        track_check "pass" "$description"
        return 0
    else
        track_check "fail" "$description - pattern not found"
        return 1
    fi
}

# Check package.json dependencies
check_package_dependency() {
    local package_dir="$1"
    local dependency="$2"
    local description="$3"
    
    local package_file="$PROJECT_ROOT/$package_dir/package.json"
    
    if [ ! -f "$package_file" ]; then
        track_check "fail" "$description - package.json not found"
        return 1
    fi
    
    if grep -q "\"$dependency\"" "$package_file"; then
        track_check "pass" "$description"
        return 0
    else
        track_check "warn" "$description - dependency not found"
        return 0
    fi
}

# Validate project structure
validate_project_structure() {
    log_step "Validating project structure..."
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]; then
        log_error "Not in FARM project root! Please run from the project root directory."
        exit 1
    fi
    
    # Root configuration files
    check_file "pnpm-workspace.yaml" "pnpm workspace configuration"
    check_file "tsconfig.base.json" "Base TypeScript configuration"
    check_file "turbo.json" "Turborepo configuration"
    check_file ".gitignore" "Git ignore file"
    check_file "README.md" "Project README"
    
    # Package directories
    check_dir "packages" "Packages directory"
    check_dir "packages/types" "Types package directory"
    check_dir "packages/core" "Core package directory"
    check_dir "packages/cli" "CLI package directory"
    check_dir "packages/ui-components" "UI components package directory"
    
    # Template directories
    check_dir "templates" "Templates directory"
    check_dir "templates/basic" "Basic template directory"
    check_dir "templates/ai-chat" "AI chat template directory"
    
    # Scripts directory
    check_dir "scripts" "Scripts directory"
}

# Validate package configurations
validate_packages() {
    log_step "Validating package configurations..."
    
    # Types package
    check_file "packages/types/package.json" "Types package.json"
    check_file "packages/types/tsconfig.json" "Types TypeScript config"
    check_file "packages/types/src/index.ts" "Types main export"
    check_file "packages/types/src/config.ts" "Config types"
    check_file "packages/types/src/cli.ts" "CLI types"
    check_file "packages/types/src/templates.ts" "Template types"
    
    # Core package
    check_file "packages/core/package.json" "Core package.json"
    check_file "packages/core/tsconfig.json" "Core TypeScript config"
    check_file "packages/core/src/index.ts" "Core main export"
    
    # CLI package
    check_file "packages/cli/package.json" "CLI package.json"
    check_file "packages/cli/tsconfig.json" "CLI TypeScript config"
    check_file "packages/cli/src/index.ts" "CLI main entry"
    check_file "packages/cli/src/commands/create.ts" "CLI create command"
    
    # UI Components package
    check_file "packages/ui-components/package.json" "UI components package.json"
    check_file "packages/ui-components/tsconfig.json" "UI components TypeScript config"
}

# Validate template structures
validate_templates() {
    log_step "Validating template structures..."
    
    # Basic template
    check_file "templates/basic/template.json" "Basic template configuration"
    check_file "templates/basic/package.json.template" "Basic template package.json"
    check_file "templates/basic/farm.config.ts.template" "Basic template FARM config"
    check_dir "templates/basic/apps" "Basic template apps directory"
    check_dir "templates/basic/apps/web" "Basic template web app"
    check_dir "templates/basic/apps/api" "Basic template API"
    
    # AI Chat template
    check_file "templates/ai-chat/template.json" "AI chat template configuration"
    check_file "templates/ai-chat/farm.config.ts.template" "AI chat template FARM config"
    check_dir "templates/ai-chat/apps/web/src/components/chat" "AI chat components"
    check_dir "templates/ai-chat/apps/api/src/ai" "AI integration directory"
}

# Validate dependencies and versions
validate_dependencies() {
    log_step "Validating dependencies and versions..."
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local required_major=18
        local current_major=$(echo $node_version | cut -d. -f1)
        
        if [ "$current_major" -ge "$required_major" ]; then
            track_check "pass" "Node.js version ($node_version) meets requirements (>= $required_major)"
        else
            track_check "fail" "Node.js version ($node_version) too old (requires >= $required_major)"
        fi
    else
        track_check "fail" "Node.js not installed"
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        local pnpm_version=$(pnpm --version)
        track_check "pass" "pnpm installed (version $pnpm_version)"
    else
        track_check "fail" "pnpm not installed"
    fi
    
    # Check TypeScript
    if command -v tsc &> /dev/null; then
        local ts_version=$(tsc --version | cut -d' ' -f2)
        track_check "pass" "TypeScript installed (version $ts_version)"
    else
        track_check "warn" "TypeScript not globally installed (will use local version)"
    fi
    
    # Check key dependencies in packages
    check_package_dependency "packages/types" "typescript" "Types package has TypeScript dependency"
    check_package_dependency "packages/core" "@farm/types" "Core package references types package"
    check_package_dependency "packages/cli" "commander" "CLI package has commander dependency"
}

# Validate TypeScript compilation
validate_typescript() {
    log_step "Validating TypeScript compilation..."
    
    # Check if node_modules exists
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_warning "node_modules not found. Installing dependencies..."
        cd "$PROJECT_ROOT"
        if pnpm install --frozen-lockfile; then
            track_check "pass" "Dependencies installed successfully"
        else
            track_check "fail" "Failed to install dependencies"
            return 1
        fi
    else
        track_check "pass" "Dependencies already installed"
    fi
    
    # Validate each package's TypeScript compilation
    local packages=("types" "core" "cli" "ui-components")
    
    for package in "${packages[@]}"; do
        local package_dir="$PROJECT_ROOT/packages/$package"
        
        if [ -d "$package_dir" ]; then
            log_check "Checking TypeScript compilation for $package package..."
            cd "$package_dir"
            
            if pnpm tsc --noEmit; then
                track_check "pass" "$package package compiles without errors"
            else
                track_check "fail" "$package package has TypeScript compilation errors"
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
}

# Validate build configuration
validate_build_config() {
    log_step "Validating build configuration..."
    
    # Check Turborepo configuration
    if [ -f "$PROJECT_ROOT/turbo.json" ]; then
        if grep -q "\"build\"" "$PROJECT_ROOT/turbo.json"; then
            track_check "pass" "Turborepo build task configured"
        else
            track_check "warn" "Turborepo build task not found"
        fi
    fi
    
    # Check package build scripts
    local packages=("types" "core" "cli" "ui-components")
    
    for package in "${packages[@]}"; do
        check_file_content "packages/$package/package.json" "\"build\"" "$package package has build script"
    done
    
    # Check if tsconfig files reference base config
    for package in "${packages[@]}"; do
        if [ -f "$PROJECT_ROOT/packages/$package/tsconfig.json" ]; then
            check_file_content "packages/$package/tsconfig.json" "tsconfig.base.json" "$package extends base TypeScript config"
        fi
    done
}

# Validate CLI functionality
validate_cli() {
    log_step "Validating CLI functionality..."
    
    # Check if CLI can be built
    cd "$PROJECT_ROOT/packages/cli"
    
    if [ ! -f "dist/index.js" ]; then
        log_info "CLI not built yet, attempting to build..."
        if pnpm build; then
            track_check "pass" "CLI built successfully"
        else
            track_check "fail" "CLI build failed"
            cd "$PROJECT_ROOT"
            return 1
        fi
    else
        track_check "pass" "CLI already built"
    fi
    
    # Test CLI help command
    if node dist/index.js --help > /dev/null 2>&1; then
        track_check "pass" "CLI help command works"
    else
        track_check "fail" "CLI help command failed"
    fi
    
    # Test CLI create command help
    if node dist/index.js create --help > /dev/null 2>&1; then
        track_check "pass" "CLI create command help works"
    else
        track_check "fail" "CLI create command help failed"
    fi
    
    cd "$PROJECT_ROOT"
}

# Validate Docker setup (optional)
validate_docker() {
    log_step "Validating Docker setup (optional)..."
    
    if command -v docker &> /dev/null; then
        track_check "pass" "Docker is installed"
        
        if docker info &> /dev/null; then
            track_check "pass" "Docker daemon is running"
        else
            track_check "warn" "Docker daemon not running"
        fi
        
        if command -v docker-compose &> /dev/null; then
            track_check "pass" "Docker Compose is installed"
        else
            track_check "warn" "Docker Compose not installed"
        fi
    else
        track_check "warn" "Docker not installed (required for development environment)"
    fi
}

# Generate summary report
generate_summary() {
    echo ""
    echo "================================================="
    log_step "Validation Summary"
    echo "================================================="
    
    log_info "Total checks: $TOTAL_CHECKS"
    log_success "Passed: $CHECKS_PASSED"
    log_warning "Warnings: $CHECKS_WARNING"
    log_error "Failed: $CHECKS_FAILED"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "🎉 All critical validations passed!"
        
        if [ $CHECKS_WARNING -gt 0 ]; then
            log_warning "There are $CHECKS_WARNING warnings that should be addressed for optimal setup."
        fi
        
        echo ""
        log_info "Next steps:"
        log_info "1. Run: pnpm install (if not done already)"
        log_info "2. Run: pnpm build (to build all packages)"
        log_info "3. Run: ./scripts/test-dev-setup.sh (to test development environment)"
        log_info "4. Run: ./scripts/test-prod-build.sh (to test production build)"
        
        return 0
    else
        log_error "🚨 $CHECKS_FAILED critical issues found!"
        echo ""
        log_info "Please fix the failed checks before proceeding."
        
        if [ $CHECKS_WARNING -gt 0 ]; then
            log_info "Also consider addressing the $CHECKS_WARNING warnings."
        fi
        
        return 1
    fi
}

# Main execution
main() {
    log_info "🔍 FARM Framework Setup Validation"
    log_info "Project Root: $PROJECT_ROOT"
    echo "================================================="
    
    validate_project_structure
    echo ""
    
    validate_packages
    echo ""
    
    validate_templates
    echo ""
    
    validate_dependencies
    echo ""
    
    validate_typescript
    echo ""
    
    validate_build_config
    echo ""
    
    validate_cli
    echo ""
    
    validate_docker
    echo ""
    
    generate_summary
}

# Run main function
main "$@"