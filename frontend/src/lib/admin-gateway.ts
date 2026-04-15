import type { APIContext } from 'astro';

type AdminLocals = {
  role?: 'admin' | 'pilgrim' | 'guest';
};

export function requireAdminForApi(locals: APIContext['locals']): Response | null {
  const role = (locals as AdminLocals)?.role ?? 'guest';
  if (role === 'admin') return null;
  return new Response(JSON.stringify({ error: 'Unauthorized: admin role required' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function getGatewayBaseUrl(): string {
  return (
    process.env.PUBLIC_GATEWAY_BASE_URL ||
    process.env.GATEWAY_BASE_URL ||
    process.env.GATEWAY_URL ||
    'http://127.0.0.1:8080'
  ).replace(/\/+$/, ''); // NOSONAR — /\/+$/ is safe: single literal char class anchored to end, no catastrophic backtracking possible
}

export async function proxyGatewayJson(
  path: string,
  request: Request,
  init: RequestInit = {}
): Promise<Response> {
  const upstreamUrl = `${getGatewayBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const method = init.method ?? request.method;
  const headers = new Headers(init.headers ?? request.headers);

  // Do not forward host/content-length headers.
  headers.delete('host');
  headers.delete('content-length');

  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : (init.body ?? (await request.text().then((v) => (v ? v : undefined))));

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
