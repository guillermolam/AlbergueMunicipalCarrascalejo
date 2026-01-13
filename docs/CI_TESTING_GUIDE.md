# CI/CD Workflow Testing Guide

## Overview

This document describes how to test the GitHub Actions CI/CD workflow locally without using `act` or Docker.

## Workflow Structure

The `.github/workflows/ci.yml` file defines 6 jobs:

1. **frontend** - Frontend build and checks
2. **gateway** - Gateway Rust/WASM builds
3. **database** - Database migrations and tests
4. **integration** - Integration tests with Spin
5. **security** - Security audits
6. **deploy-check** - Deployment readiness check

## Testing Locally

### Prerequisites

Ensure you have all dependencies installed:
- Node.js 20+ and pnpm 8+
- Rust toolchain with wasm32-wasip1 target
- just command runner
- PostgreSQL 15 (for database tests)
- Spin CLI (for integration tests)

### Using the Test Scripts

#### 1. Validate Workflow Syntax

```bash
./scripts/validate-ci-workflow.sh
```

This checks:
- YAML syntax validity
- Node.js version consistency
- pnpm version consistency
- Correct WASM target (wasm32-wasip1)
- Lists all defined jobs

#### 2. Run Full CI Test Suite

```bash
./scripts/test-ci.sh
```

This script mimics the CI workflow and tests:
- Frontend prettier check
- Frontend build
- Gateway format check
- Gateway clippy
- Gateway unit tests
- Gateway WASM build
- Backend format check
- Backend build

The script provides colored output and a summary of passed/failed jobs.

### Testing Individual Jobs

#### Frontend Job

```bash
cd frontend

# Install dependencies
pnpm install --frozen-lockfile

# Prettier check
pnpm exec prettier --check .

# Build
pnpm build

# Verify artifacts
ls -la dist/
test -f dist/index.html
```

#### Gateway Job

```bash
cd gateway

# Install just if needed
cargo install just --locked

# Format check
just fmt-check

# Clippy
just clippy

# Tests
just test

# WASM build
cargo build --workspace --release --target wasm32-wasip1
```

#### Database Job

Requires PostgreSQL 15 running locally:

```bash
# Start PostgreSQL
# Connection: localhost:5432, user: postgres, db: albergue_test

# Apply migrations
for migration in domain_model/migrations/*.sql; do
    echo "Applying $migration"
    psql -h localhost -U postgres -d albergue_test -f "$migration"
done

# Apply test seed
psql -h localhost -U postgres -d albergue_test -f domain_model/seed/test_seed.sql

# Run SQL tests
for test in domain_model/test/*.sql; do
    echo "Running $test"
    psql -h localhost -U postgres -d albergue_test -f "$test"
done
```

#### Integration Job

```bash
# Install Spin CLI
curl -fsSL https://developer.fermyon.com/downloads/install.sh | bash
export PATH="$HOME/.spin/bin:$PATH"

# Build Spin app
spin build

# Run integration tests
cd tests/integration
just check
```

#### Security Job

```bash
# Frontend security audit
cd frontend
pnpm install --frozen-lockfile
pnpm audit --audit-level=high

# Gateway security audit
cd gateway
cargo generate-lockfile
cargo audit
```

#### Deploy Check Job

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
ls -la dist/
test -f dist/index.html
```

## Known Issues and Fixes

### Issue 1: prettier-plugin-tailwindcss Missing

**Error:**
```
Cannot find package 'prettier-plugin-tailwindcss'
```

**Fix:** Removed from `frontend/prettier.config.mjs` (project uses UnoCSS, not Tailwind)

**Status:** ✅ Fixed

### Issue 2: Prettier Config Warnings

**Error:**
```
Ignored unknown option { tailwindConfig: "./tailwind.config.mjs" }
Ignored unknown option { tailwindFunctions: [...] }
```

**Fix:** Removed Tailwind-specific options from prettier config

**Status:** ✅ Fixed

### Issue 3: WASM Target

**Issue:** Some scripts used `wasm32-wasi` instead of `wasm32-wasip1`

**Fix:** Updated all references to use `wasm32-wasip1` (required for Spin)

**Status:** ✅ Fixed

## CI/CD Improvements

### Completed
- ✅ Validated workflow syntax
- ✅ Fixed prettier configuration
- ✅ Removed invalid Tailwind CSS plugin reference
- ✅ Created local testing scripts
- ✅ Documented testing procedures

### Recommended
- Add `.actrc` configuration for local act testing
- Add caching for Rust builds
- Add matrix builds for multiple platforms
- Add automated dependency updates
- Add performance benchmarks

## Using act (Optional)

If you have Docker and want to use `act`:

### Installation

```bash
# Via Homebrew
brew install act

# Via curl
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Basic Usage

```bash
# List all jobs
act -l

# Run all jobs
act push

# Run specific job
act -j frontend

# Run with specific Docker image
act -P ubuntu-latest=catthehacker/ubuntu:act-latest

# Dry run
act -n
```

### act Configuration

Create `.actrc` in project root:

```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
--rm
```

## Continuous Integration

The workflow automatically runs on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual trigger via `workflow_dispatch`

## Dependencies

| Job | Dependencies |
|-----|--------------|
| frontend | - |
| gateway | - |
| database | - |
| integration | frontend, gateway, database |
| security | - |
| deploy-check | frontend, gateway, database, integration, security |

## Success Criteria

All jobs must pass for CI to succeed:
- ✅ Frontend builds without errors
- ✅ Gateway passes format, clippy, and tests
- ✅ Database migrations apply successfully
- ✅ Integration tests pass
- ✅ No high-severity security issues
- ✅ Deployment artifacts are valid

## Troubleshooting

### Terminal Hangs

If commands hang during testing, try:
1. Use `timeout` command: `timeout 30 pnpm build`
2. Run in background: `pnpm build &`
3. Check for port conflicts
4. Restart terminal session

### Build Failures

1. Clear caches: `task clean`
2. Reinstall dependencies: `pnpm install --force`
3. Check Rust toolchain: `rustup show`
4. Verify WASM target: `rustup target list --installed | grep wasip1`

### Database Connection Issues

1. Check PostgreSQL is running: `pg_isready`
2. Verify connection: `psql -h localhost -U postgres -d albergue_test`
3. Check port: `lsof -i :5432`
4. Reset database if needed

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [act Documentation](https://github.com/nektos/act)
- [Spin CLI Documentation](https://developer.fermyon.com/spin)
- [Task Documentation](https://taskfile.dev)
