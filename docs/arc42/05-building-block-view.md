# 5. Building Block View

This section describes the main building blocks and their responsibilities.

## 5.1 Whitebox: overall system

Top-level building blocks:
- Frontend (Astro static site)
- Gateway (Spin component) as single ingress/egress for backend/integrations
- Backend services (Rust/Wasm Spin components)
- Shared library crate for common types/utilities
- Domain model and database schemas/migrations tooling

```mermaid
flowchart TB
  subgraph Client
    browser[Browser]
  end

  subgraph Frontend
    fe[Astro static site]
  end

  subgraph SpinApp[Spin Application]
    gw[Gateway component]
    subgraph Services[Backend services (Rust/Wasm)]
      auth[auth-service]
      booking[booking-service]
      docs[document-validation-service]
      arrival[info-on-arrival-service]
      loc[location-service]
      notif[notification-service]
      rate[rate-limiter-service]
      reviews[reviews-service]
      sec[security-service]
      broker[mqtt-broker-service]
      redisSvc[redis-service]
    end
  end

  subgraph Data
    db[(Database)]
    redis[(Redis / KV)]
  end

  browser --> fe
  browser --> gw
  fe --> gw
  gw --> Services
  Services --> db
  Services --> redis