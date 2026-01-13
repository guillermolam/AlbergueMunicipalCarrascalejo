// TypeScript declarations for Astro components in tests
// This file helps Vitest understand .astro file imports

declare module '*.astro' {
  const content: any;
  export default content;
}

// Declare global types for Astro runtime
declare namespace Astro {
  interface Props {
    [key: string]: any;
  }

  interface Slots {
    [key: string]: any;
  }

  interface PropsWithChildren<P = {}> extends P {
    children?: any;
  }
}

// Mock Astro global for tests
declare const Astro: {
  props: Record<string, any>;
  slots: Record<string, any>;
  self: any;
};
