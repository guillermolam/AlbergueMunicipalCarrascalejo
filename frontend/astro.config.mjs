import { defineConfig } from 'astro/config';

export default defineConfig({
  // Static site generation (FSR: file system routing)
  output: 'static',

  // Site configuration
  site: 'https://albergue-carrascalejo.com',
  base: '/',

  // Build configuration
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // No CSS framework plugins here (Tailwind removed).
  // If you need CSS, load it via your own stylesheets (e.g. src/index.css -> src/styles/global.css).
  vite: {
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
    },
    server: {
      host: true,
      port: 3000,
      open: false,
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

  // Image optimization (Sharp service)
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },

  // Compress HTML output
  compressHTML: true,
});
