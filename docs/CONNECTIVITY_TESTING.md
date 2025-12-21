# Connectivity Testing Strategy

This document outlines the connectivity testing strategy for the Albergue Municipal Carrascalejo monorepo, covering frontend ↔ gateway ↔ database integration across multiple environments.

## Architecture Overview

```
Frontend (Astro + TS + UnoCSS)
├── Local API Routes (Astro)
├── Mock Middleware (Development)
└── Gateway Integration (Spin/WASM)

Gateway (Rust + Spin)
├── Local Development (Spin up)
├── Cloud Deployment (Fermyon)
└── Health Checks & Endpoints

Database (PostgreSQL)
├── Local Container (Docker)
├── Cloud (Neon)
└── Migrations + Seeds + Tests
```

## Testing Modes

### A) Local Mode

Frontend serves API routes directly via Astro's API endpoints.

**Use Case**: Development, unit testing, CI
**Environment Variables**:

```bash
PUBLIC_API_MODE=local
PUBLIC_API_BASE_URL=http://localhost:3000
```

**Endpoints**:

- `GET /api/health` - Health check
- `POST /api/progress` - Progress sync

### B) Mock Mode

Frontend middleware intercepts requests and returns deterministic responses.

**Use Case**: Frontend development, component testing
**Environment Variables**:

```bash
PUBLIC_API_MODE=mock
```

**Features**:

- No external dependencies
- Deterministic responses
- Validation of request payloads
- Response headers indicate mock mode

### C) Gateway Mode

Frontend connects to real gateway (Spin) for full integration testing.

**Use Case**: Integration testing, production simulation
**Environment Variables**:

```bash
PUBLIC_API_MODE=gateway
PUBLIC_API_BASE_URL=http://localhost:3001  # or cloud URL
```

## Database Testing

### Local Ephemeral Database (CI Preferred)

```bash
# Start PostgreSQL container
task connectivity:db:up

# Apply migrations
task connectivity:db:migrate

# Apply test seeds
task connectivity:db:seed:test

# Run SQL tests
task connectivity:db:test:sql

# Cleanup
task connectivity:db:down
```

### Cloud Database (Optional)

```bash
# Set Neon connection
export DATABASE_URL="postgres://user:pass@neon-host/db"

# Run smoke test
task connectivity:smoke:spin:cloud
```

## Taskfile Commands

### Database Operations

```bash
# Database lifecycle
task connectivity:db:up          # Start PostgreSQL
task connectivity:db:down       # Stop PostgreSQL
task connectivity:db:migrate    # Apply migrations
task connectivity:db:seed:test  # Apply test data
task connectivity:db:test:sql    # Run SQL tests

# Gateway operations
task connectivity:gateway:test          # Run Rust tests
task connectivity:gateway:spin:up       # Start Spin gateway
task connectivity:gateway:spin:down   # Stop Spin gateway
task connectivity:gateway:smoke       # Health check

# Frontend operations
task connectivity:frontend:test:unit         # Unit tests
task connectivity:frontend:test:integration # Integration tests
task connectivity:frontend:test:e2e         # E2E tests
task connectivity:frontend:build             # Build frontend

# Mode runners
task connectivity:run:mode:local    # Local API mode
task connectivity:run:mode:mock    # Mock middleware mode
task connectivity:run:mode:gateway # Gateway integration mode
```

### Integrated Testing

```bash
# Full integration test (db + gateway + frontend)
task connectivity:smoke:e2e:integrated

# Cloud smoke test
task connectivity:smoke:spin:cloud

# Cleanup all services
task connectivity:clean:all
```

## CI/CD Pipeline

### GitHub Actions Jobs

1. **Frontend** - TypeScript, linting, unit tests, build
2. **Gateway** - Rust tests, clippy, format check
3. **Database** - Migrations, seeds, SQL tests
4. **Integration** - Cross-service integration tests
5. **E2E** - Playwright browser tests
6. **Security** - Dependency audits
7. **Performance** - Lighthouse CI
8. **Deploy Check** - Production readiness

### Environment Matrix

| Job         | API Mode | Database  | Gateway |
| ----------- | -------- | --------- | ------- |
| Unit Tests  | local    | mock      | none    |
| Integration | local    | container | local   |
| E2E         | local    | container | local   |
| Security    | local    | mock      | none    |
| Performance | local    | mock      | none    |

## Environment Variables

### Required Variables

```bash
# Frontend
PUBLIC_API_MODE=local|mock|gateway
PUBLIC_API_BASE_URL=http://localhost:3000|http://gateway:3001

# Database (local)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/albergue_test
DB_PORT=5432
DB_NAME=albergue_test
DB_USER=postgres
DB_PASSWORD=postgres

# Gateway
PORT_GATEWAY=3001
SPIN_APP_URL=https://app-xyz.fermyon.app  # for cloud smoke
```

### Optional Variables

```bash
# Frontend ports
PORT_FRONTEND=3000

# Test configuration
FRONTEND_URL=http://localhost:3000
CI=true  # for CI-specific behavior
```

## API Client Features

### Retry Logic

- Exponential backoff: 100ms, 200ms, 400ms
- Maximum retries: 2 (3 total attempts)
- Timeout: 5 seconds per request

### AbortController

- Request cancellation support
- Automatic cleanup on component unmount
- Per-request and global abort methods

### Non-blocking Operations

- `requestIdleCallback` with `setTimeout` fallback
- `queueMicrotask` for scheduling
- `keepalive: true` for reliability

### Error Handling

- Timeout errors (408)
- Network errors (retry logic)
- Validation errors (400)
- Server errors (500)

## Testing Best Practices

### Unit Tests

- Mock external dependencies
- Test individual functions
- Validate error scenarios
- Use deterministic data

### Integration Tests

- Test real API endpoints
- Validate request/response cycles
- Check error handling
- Test retry logic

### E2E Tests

- Test user workflows
- Validate UI interactions
- Check data flow end-to-end
- Test responsive behavior

### SQL Tests

- Validate schema integrity
- Test constraint enforcement
- Verify migration correctness
- Check data integrity

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check if container is running
   docker ps | grep postgres

   # Check logs
   docker logs albergue-postgres

   # Verify connection
   pg_isready -h localhost -p 5432
   ```

2. **Gateway Not Responding**

   ```bash
   # Check if Spin is running
   spin list

   # Check gateway logs
   spin logs

   # Test health endpoint
   curl http://localhost:3001/health
   ```

3. **Frontend Build Failures**

   ```bash
   # Clear cache
   rm -rf frontend/node_modules frontend/.astro

   # Reinstall dependencies
   pnpm install

   # Check TypeScript
   pnpm type-check
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=astro:* pnpm dev

# Verbose gateway logging
RUST_LOG=debug spin up

# Database query logging
# Add to PostgreSQL config:
log_statement = 'all'
log_min_duration_statement = 0
```

## Performance Considerations

### Request Optimization

- Use `keepalive: true` for better connection reuse
- Implement proper caching headers
- Minimize request payload size
- Use compression when available

### Database Optimization

- Use connection pooling
- Optimize query performance
- Implement proper indexing
- Monitor slow query logs

### Frontend Optimization

- Lazy load components
- Implement proper caching
- Use efficient bundling
- Monitor Core Web Vitals

## Security Notes

### API Security

- Validate all inputs server-side
- Implement rate limiting
- Use HTTPS in production
- Sanitize error messages

### Database Security

- Use parameterized queries
- Implement least privilege access
- Encrypt sensitive data
- Regular security audits

### Frontend Security

- Content Security Policy (CSP)
- XSS prevention
- CSRF protection
- Dependency vulnerability scanning

## Monitoring and Observability

### Health Checks

- `/api/health` - Frontend health
- `/health` - Gateway health
- Database connection monitoring
- Service dependency checks

### Metrics

- Request latency
- Error rates
- Database query performance
- Resource utilization

### Logging

- Structured logging with correlation IDs
- Request/response logging
- Error tracking
- Performance monitoring

This connectivity testing strategy ensures reliable integration across all components while maintaining development velocity and production stability.
