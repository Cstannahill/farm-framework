# CLI Command Structure & Flow

## Overview

The FARM CLI follows the Next.js model of comprehensive argument support with intelligent prompting - respecting both "quick start" developers and "I know exactly what I want" developers.

---

## `farm create` Command

### Command Syntax
```bash
farm create <project-name> [options]
```

### Core Arguments & Options

#### Templates (`--template`, `-t`)
```bash
--template basic          # Simple React + FastAPI + MongoDB
--template ai-chat        # Chat app with streaming AI responses
--template ai-dashboard   # Data dashboard with ML insights  
--template ecommerce      # E-commerce platform with payments
--template cms            # Content management system
--template api-only       # FastAPI backend only (no React)
--template custom         # Custom template from URL/path
```

#### Features (`--features`, `-f`)
```bash
--features auth                    # Single feature
--features auth,ai,realtime        # Multiple features
--no-features                      # Disable all optional features

# Available features:
# - auth: JWT authentication + user management
# - ai: AI/ML model serving + inference endpoints
# - realtime: WebSocket support + real-time features
# - payments: Stripe/PayPal integration
# - email: Email service integration
# - storage: File upload + cloud storage
# - search: Full-text search with MongoDB/Elasticsearch
# - analytics: User analytics and tracking
```

#### Database (`--database`, `-d`)
```bash
--database mongodb        # MongoDB (default)
--database postgresql     # PostgreSQL with SQLAlchemy
--database mysql          # MySQL with SQLAlchemy  
--database sqlite         # SQLite for development
```

#### Development Options
```bash
--typescript              # Enable TypeScript (default: true)
--no-typescript          # Use JavaScript instead
--docker                 # Include Docker setup (default: true)
--no-docker              # Skip Docker configuration
--testing                # Include test setup (default: true)
--no-testing             # Skip testing configuration
```

#### Setup Options
```bash
--git                     # Initialize git repo (default: true)
--no-git                 # Skip git initialization
--install                # Install dependencies (default: true)
--no-install             # Skip dependency installation
--interactive            # Force interactive mode
--no-interactive         # Skip all prompts (use defaults/args only)
```

---

## Interactive Prompt Flow

**When `farm create my-app` is run without arguments:**

```
🌾 Welcome to FARM Stack Framework!

? What template would you like to use?
  ❯ Basic Web App
    AI Chat Application  
    AI Dashboard
    E-commerce Platform
    Content Management System
    API Only (Backend)
    Custom Template

? Which features would you like to enable? (Press <space> to select)
  ✓ Authentication & User Management
  ✓ AI/ML Integration
  ○ Real-time Features (WebSocket)
  ○ Payment Processing
  ○ Email Service
  ○ File Storage
  ○ Full-text Search
  ○ Analytics

? Which database would you like to use?
  ❯ MongoDB (Recommended)
    PostgreSQL
    MySQL
    SQLite

? Additional setup options:
  ✓ TypeScript
  ✓ Docker configuration
  ✓ Testing setup
  ✓ Git repository
  ✓ Install dependencies
```

---

## Smart Prompting Logic

**Example scenarios:**

```bash
# Scenario 1: Template specified, prompt for features
farm create my-app --template ai-chat
# → Prompts for features, database, setup options

# Scenario 2: Template + some features, prompt for remaining
farm create my-app --template ai-chat --features auth,ai
# → Prompts for database, setup options (skips feature selection)

# Scenario 3: Almost everything specified
farm create my-app --template ai-chat --features auth,ai --database mongodb
# → Only prompts for setup options (TypeScript, Docker, etc.)

# Scenario 4: Completely specified
farm create my-app --template ai-chat --features auth,ai --database mongodb --typescript --docker --no-interactive
# → No prompts, creates project immediately
```

---

## Command Examples

```bash
# Quick start - interactive for everything
farm create my-ai-app

# Specific template with prompts for rest
farm create my-ai-app --template ai-chat

# Power user - exactly what they want
farm create my-ai-app \
  --template ai-chat \
  --features auth,ai,realtime \
  --database mongodb \
  --typescript \
  --docker \
  --no-interactive

# Backend only project
farm create my-api --template api-only --features auth,ai --database postgresql

# Custom template from GitHub
farm create my-app --template https://github.com/user/farm-template-custom
```

---

## Additional CLI Commands (Future Planning)

### Development Commands
```bash
farm dev [--frontend-only] [--backend-only] [--port <port>]
farm dev --watch [--verbose]
```

### Code Generation Commands
```bash
farm generate model <name> [--fields <fields>]
farm generate route <name> [--methods <methods>]
farm generate page <name> [--crud]
farm generate component <name>
```

### Database Commands
```bash
farm db migrate [--create] [--upgrade] [--downgrade]
farm db seed [--file <file>]
farm db studio
```

### AI/ML Commands
```bash
farm ml serve <model> [--port <port>]
farm ml train <script> [--gpu]
farm ml deploy <model> [--platform <platform>]
```

### Build & Deployment Commands
```bash
farm build [--production] [--analyze]
farm deploy [--platform <platform>] [--config <config>]
farm docker build [--tag <tag>]
```

---

*Status: ✅ Completed - Ready for implementation*