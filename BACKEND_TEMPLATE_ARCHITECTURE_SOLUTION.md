# Backend Template Architecture Solution

## Current Problem

The FARM framework currently suffers from **backend template code duplication** across multiple template types (`basic`, `ai-chat`, `api-only`). Each template duplicates core backend functionality with slight variations, leading to maintenance burdens and inconsistency.

### Issues Identified

1. **Database-specific conditionals scattered across templates**: Files like `config.py.hbs`, `user.py.hbs`, `health.py.hbs`, `main.py.hbs`, and `requirements.txt.hbs` contain 5-way database conditionals (MongoDB, PostgreSQL, MySQL, SQLite, SQL Server) that are duplicated across templates.

2. **Template-specific customizations mixed with shared logic**: AI-chat template has extensive AI-specific configurations mixed into basic files like `config.py.hbs`.

3. **No clear separation of concerns**: Shared backend logic is not abstracted from template-specific customizations.

4. **Maintenance burden**: Adding new database support requires updating conditionals in multiple template files across all templates.

## Proposed Architecture Solution

### 1. Move Shared Backend to Base Template

**Consolidate shared backend files in the base template with sophisticated database and feature conditionals:**

```
packages/cli/templates/base/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── core/
│       │   │   ├── config.py.hbs          # ✅ Master config with all DB & AI support
│       │   │   ├── logging.py.hbs         # ✅ Shared logging setup
│       │   │   └── security.py.hbs        # ✅ Auth utilities (if auth enabled)
│       │   ├── database/
│       │   │   ├── connection.py.hbs      # ✅ Multi-database connection logic
│       │   │   └── session.py.hbs         # ✅ Database session management
│       │   ├── models/
│       │   │   ├── __init__.py.hbs        # ✅ Model exports
│       │   │   └── user.py.hbs            # ✅ Master user model with all DB variants
│       │   ├── routes/
│       │   │   ├── __init__.py.hbs        # ✅ Route exports
│       │   │   ├── health.py.hbs          # ✅ Health check with DB-specific logic
│       │   │   └── auth.py.hbs            # ✅ Auth routes (if auth enabled)
│       │   └── main.py.hbs                # ✅ Master FastAPI app with all features
│       ├── requirements.txt.hbs           # ✅ Complete dependencies with conditionals
│       └── pyproject.toml.hbs             # ✅ Python project config
└── database/                              # ✅ Already implemented
    ├── mongodb/
    ├── postgresql/
    ├── mysql/
    ├── sqlite/
    └── sqlserver/
```

### 2. Template-Specific Extensions Only

**Templates now only provide template-specific extensions and overrides:**

```
packages/cli/templates/ai-chat/
├── apps/
│   ├── web/                               # Frontend components
│   │   └── src/
│   │       ├── components/chat/
│   │       ├── hooks/useStreamingChat.ts
│   │       └── stores/aiStore.ts
│   └── api/                               # Only AI-specific backend additions
│       └── src/
│           ├── ai/                        # AI provider system
│           │   ├── providers/
│           │   ├── router.py.hbs
│           │   └── manager.py.hbs
│           ├── models/
│           │   ├── conversation.py.hbs    # AI-specific models
│           │   ├── message.py.hbs
│           │   └── ai.py.hbs
│           └── routes/
│               ├── chat.py.hbs            # Chat endpoints
│               └── websocket.py.hbs       # WebSocket handlers
├── farm.config.ts.hbs                    # Template-specific config
└── README.md.hbs                         # Template documentation
```

### 3. Enhanced Template Registry Logic

**Update the template registry to use base template as foundation:**

```typescript
// Template Registry Enhancement
this.register({
  name: "basic",
  files: [
    // Use base template backend as foundation
    { src: "base/apps/api/**/*", dest: "apps/api/" },

    // Frontend only if not API-only
    {
      src: "frontend/basic/**/*",
      dest: "apps/web/",
      condition: (ctx) => ctx.template !== "api-only",
    },

    // Basic template specific overrides (minimal)
    { src: "basic/README.md.hbs", dest: "README.md" },
    { src: "basic/package.json.hbs", dest: "package.json" },
  ],
});

this.register({
  name: "ai-chat",
  files: [
    // Start with basic template foundation
    ...this.getBasicFiles(),

    // Add AI-specific backend components
    { src: "ai-chat/apps/api/src/ai/**/*", dest: "apps/api/src/ai/" },
    { src: "ai-chat/apps/api/src/models/**/*", dest: "apps/api/src/models/" },
    { src: "ai-chat/apps/api/src/routes/**/*", dest: "apps/api/src/routes/" },

    // AI-specific frontend
    { src: "ai-chat/apps/web/**/*", dest: "apps/web/" },

    // Template-specific config
    { src: "ai-chat/farm.config.ts.hbs", dest: "farm.config.ts" },
  ],
});
```

### 4. Master Configuration Template

**Enhanced `config.py.hbs` in base template with comprehensive conditionals:**

```python
# packages/cli/templates/base/apps/api/src/core/config.py.hbs
class Settings(BaseSettings):
    """Master application settings supporting all databases and features"""

    # Application
    APP_NAME: str = "{{name}}"
    ENVIRONMENT: str = "development"

    # Database - Support all 5 database types
    DATABASE_URL: str = "{{#switch database}}{{#case 'mongodb'}}mongodb://localhost:27017/{{kebabCase name}}{{/case}}{{#case 'postgresql'}}postgresql://user:password@localhost:5432/{{kebabCase name}}{{/case}}{{#case 'mysql'}}mysql://user:password@localhost:3306/{{kebabCase name}}{{/case}}{{#case 'sqlite'}}sqlite:///./{{kebabCase name}}.db{{/case}}{{#case 'sqlserver'}}mssql://user:password@localhost:1433/{{kebabCase name}}{{/case}}{{/switch}}"

    {{#if_feature "auth"}}
    # Authentication
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    {{/if_feature}}

    {{#if_feature "ai"}}
    # AI Providers - Template-specific AI config
    {{#if_template "ai-chat"}}
    OLLAMA_URL: str = "{{ai.providers.ollama.url}}"
    OLLAMA_DEFAULT_MODEL: str = "{{ai.providers.ollama.defaultModel}}"
    {{#if ai.providers.openai.enabled}}
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_DEFAULT_MODEL: str = "{{ai.providers.openai.defaultModel}}"
    {{/if}}
    AI_DEFAULT_PROVIDER: str = "{{ai.routing.development}}"
    {{else}}
    # Basic AI configuration for other templates
    AI_ENABLED: bool = True
    {{/if_template}}
    {{/if_feature}}
```

### 5. Master User Model Template

**Enhanced `user.py.hbs` in base template supporting all databases:**

```python
# packages/cli/templates/base/apps/api/src/models/user.py.hbs
{{#if_feature "auth"}}
{{#if_database "mongodb"}}
from beanie import Document, Indexed
from pydantic import EmailStr, Field

class User(Document):
    """User document for MongoDB"""
    email: Indexed(EmailStr, unique=True) = Field(...)
    username: Indexed(str, unique=True) = Field(...)
    # ... MongoDB-specific implementation

    {{#if_template "ai-chat"}}
    # AI-specific preferences for chat template
    ai_preferences: Dict[str, Any] = Field(default_factory=lambda: {
        "preferred_provider": None,
        "preferred_model": None,
        "default_temperature": 0.7
    })
    {{/if_template}}

    class Settings:
        name = "users"
{{else}}
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func

class User(Base):
    """User model for SQL databases"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # ... SQL-specific implementation

    {{#if_template "ai-chat"}}
    ai_preferences = Column(Text, nullable=True)  # JSON string
    {{/if_template}}
{{/if_database}}
{{else}}
# Stub User class when auth is disabled
class User:
    def __init__(self, **kwargs):
        self.id = "anonymous"
        self.email = "anonymous@example.com"
{{/if_feature}}
```

## Implementation Benefits

### 1. ✅ **Eliminated Code Duplication**

- Shared backend logic consolidated in base template
- Single source of truth for database-specific code
- Consistent implementation across all templates

### 2. ✅ **Simplified Maintenance**

- Database support additions only need base template updates
- Security fixes propagate to all templates automatically
- Feature additions have clear separation of concerns

### 3. ✅ **Clear Architecture**

- Base template: Shared infrastructure (DB, auth, config, health)
- Template-specific: Only unique functionality (AI providers, chat logic, etc.)
- Clean inheritance hierarchy

### 4. ✅ **Enhanced Template System**

- Templates can focus on their unique value proposition
- Consistent base functionality across all projects
- Better testing and validation capabilities

### 5. ✅ **Database Ecosystem Support**

- All 5 databases (MongoDB, PostgreSQL, MySQL, SQLite, SQL Server) supported consistently
- Database-specific optimizations in one location
- Easy to add new database support

## Migration Strategy

### Phase 1: Base Template Enhancement (Priority 1)

1. ✅ Move `config.py.hbs` to base template with all database conditionals
2. ✅ Move `user.py.hbs` to base template with comprehensive feature support
3. ✅ Move `main.py.hbs` to base template with all feature integrations
4. ✅ Move `health.py.hbs` to base template with database-specific health checks
5. ✅ Move `requirements.txt.hbs` to base template with complete dependency matrix

### Phase 2: Template Cleanup (Priority 2)

1. Remove duplicate backend files from `basic`, `ai-chat`, `api-only` templates
2. Keep only template-specific backend extensions
3. Update template registry to use base backend files
4. Verify all templates generate correctly

### Phase 3: Testing & Validation (Priority 3)

1. Test all template + database combinations (3 templates × 5 databases = 15 combinations)
2. Validate feature combinations work correctly
3. Ensure no regression in generated projects
4. Update documentation and examples

## Implementation Files

The following files need to be created/modified:

### New Files to Create:

- `packages/cli/templates/base/apps/api/src/core/config.py.hbs` ⭐
- `packages/cli/templates/base/apps/api/src/models/user.py.hbs` ⭐
- `packages/cli/templates/base/apps/api/src/routes/health.py.hbs` ⭐
- `packages/cli/templates/base/apps/api/src/main.py.hbs` ⭐
- `packages/cli/templates/base/apps/api/requirements.txt.hbs` ⭐

### Files to Modify:

- `packages/cli/src/template/registry.ts` - Update template file mappings
- Remove duplicate files from `basic/`, `ai-chat/`, `api-only/` templates

### Files to Test:

- All template generation combinations
- Database connection logic for all 5 databases
- Feature integration (auth + ai, auth only, ai only)

This architecture will eliminate the template duplication problem while maintaining full functionality and providing a cleaner, more maintainable codebase.
