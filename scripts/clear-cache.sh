#!/bin/bash
# Clear FARM framework cache

set -e

CACHE_DIR=".farm/cache"
GENERATED_DIR="generated"

echo "🧹 Clearing FARM framework cache..."

# Remove cache directory
if [ -d "$CACHE_DIR" ]; then
    echo "  • Removing $CACHE_DIR"
    rm -rf "$CACHE_DIR"
else
    echo "  • Cache directory $CACHE_DIR does not exist"
fi

# Remove generated directory
if [ -d "$GENERATED_DIR" ]; then
    echo "  • Removing $GENERATED_DIR"
    rm -rf "$GENERATED_DIR"
else
    echo "  • Generated directory $GENERATED_DIR does not exist"
fi

# Remove any test-specific cache directories
echo "  • Cleaning test cache directories..."
find . -name ".farm" -type d -path "*/test*" -exec rm -rf {} + 2>/dev/null || true
find . -name "generated" -type d -path "*/test*" -exec rm -rf {} + 2>/dev/null || true

# Remove any temporary directories created by tests
echo "  • Cleaning temporary test directories..."
find . -name "tmp*" -type d -path "*/testing/*" -exec rm -rf {} + 2>/dev/null || true

echo "✅ Cache cleared successfully!"
echo ""
echo "Next steps:"
echo "  • Run tests: npm test"
echo "  • Or generate fresh types: farm types:sync"
