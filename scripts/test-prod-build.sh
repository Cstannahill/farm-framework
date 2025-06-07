#!/bin/bash
# scripts/test-prod-build.sh
# Test FARM production build and deployment
# Run from project root: ./scripts/test-prod-build.sh

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

log_build() {
    echo -e "${CYAN}🏗️  $1${NC}"
}

log_deploy() {
    echo -e "${GREEN}🚀 $1${NC}"
}

# Get the absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="/tmp"

# For Windows, use a Windows-compatible temp directory
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    TEMP_DIR="/c/temp"
    mkdir -p "$TEMP_DIR"
fi

log_info "Starting FARM Production Build Test"
log_info "Project Root: $PROJECT_ROOT"
log_info "Temp Directory: $TEMP_DIR"

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    log_step "Cleaning up production test environment..."
    
    if [ -d "$TEMP_DIR/farm-test-prod" ]; then
        cd "$TEMP_DIR/farm-test-prod"
        
        # Stop production containers
        if [ -f "docker-compose.prod.yml" ]; then
            log_info "Stopping production containers..."
            docker-compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
        fi
        
        # Clean up development containers too
        if [ -f "docker-compose.yml" ]; then
            docker-compose down -v --remove-orphans 2>/dev/null || true
        fi
        
        # Remove built images
        log_info "Removing built Docker images..."
        docker images --format "table {{.Repository}}:{{.Tag}}" | grep farm-test-prod | awk '{print $1}' | xargs -r docker rmi 2>/dev/null || true
    fi
    
    # Remove test directory
    rm -rf "$TEMP_DIR/farm-test-prod" 2>/dev/null || true
    
    if [ $exit_code -eq 0 ]; then
        log_success "Production test completed successfully!"
    else
        log_error "Production test failed with exit code $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites for production build..."
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]; then
        log_error "Not in FARM project root! Expected pnpm-workspace.yaml"
        exit 1
    fi
    
    # Check for required commands
    for cmd in node pnpm docker docker-compose; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed or not in PATH"
            exit 1
        fi
        log_success "$cmd is available"
    done
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log_success "Docker is running"
    
    # Check available disk space (need space for Docker images)
    local available_space=$(df "$TEMP_DIR" | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 2097152 ]; then  # 2GB in KB
        log_warning "Low disk space available. Production build may fail."
    else
        log_success "Sufficient disk space available"
    fi
    
    # Check if CLI is built
    CLI_PATH="$PROJECT_ROOT/packages/cli/dist/index.js"
    if [ ! -f "$CLI_PATH" ]; then
        log_warning "CLI not built, building now..."
        cd "$PROJECT_ROOT"
        pnpm install --frozen-lockfile
        pnpm build
        
        if [ ! -f "$CLI_PATH" ]; then
            log_error "Failed to build CLI"
            exit 1
        fi
    fi
    log_success "CLI is built and ready"
}

# Wait for service with detailed logging
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-60}
    local counter=0
    
    log_step "Waiting for $service_name at $url (timeout: ${timeout}s)..."
    
    while [ $counter -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            log_success "$service_name is ready (took ${counter}s)"
            return 0
        fi
        
        if [ $((counter % 15)) -eq 0 ] && [ $counter -gt 0 ]; then
            log_info "$service_name not ready yet... (${counter}s elapsed)"
        fi
        
        sleep 1
        counter=$((counter + 1))
    done
    
    log_error "$service_name failed to start within ${timeout}s"
    return 1
}

# Create production-ready project
create_production_project() {
    log_step "Creating production test project..."
    
    cd "$TEMP_DIR"
    rm -rf farm-test-prod 2>/dev/null || true
    
    log_info "Creating AI chat template for production testing..."
    node "$PROJECT_ROOT/packages/cli/dist/index.js" create farm-test-prod \
        --template ai-chat \
        --no-interactive \
        --no-git
    
    if [ ! -d "farm-test-prod" ]; then
        log_error "Production project creation failed - directory not created"
        return 1
    fi
    
    cd farm-test-prod
    log_success "Production project created successfully"
    
    # Check that production files were generated
    local required_files=(
        "Dockerfile"
        "docker-compose.yml"
        "docker-compose.prod.yml"
        ".dockerignore"
        "apps/web/package.json"
        "apps/api/requirements.txt"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required production file missing: $file"
            return 1
        fi
    done
    log_success "All required production files present"
}

# Build production images
build_production_images() {
    log_build "Building production Docker images..."
    
    # Show Docker info before build
    log_info "Docker system info before build:"
    docker system df
    
    # Build images with detailed output
    log_step "Building frontend image..."
    if docker-compose -f docker-compose.prod.yml build frontend; then
        log_success "Frontend image built successfully"
    else
        log_error "Frontend image build failed"
        return 1
    fi
    
    log_step "Building backend image..."
    if docker-compose -f docker-compose.prod.yml build backend; then
        log_success "Backend image built successfully"
    else
        log_error "Backend image build failed"
        return 1
    fi
    
    # If AI template, build Ollama image
    if [ -f "apps/api/src/ai/providers/ollama.py" ]; then
        log_step "Building Ollama image for AI features..."
        if docker-compose -f docker-compose.prod.yml build ollama; then
            log_success "Ollama image built successfully"
        else
            log_warning "Ollama image build failed (continuing without AI)"
        fi
    fi
    
    # Show built images
    log_info "Built images:"
    docker images | grep farm-test-prod || log_warning "No farm-test-prod images found"
    
    # Show disk usage after build
    log_info "Docker system info after build:"
    docker system df
}

# Test production deployment
test_production_deployment() {
    log_deploy "Testing production deployment..."
    
    # Start production services
    log_step "Starting production services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Show running containers
    log_info "Running containers:"
    docker-compose -f docker-compose.prod.yml ps
    
    # Wait for database
    if ! wait_for_service "http://localhost:27017" "Production MongoDB" 60; then
        log_error "Production MongoDB failed to start"
        docker-compose -f docker-compose.prod.yml logs mongodb
        return 1
    fi
    
    # Wait for backend API
    if ! wait_for_service "http://localhost:8000/health" "Production Backend API" 90; then
        log_error "Production backend failed to start"
        log_info "Backend logs:"
        docker-compose -f docker-compose.prod.yml logs backend
        return 1
    fi
    
    # If frontend is served by backend in production, test the main route
    if ! wait_for_service "http://localhost:8000/" "Production Frontend" 60; then
        log_warning "Production frontend not accessible at root path"
        # Try alternative ports
        if wait_for_service "http://localhost:3000" "Production Frontend (alt)" 30; then
            log_success "Frontend accessible on port 3000"
        else
            log_error "Frontend not accessible on any expected port"
            return 1
        fi
    fi
    
    # Test AI endpoints if available
    if curl -s "http://localhost:8000/api/ai/health" > /dev/null 2>&1; then
        log_success "AI endpoints are accessible in production"
        
        # Test Ollama if available
        if wait_for_service "http://localhost:11434/api/tags" "Production Ollama" 60; then
            log_success "Ollama AI service is running in production"
        else
            log_warning "Ollama not available in production (this is okay)"
        fi
    else
        log_info "AI endpoints not available (this is okay for basic templates)"
    fi
}

# Test production API functionality
test_production_api() {
    log_step "Testing production API functionality..."
    
    # Test health endpoint
    local health_response=$(curl -s "http://localhost:8000/health" || echo "FAILED")
    if echo "$health_response" | grep -q "healthy"; then
        log_success "Health endpoint responding correctly"
    else
        log_error "Health endpoint failed. Response: $health_response"
        return 1
    fi
    
    # Test OpenAPI docs endpoint
    if curl -s -f "http://localhost:8000/docs" > /dev/null 2>&1; then
        log_success "OpenAPI documentation accessible"
    else
        log_warning "OpenAPI docs not accessible (may be disabled in production)"
    fi
    
    # Test CORS and basic API structure
    local cors_test=$(curl -s -H "Origin: http://localhost:3000" -I "http://localhost:8000/health" | grep -i "access-control" || echo "NO_CORS")
    if [ "$cors_test" != "NO_CORS" ]; then
        log_success "CORS headers present"
    else
        log_warning "CORS headers not found (may not be configured)"
    fi
    
    # Test that static files are served if frontend is integrated
    if curl -s -f "http://localhost:8000/favicon.ico" > /dev/null 2>&1; then
        log_success "Static files are being served"
    else
        log_info "Static files not served by backend (separate frontend server)"
    fi
}

# Verify production optimizations
verify_production_optimizations() {
    log_step "Verifying production optimizations..."
    
    # Check that images are reasonably sized (not too large)
    local frontend_size=$(docker images farm-test-prod-frontend --format "table {{.Size}}" | tail -n +2 | head -1)
    local backend_size=$(docker images farm-test-prod-backend --format "table {{.Size}}" | tail -n +2 | head -1)
    
    log_info "Image sizes:"
    log_info "  Frontend: $frontend_size"
    log_info "  Backend: $backend_size"
    
    # Check that containers are running efficiently
    log_info "Container resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f docker-compose.prod.yml ps -q) 2>/dev/null || log_warning "Could not get container stats"
    
    # Check that environment variables are set correctly
    local env_check=$(docker-compose -f docker-compose.prod.yml exec -T backend env | grep -E "(NODE_ENV|FARM_ENV)" || echo "NO_ENV")
    if echo "$env_check" | grep -q "production"; then
        log_success "Production environment variables set correctly"
    else
        log_warning "Production environment variables may not be set: $env_check"
    fi
    
    # Verify security - check that debug endpoints are disabled
    if curl -s -f "http://localhost:8000/debug" > /dev/null 2>&1; then
        log_warning "Debug endpoints may be exposed in production"
    else
        log_success "Debug endpoints properly disabled"
    fi
}

# Test production performance
test_production_performance() {
    log_step "Testing production performance..."
    
    # Simple load test - multiple concurrent requests
    log_info "Running basic load test (10 concurrent requests)..."
    local start_time=$(date +%s)
    
    for i in {1..10}; do
        curl -s "http://localhost:8000/health" > /dev/null &
    done
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 5 ]; then
        log_success "Load test passed (${duration}s for 10 concurrent requests)"
    else
        log_warning "Load test slower than expected (${duration}s)"
    fi
    
    # Test response time for a single request
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:8000/health")
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        log_success "Single request response time good (${response_time}s)"
    else
        log_warning "Single request response time slower than expected (${response_time}s)"
    fi
}

# Main execution
main() {
    log_info "🏗️ FARM Production Build Test Starting..."
    echo "================================================="
    
    check_prerequisites
    echo ""
    
    create_production_project
    echo ""
    
    build_production_images
    echo ""
    
    test_production_deployment
    echo ""
    
    test_production_api
    echo ""
    
    verify_production_optimizations
    echo ""
    
    test_production_performance
    echo ""
    
    log_success "🎉 Production build test completed successfully!"
    log_success "🚀 Your FARM application is ready for production deployment!"
}

# Run main function
main "$@"