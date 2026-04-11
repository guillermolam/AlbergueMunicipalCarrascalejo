import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

// ── Mock helpers ────────────────────────────────────────────────────────────
function isMock() {
  return (import.meta.env.PUBLIC_API_MODE ?? 'mock') !== 'real';
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime())
    / 86_400_000
  );
}

function mockBeds(checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut);
  const beds = [];
  for (let i = 1; i <= 24; i++) {
    const seed = (i * 7 + checkIn.split('-').map(Number).reduce((a, b) => a + b, 0) * 3) % 37;
    beds.push({
      bedId: `bed-${i}`,
      bedNumber: i,
      roomType: i <= 12 ? 'dorm_a' : 'dorm_b',
      bedType: i % 2 !== 0 ? 'top' : 'bottom',
      available: ![5, 9, 15, 23].includes(i) && seed > 5,
      pricePerNight: 15,
    });
  }
  return beds;
}

// ── Actions ─────────────────────────────────────────────────────────────────
export const booking = {
  checkAvailability: defineAction({
    input: z.object({
      checkIn:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      persons:  z.number().int().min(1).max(10).default(1),
    }),
    handler: async ({ checkIn, checkOut, persons }) => {
      const nights = nightsBetween(checkIn, checkOut);

      if (isMock()) {
        const pricePerNight = 15;
        const beds = mockBeds(checkIn, checkOut);
        return {
          available: beds.some(b => b.available),
          beds,
          pricePerNight,
          totalPrice: nights * pricePerNight * persons,
          currency: 'EUR',
        };
      }

      // Real mode: fetch pricing from backend, build bed list from rooms endpoint
      const apiBase = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';
      let pricePerNight = 15; // EUR default: €15

      try {
        const priceRes = await fetch(`${apiBase}/api/pricing`);
        if (priceRes.ok) {
          const priceData = await priceRes.json() as { price_eur?: number; price_cents?: number };
          pricePerNight = priceData.price_eur ?? (priceData.price_cents ?? 1500) / 100;
        }
      } catch { /* keep default */ }

      // Fetch rooms for bed availability
      let beds: Array<{
        bedId: string; bedNumber: number; roomType: string;
        bedType: string; available: boolean; pricePerNight: number;
      }> = [];
      try {
        const roomsRes = await fetch(`${apiBase}/api/rooms`);
        if (roomsRes.ok) {
          const rooms = await roomsRes.json() as Array<{
            id: number; name: string; beds_count: number; available: number;
          }>;
          let bedNum = 0;
          for (const room of rooms) {
            for (let i = 0; i < room.beds_count; i++) {
              bedNum++;
              const occupied = room.beds_count - room.available;
              beds.push({
                bedId: `bed-${bedNum}`,
                bedNumber: bedNum,
                roomType: room.name.toLowerCase().replace(/\s+/g, '_'),
                bedType: bedNum % 2 !== 0 ? 'top' : 'bottom',
                available: i >= occupied,
                pricePerNight,
              });
            }
          }
        }
      } catch { /* fallback to mock beds */ }

      if (beds.length === 0) {
        beds = mockBeds(checkIn, checkOut).map(b => ({ ...b, pricePerNight }));
      }

      return {
        available: beds.some(b => b.available),
        beds,
        pricePerNight,
        totalPrice: nights * pricePerNight * persons,
        currency: 'EUR',
      };
    },
  }),

  create: defineAction({
    input: z.object({
      checkIn:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      checkOut:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      persons:          z.number().int().min(1).max(10).default(1),
      estimatedArrival: z.string().optional(),
      notes:            z.string().max(500).optional(),
    }),
    handler: async (input, context) => {
      const nights = nightsBetween(input.checkIn, input.checkOut);

      if (isMock()) {
        const refSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        return {
          booking: {
            id: `mock-${refSuffix}`,
            referenceNumber: `BK-${refSuffix}`,
            checkInDate: input.checkIn,
            checkOutDate: input.checkOut,
            nights,
            numberOfPersons: input.persons,
            status: 'confirmed',
            paymentStatus: 'pending',
            totalAmount: nights * 15 * input.persons,
            currency: 'EUR',
          },
          confirmationCode: `CONF-${refSuffix}`,
          paymentDeadline: new Date(Date.now() + 24 * 3600_000).toISOString(),
        };
      }

      const token   = context.locals.sessionToken;
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          check_in:    input.checkIn,
          check_out:   input.checkOut,
          num_guests:  input.persons,
          notes:       input.notes,
        }),
      });
      if (!res.ok) throw new Error(`Booking creation failed: HTTP ${res.status}`);
      return (await res.json()) as {
        booking: unknown;
        confirmationCode: string;
        paymentDeadline: string;
      };
    },
  }),

  cancel: defineAction({
    input: z.object({
      bookingId: z.string().min(1),
      reason:    z.string().max(200).optional(),
    }),
    handler: async ({ bookingId, reason }, context) => {
      if (isMock()) return { success: true };

      const token   = context.locals.sessionToken;
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(`Booking cancellation failed: HTTP ${res.status}`);
      return { success: true };
    },
  }),

  validateDocument: defineAction({
    input: z.object({
      documentType:   z.enum(['DNI', 'NIE', 'PASSPORT']),
      documentNumber: z.string().min(6).max(20),
    }),
    handler: async ({ documentType, documentNumber }) => {
      if (isMock()) {
        return {
          valid: true,
          confidence: 0,
          extractedData: null,
          errors: [] as string[],
        };
      }

      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const endpoint = documentType === 'DNI'
        ? '/api/validate/dni'
        : documentType === 'NIE'
          ? '/api/validate/nie'
          : '/api/validate/passport';
      const res = await fetch(`${apiBase.replace('/api', '')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_number: documentNumber, document_type: documentType }),
      });
      if (!res.ok) {
        return { valid: false, confidence: 0, errors: [`HTTP ${res.status}`], extractedData: null };
      }
      return (await res.json()) as {
        valid: boolean;
        confidence: number;
        extractedData: unknown;
        errors: string[];
      };
    },
  }),
};
