#!/bin/bash

# FARM Framework Pre-Release Health Check
# This script verifies that everything is ready for an alpha release

# Note: We don't use set -e here because we want to continue checking
# even if individual checks fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print colored output
print_check() {
    echo -e "${BLUE}🔍 Checking: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}  ✅ $1${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}  ❌ $1${NC}"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}  ℹ️  $1${NC}"
}

echo -e "${BLUE}🚀 FARM Framework Pre-Release Health Check${NC}"
echo "=============================================="
echo

# Check 1: Git status
print_check "Git working directory status"
if [[ -z $(git status --porcelain) ]]; then
    print_pass "Working directory is clean"
else
    print_fail "Working directory has uncommitted changes"
    git status --short
fi

# Check 2: Current branch
print_check "Git branch"
current_branch=$(git branch --show-current)
if [[ "$current_branch" == "main" ]]; then
    print_pass "On main branch"
else
    print_warn "Not on main branch (current: $current_branch)"
fi

# Check 3: Dependencies
print_check "Dependencies"
if pnpm install --frozen-lockfile > /dev/null 2>&1; then
    print_pass "Dependencies are up to date"
else
    print_fail "Dependencies need updating"
fi

# Check 4: TypeScript compilation
print_check "TypeScript compilation"
if pnpm build:ts > /dev/null 2>&1; then
    print_pass "TypeScript compilation successful"
else
    print_fail "TypeScript compilation failed"
fi

# Check 5: Full build
print_check "Full build process"
if pnpm build > /dev/null 2>&1; then
    print_pass "Full build successful"
else
    print_fail "Build process failed"
fi

# Check 6: Tests
print_check "Test suite"
if timeout 60 pnpm test:run > /dev/null 2>&1; then
    print_pass "All tests passing"
else
    print_fail "Some tests are failing"
    print_info "Run 'pnpm test' to see details"
fi

# Check 7: Linting
print_check "Code linting"
if pnpm lint > /dev/null 2>&1; then
    print_pass "No linting errors"
else
    print_warn "Linting issues found (not blocking)"
    print_info "Run 'pnpm lint:fix' to auto-fix"
fi

# Check 8: Package versions consistency
print_check "Package version consistency"
root_version=$(node -p "require('./package.json').version")
inconsistent_packages=()

for package_json in packages/*/package.json tools/*/package.json; do
    if [[ -f "$package_json" ]]; then
        pkg_version=$(node -p "require('./$package_json').version" 2>/dev/null || echo "")
        pkg_name=$(node -p "require('./$package_json').name" 2>/dev/null || echo "")
        
        if [[ -n "$pkg_version" && "$pkg_version" != "$root_version" ]]; then
            inconsistent_packages+=("$pkg_name: $pkg_version")
        fi
    fi
done

if [[ ${#inconsistent_packages[@]} -eq 0 ]]; then
    print_pass "All packages have consistent versions ($root_version)"
else
    print_warn "Some packages have different versions:"
    for pkg in "${inconsistent_packages[@]}"; do
        print_info "  $pkg"
    done
fi

# Check 9: Changeset status
print_check "Changesets"
if [[ -d ".changeset" ]] && [[ -n "$(find .changeset -name '*.md' -not -name 'README.md' 2>/dev/null)" ]]; then
    changeset_count=$(find .changeset -name '*.md' -not -name 'README.md' | wc -l)
    print_pass "$changeset_count changeset(s) ready"
else
    print_warn "No changesets found"
    print_info "Create changesets with: pnpm changeset"
fi

# Check 10: Documentation
print_check "Critical documentation"
if [[ -f "README.md" ]]; then
    print_pass "README.md exists"
else
    print_fail "README.md missing"
fi

if [[ -f "docs/RELEASE_PROCESS.md" ]]; then
    print_pass "Release process documented"
else
    print_fail "Release process documentation missing"
fi

# Check 11: CLI functionality
print_check "CLI basic functionality"
if [[ -f "packages/cli/dist/index.js" ]]; then
    print_pass "CLI build artifacts exist"
else
    print_fail "CLI build artifacts missing"
fi

# Check 12: Type-sync functionality  
print_check "Type-sync package"
if [[ -f "packages/type-sync/dist/index.js" ]]; then
    print_pass "Type-sync build artifacts exist"
else
    print_fail "Type-sync build artifacts missing"
fi

# Check 13: Templates
print_check "Template availability"
template_count=$(find templates -name "package.json.hbs" -o -name "package.json" 2>/dev/null | wc -l)
if [[ $template_count -gt 0 ]]; then
    print_pass "$template_count template(s) available"
else
    print_warn "No templates found"
fi

echo
echo "=============================================="
echo -e "${BLUE}📊 Health Check Summary${NC}"
echo "=============================================="
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"  
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"

echo
if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 Ready for release!${NC}"
    echo
    echo "Next steps:"
    echo "1. Create changeset: pnpm changeset"
    echo "2. Run release: pnpm release:alpha"
    exit 0
else
    echo -e "${RED}🚫 Not ready for release${NC}"
    echo
    echo "Please fix the failed checks before releasing."
    exit 1
fi
