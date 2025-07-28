# Services - Albergue del Carrascalejo

This directory contains all Rust WASM microservices following Domain-Driven Design (DDD) with hexagonal architecture.

## Architecture Overview

All services follow this consistent structure:
```
services/<service-name>/
├── src/
│   ├── main.rs              # WASM exports & standalone main
│   ├── domain/              # Business logic & entities
│   ├── application/         # Use cases & orchestration
│   ├── ports/               # Interface definitions
│   ├── adapters/            # External integrations
│   └── infrastructure/      # Configuration & servers
├── tests/                   # Unit & integration tests
├── Cargo.toml              # Dependencies & build config
└── build.rs                # WASM build instructions
```

## Services Inventory

### 1. **shared** - Common Types & Utilities
- **Purpose**: Shared DTOs, error types, and database utilities
- **Key Features**: Cross-platform database support (PostgreSQL/SQLite)
- **Dependencies**: sqlx, serde, uuid, chrono

### 2. **booking-service** - Reservation Management
- **Purpose**: Handle all booking operations and bed management
- **Key Features**: 2-hour reservation windows, bed assignment, payment tracking
- **Ports**: BookingRepository, NotificationPort
- **Database**: Bookings, beds, pricing tables

### 3. **validation-service** - Document Processing
- **Purpose**: OCR and document validation (DNI, NIE, passports)
- **Key Features**: Tesseract OCR, checksum validation, confidence scoring
- **Ports**: OCRPort, ChecksumPort
- **Training Data**: `tests/ocr-training/` with real document samples

### 4. **country-service** - Nationality & Visa Handling
- **Purpose**: Country information and visa requirements
- **Key Features**: RESTCountries API integration, caching
- **Ports**: RestCountriesAPIPort
- **Cache**: In-memory country data with TTL

### 5. **security-service** - Authentication & Encryption
- **Purpose**: JWT validation, PII encryption, audit logging
- **Key Features**: Auth0 integration, AES-256-GCM encryption
- **Ports**: JWTPort
- **Compliance**: GDPR/NIS2 audit trails

### 6. **rate-limiter-service** - Request Throttling
- **Purpose**: API rate limiting and reservation timeouts
- **Key Features**: Token bucket algorithm, Redis storage
- **Ports**: StoragePort
- **Use Cases**: Prevent booking spam, enforce 2-hour limits

### 7. **notification-service** - Multi-Channel Messaging ✨ NEW
- **Purpose**: Send notifications via email, SMS, WhatsApp, Telegram
- **Key Features**: 
  - Template system with Handlebars
  - Multi-channel delivery with fallbacks
  - Booking confirmations, payment receipts, alerts
- **Adapters**: 
  - `email/nodemailer.rs` - SMTP via Resend/Nodemailer
  - `sms/twilio.rs` - SMS & WhatsApp via Twilio
  - `telegram/telegraf.rs` - Telegram Bot API
- **Templates**: Spanish localized notification templates

### 8. **info-on-arrival-service** - Content Management ✨ NEW
- **Purpose**: Provide arrival information cards to pilgrims
- **Key Features**:
  - Four card types: Mérida attractions, Carrascalejo info, emergencies, route maps
  - Web scraping for dynamic content updates
  - Caching with configurable expiration
  - Route planning with waypoints and difficulty levels
- **Adapters**:
  - `storage/postgres_cards_repo.rs` - Database persistence
  - `scraper/merida_scraper.rs` - Tourism content scraping
  - `scraper/carrascalejo_scraper.rs` - Local content management

## Deployment Architecture

### Development (WASM in Browser)
```bash
# Build all services
cargo build --target wasm32-unknown-unknown

# Generate WASM bindings
wasm-pack build services/notification-service --target web
wasm-pack build services/info-on-arrival-service --target web

# Frontend imports WASM modules
import { NotificationService } from '@wasm/notification-service';
import { InfoOnArrivalService } from '@wasm/info-on-arrival-service';
```

### Production (Spin/Fermyon)
```toml
# spin.toml
[[component]]
id = "notification-service"
source = "services/notification-service/target/wasm32-wasi/release/notification_service.wasm"

[[component]]
id = "info-service"
source = "services/info-on-arrival-service/target/wasm32-wasi/release/info_on_arrival_service.wasm"
```

## Cross-Service Communication

Services communicate through:
1. **Shared Types**: Common DTOs in `services/shared/src/lib.rs`
2. **Event Bus**: Notification events between booking → notification service
3. **Database**: Shared tables with foreign key relationships
4. **HTTP**: Gateway routes requests to appropriate services

## Testing Strategy

Each service includes:
- **Unit Tests**: `tests/unit_tests.rs` - Domain logic validation
- **Integration Tests**: `tests/integration_tests.rs` - End-to-end workflows
- **Training Data**: `tests/ocr-training/` (validation-service only)

Run tests for all services:
```bash
cargo test --workspace
```

## Environment Configuration

Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db
NEON_DATABASE_URL=postgresql://...

# Notifications
SMTP_HOST=smtp.resend.com
SMTP_PASSWORD=re_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TELEGRAM_BOT_TOKEN=xxx

# External APIs
AUTH0_DOMAIN=albergue.eu.auth0.com
REST_COUNTRIES_API_KEY=xxx
```

## Service Dependencies

```mermaid
graph TD
    A[shared] --> B[booking-service]
    A --> C[validation-service]
    A --> D[country-service]
    A --> E[security-service]
    A --> F[rate-limiter-service]
    A --> G[notification-service]
    A --> H[info-on-arrival-service]
    
    B --> G
    B --> F
    E --> B
    E --> C
    C --> D
```

## Building Services

```bash
# Build all services for development
cargo build --workspace

# Build specific service for WASM
cargo build -p notification-service --target wasm32-unknown-unknown

# Generate WASM bindings
wasm-pack build services/notification-service --target web --out-dir ../../pkg/notification-service

# Build for production (Spin)
cargo build --workspace --target wasm32-wasi --release
```

## Performance Considerations

- **WASM Bundle Size**: Each service ~200-500KB gzipped
- **Cold Start**: < 50ms for WASM instantiation
- **Memory Usage**: 2-8MB per service instance
- **Database Connections**: Pooled via `shared/src/db.rs`
- **Caching**: Redis for rate limiting, in-memory for countries/info cards

## Security Features

- **Input Validation**: Zod schemas at service boundaries
- **Authentication**: JWT validation in security-service
- **PII Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: All operations logged to `audit_log` table
- **Rate Limiting**: Prevent abuse and enforce business rules