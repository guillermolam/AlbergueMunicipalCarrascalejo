import type { MiddlewareHandler } from 'astro';

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

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url, request } = context;
  const isMockMode = import.meta.env.PUBLIC_API_MODE === 'mock';

  if (!isMockMode) {
    return next();
  }

  const pathname = url.pathname;

  // Handle health check
  if (pathname === '/api/health' && request.method === 'GET') {
    return new Response(JSON.stringify(MOCK_RESPONSES['/api/health']), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Mode': 'true',
      },
    });
  }

  // Handle progress sync
  if (pathname === '/api/progress' && request.method === 'POST') {
    try {
      const body = await request.json();

      // Validate payload
      if (!body.dailyGoalKm || !body.currentStageProgress || !body.ts) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate ranges
      const dailyGoalKm = Number(body.dailyGoalKm);
      const currentStageProgress = Number(body.currentStageProgress);

      if (dailyGoalKm < 15 || dailyGoalKm > 35) {
        return new Response(JSON.stringify({ error: 'dailyGoalKm must be between 15 and 35' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (currentStageProgress < 0 || currentStageProgress > 100) {
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
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return next();
};
