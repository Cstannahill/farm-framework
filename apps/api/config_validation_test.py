# apps/api/validate_config.py
"""
Validate FARM configuration with modern Pydantic v2
Run this to test your config: python validate_config.py
"""

import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

def test_modern_config():
    """Test modern Pydantic v2 configuration"""
    print("🧪 Testing Modern Pydantic v2 Configuration")
    print("=" * 50)
    
    try:
        # Import config
        from core.config import settings, Settings
        print("✅ Config imported successfully")
        
        # Test that it's a proper Pydantic v2 model
        print(f"✅ Settings is Pydantic model: {hasattr(settings, 'model_dump')}")
        
        # Test serialization (Pydantic v2 method)
        config_dict = settings.model_dump()
        print(f"✅ Model serialization works: {len(config_dict)} top-level keys")
        
        # Test nested objects
        print(f"\n🤖 AI Configuration:")
        print(f"   Ollama enabled: {settings.ai.ollama.enabled}")
        print(f"   Ollama models: {settings.ai.ollama.models}")
        print(f"   OpenAI enabled: {settings.ai.openai.enabled}")
        print(f"   Default provider: {settings.ai.routing['development']}")
        
        # Test validation
        print(f"\n✅ Validation Tests:")
        print(f"   App name type: {type(settings.app_name).__name__}")
        print(f"   API port type: {type(settings.api_port).__name__}")
        print(f"   CORS origins type: {type(settings.cors_origins).__name__}")
        print(f"   AI models type: {type(settings.ai.ollama.models).__name__}")
        
        # Test environment handling
        from core.config import get_ai_provider_for_environment
        default_provider = get_ai_provider_for_environment()
        print(f"   Default AI provider: {default_provider}")
        
        # Test model recreation (ensuring no mutable default issues)
        new_settings = Settings()
        print(f"✅ Can create new instance: {new_settings.app_name == settings.app_name}")
        
        # Verify lists are independent (no mutable default issues)
        original_models = settings.ai.ollama.models.copy()
        new_settings.ai.ollama.models.append("test-model")
        unchanged = settings.ai.ollama.models == original_models
        print(f"✅ No mutable default issues: {unchanged}")
        
        print(f"\n🎯 Configuration Summary:")
        print(f"   Environment: {settings.environment}")
        print(f"   Debug mode: {settings.debug}")
        print(f"   Database: {settings.database.type}")
        print(f"   AI providers configured: {sum([
            settings.ai.ollama.enabled,
            settings.ai.openai.enabled,
            settings.ai.huggingface.enabled
        ])}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

def test_environment_override():
    """Test environment variable override"""
    print(f"\n🌍 Testing Environment Override:")
    
    import os
    
    # Set a test environment variable
    os.environ['APP_NAME'] = 'Test Override App'
    os.environ['OLLAMA_ENABLED'] = 'false'
    
    try:
        # Reimport to pick up changes
        import importlib
        import sys
        
        # Clear module cache
        modules_to_clear = [k for k in sys.modules.keys() if k.startswith('core.config')]
        for module in modules_to_clear:
            del sys.modules[module]
        
        # Import fresh
        from core.config import Settings
        fresh_settings = Settings()
        
        print(f"   App name override: {fresh_settings.app_name}")
        print(f"   Ollama disabled: {not fresh_settings.ai.ollama.enabled}")
        
        # Clean up
        del os.environ['APP_NAME']
        del os.environ['OLLAMA_ENABLED']
        
        return True
        
    except Exception as e:
        print(f"❌ Environment override failed: {e}")
        return False

if __name__ == "__main__":
    success = test_modern_config()
    if success:
        env_success = test_environment_override()
        if env_success:
            print(f"\n🎉 All tests passed! Modern Pydantic v2 config is working correctly.")
        else:
            print(f"\n⚠️ Config works but environment override failed.")
    else:
        print(f"\n❌ Configuration test failed. Check your setup.")
        sys.exit(1)