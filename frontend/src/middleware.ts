import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

// Routes that require an authenticated user
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)']);

// Routes that require the admin role (set via Clerk publicMetadata.role)
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)']);

// ---------------------------------------------------------------------------
// Clerk middleware — wraps every request.
// Clerk attaches auth state to Astro.locals automatically via the integration.
// We add our own role check on top for admin-gated pages.
// ---------------------------------------------------------------------------
export const onRequest = clerkMiddleware(async (auth, context, next) => {
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
  context.locals.sessionToken = null; // session managed by Clerk cookies

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
