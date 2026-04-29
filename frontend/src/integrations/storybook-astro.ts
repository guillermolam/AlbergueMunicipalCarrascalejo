import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function storybookAstroIntegration(): AstroIntegration {
  return {
    name: 'storybook-astro-integration',
    hooks: {
      'astro:config:setup': ({ config, injectScript }) => {
        // Inject environment variables for Storybook compatibility
        injectScript(
          'head-inline',
          `
          <script>
            window.ASTRO_ENV = {
              PUBLIC_GATEWAY_BASE_URL: '${config.site || 'http://localhost:3000'}',
              PUBLIC_ENV: '${import.meta.env.MODE || 'development'}',
              PUBLIC_VERSION: '${import.meta.env.PACKAGE_VERSION || '1.0.0'}',
              STORYBOOK: true,
              ASTRO_VERSION: '6.1.5'
            };
            
            // Mock Cloudflare environment for Storybook
            window.Cloudflare = {
              env: {
                PUBLIC_CLERK_PUBLISHABLE_KEY: 'mock-key',
                CLERK_SECRET_KEY: 'mock-secret'
              }
            };
          </script>
        `
        );

        // Inject Alpine.js for Storybook compatibility
        injectScript(
          'head-inline',
          `
          <script type="module">
            import Alpine from 'alpinejs';
            window.Alpine = Alpine;
            Alpine.start();
          </script>
        `
        );

        // Inject Three.js for GIS components
        injectScript(
          'head-inline',
          `
          <script type="module">
            import * as THREE from 'three';
            window.THREE = THREE;
          </script>
        `
        );
      },

      'astro:build:setup': ({ vite }) => {
        // Configure Vite for Storybook compatibility
        vite.resolve = vite.resolve || {};
        vite.resolve.alias = {
          ...vite.resolve.alias,
          '@': resolve(__dirname, '../src'),
          '~': resolve(__dirname, '../'),
          astro: 'astro/dist/index.js',
        };

        vite.optimizeDeps = vite.optimizeDeps || {};
        vite.optimizeDeps.include = [
          ...(vite.optimizeDeps.include || []),
          // Three.js support
          'three',
          'three/examples/jsm/controls/OrbitControls.js',
          'three/examples/jsm/loaders/GLTFLoader.js',
          'three/examples/jsm/postprocessing/EffectComposer.js',
          'three/examples/jsm/postprocessing/RenderPass.js',
          'three/examples/jsm/postprocessing/UnrealBloomPass.js',
          'three/examples/jsm/postprocessing/ShaderPass.js',
          'three/examples/jsm/postprocessing/AfterimagePass.js',
          'three/examples/jsm/shaders/VignetteShader.js',
          // Alpine.js support
          'alpinejs',
          // Nanostores support
          'nanostores',
          '@nanostores/persistent',
          // Solid.js support
          'solid-js',
          'solid-js/web',
          'solid-js/html',
        ];

        vite.build = vite.build || {};
        vite.build.rollupOptions = vite.build.rollupOptions || {};
        const external = vite.build.rollupOptions.external;
        const externalList =
          typeof external === 'string' ? [external] : Array.isArray(external) ? external : [];
        vite.build.rollupOptions.external = [
          ...externalList,
          'fs',
          'path',
          'async_hooks',
          'crypto',
          'util',
          'stream',
          'buffer',
          'node:fs',
          'node:path',
          'node:async_hooks',
          'node:crypto',
          'node:util',
          'node:stream',
          'node:buffer',
        ];
      },
    },
  };
}
