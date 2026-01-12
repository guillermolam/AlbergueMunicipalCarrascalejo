# Tests

This directory contains test assets and test runners for the system.

## Directory structure

```
tests/
 api/              # API-level scripts (DNI/NIE/OCR helpers)
 e2e/              # End-to-end tests (TestCafe)
 spin-integration/ # Spin component integration tests
 integration/      # Cross-service integration tests
 infrastructure/   # Infrastructure/connectivity checks
 performance/      # Performance experiments
 runners/          # Node-based test runners
 documentation/    # Test documentation and notes
 attached_assets/  # Fixtures used by tests
 __mocks__/        # Mocks used by test runners
```

## Running tests

Prefer the root task runner so the same commands work in CI:

```bash
task test
```

You can also run Rust unit tests directly:

```bash
cd backend
cargo test --workspace

cd gateway
cargo test --workspace
```

API and E2E scripts can be executed from `tests/`:

```bash
node tests/runners/run-dni-tests.js
node tests/runners/run-comprehensive-testcafe.js
```