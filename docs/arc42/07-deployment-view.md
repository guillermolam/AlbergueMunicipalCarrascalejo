# 7. Deployment View

## 7.1 Typical deployment

Primary target is Spin/Fermyon.

```mermaid
flowchart TB
  user[Browser] --> edge[Platform edge (TLS/HTTP2)]
  edge --> spin[Spin host]

  subgraph spin[Spin application]
    fe[Static files / frontend]
    gw[Gateway component]
    svc[Backend components]
  end

  gw --> ext[External services]
  svc --> ext
  svc --> db[(Database)]
  svc --> redis[(Redis / KV)]
```

## 7.2 Optional native edge proxy

A native Rust edge proxy can be used in front of Fermyon/Spin when self-managed TLS termination or additional edge controls are required.

See: [Edge proxy notes](../reference/README.md#spin--fermyon--wasm)