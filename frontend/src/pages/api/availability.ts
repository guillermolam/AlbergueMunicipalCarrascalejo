import type { APIRoute } from 'astro';

// On-demand: serves per-day bed count + pricing for the calendar view.
// Real mode proxies to the backend; mock mode derives values locally.
export const prerender = false;

function localDayInfo(dateStr: string): { beds: number; price: number } {
  const parts = dateStr.split('-').map(Number);
  const hash = (parts[2] * 7 + parts[1] * 13 + parts[0]) % 29;
  const d = new Date(dateStr + 'T12:00:00');
  const isWeekend = d.getDay() === 5 || d.getDay() === 6;
  const isSummer  = d.getMonth() >= 5 && d.getMonth() <= 8;
  const price = 8 + (isWeekend ? 4 : 0) + (isSummer ? 3 : 0) + (hash % 3);
  const beds  = Math.max(0, 24 - Math.min(23, Math.floor(hash * 0.9)));
  return { beds, price };
}

export const GET: APIRoute = async ({ url }) => {
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return new Response(
      JSON.stringify({ error: 'from and to query params are required (YYYY-MM-DD)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiMode = import.meta.env.PUBLIC_API_MODE ?? 'real';

  if (apiMode !== 'real') {
    // ── Mock: derive per-day data locally ──────────────────────────────────
    const days: Record<string, { beds: number; price: number }> = {};
    const cur = new Date(from + 'T00:00:00');
    const end = new Date(to   + 'T00:00:00');
    while (cur <= end) {
      const ds = cur.toISOString().split('T')[0];
      days[ds] = localDayInfo(ds);
      cur.setDate(cur.getDate() + 1);
    }
    return new Response(JSON.stringify({ days, mock: true }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  // ── Real: proxy to backend ─────────────────────────────────────────────
  const apiBase = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';
  try {
    const res = await fetch(`${apiBase}/api/availability/calendar?from=${from}&to=${to}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      // Fallback to local formula so the calendar never breaks
      const days: Record<string, { beds: number; price: number }> = {};
      const cur = new Date(from + 'T00:00:00');
      const end = new Date(to   + 'T00:00:00');
      while (cur <= end) {
        const ds = cur.toISOString().split('T')[0];
        days[ds] = localDayInfo(ds);
        cur.setDate(cur.getDate() + 1);
      }
      return new Response(JSON.stringify({ days, fallback: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json() as unknown;
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Availability service unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
};
