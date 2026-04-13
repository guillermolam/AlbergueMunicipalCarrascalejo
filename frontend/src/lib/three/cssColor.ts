function clamp255(n: number) {
  return Math.max(0, Math.min(255, n));
}

function rgbToInt(r: number, g: number, b: number) {
  return (clamp255(r) << 16) + (clamp255(g) << 8) + clamp255(b);
}

function parseHexToInt(hex: string): number | null {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return rgbToInt(r, g, b);
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return rgbToInt(r, g, b);
  }
  return null;
}

function parseRgbToInt(rgb: string): number | null {
  const m = rgb
    .trim()
    .match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (!m) return null;
  return rgbToInt(Number(m[1]), Number(m[2]), Number(m[3]));
}

/**
 * Reads a CSS custom property from :root and returns a THREE-friendly int color (0xRRGGBB).
 * Example: cssVarColorInt('--green', 0x00ab39)
 */
export function cssVarColorInt(varName: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;

  const hex = parseHexToInt(raw);
  if (hex != null) return hex;

  const rgb = parseRgbToInt(raw);
  if (rgb != null) return rgb;

  return fallback;
}

