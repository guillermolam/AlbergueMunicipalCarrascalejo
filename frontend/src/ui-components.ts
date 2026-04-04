// UI Components Index
// SSR-compatible Astro components based on Figma design

// Layout Components
export { default as FigmaLayout } from './layouts/FigmaLayout.astro';

// Basic UI Components
export { default as Button } from './components/Button.astro';
export { default as Card } from './components/Card.astro';
export { default as DoodleIcon } from './components/core/RoughIcon.astro';
export { default as Hero } from './components/Hero.astro';
export { default as Stats } from './components/Stats.astro';

// Design Tokens
export * from './styles/design-tokens';

// TypeScript Interfaces
export type { Props as ButtonProps } from './components/Button.astro';
export type { Props as CardProps } from './components/Card.astro';
export type { Props as DoodleIconProps } from './components/core/RoughIcon.astro';
export type { Props as HeroProps } from './components/Hero.astro';
export type { Props as StatsProps } from './components/Stats.astro';
