# apps/api/test_ai_models.py
"""
Test AI models and database integration
Run: python test_ai_models.py
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))


async def test_ai_models():
    """Test AI models and database integration"""
    print("🧪 Testing AI Models and Database Integration")
    print("=" * 60)

    try:
        # Test config import
        from core.config import settings

        print(f"✅ Config loaded: {settings.app_name}")

        # Test database connection
        from core.database import connect_to_database, init_models, seed_initial_data

        print("🔌 Connecting to database...")
        await connect_to_database()
        print("✅ Database connected")

        # Initialize models
        print("📋 Initializing models...")
        await init_models()
        print("✅ Models initialized")

        # Seed initial data
        print("🌱 Seeding initial data...")
        await seed_initial_data()
        print("✅ Initial data seeded")

        # Test model operations
        from models.ai import (
            AIModel,
            Conversation,
            get_available_models,
            create_conversation,
            add_message_to_conversation,
        )

        # List available models
        print("\n🤖 Available AI Models:")
        models = await get_available_models()
        for model in models:
            print(f"   • {model.provider}/{model.name} ({model.size}) - {model.status}")
            print(f"     Capabilities: {', '.join(model.capabilities)}")

        print(f"\n📊 Total models: {len(models)}")

        # Test conversation creation
        if models:
            test_model = models[0]
            print(
                f"\n💬 Testing conversation with {test_model.provider}/{test_model.name}"
            )

            conversation = await create_conversation(
                provider=test_model.provider,
                model=test_model.name,
                title="Test Conversation",
                system_prompt="You are a helpful AI assistant for testing.",
            )

            print(f"✅ Created conversation: {conversation.id}")

            # Add test messages
            await add_message_to_conversation(
                conversation.id, role="user", content="Hello, this is a test message!"
            )

            await add_message_to_conversation(
                conversation.id,
                role="assistant",
                content="Hello! I'm working correctly. This is a test response.",
            )

            print(f"✅ Added messages to conversation")
            print(
                f"   Message count: {conversation.message_count + 2}"
            )  # +2 for the new messages

            # Test model queries
            print(f"\n🔍 Testing model queries:")

            # Get Ollama models
            ollama_models = await get_available_models(provider="ollama")
            print(f"   Ollama models: {len(ollama_models)}")

            # Get OpenAI models
            openai_models = await get_available_models(provider="openai")
            print(f"   OpenAI models: {len(openai_models)}")

        # Test AI provider integration
        print(f"\n🔄 Testing AI router integration:")
        from ai.router import ai_router, check_ai_health

        print(f"   Default provider: {ai_router.default_provider}")
        print(f"   Available providers: {ai_router.get_available_providers()}")
        print(f"   Router configured: {ai_router.is_configured()}")

        # Test health check
        health = await check_ai_health()
        print(f"   Provider health: {health}")

        print(f"\n🎉 All AI model tests passed!")
        return True

    except Exception as e:
        print(f"❌ AI model test failed: {e}")
        import traceback

        traceback.print_exc()
        return False

    finally:
        # Clean up database connection
        try:
            from core.database import close_database_connection

            await close_database_connection()
            print("🔐 Database connection closed")
        except:
            pass


async def test_model_operations():
    """Test specific model operations"""
    print("\n🔧 Testing Model Operations")
    print("=" * 40)

    try:
        from models.ai import AIModel, log_ai_inference

        # Test logging an inference
        log_entry = await log_ai_inference(
            provider="ollama",
            model="llama3.1",
            request_type="chat",
            input_text="Test input for logging",
            output_text="Test output response",
            duration_ms=1500,
            success=True,
        )

        print(f"✅ Logged inference: {log_entry.id}")
        print(f"   Provider: {log_entry.provider_info.name}")
        print(f"   Model: {log_entry.provider_info.model}")
        print(f"   Duration: {log_entry.duration_ms}ms")
        print(f"   Success: {log_entry.success}")

        return True

    except Exception as e:
        print(f"❌ Model operations test failed: {e}")
        return False


if __name__ == "__main__":

    async def main():
        success1 = await test_ai_models()
        success2 = await test_model_operations()

        if success1 and success2:
            print(f"\n🎉 All tests passed! AI models are working correctly.")
        else:
            print(f"\n❌ Some tests failed. Check your setup.")
            sys.exit(1)

    asyncio.run(main())
