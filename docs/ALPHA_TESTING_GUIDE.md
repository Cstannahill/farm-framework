# FARM Framework Alpha Testing Guide

## 📦 Installation & Setup

The FARM Framework is now available on npm! Here's how to get started with the v1.0.0 release:

### Quick Start

```bash
# Install the CLI globally
npm install -g farm-framework

# Or use with npx (recommended for testing)
npx farm-framework --version
```

### Create Your First FARM App

```bash
# Create a new FARM application
npx farm-framework create my-farm-app

# Navigate to your app
cd my-farm-app

# Start development
npm run dev
```

## 🧪 What to Test

### Core CLI Functionality
- [ ] `farm create <app-name>` - Project creation
- [ ] `farm dev` - Development server
- [ ] `farm build` - Production build
- [ ] `farm type-sync` - Python ↔ TypeScript synchronization

### Template Testing
- [ ] **Basic Template**: Simple full-stack setup
- [ ] **AI Chat Template**: Chat application with AI integration
- [ ] **API Only Template**: Backend-only setup
- [ ] **Frontend Template**: React-only setup

### Type Synchronization
- [ ] Create Python models and sync to TypeScript
- [ ] Modify Python types and verify TypeScript updates
- [ ] Test complex data structures (nested objects, arrays)

### Development Experience
- [ ] Hot reloading works correctly
- [ ] Error messages are helpful and actionable
- [ ] Build process completes without issues
- [ ] Generated code is clean and readable

## 🐛 Known Issues

### Internal Packages (Deprecated)
These packages were accidentally published but are now deprecated:
- `@farm-framework/testing` ❌ Don't use
- `@farm-framework/template-validator` ❌ Don't use  
- `@farm-framework/dev-server` ❌ Don't use

**Use only the main CLI**: `farm-framework`

## 📝 Feedback Collection

### What We Need to Know

1. **Installation Issues**
   - Did global installation work?  
   - Any dependency conflicts?
   - Platform-specific problems?

2. **Template Quality**
   - Which templates worked well?
   - Missing features or broken functionality?
   - Documentation clarity?

3. **Type Sync Experience**
   - Did Python → TypeScript sync work?
   - Were generated types accurate?
   - Performance issues?

4. **Developer Experience** 
   - Were error messages helpful?
   - Was the CLI intuitive?
   - Missing commands or options?

### How to Report Issues

1. **GitHub Issues**: [farm-framework/farm-framework/issues](https://github.com/farm-framework/farm-framework/issues)
2. **Include**:
   - Your OS and Node.js version
   - Complete error messages
   - Steps to reproduce
   - Expected vs actual behavior

### Share Success Stories

- Post screenshots of working apps
- Share what you built with FARM
- Suggest improvements or new features

## 🎯 Alpha Goals

This v1.0.0 release focuses on:
- ✅ Core framework stability
- ✅ Template variety and quality  
- ✅ Type synchronization reliability
- ✅ Developer tooling completeness

**Your feedback will directly shape the beta release!**

## 📚 Resources

- **Documentation**: [GitHub Repository](https://github.com/farm-framework/farm-framework)
- **Examples**: Check `/examples` folder in the repo
- **Templates**: All available templates in `/templates` folder

---

**Thank you for testing FARM Framework Alpha!** 🙏

Your feedback is essential for making this the best full-stack framework for AI-powered applications.
