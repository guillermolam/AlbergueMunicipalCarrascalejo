import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config — used for local schema inspection and migration diffing.
 *
 * D1 local state is stored in .wrangler/state/v3/d1/ by wrangler dev.
 * Run `pnpm db:studio` to open Drizzle Studio against the local D1 SQLite file.
 *
 * We do NOT use Drizzle Kit for migrations — Wrangler manages D1 migrations
 * via backend/api-service/migrations/*.sql (applied by dev-local.sh).
 */
export default defineConfig({
  dialect: 'sqlite',
  schema:  './src/db/schema.ts',
  out:     './drizzle',
  dbCredentials: {
    // wrangler dev persists D1 locally as a SQLite file under this path.
    // The filename matches the D1 binding database_id from wrangler.jsonc.
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/albergue-db.sqlite',
  },
});
