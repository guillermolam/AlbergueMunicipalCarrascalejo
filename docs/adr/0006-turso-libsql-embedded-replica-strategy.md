# ADR 0006: Turso/libSQL embedded replica strategy

- Status: accepted
- Date: 2026-01-12

## Context

The project wants a workflow that supports:
- fast local reads
- repeatable migrations
- remote primary database (Turso/libSQL)

SeaORM/sqlx tooling works well with local SQLite files, while Turso remote uses the libSQL protocol.

## Decision

Adopt a split approach:
- local dev/tests: SQLite local file
- remote baseline: applied directly to Turso
- embedded replica sync: done via libsql tooling/processes (not by keeping SeaORM open on a syncing file)

## Consequences

- Migration workflow must distinguish local vs remote.
- Embedded replica sync must be isolated to avoid file corruption.

## Alternatives considered

- Single approach with SeaORM for everything: conflicts with Turso remote and embedded replica sync constraints.

## References

- Turso embedded replicas: [docs/TURSO_EMBEDDED_REPLICAS.md](../TURSO_EMBEDDED_REPLICAS.md)