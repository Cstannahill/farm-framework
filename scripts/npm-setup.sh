#!/bin/bash

# NPM Setup Script for FARM Framework Publishing
# This script helps set up npm authentication for publishing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📦 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}🚀 FARM Framework NPM Setup${NC}"
echo "=================================="
echo

# Check current npm authentication
print_step "Checking current npm authentication..."
if npm whoami > /dev/null 2>&1; then
    npm_user=$(npm whoami 2>/dev/null)
    print_success "Already logged in to npm as: $npm_user"
    
    # Check npm access to @farm-framework scope
    print_step "Checking access to @farm-framework scope..."
    if npm access list packages @farm-framework 2>/dev/null | grep -q "$npm_user"; then
        print_success "You have access to @farm-framework packages"
    else
    print_warning "Cannot verify access to @farm-framework scope"
    print_warning "You may need to:"
    echo "    1. Create the organization: npm org create farm-framework"
    echo "    2. Or be added as a collaborator to existing org"
    fi
    
    # Test publish access (dry run)
    print_step "Testing publish access (dry run)..."
    cd "$(dirname "$0")/.." # Go to project root
    if pnpm build > /dev/null 2>&1 && pnpm release:dry-run > /dev/null 2>&1; then
        print_success "Dry run publish test passed"
    else
        print_warning "Dry run publish test failed - check package configuration"
    fi
    
    echo
    print_success "NPM is ready for publishing!"
    echo
    echo "You can now run:"
    echo "  pnpm release:alpha    # Interactive alpha release"
    echo "  pnpm release          # Direct publish"
    echo "  pnpm release:dry-run  # Test without publishing"
    
else
    print_error "Not logged in to npm"
    echo
    echo "To publish FARM Framework packages, you need:"
    echo "1. An npm account"
    echo "2. Access to the @farm-framework organization"
    echo "3. Two-factor authentication (recommended)"
    echo
    
    read -p "Would you like to login now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Logging in to npm..."
        npm login
        
        if npm whoami > /dev/null 2>&1; then
            npm_user=$(npm whoami 2>/dev/null)
            print_success "Successfully logged in as: $npm_user"
            
            # Re-run the script to check access
            echo
            print_step "Re-checking access..."
            exec "$0"
        else
            print_error "Login failed"
            exit 1
        fi
    else
        echo
        echo "To login later, run:"
        echo "  npm login"
        echo "  bash ./scripts/npm-setup.sh"
        exit 0
    fi
fi
