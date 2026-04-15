# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Multicloud backend architecture: Cloudflare Workers (wasm32-unknown-unknown),
  Spin/Fermyon (wasm32-wasip2), Oracle Cloud ARM (Docker)
- OPA Rego policy framework (22 rules) with pre-commit and commit-msg hooks
- P022 large-file prevention policy (50 MB hard block, 5 MB warning, binary
  extension blocklist)
- Spin deployment pipeline (`deploy-spin.yml`) for gateway, auth, rate-limiter,
  redis services
- Spacelift infrastructure orchestration with 4 stacks (platform, cloudflare,
  databases, compute)
- Terratest integration tests for Cloudflare and OCI compute stacks
- CODEOWNERS, SECURITY.md, CHANGELOG.md, LICENSE
- Dependabot configuration for npm, Cargo, GitHub Actions, Terraform, Go, Docker
- Neo-brutalism design system (UnoCSS presetMini, no Tailwind)
- Astro 6.x frontend with Solid.js islands and Alpine.js

### Changed

- Enforced runtime target matrix: Workers services use `worker` crate only, Spin
  services use `spin-sdk` only
- Migrated `deploy-backend.yml` from wasm32-wasip2 to wasm32-unknown-unknown
- Updated `gateway/spin.toml` from wasip1 to wasip2
- Restructured infra/ into modules, stacks, environments, and policies
- README rewritten to reflect multicloud architecture and policy framework
- Expanded Dependabot to cover all 7 ecosystems

### Removed

- Deleted `backend/api-service/` (replaced by per-domain Workers services)
- Deleted `backend/mqtt-broker-service/` (not needed for MVP)
- Deleted `backend/redis-cache-service/` (replaced by `redis-service` on Spin)
- Removed spin.toml from all Cloudflare Workers services (wrong runtime target)
- Removed wrangler.toml from `backend/ocr-service/` (OCI Docker target)
- Removed GIS binary files (TIF, LAZ, ECW) from git history
- Deleted 13 stale branches (trunk-based development enforcement)

### Fixed

- Fixed `deploy-backend.yml` build target (was wasip2, now wasm32-unknown-unknown)
- Fixed dangling `[[trigger.http]]` entries in root `spin.toml`
- Fixed Spacelift admin login policy identity check logic
- Fixed OCI instance timezone default (Europe/Rome to Europe/Madrid)
- Added missing OCI compute outputs and startup.sh script

### Security

- Added P009 secret detection (PRIVATE*KEY, ghp*, sk*live*, etc.)
- Added P015 policy immutability (security/policies/ read-only for agents)
- Added P018-P021 anti-bypass rules (scanner config weakening, mass
  suppressions, test deletion, .gitignore manipulation)
- Added P022 large-file and binary-extension blocking
- Spacelift admin login requires GitHub OIDC, MFA, team membership, 4-hour
  session limit
