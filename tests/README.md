# Testing Structure

This directory contains all the testing infrastructure for the Albergue Del Carrascalejo pilgrim registration system.

## Directory Structure

```
tests/
├── api/                    # API integration tests
│   ├── test-dni-api.js     # Core API endpoint validation
│   ├── test-*.mjs         # Local testing modules
│   └── test-lambda.js     # AWS Lambda OCR testing
├── e2e/                    # End-to-End testing
│   ├── testcafe/          # TestCafe E2E test files
│   │   ├── testcafe-document-formats.js
│   │   ├── testcafe-full-registration-flow.js
│   │   ├── testcafe-international-passports.js
│   │   ├── testcafe-nie-documents.js
│   │   ├── testcafe-residence-permits.js
│   │   └── test-dni-simple.js
│   └── outputs/           # TestCafe output directories
│       ├── reports/       # Test reports
│       ├── screenshots/   # Screenshot captures
│       └── videos/        # Video recordings
├── runners/               # Test execution scripts
│   ├── run-comprehensive-testcafe.js
│   ├── run-dni-tests.js
│   ├── run-enzyme-simple.js
│   └── run-enzyme-tests.js
├── __mocks__/             # Jest mocks
├── performance/           # Performance testing
├── integration/           # Integration testing
└── appsec/               # Security testing
```

## Test Types

### API Tests (`./api/`)

- Integration tests for all backend endpoints
- 100% pass rate validation
- Response time monitoring
- Error handling verification

### Component Tests (`./enzyme-components/`)

- React component unit tests using Enzyme + Jest
- 92% average test coverage
- Provider setup and context integration testing

### End-to-End Tests (`./e2e/testcafe/`)

- Full registration workflow testing
- Document processing validation (DNI, NIE, TIE, Passports)
- Multi-browser compatibility testing
- Critical user journey validation

### Test Runners (`./runners/`)

- Automated test execution scripts
- Comprehensive reporting
- Performance monitoring

## Running Tests

### All Tests

```bash
npm run test
```

### Individual Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Manual Test Execution

```bash
# API tests
node tests/runners/run-dni-tests.js

# Component tests
node tests/runners/run-enzyme-tests.js

# E2E tests
node tests/runners/run-comprehensive-testcafe.js
```

## TestCafe Configuration

TestCafe outputs are automatically saved to:

- **Reports**: `tests/e2e/outputs/reports/`
- **Screenshots**: `tests/e2e/outputs/screenshots/`
- **Videos**: `tests/e2e/outputs/videos/`

These directories are automatically created when running E2E tests.
