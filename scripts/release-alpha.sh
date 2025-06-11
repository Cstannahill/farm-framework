#!/bin/bash

# FARM Framework Alpha Release Script
# This script handles the complete alpha release process including:
# - Version bumping
# - Changelog generation  
# - Git tagging
# - Publishing (when ready)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [[ ! -f "package.json" || ! -d ".changeset" ]]; then
    print_error "Please run this script from the root of the FARM framework repository"
    exit 1
fi

# Check if git working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    print_error "Working directory is not clean. Please commit or stash changes first."
    git status --short
    exit 1
fi

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" ]]; then
    print_warning "You're not on the main branch (current: $current_branch)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_step "Starting alpha release process..."

# Function to show current version
show_current_version() {
    local current_version=$(node -p "require('./package.json').version")
    echo "Current version: $current_version"
}

# Show current version
show_current_version

# Check for pending changesets
print_step "Checking for pending changesets..."
if [[ ! -d ".changeset" ]] || [[ -z "$(find .changeset -name '*.md' -not -name 'README.md' 2>/dev/null)" ]]; then
    print_warning "No pending changesets found!"
    echo
    echo "You can create changesets by running:"
    echo "  pnpm changeset"
    echo
    read -p "Would you like to create a changeset now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pnpm changeset
        echo
        print_success "Changeset created. Please run this script again."
        exit 0
    else
        print_warning "Proceeding without changesets (manual version bump)"
    fi
else
    print_success "Found pending changesets"
    find .changeset -name '*.md' -not -name 'README.md' -exec basename {} \; | head -5
fi

echo
print_step "Release type options:"
echo "1. 📝 Preview changes (dry run)"
echo "2. 🏷️  Version bump only (no publish)"  
echo "3. 📦 Full release (version + publish)"
echo "4. 🔧 Create changeset"
echo "5. ❌ Cancel"
echo

read -p "Choose an option (1-5): " -n 1 -r
echo

case $REPLY in
    1)
        print_step "Previewing version changes..."
        pnpm changeset status
        echo
        print_step "This would be the changelog preview:"
        pnpm changeset status --verbose
        ;;
    2)
        print_step "Applying version changes..."
        
        # Run tests first
        print_step "Running tests before version bump..."
        if ! pnpm test:run; then
            print_error "Tests failed! Please fix tests before releasing."
            exit 1
        fi
        print_success "Tests passed"
        
        # Build everything
        print_step "Building packages..."
        if ! pnpm build; then
            print_error "Build failed! Please fix build issues before releasing."
            exit 1
        fi
        print_success "Build completed"
        
        # Apply version changes
        pnpm changeset version
        
        # Show new version
        echo
        local new_version=$(node -p "require('./package.json').version")
        print_success "Version updated to: $new_version"
        
        # Commit the version changes
        print_step "Committing version changes..."
        git add .
        git commit -m "chore: release v$new_version" || true
        
        # Create git tag
        git tag "v$new_version"
        print_success "Created git tag: v$new_version"
        
        echo
        print_warning "Version bump complete. To publish, run:"
        echo "  git push origin main --tags"
        echo "  pnpm release"
        ;;
    3)
        print_step "Full release process..."
        
        # Run tests first
        print_step "Running tests..."
        if ! pnpm test:run; then
            print_error "Tests failed! Please fix tests before releasing."
            exit 1
        fi
        print_success "Tests passed"
        
        # Build everything
        print_step "Building packages..."
        if ! pnpm build; then
            print_error "Build failed! Please fix build issues before releasing."
            exit 1
        fi
        print_success "Build completed"
        
        # Apply version changes
        print_step "Applying version changes..."
        pnpm changeset version
        
        # Show new version
        local new_version=$(node -p "require('./package.json').version")
        print_success "Version updated to: $new_version"
        
        # Commit the version changes
        print_step "Committing version changes..."
        git add .
        git commit -m "chore: release v$new_version" || true
        
        # Create git tag
        git tag "v$new_version"
        print_success "Created git tag: v$new_version"
        
        # Push changes
        print_step "Pushing changes to remote..."
        git push origin "$current_branch" --tags
        
        # Publish packages
        print_step "Publishing packages..."
        print_warning "Note: Publishing to npm requires authentication and npm access"
        read -p "Continue with npm publish? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pnpm release
            print_success "Packages published!"
        else
            print_warning "Skipped publishing. To publish later, run: pnpm release"
        fi
        ;;
    4)
        print_step "Creating a new changeset..."
        pnpm changeset
        print_success "Changeset created. Run this script again to create a release."
        ;;
    5)
        print_step "Release cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo
print_success "Release process completed!"
