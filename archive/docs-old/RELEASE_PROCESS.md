# FARM Framework Release Process

This document outlines the release process for FARM Framework, focusing on alpha releases and the path to beta.

## Release Scripts

### Quick Commands

```bash
# Create a changeset (describe what changed)
pnpm changeset

# Preview what would be released
pnpm changeset:status

# Run the interactive alpha release script
pnpm release:alpha

# Manual release process
pnpm changeset:version  # bump versions
pnpm release            # publish to npm
```

### Release Types

- **Alpha releases** (`0.1.0-alpha.1`, `0.1.0-alpha.2`): Early testing, breaking changes expected
- **Beta releases** (`0.1.0-beta.1`): Feature-complete, API stabilizing
- **Release candidates** (`1.0.0-rc.1`): Production-ready candidates
- **Stable releases** (`1.0.0`): Production-ready

## Alpha Release Checklist

Before cutting an alpha release, ensure:

### Core Functionality ✅
- [ ] All packages build successfully (`pnpm build`)
- [ ] All tests pass (`pnpm test:run`)
- [ ] Type-sync generates TypeScript from Python
- [ ] CLI commands work end-to-end
- [ ] Dev server starts and hot reloads
- [ ] At least one template can be scaffolded and run

### Quality Assurance
- [ ] No critical bugs in issue tracker
- [ ] Breaking changes are documented
- [ ] Dependencies are up to date
- [ ] Security vulnerabilities addressed

### Documentation
- [ ] README reflects current state
- [ ] Getting started guide works
- [ ] API changes documented
- [ ] Migration guide (if breaking changes)

### Release Mechanics
- [ ] Changesets created for all changes
- [ ] Version numbers follow semantic versioning
- [ ] Git tags are clean and pushed
- [ ] Packages published to npm (when ready)

## The Alpha → Beta Transition

From the provided criteria, FARM moves from alpha to beta when:

| Criteria | Status | Notes |
|----------|--------|-------|
| **Core feature-set frozen** | 🟡 In Progress | Type-sync ✅, CLI ✅, Dev-server ✅, Deploy recipes 🔄 |
| **Stability & test coverage** | 🟡 In Progress | Core tests ✅, Integration tests 🔄, Edge cases 🔄 |
| **Dogfooding success** | 🔴 Not Started | Need 1+ real hosted demo |
| **External feedback loop** | 🔴 Not Started | Need 5-10 external developers |
| **Upgrade experience proven** | 🔴 Not Started | Need 2+ alpha releases with migrations |
| **SemVer discipline** | 🟡 In Progress | Process ✅, Breaking changes tracking 🔄 |
| **Ecosystem hooks** | 🔴 Not Started | Plugin API needs design |
| **Docs & DX polish** | 🟡 In Progress | CLI errors 🔄, Install guide 🔄 |
| **Release automation** | 🟢 Complete | Changesets ✅, Scripts ✅ |

### Current Alpha Timeline

**Phase 1: Alpha 2** (Target: 2 weeks)
- ✅ Error handling & colorized CLI output
- ✅ Release automation setup
- 🔄 Deploy recipes completion
- 🔄 Integration test coverage

**Phase 2: Alpha 3** (Target: 4 weeks)
- 🔄 External dogfooding (invite 3-5 developers)
- 🔄 Real demo application deployment
- 🔄 Plugin API design
- 🔄 Documentation polish

**Phase 3: Beta 1** (Target: 6-8 weeks)
- 🔄 External feedback incorporation
- 🔄 API stabilization
- 🔄 Comprehensive documentation
- 🔄 Migration tooling

## Release Commands Reference

### Creating Changesets

```bash
# Interactive changeset creation
pnpm changeset

# Describe the changes:
# - What packages changed?
# - What type of change? (patch/minor/major)
# - What did you change?
```

### Version Management

```bash
# Preview changes without applying
pnpm changeset:status

# Apply version bumps (creates new package.json versions)
pnpm changeset:version

# Create snapshot versions for testing
pnpm release:snapshot
```

### Publishing

```bash
# Dry run (see what would be published)
pnpm release:dry-run

# Publish to npm
pnpm release

# Full interactive release process
pnpm release:alpha
```

### Git Workflow

```bash
# After version bumps
git add .
git commit -m "chore: release v0.1.0-alpha.2"
git tag "v0.1.0-alpha.2"
git push origin main --tags
```

## Troubleshooting

### Common Issues

**Build fails before release:**
```bash
pnpm clean
pnpm install
pnpm build
```

**Tests fail:**
```bash
# Run specific test suites
pnpm test:cli
pnpm test:integration
pnpm test:docker
```

**Version conflicts:**
```bash
# Reset and start over
git checkout main
git reset --hard origin/main
pnpm clean
pnpm install
```

### Emergency Procedures

**Revert a bad release:**
```bash
# Revert git tag
git tag -d v0.1.0-alpha.X
git push origin :refs/tags/v0.1.0-alpha.X

# Deprecate npm package
npm deprecate @farm-framework/package@version "Broken release, use X.X.X instead"
```

## Alpha Success Metrics

We'll know alpha is working when:

1. **Installation success rate > 90%** on fresh machines
2. **Zero critical bugs** open for > 48 hours
3. **At least 3 external projects** created and surviving > 1 week
4. **Documentation completion rate > 80%** for getting started guide
5. **CI/CD success rate > 95%** for all tests and builds

---

*Last updated: June 11, 2025*
