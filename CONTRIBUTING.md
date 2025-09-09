# Contributing to FARM Framework

Thank you for your interest in contributing to FARM Framework! We welcome contributions from the community and are grateful for your help in making FARM better.

## 🤝 How to Contribute

### Reporting Issues

- **Bug Reports**: Use the [GitHub Issues](https://github.com/farm-stack/framework/issues) with the `bug` label
- **Feature Requests**: Use the [GitHub Issues](https://github.com/farm-stack/framework/issues) with the `enhancement` label
- **Documentation Issues**: Use the [GitHub Issues](https://github.com/farm-stack/framework/issues) with the `documentation` label

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Documentation Contributions

- **Improve existing docs**: Fix typos, clarify explanations, add examples
- **Add new guides**: Create comprehensive how-to guides
- **Update examples**: Keep examples current and working
- **Translate docs**: Help make FARM accessible in other languages

## 🛠️ Development Setup

### Prerequisites

- **Node.js 18+**
- **Python 3.8+**
- **Git**
- **Docker** (optional, for database containers)

### Getting Started

1. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/framework.git
   cd framework
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the project**:
   ```bash
   pnpm build
   ```

4. **Run tests**:
   ```bash
   pnpm test
   ```

### Development Workflow

1. **Create a new branch** for your changes
2. **Make your changes** in the appropriate package
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Run the full test suite** before submitting

## 📝 Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Follow ESLint rules** - run `pnpm lint` to check
- **Use Prettier** for code formatting
- **Write meaningful variable names**
- **Add JSDoc comments** for public APIs
- **Use strict type checking** - no `any` types

### Python

- **Follow PEP 8** style guidelines
- **Use type hints** for all function parameters and return values
- **Write docstrings** for all functions and classes
- **Use meaningful variable names**
- **Keep functions small and focused**

### General

- **Write tests** for new functionality
- **Keep commits atomic** - one logical change per commit
- **Write clear commit messages** following conventional commits
- **Update documentation** when adding new features
- **Consider backward compatibility**

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter @farm/cli

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- **Unit tests** for individual functions and components
- **Integration tests** for package interactions
- **End-to-end tests** for complete workflows
- **Template tests** for template generation
- **Aim for high test coverage** (80%+)

## 📚 Documentation Standards

### Writing Guidelines

- **Use clear, concise language**
- **Provide code examples** for all features
- **Include prerequisites** and setup instructions
- **Test all examples** to ensure they work
- **Use consistent formatting** and structure
- **Link to related documentation**

### Documentation Structure

- **README.md**: Package overview and quick start
- **API.md**: API reference and examples
- **CHANGELOG.md**: Version history and changes
- **Examples/**: Working code examples
- **Guides/**: Comprehensive how-to guides

## 🔄 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version numbers** in package.json files
2. **Update CHANGELOG.md** with new features and fixes
3. **Run full test suite** to ensure everything works
4. **Build all packages** to verify build process
5. **Create release tag** and push to GitHub
6. **Publish packages** to npm registry

## 🏗️ Architecture Guidelines

### Package Design

- **Single responsibility**: Each package should have one clear purpose
- **Minimal dependencies**: Keep dependencies to a minimum
- **Clear interfaces**: Well-defined APIs between packages
- **Extensibility**: Design for future growth and customization

### Template System

- **Inheritance-based**: Templates inherit from base template
- **Minimal additions**: Only add template-specific dependencies
- **Validation**: All templates must pass validation
- **Documentation**: Each template needs comprehensive docs

## 🐛 Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Node.js version, etc.)
- **Error messages** and stack traces
- **Minimal reproduction case** if possible

## 💡 Feature Requests

When requesting features, please include:

- **Clear description** of the feature
- **Use case** and motivation
- **Proposed implementation** (if you have ideas)
- **Alternative solutions** you've considered
- **Additional context** that might be helpful

## 🎯 Areas for Contribution

### High Priority

- **Documentation improvements** - Better guides and examples
- **Template enhancements** - New templates and features
- **AI provider integrations** - Support for more AI providers
- **Performance optimizations** - Faster builds and runtime
- **Testing improvements** - Better test coverage and quality

### Medium Priority

- **UI component library** - More reusable components
- **Deployment integrations** - Support for more platforms
- **Monitoring and observability** - Better debugging tools
- **Developer experience** - Improved CLI and tooling
- **Internationalization** - Multi-language support

### Low Priority

- **Advanced features** - Complex integrations and customizations
- **Legacy support** - Support for older versions
- **Experimental features** - Cutting-edge capabilities
- **Community tools** - Tools for contributors and maintainers

## 📞 Getting Help

### Community

- **GitHub Discussions**: [Community discussions](https://github.com/farm-stack/framework/discussions)
- **GitHub Issues**: [Bug reports and feature requests](https://github.com/farm-stack/framework/issues)
- **Discord**: [Real-time chat](https://discord.gg/farm-framework) (if available)

### Maintainers

- **Core Team**: @farm-stack/core-team
- **Documentation**: @farm-stack/docs-team
- **Templates**: @farm-stack/templates-team

## 📄 License

By contributing to FARM Framework, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Community highlights** in discussions

---

**Thank you for contributing to FARM Framework!** Your contributions help make AI development more accessible and enjoyable for everyone.