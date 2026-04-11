import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import clerk from '@clerk/astro';

// Use the Node adapter in local dev (avoids @cloudflare/vite-plugin miniflare crash).
// Use the Cloudflare adapter for production builds (CF Pages / wrangler pages dev).
const isProd = process.env.NODE_ENV === 'production' || !!process.env.CF_PAGES;

export default defineConfig({
  adapter: isProd
    ? cloudflare({ platformProxy: { enabled: false } })
    : node({ mode: 'standalone' }),

  output: 'server',

  integrations: [
    clerk(),
  ],

  // Site configuration
  site: 'https://albergue-carrascalejo.com',
  base: '/',

  // Build configuration
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
    },
    server: {
      host: true,
      port: 4321,
      open: false,
    },
    // Clerk's backend SDK must be external for SSR (Node.js can resolve it natively).
    // Do NOT exclude @clerk/shared from optimizeDeps — Vite needs to bundle its
    // subpath exports (e.g. @clerk/shared/deriveState) for the client-side bundle.
    ssr: {
      external: ['@clerk/backend'],
    },
    optimizeDeps: {
      exclude: ['@clerk/backend'],
    },
    resolve: {
      alias: {
        '@': '/src',
        '@/components': '/src/components',
        '@/layouts': '/src/layouts',
        '@/pages': '/src/pages',
        '@/styles': '/src/styles',
        '@/assets': '/src/assets',
        '@/public': '/public',
      },
    },
  },

  // Image optimization: disabled for Cloudflare Workers compatibility.
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop',
    },
  },

  compressHTML: true,
});
