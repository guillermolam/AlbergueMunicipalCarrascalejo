/**
 * GET /api/languages
 *
 * Returns the supported-languages catalog used by LanguageSelectorIsland.
 *
 * Resolution order:
 *   1. Proxy the language-service Worker (PUBLIC_LANGUAGE_SERVICE_URL env var)
 *   2. Fallback: hardcoded catalog of 19 languages (must mirror astro.config.mjs)
 *
 * Keeping the hardcoded catalog in sync with `backend/language-service/src/lib.rs`
 * means the frontend never shows a blank selector if the worker is down — the
 * catalog is fully static and matches Astro's i18n routing config.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag: string;
  is_active: boolean;
  display_order: number;
}

const FALLBACK_LANGUAGES: Language[] = [
  { code: 'es',  name: 'Spanish',    native_name: 'Español',          flag: '🇪🇸', is_active: true, display_order: 1 },
  { code: 'en',  name: 'English',    native_name: 'English',          flag: '🇬🇧', is_active: true, display_order: 2 },
  { code: 'zh',  name: 'Chinese',    native_name: '中文',              flag: '🇨🇳', is_active: true, display_order: 3 },
  { code: 'hi',  name: 'Hindi',      native_name: 'हिन्दी',             flag: '🇮🇳', is_active: true, display_order: 4 },
  { code: 'ar',  name: 'Arabic',     native_name: 'العربية',          flag: '🇸🇦', is_active: true, display_order: 5 },
  { code: 'pt',  name: 'Portuguese', native_name: 'Português',        flag: '🇵🇹', is_active: true, display_order: 6 },
  { code: 'ru',  name: 'Russian',    native_name: 'Русский',          flag: '🇷🇺', is_active: true, display_order: 7 },
  { code: 'ja',  name: 'Japanese',   native_name: '日本語',            flag: '🇯🇵', is_active: true, display_order: 8 },
  { code: 'de',  name: 'German',     native_name: 'Deutsch',          flag: '🇩🇪', is_active: true, display_order: 9 },
  { code: 'fr',  name: 'French',     native_name: 'Français',         flag: '🇫🇷', is_active: true, display_order: 10 },
  { code: 'it',  name: 'Italian',    native_name: 'Italiano',         flag: '🇮🇹', is_active: true, display_order: 11 },
  { code: 'ko',  name: 'Korean',     native_name: '한국어',            flag: '🇰🇷', is_active: true, display_order: 12 },
  { code: 'id',  name: 'Indonesian', native_name: 'Bahasa Indonesia', flag: '🇮🇩', is_active: true, display_order: 13 },
  { code: 'tr',  name: 'Turkish',    native_name: 'Türkçe',           flag: '🇹🇷', is_active: true, display_order: 14 },
  { code: 'vi',  name: 'Vietnamese', native_name: 'Tiếng Việt',       flag: '🇻🇳', is_active: true, display_order: 15 },
  { code: 'ca',  name: 'Catalan',    native_name: 'Català',           flag: '🏴',  is_active: true, display_order: 16 },
  { code: 'eu',  name: 'Basque',     native_name: 'Euskara',          flag: '🏴',  is_active: true, display_order: 17 },
  { code: 'gl',  name: 'Galician',   native_name: 'Galego',           flag: '🏴',  is_active: true, display_order: 18 },
  { code: 'ast', name: 'Asturian',   native_name: 'Asturianu',        flag: '🏴',  is_active: true, display_order: 19 },
];

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // 1h edge cache, 24h stale — catalog changes rarely
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });

export const GET: APIRoute = async () => {
  const upstream = import.meta.env.PUBLIC_LANGUAGE_SERVICE_URL;

  if (upstream) {
    try {
      const res = await fetch(`${upstream.replace(/\/+$/, '')}/api/languages`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as Language[];
        if (Array.isArray(data) && data.length > 0) {
          return jsonResponse(data);
        }
      }
    } catch (err) {
      // Worker unreachable — fall through to static list.
      console.warn('[api/languages] upstream fetch failed, using fallback:', err);
    }
  }

  return jsonResponse(FALLBACK_LANGUAGES);
};
