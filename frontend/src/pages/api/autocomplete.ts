import type { APIRoute } from 'astro';

// SSR proxy for Geoapify Address Autocomplete API.
// The API key is kept server-side — never exposed to the browser.
//
// GET /api/autocomplete?text=<query>[&lang=es][&limit=5][&countrycode=es,fr,de,...]
//
// Docs: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
export const prerender = false;

interface GeoapifyFeature {
  type: 'Feature';
  properties: {
    formatted?:     string;
    address_line1?: string;
    address_line2?: string;
    street?:        string;
    housenumber?:   string;
    city?:          string;
    state?:         string;
    postcode?:      string;
    country?:       string;
    country_code?:  string;
    result_type?:   string;
    rank?: { popularity?: number };
  };
  geometry?: { type: string; coordinates: [number, number] };
}

interface GeoapifyResponse {
  type:     'FeatureCollection';
  features: GeoapifyFeature[];
}

export interface AutocompleteSuggestion {
  label:       string;   // full formatted address shown in dropdown
  street:      string;   // street + housenumber → fills #f-addr
  city:        string;   // fills #f-city
  postcode:    string;   // fills #f-zip
  countryCode: string;   // ISO 3166-1 alpha-2
}

function toSuggestion(f: GeoapifyFeature): AutocompleteSuggestion {
  const p = f.properties;
  const street = [p.street, p.housenumber].filter(Boolean).join(' ') || p.address_line1 || '';
  return {
    label:       p.formatted      ?? p.address_line1 ?? street,
    street:      street,
    city:        p.city           ?? '',
    postcode:    p.postcode       ?? '',
    countryCode: (p.country_code  ?? '').toUpperCase(),
  };
}

export const GET: APIRoute = async ({ url }) => {
  const text = url.searchParams.get('text')?.trim();
  if (!text || text.length < 2) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = import.meta.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEOAPIFY_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const lang        = url.searchParams.get('lang')        ?? 'es';
  const limit       = url.searchParams.get('limit')       ?? '6';
  const countrycode = url.searchParams.get('countrycode') ?? '';   // e.g. "es,fr,de"

  const geoapify = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  geoapify.searchParams.set('text',   text);
  geoapify.searchParams.set('apiKey', apiKey);
  geoapify.searchParams.set('lang',   lang);
  geoapify.searchParams.set('limit',  limit);
  if (countrycode) geoapify.searchParams.set('filter', `countrycode:${countrycode}`);

  try {
    const res = await fetch(geoapify.toString());
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Geoapify returned ${res.status}`, suggestions: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const geo = (await res.json()) as GeoapifyResponse;
    const suggestions: AutocompleteSuggestion[] = (geo.features ?? [])
      .map(toSuggestion)
      .filter(s => s.label); // drop empty results

    return new Response(JSON.stringify({ suggestions }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min edge cache
      },
    });
  } catch (err) {
    console.error('[autocomplete] Geoapify fetch failed:', err);
    return new Response(
      JSON.stringify({ error: 'Geocoding service unavailable', suggestions: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
