#!/bin/bash
# scripts/run-all-tests.sh
# Run complete FARM Framework test suite
# Run from project root: ./scripts/run-all-tests.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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

log_header() {
    echo -e "${BOLD}${CYAN}$1${NC}"
}

# Get the absolute path to project root and scripts
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Test results tracking
VALIDATION_RESULT=0
DEV_TEST_RESULT=0
PROD_TEST_RESULT=0

log_header "🧪 FARM Framework Complete Test Suite"
log_info "Project Root: $PROJECT_ROOT"
log_info "Scripts Directory: $SCRIPTS_DIR"
echo "================================================="

# Function to run a test script and capture result
run_test() {
    local script_name="$1"
    local script_path="$SCRIPTS_DIR/$script_name"
    local description="$2"
    
    if [ ! -f "$script_path" ]; then
        log_error "Test script not found: $script_path"
        return 1
    fi
    
    log_header "Running $description"
    echo "Script: $script_path"
    echo ""
    
    # Make script executable
    chmod +x "$script_path"
    
    # Run the script and capture exit code
    if "$script_path"; then
        log_success "$description completed successfully"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Step 1: Validate setup
echo ""
log_step "Step 1: Validating FARM Framework Setup"
echo "================================================="

if run_test "validate.sh" "Setup Validation"; then
    VALIDATION_RESULT=0
    log_success "✓ Setup validation passed"
else
    VALIDATION_RESULT=1
    log_error "✗ Setup validation failed"
    log_warning "Continuing with remaining tests, but expect failures..."
fi

echo ""
echo ""

# Step 2: Test development environment
log_step "Step 2: Testing Development Environment"
echo "================================================="

if run_test "test-dev-setup.sh" "Development Environment Test"; then
    DEV_TEST_RESULT=0
    log_success "✓ Development environment test passed"
else
    DEV_TEST_RESULT=1
    log_error "✗ Development environment test failed"
fi

echo ""
echo ""

# Step 3: Test production build (only if dev tests passed)
log_step "Step 3: Testing Production Build"
echo "================================================="

if [ $DEV_TEST_RESULT -eq 0 ]; then
    if run_test "test-prod-build.sh" "Production Build Test"; then
        PROD_TEST_RESULT=0
        log_success "✓ Production build test passed"
    else
        PROD_TEST_RESULT=1
        log_error "✗ Production build test failed"
    fi
else
    log_warning "Skipping production build test due to development test failures"
    PROD_TEST_RESULT=1
fi

echo ""
echo ""

# Generate comprehensive summary
log_header "🎯 Test Suite Summary"
echo "================================================="

echo ""
log_info "Test Results:"
echo "├── Setup Validation:      $([ $VALIDATION_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "├── Development Tests:     $([ $DEV_TEST_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "└── Production Tests:      $([ $PROD_TEST_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"

echo ""

# Calculate overall result
TOTAL_FAILED=$((VALIDATION_RESULT + DEV_TEST_RESULT + PROD_TEST_RESULT))

if [ $TOTAL_FAILED -eq 0 ]; then
    log_success "🎉 ALL TESTS PASSED!"
    log_success "🚀 FARM Framework is ready for development and production!"
    echo ""
    log_info "You can now:"
    log_info "• Create new FARM projects with: farm create my-app"
    log_info "• Use the development environment: farm dev"
    log_info "• Build for production: farm build"
    log_info "• Deploy your applications"
    
    exit 0
    
elif [ $VALIDATION_RESULT -eq 0 ] && [ $DEV_TEST_RESULT -eq 0 ]; then
    log_warning "⚠️ Development environment is working, but production build failed"
    log_info "You can still develop with FARM, but review production build issues"
    
    exit 1
    
elif [ $VALIDATION_RESULT -eq 0 ]; then
    log_error "🚨 Setup is valid but runtime tests failed"
    log_info "Check Docker installation and service startup issues"
    
    exit 1
    
else
    log_error "🚨 CRITICAL SETUP ISSUES DETECTED"
    log_error "Please fix setup validation errors before proceeding"
    
    echo ""
    log_info "Common fixes:"
    log_info "• Ensure you're in the FARM project root directory"
    log_info "• Run: pnpm install"
    log_info "• Run: pnpm build"
    log_info "• Check Node.js version (>= 18 required)"
    log_info "• Install Docker Desktop"
    
    exit 1
fi