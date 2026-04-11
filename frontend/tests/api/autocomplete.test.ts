/**
 * Tests for GET /api/autocomplete  (Geoapify SSR proxy)
 *
 * Runs with vitest + happy-dom (no workerd needed).
 * import.meta.env vars are stubbed via vi.stubEnv().
 *
 * For CF-binding smoke tests (KV, D1 round-trips) see tests/workers/.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../../src/pages/api/autocomplete';

// ── Geoapify response fixtures ────────────────────────────────────────────────

const TWO_FEATURES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        formatted:     'Calle Mayor 10, 28001 Madrid, Spain',
        address_line1: 'Calle Mayor 10',
        street:        'Calle Mayor',
        housenumber:   '10',
        city:          'Madrid',
        postcode:      '28001',
        country_code:  'es',
        result_type:   'building',
      },
      geometry: { type: 'Point', coordinates: [-3.7038, 40.4168] },
    },
    {
      type: 'Feature',
      properties: {
        formatted:     'Calle Mayor 12, 28001 Madrid, Spain',
        address_line1: 'Calle Mayor 12',
        street:        'Calle Mayor',
        housenumber:   '12',
        city:          'Madrid',
        postcode:      '28001',
        country_code:  'es',
        result_type:   'building',
      },
      geometry: { type: 'Point', coordinates: [-3.7040, 40.4170] },
    },
  ],
};

const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string>) {
  const url = new URL('https://test.example.com/api/autocomplete');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return { url } as Parameters<typeof GET>[0];
}

function mockGeoapify(data: object, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/autocomplete', () => {
  beforeEach(() => {
    // Provide GEOAPIFY_API_KEY so the route doesn't bail early with 500
    vi.stubEnv('GEOAPIFY_API_KEY', 'test-geoapify-key');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── Guard: short / missing text ─────────────────────────────────────────────

  it('returns empty suggestions for short queries (< 2 chars)', async () => {
    const res = await GET(makeRequest({ text: 'M' }));
    const body = await res.json() as { suggestions: unknown[] };
    expect(res.status).toBe(200);
    expect(body.suggestions).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns empty suggestions when text param is absent', async () => {
    const res = await GET(makeRequest({}));
    const body = await res.json() as { suggestions: unknown[] };
    expect(res.status).toBe(200);
    expect(body.suggestions).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('proxies to Geoapify and maps suggestions correctly', async () => {
    mockGeoapify(TWO_FEATURES);

    const res = await GET(makeRequest({ text: 'Calle Mayor', lang: 'es', limit: '6' }));
    expect(res.status).toBe(200);

    const body = await res.json() as {
      suggestions: Array<{
        label: string; street: string; city: string; postcode: string; countryCode: string;
      }>;
    };

    expect(body.suggestions).toHaveLength(2);
    const [first] = body.suggestions;
    expect(first.label).toBe('Calle Mayor 10, 28001 Madrid, Spain');
    expect(first.street).toBe('Calle Mayor 10');
    expect(first.city).toBe('Madrid');
    expect(first.postcode).toBe('28001');
    expect(first.countryCode).toBe('ES'); // alpha-2, uppercased
  });

  it('sends correct query params to Geoapify including apiKey', async () => {
    mockGeoapify(EMPTY_FEATURE_COLLECTION);

    await GET(makeRequest({ text: 'Barcelona', lang: 'ca', limit: '3', countrycode: 'es' }));

    expect(fetch).toHaveBeenCalledOnce();
    const calledUrl = new URL((vi.mocked(fetch).mock.calls[0] as [string])[0]);
    expect(calledUrl.hostname).toBe('api.geoapify.com');
    expect(calledUrl.searchParams.get('text')).toBe('Barcelona');
    expect(calledUrl.searchParams.get('apiKey')).toBe('test-geoapify-key');
    expect(calledUrl.searchParams.get('lang')).toBe('ca');
    expect(calledUrl.searchParams.get('limit')).toBe('3');
    expect(calledUrl.searchParams.get('filter')).toBe('countrycode:es');
  });

  // ── Graceful degradation ────────────────────────────────────────────────────

  it('returns empty suggestions (not 5xx) when Geoapify responds with error status', async () => {
    mockGeoapify({ error: 'internal' }, 500);

    const res = await GET(makeRequest({ text: 'Madrid' }));
    expect(res.status).toBe(200); // never forward a 500 to the browser
    const body = await res.json() as { suggestions: unknown[] };
    expect(body.suggestions).toHaveLength(0);
  });

  it('returns empty suggestions when fetch throws (network error)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

    const res = await GET(makeRequest({ text: 'Madrid' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { suggestions: unknown[] };
    expect(body.suggestions).toHaveLength(0);
  });

  it('sets Cache-Control: max-age=300 on a successful response', async () => {
    mockGeoapify(TWO_FEATURES);

    const res = await GET(makeRequest({ text: 'Calle Mayor' }));
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).toContain('max-age=300');
  });

  it('filters out features that produce an empty label', async () => {
    const fixtureWithEmpty = {
      type: 'FeatureCollection',
      features: [
        {
          // no formatted / address_line1 / street → label = '' → filtered out
          type: 'Feature',
          properties: { city: 'Madrid', postcode: '28001', country_code: 'es' },
          geometry: null,
        },
        ...TWO_FEATURES.features,
      ],
    };
    mockGeoapify(fixtureWithEmpty);

    const res = await GET(makeRequest({ text: 'Calle Mayor' }));
    const body = await res.json() as { suggestions: unknown[] };
    expect(body.suggestions).toHaveLength(2); // empty-label feature stripped
  });

  it('returns 500 when GEOAPIFY_API_KEY is not configured', async () => {
    vi.stubEnv('GEOAPIFY_API_KEY', ''); // override to empty

    const res = await GET(makeRequest({ text: 'Madrid' }));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not configured/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
