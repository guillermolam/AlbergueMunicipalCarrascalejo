import type { APIRoute } from 'astro';
import { proxyGatewayJson, requireAdminForApi } from '../../../../lib/admin-gateway';

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const deny = requireAdminForApi(ctx.locals);
  if (deny) return deny;

  const id = (ctx.params.id ?? '').trim();
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid booking id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return proxyGatewayJson(`/admin/bookings/${encodeURIComponent(id)}`, ctx.request, {
    method: 'PATCH',
  });
};
