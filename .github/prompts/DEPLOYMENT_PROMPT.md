# i18n Implementation & Deployment Prompt for Claude Code

## Project Context

You are implementing internationalization (i18n) for the Albergue Municipal Carrascalejo pilgrim hospital website. The project is deployed on Cloudflare Workers/Pages with Astro 6, Solid.js islands, and Clerk authentication.

## Current State

### Working

- ✅ Astro 6 i18n routing configured with 19 languages
- ✅ Fallback chain: all → Spanish via rewrite
- ✅ Middleware with locale detection
- ✅ LanguageSelectorIsland with search/autocomplete (fetching from `/api/languages`)
- ✅ Frontend builds successfully

### Broken/Needs

### 1. language-service Worker (`backend/language-service/`)

**Current issues:**

- Workers SDK API incompatibility - `#[worker::]` macro doesn't work with worker 0.7.5
- Needs KV bindings created
- Needs AI binding configured

**FIX:**

```rust
// Use event handler instead of macro
#[event(start)]
pub fn start() {
    console_error_panic_hook();
}

fn handler(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    // Simple routing
}
```

Then deploy with `wrangler deploy`

### 2. KV Namespaces

Run these commands:

```bash
cd /Users/guillermolam/git/personal/AlbergueMunicipalCarrascalejo/backend/language-service
wrangler kv namespace create LANGUAGES
wrangler kv namespace create TRANSLATIONS
```

Update `wrangler.toml` with the returned IDs.

### 3. Wuchale (Optional - Disabled)

Currently disabled due to TypeScript parser compatibility. Keep it disabled for now.

## Implementation Steps

### Step 1: Fix and Deploy language-service Worker

1. Navigate to `backend/language-service/`
2. Fix `src/lib.rs` to use simpler API (remove complex routing)
3. Run `wrangler deploy`

### Step 2: Verify Worker Works

Test with:

```bash
curl https://language-service.your-account.workers.dev/api/languages
```

### Step 3: Deploy Frontend

```bash
cd /Users/guillermolam/git/personal/AlbergueMunicipalCarrascalejo/frontend
pnpm build
pnpm deploy
```

### Step 4: Monitor and Test

1. Check Cloudflare Dashboard for errors
2. Test language selection
3. Verify fallback chain works

## Language List (19)

Spanish (source/default), English, Chinese, Hindi, Arabic, Portuguese, Russian, Japanese, German, French, Italian, Korean, Indonesian, Turkish, Vietnamese, Catalan, Basque, Galician, Asturian

## Key Files

- `frontend/astro.config.mjs` - i18n config
- `frontend/src/middleware.ts` - locale detection
- `frontend/src/islands/shared/LanguageSelectorIsland.astro` - search dropdown
- `backend/language-service/src/lib.rs` - Worker code
- `backend/language-service/wrangler.toml` - bindings

## Success Criteria

1. GET `/api/languages` returns 19 languages
2. Language selector shows search with autocomplete
3. Selecting a language updates the locale
4. Missing translations fallback to Spanish
5. No console errors

## Monitor Commands

```bash
# Check Worker logs
wrangler tail

# Check build output
cd frontend && pnpm build
```

## RefactorTriggers

If deployment fails:

1. Check Wrangler auth: `wrangler whoami`
2. Check KV bindings exist
3. Check build logs for errors

Begin with Step 1.

---

## Execution Checklist

### Pre-deployment

- [ ] Run `wrangler login`
- [ ] Run `wrangler whoami` to verify

### Step 1: language-service

- [ ] Check auth (`wrangler whoami`)
- [ ] Fix `src/lib.rs` if needed
- [ ] Create KV: `wrangler kv namespace create LANGUAGES`
- [ ] Create KV: `wrangler kv namespace create TRANSLATIONS`
- [ ] Update `wrangler.toml` with KV IDs
- [ ] Deploy: `wrangler deploy`
- [ ] Test: `curl` the worker API

### Step 2: Frontend

- [ ] Build: `cd frontend && pnpm build`
- [ ] Deploy: `cd frontend && pnpm deploy`

### Step 3: Verify

- [ ] Check language selector works
- [ ] Check fallback to Spanish
- [ ] Check for console errors

### If Something Fails

1. **Auth issue**: Run `wrangler login`
2. **KV missing**: Create them first
3. **Build error**: Check `pnpm build` locally
4. **Worker error**: Run `wrangler tail` to see logs