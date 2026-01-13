## Goals

- Make `domain_model/schema.ts` the canonical schema reference for the DDD model.
- Produce an updated `domain_model/README.md` containing Mermaid diagrams for: ERD, aggregates/contexts, command→event flow, and SeaORM layer mapping.
- Refactor `domain_model/migrations/` into a Rust-first SeaORM migration + entity workflow suitable for Turso (SQLite).
- Add a Seaography GraphQL scaffold wired to the SeaORM entities.

## What I’ll Ship

- Updated documentation: `domain_model/README.md` rewritten around DDD + SeaORM + Seaography.
- A new Rust workspace under `domain_model/rust/`:
  - `crates/domain`: aggregates, value objects, domain events.
  - `crates/persistence`: SeaORM entities + repository adapters.
  - `crates/migration`: SeaORM migrations (SQLite/Turso).
  - `crates/seaography`: a runnable GraphQL server (Poem/Axum) using Seaography.
- Migration strategy bridging TypeScript schema → SQLite → SeaORM entities.

## Implementation Steps

### 1) Documentation first (no behavior change)

- Rewrite `domain_model/README.md` to:
  - Declare `schema.ts` as the source-of-truth.
  - Document aggregates, invariants, commands/queries, and domain events derived from `schema.ts` plus E2E/frontend tests.
  - Include Mermaid diagrams:
    - ER diagram for current tables.
    - Context/Aggregate map.
    - Booking happy-path + expiry flow (commands → events).
    - SeaORM layered abstraction mapped to ports/adapters.

### 2) Align schema gaps discovered during analysis

- Propose (and implement) missing tables/relationships that are implied by tests and existing SQL artifacts:
  - `notifications` and `audit_log` (already exist in SQL artifacts but not in `schema.ts`).
  - Optional normalization: `countries` and a `nationality_code` FK (only if we decide it’s worth keeping).
- Keep changes minimal and motivated by invariants/tests.

### 3) Create SeaORM workspace for Turso/SQLite

- Add `domain_model/rust/Cargo.toml` workspace.
- Add `sea-orm`, `sea-orm-migration`, and `tokio` dependencies.
- Implement persistence entities using `DeriveEntityModel`, `DeriveRelation`, and `ActiveModelBehavior`.

### 4) Migrations with sea-orm-migration + sea-orm-cli workflow

- Implement initial SQLite schema migration reflecting `schema.ts`.
- Add a repeatable workflow:
  - Apply migration to `albergue.db`.
  - Use `sea-orm-cli generate entity` (optionally with `--seaography`) to keep entities synchronized.

### 5) Seaography scaffold

- Add a runnable GraphQL server crate using Seaography and the generated entities.
- Add basic guardrails (depth/complexity limits) and a minimal `/graphql` endpoint.

### 6) Verification

- `cargo fmt`, `cargo clippy`, `cargo test` for the new workspace.
- Smoke-run migration against a local SQLite file.
- Start the Seaography server and validate schema generation.

## Key Design Decisions (documented in README)

- Aggregates: `Booking` as root; `Payment` and `GovernmentSubmission` as child entities by lifecycle.
- Value objects: `ReferenceNumber`, `DateRange`, `Money`, `DocumentType`, `Encrypted<T>` wrappers.
- SeaORM usage follows its layered abstraction (Entity → Select/Insert/Update/Delete → SeaQuery statements → execution → resolution), with DDD ports shielding domain code.
