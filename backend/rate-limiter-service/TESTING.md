# Rate Limiter Service Testing Guide

This document provides comprehensive testing instructions for the Rate Limiter Service, including unit tests, integration tests, performance tests, and coverage reporting.

## Test Structure

The test suite is organized into several categories:

### 1. Unit Tests (`tests/unit_tests.rs`)

Tests for individual async functions and response building:

- `check_multiple_limits()` - Concurrent rate limit checks
- `perform_rate_limit_check()` - Main rate limiting logic
- `build_rate_limit_response()` - Response formatting
- `handle_rate_limit_status()` - Status endpoint
- `handle_rate_limit_reset()` - Reset endpoint

### 2. Algorithm Tests (`tests/rate_limit_algorithm_tests.rs`)

Tests for core rate limiting algorithms:

- `calculate_rate_limit()` - Token bucket algorithm
- `get_current_timestamp()` - Timestamp generation
- `extract_client_id()` - Client identification

### 3. Edge Case Tests (`tests/edge_case_tests.rs`)

Tests for boundary conditions and error scenarios:

- Zero/maximum window sizes
- Zero/maximum request limits
- Malformed headers and JSON
- Unicode and special characters
- Overflow scenarios

### 4. Performance Tests (`tests/performance_tests.rs`)

Tests for performance and scalability:

- Single client performance
- Multiple client concurrency
- Memory usage stability
- Algorithm efficiency
- Concurrent endpoint testing

### 5. Integration Tests (`tests/integration_tests.rs`)

End-to-end HTTP endpoint tests:

- Rate limit check endpoint
- Status endpoint
- Reset endpoint
- Error handling
- Concurrent requests

## Running Tests

### Quick Test Run

```bash
cargo test
```

### Comprehensive Test Suite

```bash
./run_tests.sh
```

### Individual Test Suites

```bash
# Unit tests
cargo test --test unit_tests

# Algorithm tests
cargo test --test rate_limit_algorithm_tests

# Edge case tests
cargo test --test edge_case_tests

# Performance tests
cargo test --test performance_tests

# Integration tests
cargo test --test integration_tests
```

### With Coverage

```bash
# Install cargo-tarpaulin if not available
cargo install cargo-tarpaulin

# Run tests with coverage
cargo tarpaulin --out Html --output-dir coverage

# View coverage report
open coverage/index.html
```

## Test Coverage

The test suite aims for 100% code coverage across:

- **Lines**: All executable lines
- **Branches**: All conditional branches
- **Functions**: All public and private functions
- **Modules**: All modules and submodules

### Coverage Report

After running `./run_tests.sh`, coverage reports are generated in:

- `coverage/index.html` - HTML coverage report
- `coverage/tarpaulin-report.html` - Detailed coverage

## Test Categories

### 1. Functional Tests

- **Rate Limiting Logic**: Token bucket algorithm correctness
- **Window Management**: Sliding window behavior
- **Client Identification**: IP address and header extraction
- **Configuration**: Dynamic rate limit configuration

### 2. Boundary Tests

- **Zero Values**: Zero window, zero max requests
- **Maximum Values**: u32::MAX for windows and limits
- **Edge Timestamps**: Unix epoch, future timestamps
- **Empty Inputs**: Empty requests, missing headers

### 3. Error Handling Tests

- **Invalid JSON**: Malformed request bodies
- **Missing Data**: Missing client IDs or endpoints
- **Network Issues**: Simulated storage failures
- **Header Issues**: Invalid or missing headers

### 4. Performance Tests

- **Throughput**: Requests per second
- **Latency**: Response time under load
- **Memory**: Memory usage stability
- **Concurrency**: Multiple simultaneous clients

### 5. Integration Tests

- **HTTP Endpoints**: All REST endpoints
- **Status Codes**: Correct HTTP status codes
- **Headers**: Proper response headers
- **CORS**: Cross-origin resource sharing

## Test Data

### Mock Data

- **Client IDs**: Test client identifiers
- **Endpoints**: Various API endpoints
- **Rate Limits**: Different configurations
- **Timestamps**: Various time scenarios

### Test Scenarios

1. **First Request**: New client, new window
2. **Within Limit**: Subsequent requests within limits
3. **Limit Exceeded**: Requests over the limit
4. **Window Reset**: Expired window scenarios
5. **Multiple Endpoints**: Different rate limits per endpoint
6. **Concurrent Access**: Simultaneous requests

## Environment Setup

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install WASM target
rustup target add wasm32-wasi

# Install testing tools
cargo install cargo-tarpaulin cargo-audit
```

### Environment Variables

```bash
export RATE_LIMIT_REQUESTS=100
export RATE_LIMIT_WINDOW_SECONDS=60
export RATE_LIMIT_BURST=20
export LOG_LEVEL=debug
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Rate Limiter Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-wasi
      - name: Run tests
        run: ./run_tests.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/tarpaulin-report.xml
```

## Debugging Tests

### Verbose Output

```bash
cargo test -- --nocapture
```

### Specific Test

```bash
cargo test test_calculate_rate_limit -- --nocapture
```

### Debug Build

```bash
cargo build --target wasm32-wasi
cargo test --target wasm32-wasi
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**

   ```bash
   cargo update
   cargo build
   ```

2. **WASM Target Issues**

   ```bash
   rustup target add wasm32-wasi
   ```

3. **Coverage Tool Issues**

   ```bash
   cargo install cargo-tarpaulin
   ```

4. **Performance Test Failures**
   - Ensure adequate system resources
   - Run with `--release` flag for accurate performance

### Performance Tuning

- Use `--release` flag for performance tests
- Adjust test iterations based on system capacity
- Monitor memory usage during tests

## Test Maintenance

### Adding New Tests

1. Create test file in `tests/` directory
2. Add test module to `Cargo.toml`
3. Follow existing test patterns
4. Update this documentation

### Test Organization

- Keep tests focused and atomic
- Use descriptive test names
- Include edge cases
- Document test scenarios

## Monitoring and Alerts

### Test Metrics

- **Coverage**: Maintain >95% line coverage
- **Performance**: <2ms average response time
- **Memory**: No memory leaks in 1000+ iterations
- **Reliability**: 100% test pass rate

### Alerting

- Coverage drops below 95%
- Performance regression >20%
- Test failures in CI/CD
- Security audit failures

## Support

For test-related issues:

1. Check test logs in `target/debug/`
2. Review coverage reports
3. Run individual test suites
4. Check system resources
5. Consult this documentation
