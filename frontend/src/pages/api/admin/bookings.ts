import type { APIRoute } from 'astro';
import { proxyGatewayJson, requireAdminForApi } from '../../../lib/admin-gateway';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const deny = requireAdminForApi(ctx.locals);
  if (deny) return deny;

  const query = new URL(ctx.request.url).search;
  return proxyGatewayJson(`/admin/bookings${query}`, ctx.request, { method: 'GET' });
};

