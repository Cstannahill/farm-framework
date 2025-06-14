# FARM Framework Monorepo Architecture Analysis & Recommendations

## 🏗️ **Current Structure Analysis**

### **✅ What Works Well (Keep These):**

1. **Root-Level Orchestration Files** - CORRECT ✅

   ```
   project-root/
   ├── package.json (workspace management)
   ├── tsconfig.json (root TypeScript config)
   ├── .env.example (shared environment template)
   ├── farm.config.ts (framework configuration)
   ├── pnpm-workspace.yaml (workspace definition)
   ├── docker-compose.yml (service orchestration)
   └── ...other shared configs
   ```

2. **Apps Separation** - CORRECT ✅

   ```
   apps/
   ├── web/ (React frontend)
   └── api/ (FastAPI backend)
   ```

3. **Language-Specific Dependency Management** - CORRECT ✅
   - `apps/api/requirements.txt` (Python dependencies)
   - `apps/web/package.json` (Frontend dependencies)

### **🔧 What Needs Improvement:**

## 📋 **Detailed Recommendations**

### **1. TypeScript Configuration Hierarchy**

**RECOMMENDED STRUCTURE:**

```
project-root/
├── tsconfig.json (base config, references)
└── apps/
    ├── web/
    │   ├── tsconfig.json (extends root, web-specific)
    │   └── package.json (frontend deps only)
    └── api/
        └── (Python files, no TypeScript)
```

**Benefits:**

- ✅ Type-safe imports between frontend modules
- ✅ Shared type definitions from root
- ✅ Optimized compilation with project references
- ✅ IDE intellisense across monorepo

### **2. Package.json Distribution**

**ROOT LEVEL (`package.json`):**

```json
{
  "workspaces": ["apps/*"],
  "dependencies": {
    // Framework packages
    "@farm-framework/core": "^0.1.0",
    "@farm-framework/types": "^0.1.0",
    "@farm-framework/api-client": "^0.1.0"
  },
  "devDependencies": {
    // Shared dev tools
    "typescript": "^5.8.3",
    "eslint": "^9.28.0",
    "prettier": "^3.5.3",
    "@farm-framework/dev-server": "workspace:*"
  },
  "scripts": {
    // Orchestration scripts
    "dev": "farm dev",
    "build": "farm build",
    "test": "vitest"
  }
}
```

**WEB LEVEL (`apps/web/package.json`):**

```json
{
  "name": "@project/web",
  "dependencies": {
    // Frontend-specific runtime
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    // Frontend build tools
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### **3. Environment Variables Strategy**

**RECOMMENDED APPROACH: Layered Environment Variables**

```
project-root/
├── .env.example (template for all)
├── .env (root level, gitignored)
├── apps/
│   ├── web/
│   │   ├── .env.local (web-specific overrides)
│   │   └── vite.config.ts (loads from root)
│   └── api/
│       ├── .env.local (api-specific overrides)
│       └── (Python loads from root)
```

**Environment Loading Priority:**

1. `apps/*/env.local` (highest priority)
2. Root `.env`
3. Root `.env.example` (defaults)

**Implementation in Vite (`apps/web/vite.config.ts`):**

```typescript
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load from root first, then local
  const rootEnv = loadEnv(mode, "../../", "");
  const localEnv = loadEnv(mode, ".", "");

  return {
    envDir: "../../", // Root level
    // ...config
  };
});
```

### **4. Python Dependencies Management**

**RECOMMENDED: API-Level Python Dependencies** ✅

```
apps/api/
├── requirements.txt (production deps)
├── requirements-dev.txt (development deps)
├── pyproject.toml (Python project config)
└── .python-version (Python version pinning)
```

**Why API-level is better:**

- ✅ Clear separation of concerns
- ✅ Independent Python environment per API
- ✅ Easier CI/CD deployment
- ✅ Better Docker layer caching

### **5. Configuration File Distribution**

**ROOT LEVEL (Orchestration):**

- ✅ `farm.config.ts` (framework config)
- ✅ `tsconfig.json` (base TypeScript)
- ✅ `pnpm-workspace.yaml`
- ✅ `docker-compose.yml`
- ✅ `.env.example`
- ✅ `.gitignore`
- ✅ `README.md`

**WEB LEVEL (Frontend-Specific):**

- ✅ `tsconfig.json` (extends root)
- ✅ `package.json` (frontend deps)
- ✅ `vite.config.ts`
- ✅ `tailwind.config.ts`
- ✅ `postcss.config.js`

**API LEVEL (Backend-Specific):**

- ✅ `requirements.txt`
- ✅ `pyproject.toml`
- ✅ `.python-version`

## 🔄 **Template Structure Changes Needed**

### **Missing Files to Add:**

1. **`basic/apps/web/tsconfig.json.hbs`** ✅ (Created)
2. **`basic/apps/api/pyproject.toml.hbs`** (Needs creation)
3. **`basic/apps/api/.python-version.hbs`** (Needs creation)
4. **`basic/apps/api/requirements-dev.txt.hbs`** (Needs creation)

### **Files to Update:**

1. **Root `tsconfig.json.hbs`** - Add project references
2. **Web `package.json.hbs`** - Remove root-level dependencies
3. **Web `vite.config.ts.hbs`** - Configure root env loading
4. **API `requirements.txt.hbs`** - Split prod/dev dependencies

## 🎯 **Benefits of This Architecture**

### **Developer Experience:**

- ✅ Clear separation between frontend/backend concerns
- ✅ Fast TypeScript compilation with project references
- ✅ Proper IDE support across the monorepo
- ✅ Environment variable inheritance with local overrides

### **Build Performance:**

- ✅ Incremental TypeScript builds
- ✅ Independent frontend/backend builds
- ✅ Efficient Docker layer caching
- ✅ Parallel CI/CD pipelines possible

### **Maintainability:**

- ✅ Clear dependency boundaries
- ✅ Easier upgrades (frontend vs backend)
- ✅ Better debugging (isolated configs)
- ✅ Scalable to multiple apps/packages

## 🚀 **Implementation Priority**

### **Phase 1: Critical Fixes**

1. ✅ Add `apps/web/tsconfig.json.hbs`
2. Create `apps/api/pyproject.toml.hbs`
3. Update root `tsconfig.json.hbs` with project references
4. Configure environment variable loading in Vite

### **Phase 2: Optimization**

1. Split Python dependencies (prod/dev)
2. Optimize web `package.json` dependencies
3. Add Python version pinning
4. Enhance build scripts

### **Phase 3: Advanced Features**

1. Add workspace-specific linting configs
2. Implement shared component packages
3. Add cross-app type sharing
4. Optimize Docker builds

This architecture follows modern monorepo best practices while maintaining the simplicity that makes FARM framework accessible to developers.

## ✅ **IMPLEMENTATION COMPLETED**

### **Phase 1: Critical Fixes - COMPLETE ✅**

1. ✅ **Added `apps/web/tsconfig.json.hbs`** - Proper TypeScript project structure
2. ✅ **Enhanced `apps/api/pyproject.toml.hbs`** - Complete Python project configuration
3. ✅ **Added `apps/api/.python-version.hbs`** - Python version pinning
4. ✅ **Added `apps/api/requirements-dev.txt.hbs`** - Development dependencies separation
5. ✅ **Updated root `tsconfig.json.hbs`** - Project references and optimized structure
6. ✅ **Enhanced `apps/web/vite.config.ts.hbs`** - Root environment variable loading
7. ✅ **Optimized `apps/web/package.json.hbs`** - Removed root-level dependencies, updated versions
8. ✅ **Created `ENVIRONMENT_VARIABLES_GUIDE.md.hbs`** - Comprehensive environment configuration guide

### **Monorepo Structure - FINAL IMPLEMENTATION:**

```
project-root/
├── package.json (workspace management + shared deps)
├── tsconfig.json (base config with project references)
├── .env.example (comprehensive environment template)
├── farm.config.ts (FARM framework configuration)
├── pnpm-workspace.yaml (workspace definition)
├── docker-compose.yml (service orchestration)
├── .eslintrc.json (shared linting rules)
├── .prettierrc (code formatting)
├── ENVIRONMENT_VARIABLES_GUIDE.md (documentation)
└── apps/
    ├── web/
    │   ├── package.json (frontend-specific dependencies)
    │   ├── tsconfig.json (extends root, web-specific)
    │   ├── vite.config.ts (environment loading + build config)
    │   └── src/ (React application)
    └── api/
        ├── requirements.txt (production Python dependencies)
        ├── requirements-dev.txt (development Python dependencies)
        ├── pyproject.toml (Python project configuration)
        ├── .python-version (Python version pinning)
        └── src/ (FastAPI application)
```

### **Key Architectural Decisions Implemented:**

#### **1. Environment Variables - Layered Loading ✅**

- **Root `.env`**: Shared configuration across all apps
- **App-specific `.env.local`**: Local overrides per application
- **Frontend**: Vite loads from root then local overrides
- **Backend**: Python can access root environment with local overrides

#### **2. TypeScript Configuration - Project References ✅**

- **Root `tsconfig.json`**: Base configuration with project references
- **Web `tsconfig.json`**: Extends root, includes React-specific settings
- **Optimized builds**: Incremental compilation with proper type checking

#### **3. Dependency Management - Clear Separation ✅**

- **Root `package.json`**: Framework packages, shared dev tools, orchestration scripts
- **Web `package.json`**: Frontend-specific runtime and build dependencies
- **API dependencies**: Python packages managed separately with prod/dev split

#### **4. Build & Development - Unified Experience ✅**

- **Root scripts**: Orchestrate entire monorepo (`farm dev`, `farm build`)
- **App scripts**: App-specific operations (`npm run dev` in web folder)
- **Environment loading**: Consistent across development and production

### **Benefits Delivered:**

#### **Developer Experience:**

- ✅ **Single command setup**: `farm dev` starts everything
- ✅ **Shared tooling**: ESLint, Prettier, TypeScript across apps
- ✅ **Environment inheritance**: Root config with local overrides
- ✅ **Fast rebuilds**: TypeScript project references enable incremental builds

#### **Production Ready:**

- ✅ **Independent deployments**: Apps can be deployed separately
- ✅ **Optimized Docker**: Better layer caching with separated dependencies
- ✅ **Environment management**: Flexible configuration for different environments
- ✅ **Python best practices**: pyproject.toml, version pinning, dev/prod deps

#### **Maintainability:**

- ✅ **Clear boundaries**: Framework vs app vs environment concerns
- ✅ **Scalable structure**: Easy to add new apps or packages
- ✅ **Consistent patterns**: Same patterns across all generated projects
- ✅ **Comprehensive documentation**: Environment guide for teams

### **Framework Integration:**

The monorepo structure seamlessly integrates with FARM framework's core principles:

- **✅ Feature-driven development**: Features add dependencies at appropriate levels
- **✅ Configuration-driven**: Single `farm.config.ts` orchestrates everything
- **✅ Template composition**: Base template provides foundation for all variants
- **✅ Developer-friendly**: Modern tooling with sensible defaults
- **✅ Production-ready**: Battle-tested patterns for deployment

This implementation provides a **world-class monorepo experience** that rivals frameworks like Next.js, Turborepo, and Nx while maintaining FARM framework's simplicity and AI-first approach.
