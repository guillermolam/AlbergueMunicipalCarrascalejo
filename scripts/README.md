# Centralized Scripts

This directory contains reusable scripts that can be called from:
- Taskfiles (`taskfiles/`)
- Package.json files (root and individual projects)
- GitHub Actions workflows (`.github/workflows/`)
- Cargo.toml files via build scripts
- Manual execution from command line

## Available Scripts

### 🔧 **Build Scripts**
- **`build-services.sh [service] [mode]`** - Build all services or specific ones
  - Services: `gateway`, `backend`, `frontend`, `all` (default)
  - Modes: `release` (default), `debug`
  - Examples:
    ```bash
    ./scripts/build-services.sh all release
    ./scripts/build-services.sh frontend debug
    ```

### 🧹 **Cleaning Scripts**
- **`clean-frontend.sh [directory]`** - Clean frontend projects (Node.js/React)
- **`clean-rust.sh [directory]`** - Clean Rust/Cargo projects
- **`clean-all.sh [mode]`** - Comprehensive cleanup (modes: frontend, rust, all)

### 🚀 **Development Scripts**
- **`dev-services.sh [action] [service]`** - Manage development services
  - Actions: `start|up`, `stop|down`, `restart|reload`, `status`
  - Examples:
    ```bash
    ./scripts/dev-services.sh start
    ./scripts/dev-services.sh stop
    ./scripts/dev-services.sh restart
    ```

### 🔍 **Quality Scripts**
- **`quality-checks.sh [check] [target]`** - Format, lint, and security checks
  - Checks: `format`, `lint`, `security`, `all` (default)
  - Targets: `rust`, `frontend`, `all` (default)
  - Examples:
    ```bash
    ./scripts/quality-checks.sh format all
    ./scripts/quality-checks.sh lint rust
    ./scripts/quality-checks.sh security
    ```

### 🔗 **Port Management**
- **`port-management.sh [action]`** - Manage port configurations
  - Actions: `generate|gen`, `show|list`, `clean|clear`, `validate|check`
  - Examples:
    ```bash
    ./scripts/port-management.sh generate
    ./scripts/port-management.sh show
    ./scripts/port-management.sh validate
    ```

### 🧪 **Testing Scripts**
- **`test-services.sh [test_type] [service]`** - Run tests for all services
  - Test types: `unit`, `integration`, `coverage`, `clean`
  - Services: `rust`, `frontend`, `all` (default), or specific service name
  - Examples:
    ```bash
    ./scripts/test-services.sh unit all
    ./scripts/test-services.sh coverage frontend
    ./scripts/test-services.sh integration
    ```

### 🏗️ **Environment Setup**
- **`setup-environment.sh [component]`** - Complete environment setup
  - Components: `check`, `rust`, `node`, `spin`, `deps`, `database`, `all` (default)
  - Examples:
    ```bash
    ./scripts/setup-environment.sh check
    ./scripts/setup-environment.sh all
    ./scripts/setup-environment.sh rust
    ```

### 🏥 **Health Checks**
- **`health-check.sh [service]`** - Check service health
  - Services: `frontend`, `gateway`, `auth`, `booking`, `notification`, `info-arrival`, `location`, `rate-limiter`, `reviews`, `security`, `all` (default)
  - Examples:
    ```bash
    ./scripts/health-check.sh all
    ./scripts/health-check.sh frontend
    ./scripts/health-check.sh gateway
    ```

### 🛠️ **Development Setup**
- **`dev-setup.sh`** - Complete development environment setup (legacy wrapper)

## Usage Examples

### From Taskfile
```yaml
tasks:
  clean:
    cmds:
      - ./scripts/clean-all.sh all
```

### From package.json
```json
{
  "scripts": {
    "clean": "./scripts/clean-all.sh all",
    "build": "./scripts/build-services.sh all release",
    "test": "./scripts/test-services.sh unit all",
    "dev": "./scripts/dev-services.sh start",
    "setup": "./scripts/setup-environment.sh all"
  }
}
```

### From GitHub Actions
```yaml
- name: Clean build artifacts
  run: ./scripts/clean-all.sh all

- name: Setup environment
  run: ./scripts/setup-environment.sh all

- name: Run tests
  run: ./scripts/test-services.sh unit all

- name: Build services
  run: ./scripts/build-services.sh all release
```

### Manual Usage
```bash
# Complete setup
./scripts/setup-environment.sh all

# Start development
./scripts/dev-services.sh start

# Run tests
./scripts/test-services.sh unit all

# Build everything
./scripts/build-services.sh all release

# Check health
./scripts/health-check.sh all

# Clean everything
./scripts/clean-all.sh all
```

## Taskfile Integration

All taskfiles now use these centralized scripts:

| Taskfile | Uses Scripts |
|----------|--------------|
| `Taskfile.clean.yml` | `clean-*.sh` |
| `Taskfile.build.yml` | `build-services.sh` |
| `Taskfile.dev.yml` | `dev-services.sh` |
| `Taskfile.ports.yml` | `port-management.sh` |
| `Taskfile.quality.yml` | `quality-checks.sh` |
| `Taskfile.setup.yml` | `setup-environment.sh` |
| `Taskfile.test.yml` | `test-services.sh` |
| `Taskfile.act.yml` | `health-check.sh`, `build-services.sh`, `dev-services.sh` |

## Benefits

1. **DRY Principle** - No duplicated logic across taskfiles and package.json files
2. **Consistency** - Same behavior regardless of how scripts are invoked
3. **Maintainability** - Changes only need to be made in one place
4. **Reusability** - Scripts can be called from any context (CI/CD, local dev, etc.)
5. **Cross-platform** - Scripts handle platform differences internally
6. **Documentation** - Clear usage examples and consistent interface
7. **Error Handling** - Proper error handling and user feedback
8. **Flexibility** - Support for different modes, services, and configurations