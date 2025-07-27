
# Spin Framework Instructions

## ⚠️ IMPORTANT: NO EXPRESS.JS

This project runs exclusively on **Fermyon Spin** framework. Express.js is **NOT USED** anywhere in the codebase.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Spin Gateway   │
│   (Vite)        │───▶│   (port 8000)    │
│   port 5173     │    │                  │
└─────────────────┘    └──────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   WASM Services      │
                    │   • booking-service  │
                    │   • reviews-service  │
                    │   • security-service │
                    │   • validation-service│
                    └──────────────────────┘
```

## Development Workflow

### 1. Build WASM Services
```bash
./scripts/build-wasm.sh
```

### 2. Start Spin Gateway
```bash
cd gateway
spin up --listen 0.0.0.0:8000
```

### 3. Start Frontend (separate terminal)
```bash
cd frontend
npx vite --host 0.0.0.0 --port 5173
```

## Service Implementation Rules

### ✅ DO - Rust WASM Services
- Implement all business logic in Rust
- Use `spin_sdk::http_component` macro
- Handle HTTP requests/responses directly
- Return JSON responses with proper CORS headers

Example service structure:
```rust
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
};

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<impl IntoResponse> {
    // Handle routing and business logic here
    let response = Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(serde_json::to_string(&data)?)
        .build();
    
    Ok(response)
}
```

### ❌ DON'T - Express.js or Node.js Backend
- No `express()` apps
- No middleware chains
- No `app.listen()` or server creation
- No Node.js HTTP servers

## API Routing

All API routes are defined in `gateway/spin.toml`:

```toml
[[component]]
id = "booking-service"
source = "../services/booking-service/target/wasm32-unknown-unknown/release/booking_service.wasm"
[component.trigger]
route = "/api/booking/..."

[[component]]
id = "reviews-service"
source = "../services/reviews-service/target/wasm32-unknown-unknown/release/reviews_service.wasm"
[component.trigger]
route = "/api/reviews/..."
```

## Frontend Integration

Frontend communicates with backend via API calls to `http://localhost:8000/api/*`:

```typescript
// ✅ Correct - API calls to Spin services
const response = await fetch('/api/booking/dashboard/stats');
const data = await response.json();

// ❌ Wrong - No Express routes
// app.get('/api/booking/stats', handler); // DON'T DO THIS
```

## Database Access

Use `sqlx` in Rust services for database operations:

```rust
// In Rust WASM service
use sqlx::PgPool;

async fn get_bookings(pool: &PgPool) -> Result<Vec<Booking>, sqlx::Error> {
    sqlx::query_as!(
        Booking,
        "SELECT * FROM bookings WHERE status = $1",
        "active"
    )
    .fetch_all(pool)
    .await
}
```

## Environment Variables

Set in `.env.spin` file (not `.env`):

```bash
# Database
NEON_DATABASE_URL=postgresql://user:pass@host/db

# External APIs
VITE_LAMBDA_OCR_URL=https://...
VITE_GOOGLE_PLACES_API_KEY=...
```

## Testing

### Unit Tests (Rust)
```bash
cargo test
```

### Integration Tests
```bash
# Test Spin services directly
curl http://localhost:8000/api/booking/pricing
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### To Fermyon Cloud
```bash
spin login
spin deploy
```

### To Replit
Use Replit's Spin runtime support for deployment.

## Common Pitfalls

1. **Don't** create Express.js servers in any file
2. **Don't** use `app.listen()` or HTTP server creation
3. **Don't** implement middleware chains
4. **DO** use Spin's HTTP component pattern
5. **DO** handle CORS in each WASM service
6. **DO** return proper HTTP responses from Rust

## File Structure Rules

```
services/
├── booking-service/
│   ├── src/lib.rs          # ✅ Spin HTTP component
│   └── Cargo.toml          # ✅ Rust dependencies
├── reviews-service/
│   ├── src/lib.rs          # ✅ Spin HTTP component
│   └── Cargo.toml          # ✅ Rust dependencies
└── shared/
    └── src/lib.rs          # ✅ Common types/utilities

frontend/
├── src/                    # ✅ React components
├── server/
│   └── index.ts            # ✅ Vite dev server only
└── bun                     # ✅ Frontend dependencies only

gateway/
├── spin.toml              # ✅ Spin app configuration
└── bff/                   # ✅ Gateway BFF service
```

Remember: **Everything backend runs as Rust WASM in Spin. No Express.js anywhere.**
