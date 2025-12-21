export type StatColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default";
export type StatSize = "sm" | "md" | "lg";
export type StatTrend = "up" | "down" | "neutral";
export type LayoutType = "grid" | "flex" | "list";
export type VariantType = "default" | "cards" | "minimal" | "gradient";
export type GapType = "sm" | "md" | "lg" | "xl";

export interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: StatTrend;
  change?: string;
  color?: StatColor;
  size?: StatSize;
}

export interface Props {
  stats: StatItem[];
  layout?: LayoutType;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: GapType;
  variant?: VariantType;
  animated?: boolean;
  class?: string;
}

export const gapClasses: Record<GapType, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export const gridClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
} as const;

export const getLayoutClasses = (
  layout: LayoutType,
  columns: number,
  gap: GapType,
): string => {
  switch (layout) {
    case "grid":
      return `grid ${gridClasses[columns as keyof typeof gridClasses]} ${gapClasses[gap]}`;
    case "flex":
      return `flex flex-wrap ${gapClasses[gap]}`;
    default:
      return "space-y-4";
  }
};

export const getTrendIcon = (trend: StatTrend): string => {
  switch (trend) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "neutral":
      return "→";
    default:
      return "";
  }
};

export const getTrendColor = (trend: StatTrend): string => {
  switch (trend) {
    case "up":
      return "text-green-600 bg-green-100";
    case "down":
      return "text-red-600 bg-red-100";
    case "neutral":
      return "text-gray-600 bg-gray-100";
    default:
      return "";
  }
};

export const getColorClasses = (color: StatColor): string => {
  switch (color) {
    case "primary":
      return "text-green-600 bg-green-50 border-green-200";
    case "secondary":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "success":
      return "text-green-600 bg-green-50 border-green-200";
    case "warning":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

export const getSizeClasses = (size: StatSize): string => {
  switch (size) {
    case "sm":
      return "p-3 text-sm";
    case "lg":
      return "p-6 text-lg";
    default:
      return "p-4 text-base";
  }
};

export const getVariantClasses = (variant: VariantType): string => {
  switch (variant) {
    case "cards":
      return "bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-1";
    case "minimal":
      return "bg-transparent border-none shadow-none";
    case "gradient":
      return "bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md";
    default:
      return "bg-white rounded-lg shadow-md hover:shadow-lg";
  }
};

export const getValueColorClass = (color: StatColor): string => {
  switch (color) {
    case "primary":
      return "text-green-600";
    case "secondary":
      return "text-yellow-600";
    default:
      return "text-gray-900";
  }
};

export const getProgressBarColors = (color: StatColor): string => {
  switch (color) {
    case "primary":
      return "from-green-400 to-green-600";
    case "secondary":
      return "from-yellow-400 to-yellow-600";
    default:
      return "from-gray-400 to-gray-600";
  }
};
