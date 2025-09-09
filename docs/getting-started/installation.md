# Installation

This guide will help you install FARM Framework and set up your development environment.

## 📋 Prerequisites

Before installing FARM Framework, ensure you have the following installed:

### Required Software

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **Python 3.8+** - [Download from python.org](https://www.python.org/downloads/)
- **Git** - [Download from git-scm.com](https://git-scm.com/downloads)

### Optional Software

- **Docker** - [Download from docker.com](https://www.docker.com/get-started) (for database containers)
- **pnpm** - [Install with npm](https://pnpm.io/installation) (recommended package manager)

## 🚀 Install FARM Framework

### Option 1: Global Installation (Recommended)

Install FARM Framework globally using npm:

```bash
npm install -g @farm/cli
```

### Option 2: Using pnpm

If you prefer pnpm:

```bash
pnpm add -g @farm/cli
```

### Option 3: Using Yarn

If you prefer Yarn:

```bash
yarn global add @farm/cli
```

## ✅ Verify Installation

Verify that FARM Framework is installed correctly:

```bash
farm --version
```

You should see output similar to:

```
farm-framework 1.5.0
```

## 🐍 Python Setup

FARM Framework uses Python for the backend. Ensure Python is properly configured:

### Check Python Version

```bash
python --version
# or
python3 --version
```

You should see Python 3.8 or higher.

### Install Python Dependencies

FARM Framework will automatically install Python dependencies when you create a project, but you can also install them manually:

```bash
pip install fastapi uvicorn python-multipart
```

## 🐳 Docker Setup (Optional)

Docker is optional but recommended for database containers and consistent development environments.

### Install Docker

- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/install/)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/mac/install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### Verify Docker Installation

```bash
docker --version
docker-compose --version
```

## 🔧 Development Tools (Optional)

### VS Code Extensions

Recommended VS Code extensions for FARM development:

- **Python** - Python language support
- **TypeScript and JavaScript Language Features** - TypeScript support
- **Tailwind CSS IntelliSense** - Tailwind CSS support
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting

### Other Editors

FARM Framework works with any editor, but VS Code provides the best experience with the recommended extensions.

## 🚨 Troubleshooting

### Common Installation Issues

#### Node.js Version Issues

If you encounter Node.js version issues:

```bash
# Check your Node.js version
node --version

# If you need to update Node.js, use nvm (Node Version Manager)
# Install nvm first, then:
nvm install 18
nvm use 18
```

#### Python Path Issues

If Python is not found:

```bash
# Check if Python is in your PATH
which python
which python3

# Add Python to your PATH if needed
export PATH="/usr/local/bin/python3:$PATH"
```

#### Permission Issues

If you encounter permission issues with global installation:

```bash
# Use sudo (Linux/macOS)
sudo npm install -g @farm/cli

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### Docker Issues

If Docker is not working:

```bash
# Start Docker service
sudo systemctl start docker  # Linux
# or start Docker Desktop application

# Verify Docker is running
docker run hello-world
```

### Getting Help

If you're still having issues:

1. **Check the [Troubleshooting Guide](../troubleshooting/installation-issues.md)**
2. **Search [GitHub Issues](https://github.com/farm-stack/framework/issues)**
3. **Ask in [GitHub Discussions](https://github.com/farm-stack/framework/discussions)**

## ✅ Next Steps

Once you have FARM Framework installed:

1. **[Create Your First Project](first-project.md)** - Build your first AI application
2. **[Understanding FARM](understanding-farm.md)** - Learn the core concepts
3. **[Examples](examples/)** - Explore example applications

## 🔄 Updating FARM Framework

To update FARM Framework to the latest version:

```bash
npm update -g @farm/cli
```

Or if using pnpm:

```bash
pnpm update -g @farm/cli
```

---

**Installation complete!** Ready to create your first project? Let's move on to [Creating Your First Project](first-project.md).