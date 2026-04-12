/**
 * GET /api/info/hostel
 *
 * Returns all hostel configuration data from D1:
 *   config, services (active), house rules (active), nearby attractions (active)
 *
 * Response: { config, services, rules, attractions, source }
 *
 * Data resolution order:
 *   1. Cloudflare D1 (CF Workers / wrangler pages dev)
 *   2. Backend hostel config worker at PUBLIC_API_URL
 *   3. Hardcoded defaults — source: "default"
 */
import type { APIRoute } from 'astro';
import {
  getD1,
  db,
  hostelConfig,
  hostelServices,
  hostelRules,
  nearbyAttractions,
} from '../../../db/helpers';
import { eq, asc } from 'drizzle-orm';

export const prerender = false;

// ── Fallback defaults (match migration seed data) ─────────────────────────────
const DEFAULTS = {
  config: {
    name: 'Albergue Municipal de El Carrascalejo',
    tagline: 'Acogida en el Camino de Santiago — Vía de la Plata',
    addressStreet: 'Paraje la cuesta, s/n',
    addressPostcode: '06894',
    addressTown: 'El Carrascalejo',
    addressProvince: 'Badajoz',
    addressCountry: 'España',
    phone: '+34 695 90 43 44',
    email: 'elcarrascalejoalbergue@gmail.com',
    website: 'https://alberguecarrascalejo.es',
    latitude: 39.0237972,
    longitude: -6.3373782,
    checkInOpen: '10:00',
    checkInClose: '21:00',
    checkOutOpen: '09:00',
    checkOutClose: '11:00',
    maxNights: 2,
    totalBeds: 24,
    tourismLicense: 'AL-BA-0034',
    languages: ['es', 'en'],
    accessibility: {
      wheelchair: true,
      ground_floor: true,
      adapted_bathroom: true,
      grab_rails: true,
    },
    caminoKm: '482',
    caminoRoute: 'Via de la Plata',
  },
  services: [
    { name: 'Desayuno', icon: '☕', priceCents: 350, unit: 'por persona', category: 'food' },
    { name: 'Cena peregrino', icon: '🍽️', priceCents: 1000, unit: 'por persona', category: 'food' },
    { name: 'Lavadora', icon: '🧺', priceCents: 250, unit: 'por lavada', category: 'laundry' },
    { name: 'Secadora', icon: '💨', priceCents: 200, unit: 'por secada', category: 'laundry' },
    { name: 'Sello credencial', icon: '📮', priceCents: 0, unit: 'gratuito', category: 'camino' },
    { name: 'Parking bici', icon: '🚲', priceCents: 0, unit: 'gratuito', category: 'transport' },
    { name: 'Wi-Fi', icon: '📶', priceCents: 0, unit: 'gratuito', category: 'facilities' },
    {
      name: 'Cocina peregrinos',
      icon: '🍳',
      priceCents: 0,
      unit: 'gratuito',
      category: 'facilities',
    },
  ],
  rules: [
    'Horario de silencio: 22:00 — 07:00',
    'Zona de fumadores habilitada en el exterior',
    'No se permiten fiestas ni eventos',
    'No se admiten ninos (albergue para adultos peregrinos)',
    'Mascotas permitidas — consultar sin cargo adicional',
    'Documento de identidad obligatorio al llegar',
    'Respeta a los demas peregrinos',
    'Cancelacion gratuita 24h antes',
    'Pago en efectivo en el albergue',
    'Llegadas tardias: avisar previamente al hospitalero',
  ],
  attractions: [
    {
      name: 'Acueducto Romano de Los Milagros',
      distanceKm: 13,
      icon: '🏛️',
      description:
        'Impresionante acueducto romano del siglo I d.C., Patrimonio de la Humanidad UNESCO.',
    },
    {
      name: 'Basilica de Santa Eulalia',
      distanceKm: 14,
      icon: '⛪',
      description:
        'Imponente basilica gotica del siglo XIV dedicada a la martir patrona de Merida.',
    },
    {
      name: 'Teatro Romano y Anfiteatro',
      distanceKm: 15,
      icon: '🎭',
      description: 'Teatro del siglo I a.C. perfectamente conservado y anfiteatro de gladiadores.',
    },
    {
      name: 'Aeropuerto de Badajoz',
      distanceKm: 57,
      icon: '✈️',
      description: 'Aeropuerto internacional con conexiones a Madrid, Barcelona y Canarias.',
    },
  ],
};

export const GET: APIRoute = async () => {
  // ── 1. Try D1 ───────────────────────────────────────────────────────────────
  const d1 = await getD1();
  if (d1) {
    try {
      const drizzle = db(d1);

      const [config] = await drizzle
        .select()
        .from(hostelConfig)
        .where(eq(hostelConfig.id, 1))
        .limit(1);
      const services = await drizzle
        .select()
        .from(hostelServices)
        .where(eq(hostelServices.available, 1))
        .orderBy(asc(hostelServices.id));
      const rules = await drizzle
        .select()
        .from(hostelRules)
        .where(eq(hostelRules.active, 1))
        .orderBy(asc(hostelRules.sortOrder));
      const attractions = await drizzle
        .select()
        .from(nearbyAttractions)
        .where(eq(nearbyAttractions.active, 1))
        .orderBy(asc(nearbyAttractions.sortOrder));

      // Extended columns added by migration 0005 — read via raw D1 for SQLite ALTER TABLE columns
      // that Drizzle's static schema may not include until schema is regenerated.
      const extRow = await d1
        .prepare(
          'SELECT check_in_open, check_in_close, check_out_open, check_out_close, max_nights, total_beds, languages, accessibility, camino_km, camino_route FROM hostel_config WHERE id = 1'
        )
        .first<{
          check_in_open: string;
          check_in_close: string;
          check_out_open: string;
          check_out_close: string;
          max_nights: number;
          total_beds: number;
          languages: string;
          accessibility: string;
          camino_km: string;
          camino_route: string;
        }>();

      return new Response(
        JSON.stringify({
          config: {
            ...config,
            checkInOpen: extRow?.check_in_open ?? DEFAULTS.config.checkInOpen,
            checkInClose: extRow?.check_in_close ?? DEFAULTS.config.checkInClose,
            checkOutOpen: extRow?.check_out_open ?? DEFAULTS.config.checkOutOpen,
            checkOutClose: extRow?.check_out_close ?? DEFAULTS.config.checkOutClose,
            maxNights: extRow?.max_nights ?? DEFAULTS.config.maxNights,
            totalBeds: extRow?.total_beds ?? DEFAULTS.config.totalBeds,
            languages: extRow?.languages ? JSON.parse(extRow.languages) : DEFAULTS.config.languages,
            accessibility: extRow?.accessibility
              ? JSON.parse(extRow.accessibility)
              : DEFAULTS.config.accessibility,
            caminoKm: extRow?.camino_km ?? DEFAULTS.config.caminoKm,
            caminoRoute: extRow?.camino_route ?? DEFAULTS.config.caminoRoute,
          },
          services: services.map((s) => ({ ...s, priceEur: s.priceCents / 100 })),
          rules: rules.map((r) => r.rule),
          attractions,
          source: 'd1',
        }),
        {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        }
      );
    } catch (e) {
      console.error('[/api/info/hostel] D1 error', e);
    }
  }

  // ── 2. Proxy to backend worker ───────────────────────────────────────────────
  const apiBase = import.meta.env.PUBLIC_API_URL;
  if (apiBase) {
    try {
      const upstream = await fetch(`${apiBase}/api/info/hostel`);
      if (upstream.ok) {
        const data = (await upstream.json()) as unknown;
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }
    } catch (e) {
      console.warn('[/api/info/hostel] backend proxy failed', e);
    }
  }

  // ── 3. Static defaults ───────────────────────────────────────────────────────
  return new Response(JSON.stringify({ ...DEFAULTS, source: 'default' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
