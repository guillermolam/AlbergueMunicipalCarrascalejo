// Global type definitions for SSR-compatible Astro project
// Based on Figma prototype design system

/// <reference types="astro/client" />

// Module declarations for Astro components
declare module '*.astro' {
  const Component: any;
  export default Component;
}

// Astro-specific types
interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly BASE_URL: string;
  readonly ASTRO_SITE: string;
  readonly ASTRO_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}

// Global window extensions for SSR compatibility
declare global {
  interface Window {
    // Analytics and tracking
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];

    // PWA support
    deferredPrompt?: any;

    // Custom properties
    __INITIAL_STATE__?: Record<string, any>;
    __ENVIRONMENT__?: 'development' | 'production' | 'test';

    // Service worker
    serviceWorker?: {
      register: (
        scriptURL: string,
        options?: RegistrationOptions
      ) => Promise<ServiceWorkerRegistration>;
      ready: Promise<ServiceWorkerRegistration>;
    };
  }

  // Node.js global extensions for SSR
  namespace NodeJS {
    interface Global {
      window?: Window;
      document?: Document;
      navigator?: Navigator;
    }

    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      ASTRO_SITE?: string;
      ASTRO_BASE?: string;

      // Database configuration
      DATABASE_URL?: string;
      REDIS_URL?: string;

      // Authentication
      JWT_SECRET?: string;
      BETTER_AUTH_SECRET?: string;

      // API keys
      GOOGLE_API_KEY?: string;
      MAPS_API_KEY?: string;

      // External services
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;

      // Environment-specific
      VERCEL?: string;
      NETLIFY?: string;
      RAILWAY?: string;
    }
  }
}

// Custom CSS properties for Figma design system
declare namespace astroHTML.JSX {
  interface CSSProperties {
    // Figma design tokens as CSS custom properties
    '--color-primary'?: string;
    '--color-primary-dark'?: string;
    '--color-primary-light'?: string;
    '--color-secondary'?: string;
    '--color-accent'?: string;
    '--color-blue'?: string;

    // Gradients
    '--gradient-primary'?: string;
    '--gradient-secondary'?: string;
    '--gradient-accent'?: string;
    '--gradient-blue'?: string;
    '--gradient-rainbow'?: string;

    // Shadows
    '--shadow-soft'?: string;
    '--shadow-medium'?: string;
    '--shadow-strong'?: string;
    '--shadow-glow'?: string;
    '--shadow-button'?: string;
    '--shadow-card'?: string;

    // Animations
    '--animation-duration-fast'?: string;
    '--animation-duration-normal'?: string;
    '--animation-duration-slow'?: string;
    '--animation-easing'?: string;

    // Spacing
    '--spacing-xs'?: string;
    '--spacing-sm'?: string;
    '--spacing-md'?: string;
    '--spacing-lg'?: string;
    '--spacing-xl'?: string;

    // Typography
    '--font-family-sans'?: string;
    '--font-family-mono'?: string;
    '--font-size-xs'?: string;
    '--font-size-sm'?: string;
    '--font-size-base'?: string;
    '--font-size-lg'?: string;
    '--font-size-xl'?: string;

    // Border radius
    '--radius-sm'?: string;
    '--radius-md'?: string;
    '--radius-lg'?: string;
    '--radius-xl'?: string;
    '--radius-2xl'?: string;
    '--radius-3xl'?: string;
    '--radius-full'?: string;
  }

  interface HTMLAttributes {
    // Custom data attributes for Figma components
    'data-variant'?: string;
    'data-size'?: string;
    'data-color'?: string;
    'data-state'?: 'loading' | 'disabled' | 'active' | 'inactive';
    'data-animate'?: boolean | string;
    'data-ssr'?: boolean;
    'data-hydrated'?: boolean;

    // Accessibility attributes
    'aria-live'?: 'off' | 'assertive' | 'polite';
    'aria-atomic'?: boolean | 'true' | 'false';
    'aria-relevant'?:
      | 'additions'
      | 'additions removals'
      | 'additions text'
      | 'all'
      | 'removals'
      | 'text';
    'aria-busy'?: boolean | 'true' | 'false';
    'aria-expanded'?: boolean | 'true' | 'false';
    'aria-selected'?: boolean | 'true' | 'false';
    'aria-disabled'?: boolean | 'true' | 'false';
    'aria-hidden'?: boolean | 'true' | 'false';
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-controls'?: string;
    'aria-owns'?: string;
    'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-level'?: number | string;
    'aria-posinset'?: number | string;
    'aria-setsize'?: number | string;
    'aria-valuemin'?: number | string;
    'aria-valuemax'?: number | string;
    'aria-valuenow'?: number | string;
    'aria-valuetext'?: string;
    'aria-orientation'?: 'horizontal' | 'vertical' | 'undefined';
    'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
    'aria-multiselectable'?: boolean | 'true' | 'false';
    'aria-required'?: boolean | 'true' | 'false';
    'aria-readonly'?: boolean | 'true' | 'false';
    'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
    'aria-errormessage'?: string;
    'aria-description'?: string;
    'aria-details'?: string;
    'aria-keyshortcuts'?: string;
    'aria-roledescription'?: string;

    // Performance attributes
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
    fetchpriority?: 'high' | 'low' | 'auto';
    imagesrcset?: string;
    imagesizes?: string;

    // Security attributes
    nonce?: string;
    integrity?: string;
    crossorigin?: 'anonymous' | 'use-credentials';
    referrerpolicy?:
      | 'no-referrer'
      | 'no-referrer-when-downgrade'
      | 'origin'
      | 'origin-when-cross-origin'
      | 'same-origin'
      | 'strict-origin'
      | 'strict-origin-when-cross-origin'
      | 'unsafe-url';

    // SEO attributes
    itemscope?: boolean;
    itemtype?: string;
    itemprop?: string;
    itemid?: string;
    itemref?: string;

    // Microdata
    property?: string;
    content?: string;

    // Custom attributes for Figma components
    'data-figma-variant'?: string;
    'data-figma-size'?: string;
    'data-figma-color'?: string;
    'data-figma-state'?: string;
    'data-figma-animate'?: boolean | string;
    'data-figma-gradient'?: string;
    'data-figma-shadow'?: string;
    'data-figma-rounded'?: string;
    'data-figma-icon'?: string;
    'data-figma-trend'?: 'up' | 'down' | 'neutral';
    'data-figma-layout'?: 'grid' | 'flex' | 'list' | 'stack';
    'data-figma-align'?: 'left' | 'center' | 'right' | 'justify';
    'data-figma-variant-type'?: 'button' | 'card' | 'hero' | 'stats' | 'icon';
  }
}

// Utility types for component development
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type OptionalExceptFor<T, TRequired extends keyof T> = Partial<T> & Pick<T, TRequired>;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type Maybe<T> = T | null | undefined;

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Export for module augmentation
export {};
