# Taskfile Architecture Enforcement

## Overview

This document establishes the canonical architecture for Taskfile.yml usage across the Albergue Municipal Carrascalejo project. This architecture must be followed by all LLM interactions and code generation.

## Architecture Hierarchy

The Taskfile system follows a strict hierarchical pattern:

```
@Taskfile.yml (root)
  ├── includes @taskfiles/*.yml
  │   ├── uses @scripts/ (root level)
  │   ├── uses @taskfiles/ (task definitions)
  │   └── references @backend/scripts/
  │   └── references @frontend/scripts/
  │   └── references @database/scripts/
  │   └── references @tests/infrastructure/scripts/
  ├── @frontend/Taskfile.yml
  │   ├── uses @frontend/scripts/
  │   └── references @scripts/ (root level)
  ├── @backend/scripts/
  ├── @database/scripts/
  ├── @frontend/scripts/
  └── @tests/infrastructure/scripts/
```

## Directory Structure Requirements

### Root Level Scripts (@scripts/)

- **Purpose**: Cross-cutting concerns, port management, deployment orchestration
- **Contents**:
  - `port-manager.py` - Dynamic port allocation
  - `dev-start.sh` - Development environment startup
  - `deploy-all-services.sh` - Production deployment
  - `test-all-services.sh` - Integration testing
  - `build-wasm-all.sh` - WebAssembly compilation
  - `test-integration.sh` - End-to-end testing

### Backend Scripts (@backend/scripts/)

- **Purpose**: Backend service management
- **Contents**:
  - `start-all-services.sh` - Start all backend microservices
  - `stop-all-services.sh` - Stop all backend services
  - `build-services.sh` - Build all backend services
  - `test-services.sh` - Run backend service tests
  - `health-check.sh` - Service health verification

### Frontend Scripts (@frontend/scripts/)

- **Purpose**: Frontend microfrontend management
- **Contents**:
  - `cleanup-structure.js` - Frontend structure maintenance
  - `fix-components-structure.sh` - Component organization
  - `fix-imports.js` - Import path resolution
  - `build-microfrontends.sh` - Build all microfrontends
  - `serve-microfrontends.sh` - Local development serving

### Database Scripts (@database/scripts/)

- **Purpose**: Database management and migrations
- **Contents**:
  - `setup-db.sh` - Database initialization
  - `migrate-postgres.sh` - PostgreSQL migrations
  - `migrate-sqlite.sh` - SQLite migrations
  - `dump-schema-postgres.sh` - Schema export for PostgreSQL
  - `dump-schema-sqlite.sh` - Schema export for SQLite

### Tests Infrastructure Scripts (@tests/infrastructure/scripts/)

- **Purpose**: Testing environment setup
- **Contents**:
  - `setup-dev.sh` - Development testing environment
  - `setup-ci.sh` - CI/CD testing environment
  - `run-e2e-tests.sh` - End-to-end test execution
  - `generate-test-data.sh` - Test data generation

## Usage Patterns

### Root Taskfile.yml Usage

```yaml
includes:
  dev: ./taskfiles/Taskfile.dev.yml
  build: ./taskfiles/Taskfile.build.yml
  # ... other includes

vars:
  FRONTEND_PORT:
    sh: python3 scripts/port-manager.py show > /dev/null 2>&1 && python3 -c "import json; print(json.load(open('.ports.json'))['FRONTEND'])" || python3 scripts/port-manager.py generate > /dev/null && python3 -c "import json; print(json.load(open('.ports.json'))['FRONTEND'])"
```

### Taskfile Includes Usage

```yaml
# In taskfiles/Taskfile.dev.yml
tasks:
  run-all:
    cmds:
      - ./scripts/start-all-services.sh # Root scripts
      - ../backend/scripts/start-all-services.sh # Backend scripts
      - ../frontend/scripts/build-microfrontends.sh # Frontend scripts
```

### Frontend Taskfile.yml Usage

```yaml
# In frontend/Taskfile.yml
tasks:
  build:
    cmds:
      - ./scripts/build-microfrontends.sh # Frontend-specific scripts
      - ../scripts/deploy-all-services.sh # Root-level scripts when needed
```

## Path Resolution Rules

1. **Absolute Paths**: Always use relative paths from the Taskfile location
2. **Root References**: Use `../` to reference parent directories when needed
3. **Cross-Domain References**: Use full relative paths for cross-domain script usage
4. **Script Discovery**: Scripts should be discoverable via standard directory structure

## Enforcement Rules for LLM Interactions

### When Creating New Taskfiles

1. **MUST** place new taskfiles in `@taskfiles/` directory
2. **MUST** reference scripts using the correct path pattern:
   - Root scripts: `scripts/script-name.sh`
   - Backend scripts: `../backend/scripts/script-name.sh`
   - Frontend scripts: `../frontend/scripts/script-name.sh`
   - Database scripts: `../database/scripts/script-name.sh`

### When Creating New Scripts

1. **MUST** place scripts in the appropriate domain directory:
   - Cross-cutting: `@scripts/`
   - Backend-specific: `@backend/scripts/`
   - Frontend-specific: `@frontend/scripts/`
   - Database-specific: `@database/scripts/`
   - Testing-specific: `@tests/infrastructure/scripts/`

### When Modifying Existing Taskfiles

1. **MUST** maintain backward compatibility with existing script paths
2. **MUST** update references if moving scripts between directories
3. **MUST** ensure all script references follow the established patterns

## Validation Checklist

For any LLM-generated code or configuration:

- [ ] New taskfiles are placed in `@taskfiles/` directory
- [ ] Script references use correct relative paths
- [ ] Cross-domain script usage follows established patterns
- [ ] No absolute paths are used (always relative)
- [ ] Script directories exist before script creation
- [ ] Executable permissions are set on shell scripts
- [ ] Documentation is updated to reflect new scripts

## Examples

### Correct Usage

```yaml
# In taskfiles/Taskfile.build.yml
tasks:
  build:backend:
    cmds:
      - ../backend/scripts/build-services.sh

  build:frontend:
    cmds:
      - ../frontend/scripts/build-microfrontends.sh

  build:all:
    cmds:
      - task: build:backend
      - task: build:frontend
      - ./scripts/build-wasm-all.sh
```

### Incorrect Usage

```yaml
# WRONG - absolute path
- /home/user/project/backend/scripts/start.sh

# WRONG - wrong directory reference
- scripts/start-all-services.sh # Should be ../backend/scripts/

# WRONG - script in wrong location
- ./start-services.sh # Should be in appropriate scripts directory
```

## Migration Path

When encountering legacy configurations:

1. **Identify** the current script location
2. **Move** scripts to appropriate domain directory
3. **Update** all Taskfile references
4. **Test** all affected tasks
5. **Document** the changes

This architecture ensures clear separation of concerns, maintainable code organization, and consistent patterns across the entire project.
