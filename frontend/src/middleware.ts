import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { i18nRouting } from 'astro:i18n';

// Routes that require an authenticated user
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)']);

// Routes that require the admin role (set via Clerk publicMetadata.role)
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)']);

// Supported locales (must match astro.config.mjs)
const SUPPORTED_LOCALES = [
  'es', 'en', 'zh', 'hi', 'ar', 'pt', 'ru', 'ja', 'de', 'fr',
  'it', 'ko', 'id', 'tr', 'vi', 'ca', 'eu', 'gl', 'ast'
];

// Parse Accept-Language header and return preferred locale
function parseAcceptLanguage(header: string | null): string | null {
  if (!header) return null;

  const prefs = header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.split('-')[0], q: parseFloat(q) || 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const pref of prefs) {
    if (SUPPORTED_LOCALES.includes(pref.lang)) {
      return pref.lang;
    }
  }
  return null;
}

function detectLocale(request: Request): string {
  // 1. Check URL path for locale
  const url = new URL(request.url);
  const pathLocale = url.pathname.split('/')[1];
  if (pathLocale && SUPPORTED_LOCALES.includes(pathLocale)) {
    return pathLocale;
  }

  // 2. Check user's preferred locale (stored in cookie)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => c.trim().split('='))
    );
    if (cookies['preferred-locale'] && SUPPORTED_LOCALES.includes(cookies['preferred-locale'])) {
      return cookies['preferred-locale'];
    }
  }

  // 3. Check Accept-Language header
  const acceptLang = request.headers.get('accept-language');
  const browserLocale = parseAcceptLanguage(acceptLang);
  if (browserLocale) {
    return browserLocale;
  }

  // 4. Default to Spanish
  return 'es';
}

// ---------------------------------------------------------------------------
// Locale detection + Clerk middleware — wraps every request.
// ---------------------------------------------------------------------------
export const onRequest = clerkMiddleware(async (auth, context, next) => {
  // Detect locale BEFORE handling the request
  const detectedLocale = detectLocale(context.request);

  // Set locale for i18n routing
  context.locals.locale = detectedLocale;

  // Process Clerk auth
  const authState = await auth();
  const { userId, sessionClaims } = authState;

  // Derive role from Clerk publicMetadata (set in Clerk dashboard or via API)
  const metadata = (sessionClaims as Record<string, unknown> | null)?.metadata as
    | { role?: string }
    | undefined;
  const role: 'admin' | 'pilgrim' | 'guest' = userId
    ? metadata?.role === 'admin'
      ? 'admin'
      : 'pilgrim'
    : 'guest';

  // Expose to all pages via Astro.locals
  context.locals.role = role;
  context.locals.user = userId
    ? {
        id: userId,
        email: String((sessionClaims as Record<string, unknown>)?.email ?? ''),
        name: String((sessionClaims as Record<string, unknown>)?.name ?? ''),
      }
    : null;
  context.locals.sessionToken = null;

  // Admin-only guard
  if (isAdminRoute(context.request) && role !== 'admin') {
    const dest = new URL('/auth', context.url.origin);
    dest.searchParams.set('from', context.url.pathname);
    dest.searchParams.set('reason', 'unauthorized');
    return context.redirect(dest.toString(), 302);
  }

  // Auth-required guard
  if (isProtectedRoute(context.request) && !userId) {
    const dest = new URL('/auth', context.url.origin);
    dest.searchParams.set('from', context.url.pathname);
    return context.redirect(dest.toString(), 302);
  }

  return next();
});
