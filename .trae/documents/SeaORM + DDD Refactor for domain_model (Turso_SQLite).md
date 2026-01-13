## What I Found (Current Baseline)

- There are 3 competing “sources of truth” for the data model:
  - `domain_model/schemas/postgres.sql` and `domain_model/schemas/sqlite.sql` (coherent ERD: countries, pilgrims, beds, bookings, payments, notifications, audit_log, pricing).
  - `domain_model/migrations/*.sql` (partially overlaps but introduces different tables/columns and even conflicting definitions of notifications/audit_log/pricing).
  - `domain_model/schema.ts` (Drizzle/PG-core TS schema) defines yet another shape, including `government_submissions`, and omits `countries/notifications/audit_log`.
- Tests imply a core domain centered on: identity document capture + OCR, booking creation, bed inventory decrement, notifications, dashboard occupancy stats, and pricing calculation.

## DDD Target Shape (What “Convert migrations into a proper domain model” Means)

- Migrations become infrastructure artifacts (how data is stored).
- The domain model becomes explicit, pure Rust types:
  - Aggregates (e.g., Booking, Pilgrim/Identity)
  - Entities (e.g., Bed as inventory entity)
  - Value Objects (DocumentNumber, DateRange, Money, Email, Phone, NationalityCode)
  - Domain Events (BookingRequested, BookingConfirmed, BedReserved, IdentityVerified, PaymentCompleted, NotificationRequested)
  - Commands/Queries (CreateBooking, ValidateIdentityDocument, GetDashboardStats, etc.)
- SeaORM becomes the persistence adapter:
  - `DeriveEntityModel` / `DeriveEntity` map tables to persistence models.
  - Application services map Commands → Domain Events → persistence writes.

## SeaORM Architecture Mapping (per SeaORM layered design)

- Declaration stage: `EntityTrait/ColumnTrait/RelationTrait` generated into an `entity` crate.
- Query building stage:
  - High-level: `Entity::find/insert/update/delete` for common repository ops.
  - Mid-level: `Select/Insert/Update/Delete` for richer query composition.
  - Low-level: SeaQuery statements for SQLite/Turso-specific SQL needs.
- Execution stage: `DatabaseConnection` backed by SQLite/Turso driver.
- Resolution stage: result rows → SeaORM Models → mapped into Domain Entities/Value Objects.

## Proposed Refactor Output (Concrete Deliverables)

- `domain_model/` becomes a Rust workspace dedicated to the data + domain:
  - `domain_model/entity` (SeaORM entities, generated)
  - `domain_model/migration` (SeaORM migrations, generated + curated)
  - `domain_model/domain` (DDD: aggregates, VOs, events)
  - `domain_model/application` (commands/queries + use-cases)
  - `domain_model/infrastructure` (SeaORM repositories + mapping)
  - Optional: `domain_model/seaography` (GraphQL schema over entities and/or read models)
- A top-level `domain_model/README.md` with Mermaid diagrams:
  - ERD (tables/relations)
  - Context map / bounded contexts
  - Command → event flow for “registration/booking”
  - SeaORM layer mapping (declaration → query building → execution → resolution)

## Key Design Choices For Turso/SQLite

- SQLite lacks Postgres features used in the current SQL:
  - No `EXCLUDE USING gist` for overlapping bookings → enforce via transaction + query guard + unique strategy (and/or a “bed_reservations” table).
  - No `JSONB` → use `TEXT` (JSON serialized) or `BLOB`; SeaORM supports JSON via serde where driver allows; in SQLite it’s typically `TEXT`.
  - UUID strategy: either store as `TEXT` UUIDs (recommended for distributed systems), or keep integer PKs.
- Prefer to treat “no double booking” as a domain invariant enforced in application service + DB constraint where feasible.

## Work Plan (What I will implement after you confirm)

### 1) Choose the authoritative schema

- Reconcile the 3 schema tracks into a single SQLite-first schema (Turso).
- Produce a “schema decision report” in README: what we kept/dropped and why.

### 2) Create SeaORM workspace under `domain_model/`

- Add `Cargo.toml` workspace.
- Initialize SeaORM migration crate with `sea-orm-cli`.
- Define first migration(s) that implement the consolidated SQLite schema.

### 3) Generate and curate SeaORM entities

- Use `sea-orm-cli generate entity` against the SQLite schema.
- Ensure relations are correct (`belongs_to/has_many`) and naming stable.

### 4) Implement DDD domain crate

- Build aggregates + value objects inferred from tests:
  - `Booking` aggregate: status transitions (reserved/confirmed/checked_in/out/cancelled/expired), date range, total price, bed assignment.
  - `Identity` (Pilgrim) model: document type/number, validation status, OCR payload.
  - `Bed` inventory entity: status (available/reserved/occupied/maintenance/cleaning).
  - `Pricing` policy: effective-date pricing and money calculations.
- Define domain events and ensure they capture invariants without leaking DB concerns.

### 5) Application layer: commands/queries

- Commands (from E2E/unit tests):
  - `ScanIdentityDocument`, `UpsertPilgrimIdentity`, `CreateBooking`, `ReserveBed`, `ConfirmPayment`, `CancelExpiredReservations`, `SendNotification`.
- Queries:
  - `GetDashboardStats` (occupancy), `GetAvailableBeds`, `GetPricingForDates`.

### 6) Infrastructure: SeaORM repositories and mapping

- Implement repositories as ports + SeaORM adapters.
- Map persistence models ↔ domain types.

### 7) Seaography integration

- Generate a GraphQL API (Seaography) over:
  - Entities (admin/internal)
  - Or read models (if you prefer hiding internal tables)
- Document what is safe to expose (PII constraints).

### 8) Verification

- Add minimal Rust tests for:
  - Date range/night cap and no-overlap booking rule.
  - Value object parsing (NIE/passport constraints where applicable).
- Optionally add a lightweight integration test using SQLite in-memory.

### 9) Produce `domain_model/README.md`

- Mermaid diagrams:
  - ERD
  - Bounded context map
  - Sequence diagram for booking flow
  - SeaORM layering diagram

## Questions I Need Answered (to be 100% sure)

- Which schema is authoritative to converge on: `schemas/sqlite.sql`, `migrations/*.sql`, or `schema.ts`?
- ID strategy for Turso: `TEXT` UUIDs or integer PKs?
- Do you want to keep these tables/contexts if they exist only in some tracks: `reviews`, `info_on_arrival`, `locations`, `government_submissions`?
