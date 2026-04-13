/**
 * Runtime i18n loader — Path B.
 *
 * Reads compiled Wuchale catalogs from `src/locales/.wuchale/*.compiled.js` at
 * build time (Vite resolves the glob) and exposes a `t(source)` function that
 * returns the translation for the current locale, falling back to the Spanish
 * source string when no translation exists (or for plain non-placeholder
 * entries, the `c[i]` value itself).
 *
 * Usage (in any .astro page/component):
 *   ---
 *   import { tFor } from '@/i18n/t';
 *   const t = tFor(Astro.currentLocale ?? 'es');
 *   ---
 *   <h1>{t('Albergue Municipal El Carrascalejo')}</h1>
 *
 * This sidesteps Wuchale's buggy Vite plugin while still leveraging the
 * translated .po catalogs it produces.
 */

import { keys as MANIFEST_KEYS } from "../locales/.wuchale/main.main.manifest.js";

export type Locale =
  | "es" | "en" | "zh" | "hi" | "ar" | "pt" | "ru" | "ja" | "de" | "fr"
  | "it" | "ko" | "id" | "tr" | "vi" | "ca" | "eu" | "gl" | "ast";

// Eager glob so every compiled catalog is bundled; Vite inlines them.
const catalogModules = import.meta.glob<{
  c: (string | (string | number | (string | number)[])[])[];
}>("../locales/.wuchale/main.main.*.compiled.js", { eager: true });

// Normalise keys: Wuchale stores some as string arrays (placeholders) — we
// key the lookup by the flat source string in its `msgid` form.
const keyIndex = new Map<string, number>();
for (let i = 0; i < MANIFEST_KEYS.length; i++) {
  const k = MANIFEST_KEYS[i];
  let flat;
  if (typeof k === "string") {
    flat = k;
  } else if (Array.isArray(k)) {
    flat = k.join("");
  } else {
    flat = k.text;
  }
  if (typeof flat === "string") keyIndex.set(flat, i);
  else if (Array.isArray(flat)) keyIndex.set(flat.join(""), i);
}

function catalogFor(locale: string) {
  const path = `../locales/.wuchale/main.main.${locale}.compiled.js`;
  return catalogModules[path];
}

/**
 * Returns a translator bound to `locale`. If the locale has no catalog, or
 * the specific string isn't in the catalog, returns the Spanish source.
 */
export function tFor(locale: string) {
  const normLocale = (locale || "es").toLowerCase();
  const cat = catalogFor(normLocale);
  return function t(source: string): string {
    // Spanish source == source, skip lookup.
    if (normLocale === "es") return source;
    const idx = keyIndex.get(source);
    if (idx === undefined || !cat) return source;
    const entry = cat.c[idx];
    if (typeof entry === "string") return entry;
    if (Array.isArray(entry)) {
      // Composite entries (placeholders) — concatenate literal segments.
      // Real placeholder interpolation would require the runtime's state
      // machine; for static UI strings this is sufficient.
      return entry.filter((p) => typeof p === "string").join("");
    }
    return source;
  };
}

/** Convenience wrapper — detects locale from Astro.currentLocale upstream. */
export function t(source: string, locale: string): string {
  return tFor(locale)(source);
}
