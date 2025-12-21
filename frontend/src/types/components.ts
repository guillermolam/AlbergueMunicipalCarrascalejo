// TypeScript type definitions for Figma-inspired components
// SSR-compatible types for Astro + TypeScript

import type { HTMLAttributes } from 'astro/types';

// Base component props extending HTML attributes
export interface BaseComponentProps extends HTMLAttributes<'div'> {
  class?: string;
  children?: any;
}

// Button component props
export interface ButtonProps extends HTMLAttributes<'button' | 'a'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
  shadow?: boolean;
  glow?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: string;
}

// Card component props
export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'subtle' | 'gradient' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  border?: boolean;
  hover?: boolean;
  glow?: boolean;
  header?: string;
  footer?: string;
  icon?: string;
  gradient?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'teal';
}

// DoodleIcon component props
export interface DoodleIconProps extends BaseComponentProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'current';
  variant?: 'outline' | 'filled' | 'doodle' | 'animated';
  animated?: boolean;
  bounce?: boolean;
  spin?: boolean;
  pulse?: boolean;
}

// Hero component props
export interface HeroProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: {
    text: string;
    href: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    text: string;
    href: string;
    icon?: string;
    variant?: 'ghost' | 'outline';
  };
  background?: 'gradient' | 'image' | 'solid' | 'doodle';
  gradientColors?: string[];
  imageSrc?: string;
  imageAlt?: string;
  overlay?: boolean;
  particles?: boolean;
  animated?: boolean;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Stats component props
export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export interface StatsProps extends BaseComponentProps {
  stats: StatItem[];
  layout?: 'grid' | 'flex' | 'list';
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'cards' | 'minimal' | 'gradient';
  animated?: boolean;
}

// Layout component props
export interface LayoutProps {
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  locale?: string;
  siteName?: string;
  themeColor?: string;
  backgroundColor?: string;
  noIndex?: boolean;
  canonical?: string;
  structuredData?: any;
  children: any;
}

// Figma design tokens
export interface DesignTokens {
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    neutral: Record<string, string>;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: Record<string, string[]>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
    lineHeight: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  breakpoints: Record<string, string>;
}

// Component variants
export interface ComponentVariants {
  button: {
    primary: {
      background: string;
      color: string;
      hover: string;
      shadow: string;
    };
    secondary: {
      background: string;
      color: string;
      hover: string;
      shadow: string;
    };
    outline: {
      background: string;
      color: string;
      border: string;
      hover: string;
    };
    ghost: {
      background: string;
      color: string;
      hover: string;
    };
  };
  card: {
    default: {
      background: string;
      shadow: string;
      border: string;
      radius: string;
    };
    elevated: {
      background: string;
      shadow: string;
      border: string;
      radius: string;
    };
    subtle: {
      background: string;
      shadow: string;
      border: string;
      radius: string;
    };
  };
}

// SSR-specific types
export interface SSRProps {
  isServer: boolean;
  isClient: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Hydration types
export interface HydrationOptions {
  client?: 'load' | 'idle' | 'visible' | 'media' | 'only';
  props?: Record<string, any>;
  directive?: string;
}

// Animation types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

// Responsive types
export interface ResponsiveConfig {
  sm?: string | number;
  md?: string | number;
  lg?: string | number;
  xl?: string | number;
  '2xl'?: string | number;
}

// Utility types for component development
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type ShadowVariant = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type BorderRadiusVariant = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
export type LayoutVariant = 'grid' | 'flex' | 'list' | 'stack';
export type AlignmentVariant = 'left' | 'center' | 'right' | 'justify';
export type AnimationVariant = 'fade' | 'slide' | 'bounce' | 'pulse' | 'spin' | 'shake';

// Type guards for runtime type checking
export const isColorVariant = (value: any): value is ColorVariant => {
  return ['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(value);
};

export const isSizeVariant = (value: any): value is SizeVariant => {
  return ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(value);
};

export const isShadowVariant = (value: any): value is ShadowVariant => {
  return ['none', 'sm', 'md', 'lg', 'xl', '2xl'].includes(value);
};

export const isAnimationVariant = (value: any): value is AnimationVariant => {
  return ['fade', 'slide', 'bounce', 'pulse', 'spin', 'shake'].includes(value);
};