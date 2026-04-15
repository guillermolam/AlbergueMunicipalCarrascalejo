import type { APIRoute } from 'astro';
import { proxyGatewayJson, requireAdminForApi } from '../../../lib/admin-gateway';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const deny = requireAdminForApi(ctx.locals);
  if (deny) return deny;
  return proxyGatewayJson('/admin/settings', ctx.request, { method: 'GET' });
};

export const PUT: APIRoute = async (ctx) => {
  const deny = requireAdminForApi(ctx.locals);
  if (deny) return deny;
  return proxyGatewayJson('/admin/settings', ctx.request, { method: 'PUT' });
};

