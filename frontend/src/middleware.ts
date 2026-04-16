import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const MOCK_RESPONSES = {
  '/api/health': {
    ok: true,
    mode: 'mock',
    ts: Date.now(),
  },
  '/api/progress': {
    ok: true,
  },
} as const;

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

type ClerkAuth = {
  isAuthenticated: boolean;
  userId: string | null;
  has: (opts: { role?: string; permission?: string }) => boolean;
};
type AstroContext = {
  request: Request;
  url: URL;
  locals: Record<string, unknown>;
};

export const onRequest = clerkMiddleware(async (auth: () => ClerkAuth, context: AstroContext) => {
  const { request, url } = context;
  const pathname = url.pathname;

  if (import.meta.env.PUBLIC_API_MODE === 'mock') {
    if (pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify(MOCK_RESPONSES['/api/health']), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Mode': 'true',
        },
      });
    }

    if (pathname === '/api/progress' && request.method === 'POST') {
      try {
        const payload = (await request.json()) as Record<string, unknown>;
        const dailyGoalKmRaw = payload.dailyGoalKm;
        const currentStageProgressRaw = payload.currentStageProgress;
        const tsRaw = payload.ts;

        if (dailyGoalKmRaw == null || currentStageProgressRaw == null || tsRaw == null) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const dailyGoalKm = Number(dailyGoalKmRaw);
        const currentStageProgress = Number(currentStageProgressRaw);

        if (Number.isNaN(dailyGoalKm) || dailyGoalKm < 15 || dailyGoalKm > 35) {
          return new Response(JSON.stringify({ error: 'dailyGoalKm must be between 15 and 35' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (
          Number.isNaN(currentStageProgress) ||
          currentStageProgress < 0 ||
          currentStageProgress > 100
        ) {
          return new Response(
            JSON.stringify({ error: 'currentStageProgress must be between 0 and 100' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(JSON.stringify(MOCK_RESPONSES['/api/progress']), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Mock-Mode': 'true',
          },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const locals = context.locals;
  const a = auth();
  const isAuthenticated = !!a.isAuthenticated;
  const userId = a.userId ?? null;
  const isAdmin =
    !!userId &&
    (a.has({ role: 'org:admin' }) ||
      a.has({ role: 'admin' }) ||
      a.has({ permission: 'org:admin' }));

  locals.role = !userId || !isAuthenticated ? 'guest' : isAdmin ? 'admin' : 'pilgrim';
  locals.userId = userId;

  if (!isAdminRoute(request)) return;

  if (!isAuthenticated || !userId) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return a.redirectToSignIn();
  }

  if (!isAdmin) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: admin role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return Response.redirect(new URL('/', request.url), 302);
  }
});
