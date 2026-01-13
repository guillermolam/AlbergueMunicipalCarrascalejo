# Scripts

This directory contains reusable scripts invoked by taskfiles and CI.

## Common scripts

- `setup-environment.sh` - Environment checks and setup
- `dev-services.sh` - Start/stop/restart local dev services
- `build-services.sh` - Build selected services
- `build-wasm-all.sh` - Build Wasm artifacts for multiple components
- `test-services.sh` / `test-all-services.sh` - Run test suites
- `quality-checks.sh` - Format/lint/security checks
- `health-check.sh` - Health checks against running services
- `port-management.sh` / `port-manager.py` - Port allocation and validation
- `deploy.sh` / `deploy-fermyon.sh` / `deploy-all-services.sh` - Deployment helpers
- `validate-architecture.sh` - Architecture validation

## Usage

Scripts are generally run via go-task:

```bash
task dev
task test
task build
```

You can also execute a script directly:

```bash
./scripts/setup-environment.sh check
./scripts/quality-checks.sh all all
```
