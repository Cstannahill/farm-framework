# Creating Your First Project

This guide will walk you through creating your first AI-powered application with FARM Framework.

## 🎯 What We'll Build

We'll create a simple AI chat application that demonstrates:
- Full-stack TypeScript/React frontend
- FastAPI Python backend
- Local AI integration with Ollama
- Real-time streaming responses
- Type-safe API communication

## 🚀 Step 1: Create the Project

Use the FARM CLI to create a new project:

```bash
farm create my-first-ai-app --template ai-chat
```

This command will:
- Create a new directory called `my-first-ai-app`
- Generate a complete full-stack application
- Set up the project structure with frontend and backend
- Configure AI integration with Ollama

## 📁 Project Structure

Your new project will have this structure:

```
my-first-ai-app/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API services
│   │   │   └── types/          # TypeScript types
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                    # FastAPI backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── models/         # Data models
│       │   ├── ai/             # AI integration
│       │   └── main.py         # FastAPI app
│       └── requirements.txt
├── farm.config.ts              # FARM configuration
├── docker-compose.yml          # Development environment
└── README.md                   # Project documentation
```

## 🐳 Step 2: Set Up Development Environment

Navigate to your project directory:

```bash
cd my-first-ai-app
```

Start the development environment:

```bash
farm dev
```

This command will:
- Start the FastAPI backend server
- Start the React frontend development server
- Set up database containers (if needed)
- Initialize AI providers

## 🤖 Step 3: Set Up AI (Ollama)

FARM Framework uses Ollama for local AI models. Install and set up Ollama:

### Install Ollama

- **macOS**: `brew install ollama`
- **Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`
- **Windows**: Download from [ollama.ai](https://ollama.ai)

### Pull an AI Model

```bash
# Pull a small, fast model for development
ollama pull llama3.2:3b

# Or pull a larger model for better responses
ollama pull llama3.2:8b
```

### Verify Ollama is Running

```bash
# Check if Ollama is running
ollama list

# Test the model
ollama run llama3.2:3b "Hello, how are you?"
```

## 🌐 Step 4: Access Your Application

Once `farm dev` is running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 💬 Step 5: Test the AI Chat

1. Open http://localhost:3000 in your browser
2. You should see the AI chat interface
3. Type a message and press Enter
4. Watch as the AI responds in real-time

## 🔧 Step 6: Explore the Code

### Frontend (React)

The frontend is built with React and TypeScript:

```typescript
// apps/web/src/components/ai/ChatInterface.tsx
import React from 'react';
import { useStreamingChat } from '../../hooks/ai';

export function ChatInterface() {
  const { messages, sendMessage, isLoading } = useStreamingChat();
  
  return (
    <div className="chat-container">
      {/* Chat UI implementation */}
    </div>
  );
}
```

### Backend (FastAPI)

The backend provides AI endpoints:

```python
# apps/api/src/routes/ai.py
from fastapi import APIRouter
from ..ai.router import ai_router

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(message: str):
    response = await ai_router.generate_response(message)
    return {"response": response}
```

### AI Integration

The AI integration handles model communication:

```python
# apps/api/src/ai/providers/ollama.py
class OllamaProvider:
    async def generate_response(self, prompt: str):
        # Stream response from Ollama
        async for chunk in self.client.generate(prompt):
            yield chunk
```

## 🎨 Step 7: Customize Your App

### Change the AI Model

Edit `farm.config.ts` to use a different model:

```typescript
export default defineConfig({
  ai: {
    providers: {
      ollama: {
        model: "llama3.2:8b", // Change to your preferred model
      },
    },
  },
});
```

### Add Custom Styling

The app uses Tailwind CSS. Modify styles in:

```typescript
// apps/web/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add your custom styles here */
```

### Extend the API

Add new endpoints in the backend:

```python
# apps/api/src/routes/custom.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/custom-endpoint")
async def custom_endpoint():
    return {"message": "Hello from custom endpoint!"}
```

## 🚀 Step 8: Build for Production

When you're ready to deploy:

```bash
# Build the application
farm build

# Start production server
farm start
```

## 🎯 What You've Learned

Congratulations! You've successfully:

1. ✅ Created a full-stack AI application
2. ✅ Set up local AI integration with Ollama
3. ✅ Built a real-time chat interface
4. ✅ Connected React frontend to FastAPI backend
5. ✅ Used type-safe API communication
6. ✅ Customized the application

## 🔄 Next Steps

Now that you have your first project running:

1. **[Understanding FARM](understanding-farm.md)** - Learn the core concepts
2. **[Template Guide](guides/templates/ai-chat.md)** - Deep dive into the AI chat template
3. **[Examples](examples/)** - Explore more example applications
4. **[Guides](guides/README.md)** - Comprehensive how-to guides

## 🛠️ Troubleshooting

### Common Issues

#### Ollama Not Found
```bash
# Make sure Ollama is running
ollama serve

# Check if the model is available
ollama list
```

#### Port Already in Use
```bash
# Kill processes using the ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

#### AI Responses Not Working
- Check that Ollama is running: `ollama list`
- Verify the model is pulled: `ollama pull llama3.2:3b`
- Check the backend logs for errors

### Getting Help

- **[Troubleshooting Guide](../troubleshooting/README.md)** - Common issues and solutions
- **[GitHub Issues](https://github.com/farm-stack/framework/issues)** - Report bugs
- **[Discussions](https://github.com/farm-stack/framework/discussions)** - Community help

---

**Great job!** You've created your first AI application with FARM Framework. Ready to learn more? Check out [Understanding FARM](understanding-farm.md) to dive deeper into the framework's concepts.