# Bundled Ruff Binaries

This directory contains platform-specific Ruff binaries that are bundled with the FARM CLI to provide Python formatting without requiring users to install Python or Ruff separately.

## Directory Structure

```
bin/
├── win32-x64/     # Windows x64
│   └── ruff.exe
├── linux-x64/     # Linux x64
│   └── ruff
├── darwin-x64/    # macOS Intel
│   └── ruff
└── darwin-arm64/  # macOS Apple Silicon
    └── ruff
```

## How to Add Ruff Binaries

1. **Download Ruff releases** from: https://github.com/astral-sh/ruff/releases

2. **Extract and copy binaries** to the appropriate platform directories:

   - Windows x64: `ruff.exe` → `win32-x64/ruff.exe`
   - Linux x64: `ruff` → `linux-x64/ruff`
   - macOS Intel: `ruff` → `darwin-x64/ruff`
   - macOS Apple Silicon: `ruff` → `darwin-arm64/ruff`

3. **Make binaries executable** (Linux/macOS):

   ```bash
   chmod +x bin/linux-x64/ruff
   chmod +x bin/darwin-x64/ruff
   chmod +x bin/darwin-arm64/ruff
   ```

4. **Update package.json** to include bin directory in `files` array:
   ```json
   {
     "files": ["dist", "bin"]
   }
   ```

## Version Compatibility

- Recommend using Ruff v0.4.6 or later for stability
- All platforms should use the same Ruff version for consistency
- Update all binaries together when upgrading Ruff version

## Fallback Behavior

If bundled binaries are not available or fail to execute, the formatter will:

1. Try system-installed `ruff` command
2. Fall back to `python -m black` if available
3. Skip Python formatting with a warning if neither is available

## File Size Considerations

Ruff binaries are approximately:

- Windows: ~8-10 MB
- Linux: ~8-10 MB
- macOS: ~8-10 MB each (Intel + ARM)

Total addition to package: ~35-40 MB

This is acceptable for a CLI tool that eliminates the need for users to install and configure Python formatting tools.
