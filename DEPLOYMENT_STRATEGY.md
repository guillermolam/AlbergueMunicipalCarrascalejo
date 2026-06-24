# Fermyon/Cloudflare Free Tier Deployment Strategy

## Free Tier Constraints Analysis

### Fermyon Spin Starter
- **5 apps max** - Hard limit
- **100MB/app** - WASM size limit (generous)
- **100K requests/month** - ~3.3K/day combined across all services
- **1GB KV store** - Total key-value storage

### Cloudflare Workers Free
- **100K requests/day** - Per worker (more generous than Fermyon)
- **3MB compressed / 64MB uncompressed** - Per Worker WASM limit
- **50 subrequests/day** - Per request (outbound HTTP)
- **10ms CPU default** - Can burst to ~30s on initial call

## Current Service Analysis

| Service | Endpoints | Lines of Code | Dependencies | Est. WASM Size | Coupling | Recommendation |
|---------|-----------|---------------|--------------|---------------|----------|----------------|
| **gateway** | Routes /api/* | ~500 | spin, http, serde | ~1MB | Routes to all | Keep on Fermyon |
| **auth-service** | 5 (/login, /callback, /logout, /refresh, /.well-known) | ~400 | openidconnect, jsonwebtoken, spin-sdk | ~2-3MB | Standalone (auth boundary) | Spin only - Cloudflare incompatible |
| **booking-service** | 4 (/bookings, /rooms, /dashboard/stats, /pricing) | ~267 | spin-sdk, shared | ~1-1.5MB | Standalone | Split route stats, keep core |
| **info-on-arrival-service** | 7+ endpoints | ~600 | scrapers, postgres | ~2-4MB | Split by function | **Must split** for Cloudflare |
| **notification-service** | 2 (/send/email, /booking-confirmation) | ~300+ | smtp/telegram/whatsapp variants | ~2-3MB | Standalone | Keep unified, Cloudflare compatible |
| **rate-limiter-service** | 3 (/rate-limit/*) | ~272 | spin-sdk, tokio | ~1-2MB | Standalone | Keep unified |
| **reviews-service** | 4 (/reviews/*) | ~318 | spin-sdk, serde | ~1-2MB | Split source vs aggregation | **Split recommended** |
| **redis-service** | placeholder | ~50 | spin-sdk | ~0.5MB | Standalone | Simplify or remove |

## Deployment Plan

### Platform Assignment Matrix

| Service | Target | Rationale |
|---------|--------|-----------|
| **App 1: api-gateway** | Fermyon Spin | Routing layer, internal service calls |
| **App 2: auth-service** | Fermyon Spin | Requires persistent sessions, JWT signing |
| **App 3: booking-service** | Fermyon Spin | Hardcoded data OK, future DB integration |
| **App 4: info-split** | Cloudflare Workers | Multiple small modules, can fit 3MB limit |
| **App 5: core-services** | Fermyon Spin | notification + rate-limiter + reviews |

### Info-on-Arrival Split Strategy (for Cloudflare)

Split into separate Workers under 3MB each:

```
info-attractions-worker/     ~1MB
  - /api/info/merida-attractions
  
info-emergency-worker/      ~0.8MB  
  - /api/info/emergency-contacts
  
info-route-worker/          ~0.9MB
  - /api/info/route-map
  
info-local-worker/          ~0.8MB
  - /api/info/carrascalejo-info
  - /api/info/all-cards
  
info-dining-worker/         ~1.2MB
  - /api/info/restaurants
  - /api/info/taxis
  - /api/info/car-rentals
```

### Reviews-Service Split Strategy (for Cloudflare)

If deploying to Cloudflare, split into:

```
reviews-source-worker/      ~1MB
  - /reviews/google
  - /reviews/booking (static data)
  
reviews-aggregation-worker/ ~1MB
  - /reviews/all
  - /reviews/stats
```

## Shared Code Abstraction Layer

Create `backend/shared/src/platform.rs`:

```rust
/// Platform abstraction for HTTP types
pub mod http {
    #[cfg(feature = "spin")]
    pub use spin_sdk::http::{Request, Response, Method};
    
    #[cfg(feature = "workers")]
    pub use worker::{Request, Response, Method};
}

/// Platform abstraction for KV storage
pub mod storage {
    #[cfg(feature = "spin")]
    pub use spin_sdk::key_value::Store;
    
    #[cfg(feature = "workers")]
    pub use worker_kv::KvStore;
}

/// Platform abstraction for outbound HTTP client
pub mod client {
    #[cfg(feature = "spin")]
    pub use spin_sdk::http::Client;
    
    #[cfg(feature = "workers")]
    pub use worker::Fetch;
}
```

## WASM Size Optimization Strategies

### Build Configuration
- Use `wasm32-wasi` or `wasm32-wasip1` target
- Enable `--release` builds with LTO
- Strip debug symbols: `wasm-strip`
- Use `wee_alloc` or `dlmalloc` for smaller memory footprint

### Code Reduction
1. Remove unused dependencies from individual services
2. Extract common types to shared crate
3. Use `#[cfg(feature = "...")]` for platform-specific code
4. Replace `serde_json` with `jsonwebtokens` for smaller JWT handling

### Estimated Size Reduction
- Full info-on-arrival-service: ~4MB → Split workers: ~1MB each
- Full reviews-service: ~2MB → Split: ~1MB each
- With LTO and stripping: ~20-30% reduction possible

## Routing Strategy

### Fermyon (using Spin routing)
```toml
[[trigger.http]]
route = "/api/auth"
component = "auth-service"

[[trigger.http]]  
route = "/api/bookings"
component = "booking-service"
```

### Cloudflare (using Wrangler)
Deploy separate Workers with routes:

```toml
# info-attractions/wrangler.toml
[vars]
SERVICE_NAME = "info-attractions"

[[kv_namespaces]]
binding = "CARD_CACHE"
id = "..."
```

Routes will be configured via:
```
/api/info/merida-attractions  -> info-attractions-worker
/api/info/emergency-contacts -> info-emergency-worker
/api/info/route-map          -> info-route-worker
/api/info/carrascalejo-info  -> info-local-worker
/api/info/restaurants        -> info-dining-worker
```

## Request Volume Considerations

### Daily Request Budget (Cloudflare: 100K/worker/day)
- info-attractions: 10K/day
- info-emergency: 2K/day (static, high cacheability)
- info-route: 5K/day
- info-local: 8K/day
- info-dining: 15K/day

Total: ~40K/day for info services, well under 50K subrequest limit

### Monthly Request Budget (Fermyon: 100K/month)
- auth-service: 20K/month (spiky during check-in times)
- booking-service: 30K/month
- notification: 10K/month
- rate-limiter: 20K/month
- reviews: 20K/month

## Implementation Steps

1. **Phase 1**: Create platform abstraction in shared crate
2. **Phase 2**: Add `spin` and `workers` features to Cargo.toml files
3. **Phase 3**: Split info-on-arrival-service into 5 workers
4. **Phase 4**: Split reviews-service into source/aggregation workers
5. **Phase 5**: Create wrangler.toml for each Cloudflare worker
6. **Phase 6**: Update gateway routing for split services

## Service Coupling Analysis

### Tightly Coupled (Must Stay Together)
- **auth-service**: Uses openidconnect, requires JWT signing - Spin only
- **booking-service**: Simple CRUD, no external API calls - Both platforms

### Can Be Split
- **info-on-arrival-service**: Each endpoint returns independent InfoCard - Must split for Cloudflare
- **reviews-service**: Source vs aggregation logic - Can split

### Standalone (Independent)
- **notification-service**: Multiple adapters but single purpose - Keep unified
- **rate-limiter-service**: Single purpose, platform agnostic - Keep unified
- **redis-service**: Currently placeholder - Remove or simplify

## KV Store Strategy

### Fermyon (1GB total)
- Cache for info-on-arrival cards
- Rate limit counters
- Notification queue

### Cloudflare KV
- Cached per-worker for each info service
- Shared namespace for rate limiting (requires Durable Objects)

## Risk Mitigation

1. **Cold starts**: Cloudflare has faster cold starts than Fermyon
2. **KV consistency**: Use appropriate TTLs (24h for static data)
3. **Outbound limits**: Cache aggressively, pre-scrape where possible
4. **Error handling**: Each worker needs independent error responses