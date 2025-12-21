## Goal
Switch the repo to pnpm and remove Bun usage everywhere, so `pnpm install` works without errors and all dev/build tasks run on pnpm.

## What Triggered The Change
- Running `pnpm install` inside `frontend` shows:
  - Workspace warning: package.json uses `workspaces`, but pnpm expects `pnpm-workspace.yaml`.
  - Error: project is configured to use Bun. This is typically caused by a `packageManager` field or environment tooling pointing to Bun.

## Scope
- Frontend monorepo under `frontend/` (Astro + Vite + packages/apps)
- CI workflows and Vercel config
- Local helper scripts and Taskfiles
- Nix devShell

## Changes Overview
1) pnpm Workspace
- Add `frontend/pnpm-workspace.yaml` with packages:
  - `apps/*`, `packages/*`, `packages/components/*`, `packages/contexts/*`, `packages/services/*`
- Ensure a `pnpm-lock.yaml` is generated later by running `pnpm install`.
- Optional: add `"packageManager": "pnpm@latest"` to `frontend/package.json` to enforce pnpm.

2) Replace Bun Scripts With pnpm-Compatible Scripts
- frontend/package.json scripts:
  - `dev`: `astro dev`
  - `build`: `astro build`
  - `preview`: `astro preview`
  - `lint`: `eslint .`
  - `lint:fix`: `eslint . --fix`
  - `fmt`: `prettier --write .`
  - `fmt:check`: `prettier --check .`
  - `test`: `vitest`
  - `test:watch`: `vitest --watch`
  - `test:coverage`: `vitest --coverage`
- apps using Vite (booking, auth, dashboard):
  - Replace `bunx vite` with `vite` in `dev`, `build`, `preview`, `lint`, `test*` scripts
  - Keep `tsc && vite build` where used.

3) Remove Bun Artifacts
- Delete `frontend/bunfig.toml`
- Delete `frontend/apps/auth/bunfig.toml`
- Delete Bun build script `frontend/apps/auth/build.ts` if unused
- Remove any `bun.lockb` files if present
- In any `package.json` that has `"packageManager": "bun@..."`, change to `"pnpm@latest"` (addresses the “configured to use bun” error)

4) CI: Use pnpm Only
- .github/workflows/ci.yml:
  - Remove Bun setup step
  - Add pnpm setup: `pnpm/action-setup@v4`
  - Use Node 20+ with cache: `pnpm`
  - Replace commands:
    - Install: `cd frontend && pnpm install --frozen-lockfile`
    - Lint: `cd frontend && pnpm lint`
    - Format: `cd frontend && pnpm fmt:check`
    - Test: `cd frontend && pnpm test || echo "No tests found"`
    - Build: `cd frontend && pnpm build`

5) Vercel Config
- frontend/vercel.json:
  - `installCommand`: `pnpm install`
  - `buildCommand`: `pnpm build`
  - `devCommand`: `pnpm dev`
  - Optionally set `framework` to `astro` instead of `vite` if preferable

6) Local Scripts & Taskfiles
- frontend/scripts/build-frontend.sh:
  - Replace `bun install && bun run build` with `pnpm install && pnpm build`
- scripts/dev-services.sh:
  - Replace `bun run dev` with `pnpm run dev` in the concurrently block and process-kill logic
- scripts/setup-environment.sh:
  - Remove Bun checks/versions
  - Add pnpm support via Corepack:
    - `corepack enable` and `corepack use pnpm@latest`
    - Ensure `pnpm --version` check
- taskfiles/Taskfile.setup.yml:
  - Replace `cd frontend && bun install` with `cd frontend && pnpm install`
  - Remove `BUN_VERSION` var

7) Nix devShell (Optional but recommended)
- flake.nix:
  - Remove `bun-cli` from `buildInputs` and any references/echoes to Bun
  - Keep `pkgs.pnpm`

## Validation Plan
- Stop any running Bun dev/build processes
- Enable Corepack and pin pnpm:
  - `corepack enable && corepack use pnpm@latest`
- From repo root:
  - `cd frontend && pnpm install` (generates `pnpm-lock.yaml`)
  - `pnpm -C frontend dev` to run Astro
  - `pnpm -C frontend -r run build` to build all apps/packages
- CI should pass using pnpm-only steps
- Vercel should show pnpm in build logs

## Rollback
- Keep a branch before migration; revert file edits and resume Bun if required.

If you confirm, I’ll:
- Create `pnpm-workspace.yaml`
- Update package scripts and remove Bun artifacts
- Update CI/Vercel/Taskfiles/scripts and Nix
- Run `pnpm install`, build, and verify