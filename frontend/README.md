# Albergue Municipal Carrascalejo - Frontend

Static Astro frontend served as static assets.

## Stack

- Astro (Vite-powered)
- pnpm
- Client-side progressive enhancement via small runtime modules (RoughJS, Alpine, Nano Stores)

## Quick start

```bash
cd frontend
pnpm install
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm clean
pnpm format
```

## Runtime scripts

The base runtime entrypoint is loaded by layouts:

- `src/scripts/runtime.ts`

See `src/scripts/README.md` for the `data-*` contracts used by the runtime modules.

## Windows note

If you are in a \\wsl.localhost\\... path, some Windows tools fail due to UNC path limitations. Prefer running frontend commands inside WSL (for example: cd frontend && pnpm build).