# 3. System Scope and Context

## 3.1 Business context

The system supports:
- Pilgrims/guests looking for information and booking-related interactions
- Staff/admin users needing operational visibility and service management UI

External actors and systems (representative):
- Identity providers (OIDC) used by the auth service / gateway auth flows
- Data stores (Postgres/SQLite/Turso/libSQL depending on environment)
- Redis (rate-limiting, caching, broker persistence depending on component)

## 3.2 Technical context

High-level flow:
- Browser loads static frontend assets
- Browser calls gateway HTTP endpoints (`/api/...`) for dynamic data
- Gateway routes requests to backend Spin components and controls outbound policy
- Backend services call external systems only through allowed outbound hosts

### Context diagram

```mermaid
flowchart LR
  user[User / Browser] --> fe[Frontend (Astro static)]
  fe --> gw[Gateway (Spin component)]
  gw --> svc[Backend services (Rust/Wasm)]
  svc --> db[(Database)]
  svc --> redis[(Redis / KV)]
  svc --> ext[External APIs]
  gw --> ext
```

See also:
- [5. Building Block View](05-building-block-view.md)
- [7. Deployment View](07-deployment-view.md)