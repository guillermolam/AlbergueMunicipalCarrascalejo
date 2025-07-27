# Package Management Strategy

## 🚨 IMPORTANT: NO ROOT PACKAGE.JSON

This project uses a **multi-tool package management strategy**:

### 1. **System-Level Packages: NIX**

- All system tools, compilers, and runtime environments are managed via `replit.nix` and `flake.nix`
- Includes: Rust toolchain, Node.js, Bun, Caddy, PostgreSQL, testing tools, etc.
- **NO npm/yarn for system packages**

### 2. **JavaScript/Node.js Dependencies: BUN**

- Frontend dependencies managed in `frontend/package.json` using **Bun**
- Commands:
  ```bash
  cd frontend
  bun install
  bun run dev
  bun run build
  ```

### 3. **Rust Backend Dependencies: CARGO**

- All Rust services use `Cargo.toml` for dependency management
- Workspace configuration in root `Cargo.toml`
- Commands:
  ```bash
  cargo build --workspace
  cargo test --workspace
  ```

### 4. **Development Workflow**

- Use `task` (from Nix) for orchestrating builds across all package managers
- Main commands:
  ```bash
  task dev          # Start all services
  task build:all    # Build everything
  task test:unit    # Run all tests
  ```

## ❌ What NOT to do:

- Do NOT create a root `package.json`
- Do NOT use npm/yarn for system packages
- Do NOT mix package managers within the same service

## ✅ What to do:

- Use Nix for system dependencies
- Use Bun for frontend JavaScript packages
- Use Cargo for Rust backend packages
- Use Task for orchestration
