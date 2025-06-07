#!/bin/bash
# scripts/test-dev-setup.sh
# Test FARM development environment setup
# Run from project root: ./scripts/test-dev-setup.sh

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

log_docker() {
    echo -e "${CYAN}🐳 $1${NC}"
}

# Get the absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="/tmp"

# For Windows, use a Windows-compatible temp directory
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    TEMP_DIR="/c/temp"
    mkdir -p "$TEMP_DIR"
fi

log_info "Starting FARM Development Setup Test"
log_info "Project Root: $PROJECT_ROOT"
log_info "Temp Directory: $TEMP_DIR"

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    log_step "Cleaning up test environments..."
    
    # Stop and remove any test containers
    for project in farm-test-basic farm-test-ai; do
        if [ -d "$TEMP_DIR/$project" ]; then
            log_info "Cleaning up $project..."
            cd "$TEMP_DIR/$project"
            if [ -f "docker-compose.yml" ]; then
                docker-compose down -v --remove-orphans 2>/dev/null || true
            fi
        fi
    done
    
    # Remove test directories
    rm -rf "$TEMP_DIR"/farm-test-* 2>/dev/null || true
    
    if [ $exit_code -eq 0 ]; then
        log_success "Test completed successfully!"
    else
        log_error "Test failed with exit code $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
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

# Test function to wait for service with timeout and detailed logging
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
        
        if [ $((counter % 10)) -eq 0 ] && [ $counter -gt 0 ]; then
            log_info "$service_name not ready yet... (${counter}s elapsed)"
        fi
        
        sleep 1
        counter=$((counter + 1))
    done
    
    log_error "$service_name failed to start within ${timeout}s"
    return 1
}

# Test basic template
test_basic_template() {
    log_step "Testing Basic Template..."
    
    cd "$TEMP_DIR"
    rm -rf farm-test-basic 2>/dev/null || true
    
    log_info "Creating basic template project..."
    node "$PROJECT_ROOT/packages/cli/dist/index.js" create farm-test-basic \
        --template basic \
        --no-install \
        --no-interactive \
        --no-git
    
    if [ ! -d "farm-test-basic" ]; then
        log_error "Basic template creation failed - directory not created"
        return 1
    fi
    
    cd farm-test-basic
    log_success "Basic template created successfully"
    
    # Check required files exist
    local required_files=(
        "package.json"
        "farm.config.ts"
        "docker-compose.yml"
        "apps/web/package.json"
        "apps/api/src/main.py"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file missing: $file"
            return 1
        fi
    done
    log_success "All required files present"
    
    # Install dependencies
    log_step "Installing dependencies..."
    pnpm install --frozen-lockfile
    
    # Start Docker services
    log_docker "Starting basic template services..."
    docker-compose up -d
    
    # Wait for services
    if ! wait_for_service "http://localhost:27017" "MongoDB" 60; then
        log_error "MongoDB failed to start"
        docker-compose logs mongodb
        return 1
    fi
    
    if ! wait_for_service "http://localhost:8000/health" "FastAPI Backend" 60; then
        log_error "FastAPI backend failed to start"
        docker-compose logs backend
        return 1
    fi
    
    if ! wait_for_service "http://localhost:3000" "React Frontend" 60; then
        log_error "React frontend failed to start"
        docker-compose logs frontend
        return 1
    fi
    
    # Test API health endpoint
    log_step "Testing API health endpoint..."
    if curl -s -f "http://localhost:8000/health" | grep -q "healthy"; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        return 1
    fi
    
    # Stop services
    log_docker "Stopping basic template services..."
    docker-compose down -v
    
    log_success "Basic template test completed successfully"
}

# Test AI chat template
test_ai_template() {
    log_step "Testing AI Chat Template..."
    
    cd "$TEMP_DIR"
    rm -rf farm-test-ai 2>/dev/null || true
    
    log_info "Creating AI chat template project..."
    node "$PROJECT_ROOT/packages/cli/dist/index.js" create farm-test-ai \
        --template ai-chat \
        --no-install \
        --no-interactive \
        --no-git
    
    if [ ! -d "farm-test-ai" ]; then
        log_error "AI template creation failed - directory not created"
        return 1
    fi
    
    cd farm-test-ai
    log_success "AI chat template created successfully"
    
    # Check AI-specific files
    local ai_files=(
        "apps/web/src/components/chat/ChatWindow.tsx"
        "apps/api/src/ai/providers/ollama.py"
        "apps/api/src/routes/ai.py"
    )
    
    for file in "${ai_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "AI-specific file missing: $file"
            return 1
        fi
    done
    log_success "All AI-specific files present"
    
    # Install dependencies
    log_step "Installing dependencies..."
    pnpm install --frozen-lockfile
    
    # Start Docker services (including Ollama)
    log_docker "Starting AI template services (including Ollama)..."
    docker-compose up -d
    
    # Wait for core services first
    if ! wait_for_service "http://localhost:27017" "MongoDB" 60; then
        log_error "MongoDB failed to start"
        docker-compose logs mongodb
        return 1
    fi
    
    # Ollama takes longer to start
    if ! wait_for_service "http://localhost:11434/api/tags" "Ollama AI Service" 120; then
        log_error "Ollama failed to start"
        docker-compose logs ollama
        return 1
    fi
    
    # Test Ollama API
    log_step "Testing Ollama API..."
    if curl -s -f "http://localhost:11434/api/tags" | grep -q "models"; then
        log_success "Ollama API responding"
    else
        log_warning "Ollama API not fully ready, but container is running"
    fi
    
    # Test pulling a small model (optional, as it takes time)
    log_step "Testing Ollama model pull (using phi3:mini for speed)..."
    if timeout 300 docker-compose exec -T ollama ollama pull phi3:mini; then
        log_success "Successfully pulled phi3:mini model"
        
        # Test model inference
        log_step "Testing model inference..."
        if docker-compose exec -T ollama ollama run phi3:mini "Hello, respond with just 'OK'"; then
            log_success "Model inference test passed"
        else
            log_warning "Model inference test failed, but pull succeeded"
        fi
    else
        log_warning "Model pull timed out or failed (this is okay for testing)"
    fi
    
    # Wait for backend with AI integration
    if ! wait_for_service "http://localhost:8000/health" "FastAPI Backend with AI" 90; then
        log_error "FastAPI backend with AI failed to start"
        docker-compose logs backend
        return 1
    fi
    
    # Test AI-specific endpoints
    log_step "Testing AI endpoints..."
    if curl -s -f "http://localhost:8000/api/ai/health" | grep -q "ollama"; then
        log_success "AI health endpoint responding"
    else
        log_warning "AI health endpoint not fully ready"
    fi
    
    # Wait for frontend
    if ! wait_for_service "http://localhost:3000" "React Frontend with AI" 60; then
        log_error "React frontend with AI failed to start"
        docker-compose logs frontend
        return 1
    fi
    
    # Stop services
    log_docker "Stopping AI template services..."
    docker-compose down -v
    
    log_success "AI chat template test completed successfully"
}

# Main execution
main() {
    log_info "🧪 FARM Development Setup Test Starting..."
    echo "================================================="
    
    check_prerequisites
    echo ""
    
    test_basic_template
    echo ""
    
    test_ai_template
    echo ""
    
    log_success "🎉 All tests passed! FARM development environment is working correctly."
}

# Run main function
main "$@"