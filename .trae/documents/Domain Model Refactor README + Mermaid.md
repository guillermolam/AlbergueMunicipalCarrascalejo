# domain_model: DDD + SeaORM + Seaography (Turso/SQLite)

This document defines the **domain model** (DDD), how it maps to the current schema in [schema.ts](file:///wsl.localhost/Ubuntu/home/glam/git/personal/AlbergueMunicipalCarrascalejo/domain_model/schema.ts), and how we will represent persistence with **SeaORM** (Entity/Model/ActiveModel) and expose read models via **Seaography**.

**Database**: Turso (SQLite-compatible). Development uses a local SQLite file and keeps SQL portable to Turso.

## Single Source Of Truth

- The current source of truth is [schema.ts](file:///wsl.localhost/Ubuntu/home/glam/git/personal/AlbergueMunicipalCarrascalejo/domain_model/schema.ts).
- We will extend it where the domain needs stronger invariants (constraints, relationships, extra entities), but we will not contradict it.

## Domain Overview

### Bounded Contexts

- **Identity & Compliance**: pilgrims, identity document handling metadata, GDPR retention fields.
- **Booking**: reservation lifecycle, deadlines/timeouts, bed assignment, booking reference.
- **Payments**: payment lifecycle and reconciliation.
- **Inventory**: bed availability/status, cleaning/maintenance.
- **Pricing**: room/bed type pricing.
- **Government Reporting**: MIR/SOAP submission tracking.

### Aggregates (DDD)

- **Pilgrim** (Aggregate Root)
  - Purpose: identity, contact, GDPR consent/retention.
  - Persistence: `pilgrims` table.

- **Booking** (Aggregate Root)
  - Purpose: reservation lifecycle with deadlines, optional bed assignment, payment window.
  - Entities inside aggregate (modeled as separate tables but domain-owned):
    - `Payment` (1..N) → `payments`
    - `GovernmentSubmission` (0..N) → `government_submissions`
  - Persistence: `bookings` plus child tables.

- **Bed** (Aggregate Root)
  - Purpose: availability and operational status (available/reserved/occupied/maintenance/cleaning).
  - Persistence: `beds`.

- **PricingRule** (Aggregate Root)
  - Purpose: pricing configuration by `(roomType, bedType)`.
  - Persistence: `pricing`.

- **User** (Aggregate Root)
  - Purpose: authentication identity.
  - Persistence: `users`.

## Mermaid Diagrams

### 1) ER Diagram (Current Schema.ts)

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
  BOOKINGS ||--o{ PAYMENTS : records
  BOOKINGS ||--o{ GOVERNMENT_SUBMISSIONS : reports
```

### 2) Aggregate Model (DDD)

```mermaid
classDiagram
  class Pilgrim {
    +PilgrimId id
    +EncryptedString firstName
    +EncryptedString lastName1
    +EncryptedString lastName2
    +Document document
    +Gender gender
    +CountryCode nationality
    +EncryptedPhone phone
    +EncryptedEmail email
    +Address address
    +GDPRConsent consent
    +RetentionPolicy retention
  }

  class Booking {
    +BookingId id
    +BookingReference reference
    +PilgrimId pilgrimId
    +StayPeriod stay
    +Guests guests
    +Rooms rooms
    +InternetOption hasInternet
    +BookingStatus status
    +BedId? bedAssignmentId
    +ETA? estimatedArrivalTime
    +Money total
    +Deadline reservationExpiresAt
    +Deadline paymentDeadline
  }

  class Payment {
    +PaymentId id
    +BookingId bookingId
    +Money amount
    +PaymentMethod method
    +PaymentStatus status
    +ReceiptNumber? receipt
    +GatewayTransactionId? transactionId
  }

  class GovernmentSubmission {
    +SubmissionId id
    +BookingId bookingId
    +XmlPayload xml
    +SubmissionStatus status
    +Attempts attempts
  }

  class Bed {
    +BedId id
    +BedNumber bedNumber
    +Room room
    +Money nightlyPrice
    +BedStatus status
    +ReservationHold? reservedUntil
  }

  class PricingRule {
    +PricingRuleId id
    +RoomType roomType
    +BedType bedType
    +Money nightlyPrice
    +IsActive active
  }

  Pilgrim "1" --> "0..*" Booking : makes
  Booking "1" --> "0..*" Payment : records
  Booking "1" --> "0..*" GovernmentSubmission : submits
  Booking "0..1" --> "1" Bed : assigns
```

### 3) Booking Flow (Commands → Events)

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as Gateway/Service
  participant Dom as Domain (Aggregates)
  participant DB as SQLite/Turso
  participant Bus as Events

  UI->>API: ReserveBooking(cmd)
  API->>Dom: Booking.reserve(cmd)
  Dom-->>API: BookingReserved(evt)
  API->>DB: Insert bookings + optional bed hold
  API->>Bus: publish BookingReserved

  UI->>API: RecordPayment(cmd)
  API->>Dom: Booking.recordPayment(cmd)
  Dom-->>API: PaymentRecorded(evt)
  API->>DB: Insert payments
  API->>Bus: publish PaymentRecorded

  UI->>API: ConfirmBooking(cmd)
  API->>Dom: Booking.confirm(cmd)
  Dom-->>API: BookingConfirmed(evt)
  API->>DB: Update bookings.status
  API->>Bus: publish BookingConfirmed

  API->>API: ExpireReservations(scheduled)
  API->>Dom: Booking.expireIfPastDeadline()
  Dom-->>API: BookingExpired(evt)
  API->>DB: Update bookings.status + release bed
  API->>Bus: publish BookingExpired
```

### 4) SeaORM Layered Abstraction (How We Use It)

SeaORM is a layered abstraction: declaration → query building → execution → resolution.

```mermaid
flowchart TD
  A[Declaration Stage\nDeriveEntityModel / DeriveRelation\nEntityTrait] --> B[Query Building Stage\nEntity::find/insert/update/delete\nSelect/Insert/Update/Delete]
  B --> C[SeaQuery Stage\nSelectStatement/InsertStatement\nSQL AST]
  C --> D[Execution Stage\nSelector/Inserter/Updater/Deleter]
  D --> E[Resolution Stage\nRow -> Model\nRelation hydration]

  subgraph App[DDD Application Layer]
    Cmd[Commands] --> Agg[Aggregates]
    Qry[Queries] --> RM[Read Models]
  end

  Agg -->|uses port| Repo[Repository Port]
  Repo -->|adapter| A
  RM -->|adapter| B
```

## Domain Invariants (Derived From Schema + Tests)

- A Booking has a **reservation deadline** and **payment deadline**.
- A Booking has a **date range** (`check_in_date`, `check_out_date`) and derived `number_of_nights`.
- Bed assignment is optional at reservation time; once assigned, it must reference an existing bed.
- Bed status is one of: available, reserved, occupied, maintenance, cleaning.
- Payments belong to a booking and can be multiple per booking.

## Commands & Queries

### Commands

- `RegisterPilgrim`
- `UpdatePilgrimContact`
- `ReserveBooking`
- `AssignBedToBooking`
- `RecordPayment`
- `ConfirmBooking`
- `CancelBooking`
- `ExpireBookingReservations` (scheduled)
- `SubmitGovernmentReport`
- `MarkBedStatus`
- `SetPricingRule`

### Queries

- `GetBookingByReference`
- `GetBookingsByPilgrim`
- `GetBedsByStatus`
- `GetAvailableBedsForDateRange`
- `GetPricing(roomType, bedType)`
- `GetDashboardStats` (occupancy/availability)

## Domain Events

- `PilgrimRegistered`
- `PilgrimUpdated`
- `GDPRConsentRecorded`
- `BookingReserved`
- `BookingBedAssigned`
- `BookingConfirmed`
- `BookingCancelled`
- `BookingExpired`
- `PaymentRecorded`
- `PaymentCompleted`
- `GovernmentSubmissionQueued`
- `GovernmentSubmissionSucceeded`
- `GovernmentSubmissionFailed`
- `BedStatusChanged`

## SeaORM Mapping (How Tables Become Entities)

For each table in `schema.ts`, SeaORM represents it as:

- `Model`: an immutable row type (what you query)
- `ActiveModel`: a mutable builder for inserts/updates
- `Entity`: the entry point for queries (`Entity::find()`, `Entity::insert()`, etc.)
- `Relation`: relation metadata (`belongs_to`, `has_many`) for eager/lazy loading

### Example Mapping (Bookings)

- `bookings` table → `bookings::Entity`
- `bookings::Model` corresponds to a stored booking snapshot
- `bookings::ActiveModel` is used by the persistence adapter to create/update rows
- `Relation` defines:
  - belongs_to `pilgrims`
  - belongs_to `beds` (optional)
  - has_many `payments`
  - has_many `government_submissions`

## Seaography (GraphQL)

Seaography can expose a GraphQL schema directly from SeaORM entities (including filters, pagination, and nested relations). Entities are generated with `--seaography`, then a GraphQL server can be scaffolded by `seaography-cli`.

## Next Repo Changes (After Approval)

1. Replace `domain_model/README.md` with this document.
2. Extend `schema.ts` with any missing domain-required entities/relations (e.g. notifications/audit log) and align with E2E expectations.
3. Add `domain_model/rust/` Cargo workspace:
   - domain crate (aggregates/value objects/events)
   - persistence crate (SeaORM entities)
   - migration crate (SeaORM migrations targeting SQLite)
   - seaography crate (GraphQL server scaffold)
4. Add runnable commands and minimal verification (cargo build/test; migration apply).
