## Current State Audit

- Migrations exist and implement `up`/`down` and use SeaQuery DDL (`Table::create`, `ColumnDef`, `ForeignKey`, `Index`).
- They currently deviate from the guide mainly in structure and naming conventions:
  - Each file manually implements `MigrationName` instead of using `#[derive(DeriveMigrationName)]`.
  - Migrations live under `src/migration/` and `src/lib.rs` just re-exports `pub mod migration;`, whereas the guide’s canonical layout places migration modules directly under `migration/src/` and defines `Migrator` in `migration/src/lib.rs`.
  - README guidance should match the guide’s recommendation to generate migrations via `sea-orm-cli migrate generate` (or use the template), and to register each migration in `MigratorTrait::migrations`.

## Refactor Goals (match the guide)

- Use the official migration file template style:
  - `#[derive(DeriveMigrationName)] pub struct Migration;`
  - `#[async_trait::async_trait] impl MigrationTrait for Migration { ... }`
- Ensure naming convention and module registration:
  - Migration files named `mYYYYMMDD_HHMMSS_<name>.rs`.
  - Explicitly registered in `MigratorTrait::migrations()` in chronological order.
- Keep SeaQuery-based DDL (still fully compliant with the guide).

## Implementation Steps

1. **Restructure the migration crate layout**
   - Move `Migrator` definition from `src/migration/mod.rs` into `crates/migration/src/lib.rs`, following the guide’s `migration/src/lib.rs` pattern.
   - Flatten module structure by moving files from `src/migration/m20260111_*.rs` into `crates/migration/src/` (same folder as `lib.rs`).
   - Update module declarations accordingly and delete the extra `migration` module layer.

2. **Update each migration file to the guide’s template**
   - Replace `impl MigrationName for Migration { ... }` with `#[derive(DeriveMigrationName)]`.
   - Keep the SeaQuery DDL logic intact, but ensure each `down()` cleanly reverts `up()`.
   - Add `if_exists()` to `drop_table` calls for safer down migrations (optional but aligned with “multiple DDL with conditions”).

3. **(Optional but aligned) Add explicit “conditions” examples where valuable**
   - For complex objects (indexes / foreign keys), optionally guard operations using `SchemaManager` inspection methods (`has_table`, `has_index`) if needed.
   - This is only added where it improves safety; otherwise `.if_not_exists()` is retained.

4. **Update README to match the guide’s workflow**
   - Replace/augment migration creation instructions to reference:
     - `sea-orm-cli migrate generate <name>` and/or the official template.
   - Explicitly document: naming convention, registration in `MigratorTrait::migrations`, and the schema-first workflow (write migrations first → generate entities from the live DB).

## Verification

- Run `cargo test --manifest-path domain_model/rust/Cargo.toml`.
- Run a local migration cycle on SQLite:
  - `cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- up`
  - `cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- down`
- If you want, also test against Turso via the embedded-replica flow you already have.

## Deliverables

- Migration crate reorganized to match SeaORM docs layout.
- All migrations updated to `DeriveMigrationName` + canonical template.
- README migration section updated to follow the official guide end-to-end.
