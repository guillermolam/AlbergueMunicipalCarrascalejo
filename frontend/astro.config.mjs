import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import clerk from '@clerk/astro';
// Wuchale's Vite plugin is disabled: its markup rewriter crashes on
// .astro files with inline multi-attribute SVG elements
// (`Expected "]" but found "}"` at e.g. StepPersonalInfo.astro:41).
// We use a manual runtime loader instead — see src/i18n/t.ts.

// Use the Node adapter in local dev (avoids miniflare/workerd startup overhead).
// Use the Cloudflare adapter for production builds (wrangler deploy / CF Workers).
// CF_PAGES is set by Cloudflare Pages CI; NODE_ENV=production covers wrangler builds.
const isProd = process.env.NODE_ENV === 'production' || !!process.env.CF_PAGES || !!process.env.CF_WORKER;

export default defineConfig({
  adapter: isProd
    ? cloudflare({
        prerenderEnvironment: 'node',
      })
    : node({ mode: 'standalone' }),

  output: 'server',

  // Astro i18n routing (prefixDefaultLocale: false = /book, /en/book)
  i18n: {
    defaultLocale: 'es',
    locales: [
      'es', 'en', 'zh', 'hi', 'ar', 'pt', 'ru', 'ja', 'de', 'fr',
      'it', 'ko', 'id', 'tr', 'vi', 'ca', 'eu', 'gl', 'ast'
    ],
    routing: {
      prefixDefaultLocale: false,
      // redirectToDefaultLocale is only valid when prefixDefaultLocale: true,
      // so it's omitted here to avoid "infinite loop" validation errors.
      fallbackType: 'rewrite',
    },
    fallback: {
      en: 'es',
      fr: 'es',
      de: 'es',
      it: 'es',
      pt: 'es',
      zh: 'es',
      ja: 'es',
      ko: 'es',
      ru: 'es',
      hi: 'es',
      ar: 'es',
      id: 'es',
      tr: 'es',
      vi: 'es',
      ca: 'es',
      eu: 'es',
      gl: 'es',
      ast: 'es',
    },
  },

  integrations: [
    clerk(),
  ],

  // ── Fonts ─────────────────────────────────────────────────────────────────
  // Local WOFF2 files downloaded from Google Fonts, served from src/assets/fonts/.
  // fontProviders.local() reads the files from disk — zero network requests.
  fonts: [
    {
      name: 'Patrick Hand',
      cssVariable: '--font-patrick-hand',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/patrick-hand-400.woff2'],
          },
        ],
      },
    },
    {
      name: 'Cabin Sketch',
      cssVariable: '--font-cabin-sketch',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/cabin-sketch-400.woff2'],
          },
          {
            weight: 700,
            style: 'normal',
            src: ['./src/assets/fonts/cabin-sketch-700.woff2'],
          },
        ],
      },
    },
    {
      name: 'Shadows Into Light',
      cssVariable: '--font-shadows-into-light',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/shadows-into-light-400.woff2'],
          },
        ],
      },
    },
    {
      name: 'Gloria Hallelujah',
      cssVariable: '--font-gloria',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/gloria-hallelujah-400.woff2'],
          },
        ],
      },
    },
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: '100 900',
            style: 'normal',
            src: ['./src/assets/fonts/inter-latin.woff2'],
          },
        ],
      },
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      provider: fontProviders.local(),
      fallbacks: [],
      options: {
        variants: [
          {
            weight: '100 800',
            style: 'normal',
            src: ['./src/assets/fonts/jetbrains-mono-latin.woff2'],
          },
        ],
      },
    },
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
        '@/stores': '/src/stores',
        '@/lib': '/src/lib',
        '@/islands': '/src/islands',
        '@/types': '/src/types',
        '@/utils': '/src/utils',
        '@/actions': '/src/actions',
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
