# Dependency Update Task

## Usage

### Option 1: Using Task (Recommended)

```bash
task update-deps
```

### Option 2: Direct Script Execution

```bash
bash scripts/update-deps.sh
```

### Option 3: Manual Update

```bash
# Install cargo-edit (first time only)
cargo install cargo-edit

# Update specific service
cd backend/booking-service
cargo upgrade --incompatible

# Or use the script
./scripts/update-deps.sh
```

## What It Does

The `update-deps` task/script will:

1. Check if `cargo-edit` is installed (provides `cargo upgrade` command)
2. Install it if missing (~2-3 minutes on first run)
3. Update all Cargo.toml dependencies to latest compatible versions in:
   - All backend services (auth, booking, notification, etc.)
   - Gateway services (api-gateway, api-gateway-core, edge-proxy)
   - Shared library

## Flags Used

- `--incompatible`: Only upgrade to latest incompatible (breaking) versions
- `--skip-compatible`: Skip packages that are already at compatible versions

## After Updating

After dependencies are updated, rebuild the project:

```bash
task build:all
# or
spin build
```

## Troubleshooting

If the task fails:

1. Ensure cargo and rustc are installed: `cargo --version`
2. Check for network connectivity (cargo needs to access crates.io)
3. Try running the script directly: `bash scripts/update-deps.sh`
4. Manual update: `cd <service-dir> && cargo upgrade`
