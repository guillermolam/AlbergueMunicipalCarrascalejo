// Design Tokens based on Figma prototype
// SSR-safe design system tokens

export const colors = {
  // Primary Colors - Extremadura Palette
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    main: '#00AB39', // Extremadura Green
    contrast: '#FFFFFF',
  },

  // Secondary Colors
  secondary: {
    yellow: '#EAC102',
    red: '#ED1C24',
    blue: '#0071BC',
  },

  // Neutral Colors
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'Noto Sans',
      'sans-serif',
    ],
    mono: [
      'JetBrains Mono',
      'ui-monospace',
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      'Liberation Mono',
      'Courier New',
      'monospace',
    ],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
  },
} as const;

// Figma-inspired component variants
export const componentVariants = {
  button: {
    primary: {
      background: colors.primary.main,
      color: colors.primary.contrast,
      hover: colors.primary[600],
      shadow: shadows.md,
    },
    secondary: {
      background: colors.secondary.yellow,
      color: colors.neutral[900],
      hover: '#d4a501',
      shadow: shadows.sm,
    },
    outline: {
      background: 'transparent',
      color: colors.primary.main,
      border: `2px solid ${colors.primary.main}`,
      hover: colors.primary[50],
    },
    ghost: {
      background: 'transparent',
      color: colors.neutral[700],
      hover: colors.neutral[100],
    },
  },
  card: {
    default: {
      background: 'white',
      shadow: shadows.lg,
      border: `1px solid ${colors.neutral[200]}`,
      radius: borderRadius.xl,
    },
    elevated: {
      background: 'white',
      shadow: shadows['2xl'],
      border: 'none',
      radius: borderRadius['2xl'],
    },
    subtle: {
      background: colors.neutral[50],
      shadow: shadows.sm,
      border: `1px solid ${colors.neutral[200]}`,
      radius: borderRadius.lg,
    },
  },
} as const;

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// SSR-safe CSS custom properties generator
export const generateCSSCustomProperties = () => {
  const cssVars: Record<string, string> = {};

  // Colors
  Object.entries(colors).forEach(([colorName, colorValues]) => {
    if (typeof colorValues === 'object') {
      Object.entries(colorValues).forEach(([shade, value]) => {
        cssVars[`--color-${colorName}-${shade}`] = value;
      });
    } else {
      cssVars[`--color-${colorName}`] = colorValues;
    }
  });

  // Typography
  Object.entries(typography.fontSize).forEach(([size, value]) => {
    cssVars[`--font-size-${size}`] = value;
  });

  // Spacing
  Object.entries(spacing).forEach(([space, value]) => {
    cssVars[`--spacing-${space}`] = value;
  });

  // Border radius
  Object.entries(borderRadius).forEach(([radius, value]) => {
    cssVars[`--radius-${radius}`] = value;
  });

  return cssVars;
};
