// Stats utility types and functions
// Moved from statsUtils.ts for better organization

export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'stable';
  change?: string;
}

export interface Props {
  stats: StatItem[];
  layout?: 'grid' | 'flex' | 'list';
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'card' | 'minimal' | 'gradient';
  animated?: boolean;
  class?: string;
}

// Utility functions for Stats component
export function getLayoutClasses(layout: string, columns: number, gap: string): string {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  if (layout === 'flex') {
    return `flex flex-wrap ${gapClasses[gap as keyof typeof gapClasses]}`;
  }
  
  if (layout === 'list') {
    return `space-y-${gap === 'none' ? '0' : gap === 'sm' ? '2' : gap === 'md' ? '4' : gap === 'lg' ? '6' : '8'}`;
  }

  // Grid layout (default)
  return `grid grid-cols-1 md:grid-cols-${columns} ${gapClasses[gap as keyof typeof gapClasses]}`;
}

export function getVariantClasses(variant: string): string {
  const baseClasses = 'bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300';
  
  const variantClasses = {
    default: baseClasses,
    card: `${baseClasses} hover:-translate-y-1`,
    minimal: 'bg-transparent p-4',
    gradient: 'bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-100 shadow-lg'
  };

  return variantClasses[variant as keyof typeof variantClasses] || baseClasses;
}

export function getColorClasses(color: string): string {
  const colorClasses = {
    default: '',
    primary: 'border-green-200 bg-green-50',
    secondary: 'border-yellow-200 bg-yellow-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50'
  };

  return colorClasses[color as keyof typeof colorClasses] || '';
}

export function getSizeClasses(size: string): string {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return sizeClasses[size as keyof typeof sizeClasses] || 'p-6';
}

export function getValueColorClass(color: string): string {
  const valueColors = {
    default: 'text-gray-900',
    primary: 'text-green-600',
    secondary: 'text-yellow-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  };

  return valueColors[color as keyof typeof valueColors] || 'text-gray-900';
}

export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  const trendColors = {
    up: 'bg-green-100 text-green-800',
    down: 'bg-red-100 text-red-800',
    stable: 'bg-gray-100 text-gray-800'
  };

  return trendColors[trend];
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→'
  };

  return trendIcons[trend];
}

export function getProgressBarColors(color: string): string {
  const progressColors = {
    default: 'from-gray-400 to-gray-600',
    primary: 'from-green-400 to-green-600',
    secondary: 'from-yellow-400 to-yellow-600',
    success: 'from-green-400 to-green-600',
    warning: 'from-yellow-400 to-yellow-600',
    error: 'from-red-400 to-red-600',
    info: 'from-blue-400 to-blue-600'
  };

  return progressColors[color as keyof typeof progressColors] || 'from-gray-400 to-gray-600';
}