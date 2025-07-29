# Location Service Testing Guide

This document provides comprehensive testing instructions for the location service.

## Test Coverage Overview

The location service has been designed with 100% test coverage in mind, including:

- **Unit Tests**: Individual component testing
- **Integration Tests**: HTTP handler testing
- **Edge Case Tests**: Boundary conditions and error scenarios
- **Performance Tests**: Response time and concurrent access

## Test Structure

```
location-service/
├── tests/
│   ├── unit_tests.rs          # Unit tests for all components
│   ├── integration_tests.rs   # HTTP handler integration tests
├── run_tests.sh              # Test runner script
├── TESTING.md               # This documentation
```

## Running Tests

### Quick Start
```bash
# From the location-service directory
./run_tests.sh
```

### Individual Test Suites
```bash
# Run unit tests only
cargo test --test unit_tests

# Run integration tests only
cargo test --test integration_tests

# Run all tests
cargo test --all
```

### With Coverage
```bash
# Install cargo-tarpaulin first
cargo install cargo-tarpaulin

# Run tests with coverage
cargo tarpaulin --tests --out Html --output-dir coverage
```

## Test Categories

### 1. Unit Tests (`tests/unit_tests.rs`)

#### CountryData Tests
- Serialization/deserialization
- Handling of None values
- JSON format validation

#### CacheEntry Tests
- Timestamp handling
- Data integrity
- Serialization

#### CountryService Tests
- Cache functionality
- Cache expiration
- Case insensitivity
- Empty code handling
- Warm cache functionality

#### HTTP Handler Tests
- CORS preflight handling
- GET country endpoints
- POST warm cache endpoint
- Error responses
- Invalid methods
- Malformed URIs

### 2. Integration Tests (`tests/integration_tests.rs`)

#### Full Request/Response Cycle
- Complete HTTP flow testing
- Response format validation
- Header verification

#### CORS Testing
- Preflight request handling
- CORS headers presence
- Cross-origin compatibility

#### Performance Testing
- Response time validation
- Concurrent request handling
- Cache warmup integration

### 3. Edge Case Tests

#### Input Validation
- Special characters in country codes
- Unicode handling
- Numeric codes
- Whitespace handling

#### Cache Behavior
- Concurrent access patterns
- Cache size limits
- Expiration scenarios

## Test Scenarios Covered

### Positive Scenarios
- ✅ Known country retrieval (ES, FR, PT, IT)
- ✅ Cache hit scenarios
- ✅ Cache warmup functionality
- ✅ CORS preflight requests
- ✅ JSON serialization/deserialization

### Negative Scenarios
- ❌ Unknown country codes
- ❌ Empty country codes
- ❌ Invalid HTTP methods
- ❌ Malformed URIs
- ❌ Cache expiration

### Edge Cases
- ⚡ Case insensitivity (es, ES, eS)
- ⚡ Special characters in input
- ⚡ Unicode handling
- ⚡ Concurrent access
- ⚡ Empty cache scenarios

## Test Data

### Known Countries
- **ES**: Spain (🇪🇸, +34, EUR)
- **FR**: France (🇫🇷, +33, EUR)
- **PT**: Portugal (🇵🇹, +351, EUR)
- **IT**: Italy (🇮🇹, +39, EUR)

### Test Country Codes
- Valid: ES, FR, PT, IT
- Invalid: XX, YY, ZZ, 123, ""
- Edge cases: "es", "ES ", "es!@#"

## Performance Benchmarks

### Response Time
- Individual requests: < 100ms
- Concurrent requests (10): < 200ms total
- Cache warmup: < 50ms

### Memory Usage
- Cache size: Limited to known countries
- Memory leaks: None detected
- Concurrent access: Thread-safe

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Test Location Service
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run tests
        run: |
          cd backend/location-service
          ./run_tests.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Common Issues
1. **Test failures**: Check for missing dependencies
2. **Build errors**: Ensure WASM target is installed
3. **Coverage issues**: Verify cargo-tarpaulin installation

### Debug Commands
```bash
# Verbose test output
cargo test -- --nocapture

# Specific test
cargo test test_get_country_data_known_country -- --nocapture

# Build with debug info
cargo build --target wasm32-wasi
```

## Test Maintenance

### Adding New Tests
1. Add unit tests to `tests/unit_tests.rs`
2. Add integration tests to `tests/integration_tests.rs`
3. Update test documentation
4. Ensure 100% coverage is maintained

### Test Guidelines
- Use descriptive test names
- Include both positive and negative test cases
- Test edge cases explicitly
- Maintain fast test execution
- Document test purpose in comments

## Coverage Report

After running tests with coverage, check the `coverage/` directory for:
- HTML coverage report
- Line-by-line coverage analysis
- Function coverage metrics
- Branch coverage details

## Troubleshooting

### Build Issues
```bash
# Install WASM target
rustup target add wasm32-wasi

# Update dependencies
cargo update

# Clean build
cargo clean && cargo build
```

### Test Failures
```bash
# Check specific test
cargo test test_name -- --exact

# Run with backtrace
RUST_BACKTRACE=1 cargo test

# Check for memory issues
cargo test --release
```