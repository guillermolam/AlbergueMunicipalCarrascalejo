# Gateway BFF Architecture

This directory contains the Backend for Frontend (BFF) architecture for Albergue Del Carrascalejo.

## Structure

```
gateway/
├── Caddyfile                 # Caddy configuration for alberguedelcarrascalejo.com
├── spin.toml                 # Spin application configuration
├── bff/                      # Composed Rust BFF microservice
│   ├── Cargo.toml           # Single Cargo.toml for all services
│   └── src/
│       ├── lib.rs           # Entry-point routing (security → rate → auth → booking)
│       ├── auth_verify.rs   # Auth0 JWT verification
│       ├── booking_service/
│       │   └── lib.rs       # Booking endpoints
│       ├── rate_limiter_service/
│       │   └── lib.rs       # Rate limiting logic
│       └── security_service/
│           └── lib.rs       # Security scanning and validation
├── deploy.sh                # Deployment script to Fermyon Spin Cloud
└── README.md               # This file
```

## Services Architecture

The BFF follows a composed microservice pattern where all services are compiled into a single WASM component with internal routing:

1. **Security Service** (`/api/security/*`) - First line of defense
2. **Rate Limiter** (`/api/rate-limit/*`) - Traffic control  
3. **Auth Verify** (`/api/auth/*`) - Auth0 JWT validation
4. **Booking Service** (`/api/booking/*`) - Core business logic

## Build & Deploy

```bash
# Build the BFF WASM component
cd bff && cargo build --target wasm32-wasi --release

# Deploy to Fermyon Spin Cloud
bash deploy.sh
```

## Domain Configuration

- Production: `alberguedelcarrascalejo.com` (Caddy with Let's Encrypt TLS)
- Development: `e8cc356a-247c-4e26-bebe-c81e2720d706-00-c9097ozkhla1.picard.replit.dev` (Replit internal TLS)
- Deployment: `alberguecarrascalejo.fermyon.app` (Fermyon Spin Cloud)

The Caddyfile handles static file serving from `../frontend/dist` and proxies API requests to the Spin gateway for both production and development domains.