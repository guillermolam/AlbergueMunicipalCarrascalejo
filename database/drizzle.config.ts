import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || 'postgresql://localhost:5432/albergue',
  },
  verbose: process.env.LOG_LEVEL === 'debug',
  strict: true,
});