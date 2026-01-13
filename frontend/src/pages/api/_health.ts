import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const mode = (import.meta as any).env?.PUBLIC_API_MODE || 'local';

  return new Response(
    JSON.stringify({
      ok: true,
      mode,
      ts: Date.now(),
      service: 'albergue-frontend',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
};
