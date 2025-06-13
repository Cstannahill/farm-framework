# Frontend Dependency Management Strategy

## Overview
Following the same pattern as backend `requirements.txt` inheritance, frontend templates should inherit dependencies from the base template and only add template-specific dependencies.

## Architecture

### Base Template (`packages/cli/templates/base/apps/web/package.json.hbs`)
Contains ALL core dependencies that every FARM app needs:
- React & React DOM
- React Router DOM
- @tanstack/react-query
- Zustand
- TypeScript
- Vite
- ESLint & TypeScript ESLint
- Tailwind CSS
- All common utilities (clsx, tailwind-merge, lucide-react)

### Template-Specific Dependencies

#### Basic Template
- **Inherits**: Everything from base
- **Adds**: Nothing (it's essentially the base template)

#### AI Chat Template  
- **Inherits**: Everything from base
- **Adds**: 
  - `framer-motion` (for animations)
  - `react-markdown` (for chat message rendering)
  - `remark-gfm` (for GitHub Flavored Markdown)
  - `react-syntax-highlighter` (for code highlighting)

#### AI Dashboard Template
- **Inherits**: Everything from base  
- **Adds**:
  - `recharts` (for data visualization)
  - `date-fns` (for date handling)
  - `react-window` (for virtualization)

#### E-commerce Template
- **Inherits**: Everything from base
- **Adds**:
  - `stripe` (for payments)
  - `react-hook-form` (for forms)
  - `yup` (for validation)

#### CMS Template
- **Inherits**: Everything from base
- **Adds**:
  - `@tiptap/react` (for rich text editing)
  - `@tiptap/starter-kit` (for editor extensions)
  - `react-beautiful-dnd` (for drag & drop)

## Implementation Plan

1. **Phase 1**: Update base template with ALL common dependencies
2. **Phase 2**: Update each template to inherit from base + add specific deps
3. **Phase 3**: Create automated dependency update scripts
4. **Phase 4**: Implement dependency conflict detection

## Benefits

1. **Single Source of Truth**: All core dependencies managed in one place
2. **Easier Updates**: Update base template → all templates get updates
3. **Conflict Prevention**: Ensure all templates use compatible versions
4. **Maintenance**: Much easier to maintain and audit dependencies
5. **Consistency**: All templates use the same core dependency versions

## Future Automation

We'll create scripts to:
- Check for outdated dependencies across all templates
- Update base template dependencies
- Verify no version conflicts between base and template-specific deps
- Generate dependency reports
- Automate security vulnerability checks
