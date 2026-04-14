export type DirectionEntry = {
  id: string;
  type: string;
  icon: string;
  name: string;
  subtitle: string;
  detail1: string;
  detail2: string;
  description: string;
  color: string;
  order: number;
};

export type StageEntry = {
  type: 'stage';
  id: string;
  num: number;
  name: string;
  km: number;
  difficulty: string;
  towns: string[];
  hours: string;
  highlight: boolean;
};

export type DirectionCard = {
  icon: string;
  title: string;
  lines: string[];
  color: string;
};

export type NearbyStage = {
  from: string;
  to: string;
  km: number;
  diff: 'Baja' | 'Media' | 'Alta';
  days: number;
};

const difficultyLabel = (value: string): NearbyStage['diff'] => {
  if (value === 'easy') return 'Baja';
  if (value === 'medium') return 'Media';
  return 'Alta';
};

export function buildDirectionCards(data: DirectionEntry[]): DirectionCard[] {
  return data
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      icon: entry.icon,
      title: entry.name,
      lines: [entry.detail1, entry.detail2, entry.description],
      color: entry.color,
    }));
}

export function buildNearbyStages(data: StageEntry[]): NearbyStage[] {
  return data
    .filter((stage) => stage.type === 'stage' && stage.num >= 11 && stage.num <= 13)
    .slice()
    .sort((a, b) => a.num - b.num)
    .map((stage) => ({
      from: stage.towns[0] ?? '',
      to: stage.towns[stage.towns.length - 1] ?? '',
      km: stage.km,
      diff: difficultyLabel(stage.difficulty),
      days: stage.highlight ? 0 : stage.num - 12,
    }));
}

export const LAT = 39.0237972;
export const LNG = -6.3373782;
export const ELEVATION = 177;

export const osmUrl = `https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LNG}&zoom=15`;
export const osmDirections = `https://www.openstreetmap.org/directions?from=&to=${LAT},${LNG}`;
