// UI Components Index
// SSR-compatible Astro components based on Figma design

// Layout Components
export { default as FigmaLayout } from './layouts/FigmaLayout.astro';

// Basic UI Components
export { default as Button } from './components/ui/Button.astro';
export { default as Card } from './components/ui/Card.astro';
export { default as DoodleIcon } from './components/ui/DoodleIcon.astro';
export { default as Hero } from './components/ui/Hero.astro';
export { default as Stats } from './components/ui/Stats.astro';

// Design Tokens
export * from './styles/design-tokens';

// TypeScript Interfaces
export type { Props as ButtonProps } from './components/ui/Button.astro';
export type { Props as CardProps } from './components/ui/Card.astro';
export type { Props as DoodleIconProps } from './components/ui/DoodleIcon.astro';
export type { Props as HeroProps } from './components/ui/Hero.astro';
export type { Props as StatsProps } from './components/ui/Stats.astro';