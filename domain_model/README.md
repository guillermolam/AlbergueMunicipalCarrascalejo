# Domain Model (DDD) + SeaORM + Seaography (Turso/SQLite)

This folder is the **domain model baseline** for the Albergue Municipal Carrascalejo system.

**Single source of truth:** [schema.ts](file:///wsl.localhost/Ubuntu/home/glam/git/personal/AlbergueMunicipalCarrascalejo/domain_model/schema.ts)

Target database: **Turso (SQLite-compatible)**.

## Why this refactor

- The current `schema.ts` expresses the data model used by the frontend and tests.
- We want a **DDD-oriented domain model** (aggregates, value objects, domain events, commands/queries).
- We want a **persistence implementation** using **SeaORM** (Entity / Model / ActiveModel) and **SeaORM migrations**.
- We want an optional **GraphQL API** over the persistence model using **Seaography**.

SeaORM is designed as **layered abstraction**: declaration (entities) â†’ query building (Entity / Select / SeaQuery) â†’ execution (Selector/Inserter/Updater/Deleter) â†’ resolution (rows â†’ Rust types, relations stitched). This refactor aligns those layers with DDD boundaries.

---

## Current Data Model (from schema.ts)

Tables in `schema.ts`:

- `users`
- `pilgrims`
- `beds`
- `bookings`
- `payments`
- `pricing`
- `government_submissions`

### ER Diagram

```mermaid
erDiagram
  USERS {
    int id PK
    string username UK
    string password
    datetime created_at
  }

  PILGRIMS {
    int id PK
    string first_name_encrypted
    string last_name_1_encrypted
    string last_name_2_encrypted
    string birth_date_encrypted
    string document_type
    string document_number_encrypted
    string document_support
    string gender
    string nationality
    string phone_encrypted
    string email_encrypted
    string address_country
    string address_street_encrypted
    string address_street_2_encrypted
    string address_city_encrypted
    string address_postal_code
    string address_province
    string address_municipality_code
    string id_photo_url
    string language
    bool consent_given
    datetime consent_date
    datetime data_retention_until
    datetime last_access_date
    datetime created_at
    datetime updated_at
  }

  BEDS {
    int id PK
    int bed_number
    int room_number
    string room_name
    string room_type
    decimal price_per_night
    string currency
    bool is_available
    string status
    datetime reserved_until
    datetime last_cleaned_at
    string maintenance_notes
    datetime created_at
    datetime updated_at
  }

  BOOKINGS {
    int id PK
    int pilgrim_id FK
    string reference_number UK
    date check_in_date
    date check_out_date
    int number_of_nights
    int number_of_persons
    int number_of_rooms
    bool has_internet
    string status
    int bed_assignment_id FK
    string estimated_arrival_time
    string notes
    decimal total_amount
    datetime reservation_expires_at
    datetime payment_deadline
    bool auto_cleanup_processed
    datetime created_at
    datetime updated_at
  }

  PAYMENTS {
    int id PK
    int booking_id FK
    decimal amount
    string payment_type
    string payment_status
    string currency
    string receipt_number
    datetime payment_date
    datetime payment_deadline
    string transaction_id
    json gateway_response
    datetime created_at
    datetime updated_at
  }

  PRICING {
    int id PK
    string room_type
    string bed_type
    decimal price_per_night
    string currency
    bool is_active
    datetime created_at
    datetime updated_at
  }

  GOVERNMENT_SUBMISSIONS {
    int id PK
    int booking_id FK
    string xml_content
    string submission_status
    json response_data
    int attempts
    datetime last_attempt
    datetime created_at
  }

  PILGRIMS ||--o{ BOOKINGS : has
  BEDS ||--o{ BOOKINGS : assigned_to
  BOOKINGS ||--o{ PAYMENTS : has
  BOOKINGS ||--o{ GOVERNMENT_SUBMISSIONS : reports
```

---

## Domain Model (DDD)

### Bounded Contexts

- **Identity**: capturing, validating, and retaining pilgrim identity (PII encrypted at rest)
- **Booking**: reservations, lifecycle, expiry rules, and payment capture
- **Inventory**: bed status, availability, maintenance/cleaning states
- **Pricing**: dynamic pricing rules for room/bed types
- **Compliance**: submission of required data to government systems

### Aggregates

- **PilgrimAggregate (Identity)**
  - Root: `Pilgrim`
  - Owns encrypted identity fields + consent/retention fields

- **BookingAggregate (Booking)**
  - Root: `Booking`
  - Child entities (modeled as separate tables but treated as part of aggregate in write-path):
    - `Payment`
    - `GovernmentSubmission`
  - References:
    - `PilgrimId` (required)
    - `BedId` (optional until assigned)

- **BedAggregate (Inventory)**
  - Root: `Bed`
  - Owns status transitions: `available | reserved | occupied | maintenance | cleaning`

- **PricingAggregate (Pricing)**
  - Root: `PricingRule`

- **UserAggregate (Auth)**
  - Root: `User`

### Aggregate Diagram

```mermaid
classDiagram
  class PilgrimAggregate {
    +PilgrimId id
    +EncryptedName firstName
    +EncryptedName lastName1
    +EncryptedName? lastName2
    +EncryptedBirthDate birthDate
    +Document document
    +Contact contact
    +Address address
    +Consent consent
    +Retention retention
  }

  class BookingAggregate {
    +BookingId id
    +ReferenceNumber reference
    +BookingPeriod period
    +BookingStatus status
    +Money total
    +PilgrimId pilgrimId
    +BedId? bedId
    +Deadline reservationExpiresAt
    +Deadline paymentDeadline
    +Payment[] payments
    +GovernmentSubmission[] submissions
  }

  class BedAggregate {
    +BedId id
    +BedNumber bedNumber
    +Room room
    +BedStatus status
    +Money pricePerNight
  }

  class PricingAggregate {
    +PricingId id
    +RoomType roomType
    +BedType bedType
    +Money pricePerNight
    +bool isActive
  }

  PilgrimAggregate --> BookingAggregate : referenced_by
  BedAggregate --> BookingAggregate : assigned_to
  PricingAggregate --> BedAggregate : prices
```

### Value Objects (examples)

- `BookingId`, `PilgrimId`, `BedId`, `PaymentId` (opaque identifiers)
- `ReferenceNumber`
- `BookingPeriod(check_in, check_out)`
- `Money(amount, currency)`
- `Email`, `Phone`
- `DocumentType`, `DocumentNumber`, `DocumentSupport`
- `BedStatus`, `BookingStatus`, `PaymentStatus`, `SubmissionStatus`
- `EncryptedString` (domain wrapper; encryption happens in adapters)

### Domain Events (examples)

- `PilgrimRegistered`
- `PilgrimConsentGranted`
- `BookingReserved`
- `BookingBedAssigned`
- `PaymentRequested`
- `PaymentRecorded`
- `BookingConfirmed`
- `BookingExpired`
- `BookingCancelled`
- `GovernmentSubmissionQueued`
- `GovernmentSubmissionSucceeded`
- `GovernmentSubmissionFailed`
- `BedStatusChanged`

### Commands and Queries

Commands (write):

- `RegisterPilgrim`
- `UpdatePilgrimContact`
- `ReserveBooking`
- `AssignBedToBooking`
- `RecordPayment`
- `ConfirmBooking`
- `ExpireReservations`
- `QueueGovernmentSubmission`
- `SetBedStatus`
- `SetPricingRule`

Queries (read):

- `GetBookingByReference`
- `GetPilgrimByDocument`
- `ListAvailableBeds(period, roomType)`
- `GetDashboardStats` (available/occupied/reserved/maintenance)
- `GetPricing(roomType, bedType)`

---

## Mapping DDD â†’ SeaORM internals

SeaORMâ€™s core types map cleanly to DDD layers:

- **Declaration stage (entities):**
  - One Rust module per table.
  - `#[derive(DeriveEntityModel)]` defines `Model` (read), `ActiveModel` (write).
  - `Relation` + `impl Related` encode foreign keys and navigation.

- **Query building stage:**
  - Simple CRUD: `Entity::find`, `Entity::insert`, `Entity::update`, `Entity::delete`.
  - Richer operations: `Select/Insert/Update/Delete` structs (filter, join, pagination).
  - Escape hatch: SeaQuery `SelectStatement`/`UpdateStatement` etc.

- **Execution stage:**
  - Queries are executed with `db: DatabaseConnection` and return `Result`.

- **Resolution stage:**
  - Rows are converted into `Model` (and `into_active_model()`), relations can be loaded.

DDD guidance:

- **Aggregates live in the domain crate**, independent of SeaORM.
- **Repositories live in the application layer** and use SeaORM entities as an adapter.
- **Domain events are emitted by command handlers**, persisted/published by adapters.

---

## Seaography (GraphQL over SeaORM)

Seaography can expose a GraphQL schema automatically from SeaORM entities (filters, pagination, nested relations).

Typical workflow:

```bash
cargo install sea-orm-cli@2.0.0-rc.27
cargo install seaography-cli@^2.0.0-rc

# Generate SeaORM entities (dense or compact) from SQLite schema
sea-orm-cli generate entity -u sqlite://albergue.db -o ./src/entities --seaography

# Generate a ready-to-run GraphQL server (axum/poem/actix)
seaography-cli -o ./ --entities ./src/entities --database-url sqlite://albergue.db albergue-graphql
```

---

## Event Flow (booking happy-path)

```mermaid
sequenceDiagram
  autonumber
  actor Pilgrim
  participant UI as Frontend/UI
  participant BookingApp as Booking Application
  participant Identity as Identity Domain
  participant Inventory as Inventory Domain
  participant Payments as Payments Adapter
  participant Compliance as Compliance Adapter

  Pilgrim->>UI: Start registration
  UI->>BookingApp: ReserveBooking(command)
  BookingApp->>Identity: RegisterPilgrim(command)
  Identity-->>BookingApp: PilgrimRegistered(event)
  BookingApp->>Inventory: Select/Assign bed (command)
  Inventory-->>BookingApp: BedStatusChanged(event)
  BookingApp-->>UI: BookingReserved(query result)

  UI->>Payments: RecordPayment(command)
  Payments-->>BookingApp: PaymentRecorded(event)
  BookingApp-->>UI: BookingConfirmed(query result)

  BookingApp->>Compliance: QueueGovernmentSubmission(command)
  Compliance-->>BookingApp: GovernmentSubmissionSucceeded(event)
```

---

## SeaORM Architecture (how weâ€™ll use it)

```mermaid
flowchart TB
  subgraph Declaration[Declaration stage]
    E[SeaORM Entities\nDeriveEntityModel + Relations]
  end

  subgraph QueryBuild[Query building stage]
    CRUD[Entity::find/insert/update/delete]
    Q[Select/Insert/Update/Delete]
    SQ[SeaQuery Statements]
  end

  subgraph Exec[Execution stage]
    DB[(DatabaseConnection)]
    X[Selector / Inserter / Updater / Deleter]
  end

  subgraph Resolve[Resolution stage]
    M[Model / ActiveModel]
    R[Relation materialization]
  end

  E --> CRUD --> Q --> SQ
  SQ --> X --> DB
  DB --> M --> R

  subgraph DDD[DDD layers]
    D[Domain\nAggregates + VOs + Events]
    A[Application\nCommands/Queries + Repos]
    P[Persistence Adapter\nSeaORM]
  end

  D --> A --> P
  P --> E
```

---

## Planned Improvements to schema.ts (still source-of-truth)

We will extend the schema to cover cross-cutting concerns already implied by the system:

- `notifications` (delivery attempts per booking/pilgrim)
- `audit_log` (GDPR/NIS2 access logging)

These will remain optional to adopt by existing UI flows until wired.

---

## Next steps (what will be added to the repo)

- A Rust workspace under `domain_model/rust/`:
  - `crates/domain`: aggregates, value objects, domain events
  - `crates/persistence`: SeaORM entities + repository adapters
  - `crates/migration`: SeaORM migrations (SQLite)
  - `crates/seaography`: optional GraphQL server over entities

- Updated `schema.ts` relationships and new tables (`notifications`, `audit_log`).

- Commands to run locally against SQLite (and later Turso):

```bash
# Run migrations (SQLite)
cargo run -p albergue-migration -- up

# Start GraphQL
DATABASE_URL=sqlite://albergue.db cargo run -p albergue-seaography
```

## Turso / libsql Connectivity

SeaORM connects via SQLx's SQLite driver, which expects a local SQLite file or local SQLite URI.
To connect to Turso (`libsql://...`), we use libsql embedded replicas to maintain a local SQLite file, then point SeaORM at that local file.

Turso (remote) quickstart:

```bash
turso auth login
turso db create albergue-dev
turso db show albergue-dev --url
turso db tokens create albergue-dev
```

Migrate and verify using a local replica:

```bash
export TURSO_DATABASE_URL="$(turso db show albergue-dev --url)"
export TURSO_AUTH_TOKEN="$(turso db tokens create albergue-dev)"
export TURSO_REPLICA_PATH=albergue.local.db

DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" TURSO_REPLICA_PATH="$TURSO_REPLICA_PATH" \
  cargo run -p albergue-turso-sync --manifest-path domain_model/rust/Cargo.toml

DATABASE_URL="sqlite://$TURSO_REPLICA_PATH" \
  cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- up

DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" TURSO_REPLICA_PATH="$TURSO_REPLICA_PATH" \
  cargo run -p albergue-turso-sync --manifest-path domain_model/rust/Cargo.toml

DATABASE_URL="sqlite://$TURSO_REPLICA_PATH" \
  cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- status
```

Validate on Turso:

```bash
turso db shell albergue-dev
```

Then run:

- `select name from sqlite_master where type = "table";`
- `select * from seaql_migrations order by version desc limit 20;`
- `select id, username from users where username = "synthetic_admin";`

GraphQL serves at `http://127.0.0.1:8000/graphql`.

## Migrations (SeaORM)

We use `sea-orm-migration` for schema evolution.

Create a new migration file (example pattern):

```bash
sea-orm-cli migrate generate <name>
```

Then implement MigrationTrait in the generated file and register it in MigratorTrait::migrations. Name files with mYYYYMMDD_HHMMSS_migration_name.rs and use #[derive(DeriveMigrationName)] for the migration struct.

Note: This is conceptually the same "first migration" workflow as typical tutorials: create the migration scaffolding, implement `up`/`down`, and run it against the database.

## Running Migrations (Cargo + sea-orm-cli)

SeaORM migrations can be applied from the terminal using either the migrator binary (Cargo) or `sea-orm-cli`. In both cases, set `DATABASE_URL`.

Common commands:

- Apply all pending migrations: `up`
- Rollback last applied migration: `down`
- Show status of all migrations: `status`
- Drop all tables then re-apply: `fresh`
- Rollback all then re-apply: `refresh`
- Rollback all applied: `reset`

Via Cargo (runs our migrator CLI):

```bash
DATABASE_URL=sqlite://albergue.db cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- up
DATABASE_URL=sqlite://albergue.db cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- status
DATABASE_URL=sqlite://albergue.db cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- fresh
```

Via sea-orm-cli (executes the same cargo command under the hood):

```bash
cargo install sea-orm-cli@2.0.0-rc.27
DATABASE_URL=sqlite://albergue.db sea-orm-cli migrate -d domain_model/rust/crates/migration up
DATABASE_URL=sqlite://albergue.db sea-orm-cli migrate -d domain_model/rust/crates/migration status
```

Via Turso (remote, using local replica):

```bash
DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" TURSO_REPLICA_PATH="$TURSO_REPLICA_PATH" \
  cargo run -p albergue-turso-sync --manifest-path domain_model/rust/Cargo.toml

DATABASE_URL="sqlite://$TURSO_REPLICA_PATH" \
  cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- status
```

Validate we're on the right track:

- After `up`/`fresh`/`refresh`, `status` should show all migrations as Applied.
- After `reset`, `status` should show all migrations as Pending.

Synthetic test data:

- The latest migration inserts a `synthetic_admin` user (if missing) so you can confirm the pipeline end-to-end.

## Logging (SeaORM + SQLx)

SeaORM logs SQL statements through the `tracing` crate. In this workspace we enable SeaORM statement logging via the `debug-print` feature flag and initialize `tracing-subscriber` in the binaries.

Statement logging:

- Build-time: enabled through `sea-orm` feature `debug-print`.
- Run-time: set `RUST_LOG=debug` (or a more specific filter) to view SQL statements.

SQLx logging:

- Controlled by `ALBERGUE_SQLX_LOGGING`:
  - `ALBERGUE_SQLX_LOGGING=true` enables SQLx logs
  - unset/false disables SQLx logs

Example:

```bash
RUST_LOG=debug ALBERGUE_SQLX_LOGGING=false DATABASE_URL=sqlite://albergue.db cargo run -p albergue-seaography --manifest-path domain_model/rust/Cargo.toml
```
