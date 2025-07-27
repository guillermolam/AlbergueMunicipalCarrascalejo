# 📊 Test Coverage & Act Integration Guide

## 🎯 **Coverage Requirements**

### **85% Coverage Threshold**
- **Backend**: 85% minimum coverage
- **Frontend**: 85% minimum coverage  
- **Gateway**: 85% minimum coverage

### **Build Breaking Rules**
✅ **CAN BREAK BUILD**:
- Unit tests
- Integration tests
- Coverage verification (< 85%)

❌ **CANNOT BREAK BUILD**:
- Formatting issues
- Linting issues
- E2E tests
- Performance tests
- Security tests
- Load tests

## 🚀 **Quick Start Commands**

### **Test Coverage**
```bash
# Full test suite with coverage (can break build)
task test

# Unit tests only (can break build)
task test:unit

# Integration tests only (can break build)
task test:integration

# Coverage verification (can break build)
task coverage:all

# Coverage reports
task coverage:report
```

### **Local GitHub Actions with Act**
```bash
# Setup act
task act:setup

# Run quality workflow (non-breaking)
task act:run-quality

# Run tests workflow (can break build)
task act:run-tests

# Run on push event
task act:run-push

# Run on PR event
task act:run-pr

# List available workflows
task act:list
```

## 📋 **Available Tasks**

### **Test Tasks**
- `task test:unit` - Unit tests with 85% coverage
- `task test:integration` - Integration tests with 85% coverage
- `task test:e2e` - E2E tests (non-breaking)
- `task test:performance` - Performance tests (non-breaking)
- `task test:security` - Security tests (non-breaking)

### **Coverage Tasks**
- `task coverage:backend` - Backend coverage verification
- `task coverage:frontend` - Frontend coverage verification
- `task coverage:gateway` - Gateway coverage verification
- `task coverage:all` - All projects coverage verification

### **Act Tasks**
- `task act:setup` - Install and configure act
- `task act:run-quality` - Run quality workflow
- `task act:run-tests` - Run tests workflow
- `task act:run-push` - Run on push event
- `task act:run-pr` - Run on PR event
- `task act:list` - List workflows
- `task act:help` - Show help

## 🔧 **Configuration Files**

### **Act Configuration**
- `.actrc` - Act configuration
- `.secrets` - GitHub tokens and secrets
- `.env` - Environment variables

### **Coverage Tools**
- **Backend**: `cargo-tarpaulin`
- **Frontend**: `@vitest/coverage-v8`
- **Gateway**: `cargo-tarpaulin`

## 🏗️ **Architecture Compliance**

Following the exact architecture:
```
taskfile → taskfiles → cargo → backend/cargo → gateway/cargo → frontend/package.json
```

## 📊 **GitHub Actions Workflows**

### **Quality Reports** (`.github/workflows/quality-reports.yml`)
- Non-breaking quality checks
- Automatic issue creation
- PR comments

### **Test Coverage** (`.github/workflows/test-coverage.yml`)
- 85% coverage enforcement
- Unit and integration tests
- Coverage reporting

## 🐳 **Docker Support**

### **Act Images**
- Ubuntu: `nektos/act-environments-ubuntu:18.04`
- Alpine: `alpine:latest`
- Custom: Configurable via `.actrc`

## 📝 **Usage Examples**

### **Local Development**
```bash
# Setup everything
task setup:coverage
task act:setup

# Run tests with coverage
task test

# Check coverage
task coverage:all

# Run GitHub Actions locally
task act:run-tests
```

### **CI/CD Pipeline**
```bash
# Full CI pipeline
task ci

# Only tests (can break build)
task test:unit && task test:integration

# Coverage verification
task coverage:all
```

## 🔍 **Troubleshooting**

### **Act Issues**
```bash
# Check act installation
task act:check-act

# Setup secrets
task act:secrets-setup

# Clean containers
task act:clean-containers

# Run in debug mode
task act:run-debug
```

### **Coverage Issues**
```bash
# Install coverage tools
task test:setup:coverage

# Generate reports
task coverage:report

# Check specific project
task coverage:backend
```

## 🎨 **Color Coding**

- **✅ Green**: Success, requirements met
- **❌ Red**: Build breaking issues
- **⚠️ Yellow**: Non-breaking warnings
- **🔍 Blue**: Information/debug

## 📈 **Monitoring**

### **Coverage Reports**
- Generated in `./coverage/` directory
- HTML reports for each project
- XML reports for CI/CD

### **GitHub Issues**
- Automatically created for quality issues
- Weekly reports via scheduled workflows
- PR comments with actionable feedback