#!/bin/bash
# scripts/download-ruff-binaries.sh
# Download Ruff binaries for all supported platforms

set -e

RUFF_VERSION="0.11.13"

# Get the directory of this script and find the repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_DIR="${REPO_ROOT}/packages/cli/bin"

echo "📦 Downloading Ruff v${RUFF_VERSION} binaries..."
echo "📁 Repository root: ${REPO_ROOT}"
echo "📁 Binary directory: ${BIN_DIR}"

# Create platform directories
mkdir -p "${BIN_DIR}/win32-x64"
mkdir -p "${BIN_DIR}/linux-x64" 
mkdir -p "${BIN_DIR}/darwin-x64"
mkdir -p "${BIN_DIR}/darwin-arm64"

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: ${TEMP_DIR}"

# Download Windows x64
echo "🪟 Downloading Windows x64..."
curl -L -o "${TEMP_DIR}/ruff-win.zip" "https://github.com/astral-sh/ruff/releases/download/${RUFF_VERSION}/ruff-x86_64-pc-windows-msvc.zip"
unzip -j "${TEMP_DIR}/ruff-win.zip" "ruff.exe" -d "${BIN_DIR}/win32-x64/"

# Download Linux x64
echo "🐧 Downloading Linux x64..."
curl -L -o "${TEMP_DIR}/ruff-linux.tar.gz" "https://github.com/astral-sh/ruff/releases/download/${RUFF_VERSION}/ruff-x86_64-unknown-linux-gnu.tar.gz"
tar -xzf "${TEMP_DIR}/ruff-linux.tar.gz" -C "${TEMP_DIR}/"
mv "${TEMP_DIR}/ruff-x86_64-unknown-linux-gnu/ruff" "${BIN_DIR}/linux-x64/ruff"

# Download macOS Intel
echo "🍎 Downloading macOS Intel..."
curl -L -o "${TEMP_DIR}/ruff-macos-intel.tar.gz" "https://github.com/astral-sh/ruff/releases/download/${RUFF_VERSION}/ruff-x86_64-apple-darwin.tar.gz"
tar -xzf "${TEMP_DIR}/ruff-macos-intel.tar.gz" -C "${TEMP_DIR}/"
mv "${TEMP_DIR}/ruff-x86_64-apple-darwin/ruff" "${BIN_DIR}/darwin-x64/ruff"

# Download macOS Apple Silicon
echo "🍎 Downloading macOS Apple Silicon..."
curl -L -o "${TEMP_DIR}/ruff-macos-arm.tar.gz" "https://github.com/astral-sh/ruff/releases/download/${RUFF_VERSION}/ruff-aarch64-apple-darwin.tar.gz"
tar -xzf "${TEMP_DIR}/ruff-macos-arm.tar.gz" -C "${TEMP_DIR}/"
mv "${TEMP_DIR}/ruff-aarch64-apple-darwin/ruff" "${BIN_DIR}/darwin-arm64/ruff"

# Make binaries executable
chmod +x "${BIN_DIR}/linux-x64/ruff"
chmod +x "${BIN_DIR}/darwin-x64/ruff"
chmod +x "${BIN_DIR}/darwin-arm64/ruff"

# Clean up temporary files
rm -rf "${TEMP_DIR}"

echo "✅ Ruff binaries downloaded successfully!"
echo "📁 Binaries location: ${BIN_DIR}/"
echo ""
echo "📊 Binary sizes:"
ls -lh "${BIN_DIR}"/*/* | awk '{print $5, $9}'
