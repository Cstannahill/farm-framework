# apps/api/diagnose_config.py
"""
FARM Config Diagnostic Tool
Run this to diagnose configuration issues
"""

import os
import sys
from pathlib import Path

def diagnose_config():
    """Diagnose configuration issues"""
    print("🔍 FARM Configuration Diagnostics")
    print("=" * 50)
    
    # Check current directory
    current_dir = Path.cwd()
    print(f"📍 Current directory: {current_dir}")
    
    # Check if we're in the right place
    api_src = current_dir / "apps" / "api" / "src"
    if not api_src.exists():
        print("❌ Not in project root. Please run from project root directory.")
        return
    
    print(f"✅ Found API source: {api_src}")
    
    # Check for config files
    config_locations = [
        api_src / "config.py",
        api_src / "core" / "config.py"
    ]
    
    print("\n🔧 Checking config file locations:")
    config_found = False
    for config_path in config_locations:
        if config_path.exists():
            print(f"✅ Found: {config_path}")
            config_found = True
            
            # Try to import and check content
            try:
                sys.path.insert(0, str(config_path.parent))
                import config
                
                if hasattr(config, 'settings'):
                    print(f"   ✅ Has 'settings' object")
                    
                    if hasattr(config.settings, 'ai'):
                        print(f"   ✅ Has AI configuration")
                    else:
                        print(f"   ❌ Missing AI configuration")
                        
                else:
                    print(f"   ❌ Missing 'settings' object")
                    
            except Exception as e:
                print(f"   ❌ Import error: {e}")
            finally:
                if 'config' in sys.modules:
                    del sys.modules['config']
                sys.path.pop(0)
        else:
            print(f"❌ Not found: {config_path}")
    
    if not config_found:
        print("\n⚠️ No config file found!")
        print("💡 Solution: Create config.py using one of the provided templates")
    
    # Check for AI router
    print("\n🤖 Checking AI router:")
    ai_router_path = api_src / "ai" / "router.py"
    if ai_router_path.exists():
        print(f"✅ Found: {ai_router_path}")
        
        # Check imports in router
        try:
            with open(ai_router_path, 'r') as f:
                content = f.read()
                
            if "from ..config import" in content:
                print("   ✅ Expects config at src/config.py")
            elif "from ..core.config import" in content:
                print("   ✅ Expects config at src/core/config.py")
            else:
                print("   ❌ No clear config import found")
                
        except Exception as e:
            print(f"   ❌ Error reading router: {e}")
    else:
        print(f"❌ Not found: {ai_router_path}")
    
    # Check for main.py
    print("\n🚀 Checking main.py:")
    main_path = api_src / "main.py"
    if main_path.exists():
        print(f"✅ Found: {main_path}")
    else:
        print(f"❌ Not found: {main_path}")
    
    # Check for dependencies
    print("\n📦 Checking dependencies:")
    requirements_path = current_dir / "apps" / "api" / "requirements.txt"
    if requirements_path.exists():
        print(f"✅ Found: {requirements_path}")
    else:
        print(f"❌ Not found: {requirements_path}")
    
    print("\n" + "=" * 50)
    print("🎯 RECOMMENDATIONS:")
    
    if not config_found:
        print("1. Create config.py using the provided template")
        print("2. Choose location: src/config.py OR src/core/config.py")
        print("3. Update AI router imports to match your choice")
    
    print("4. Install dependencies: pip install -r requirements.txt")
    print("5. Test with: python -m uvicorn src.main:app --reload")

if __name__ == "__main__":
    diagnose_config()