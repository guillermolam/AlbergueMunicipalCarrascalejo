import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

// ── Mock helpers ────────────────────────────────────────────────────────────
function isMock() {
  return (import.meta.env.PUBLIC_API_MODE ?? 'mock') !== 'real';
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime()) /
      86_400_000
  );
}

function mockBeds(checkIn: string, checkOut: string) {
  const beds = [];
  for (let i = 1; i <= 24; i++) {
    const seed =
      (i * 7 +
        checkIn
          .split('-')
          .map(Number)
          .reduce((a, b) => a + b, 0) *
          3) %
      37;
    beds.push({
      bedId: `bed-${i}`,
      bedNumber: i,
      roomType: i <= 12 ? 'dorm_a' : 'dorm_b',
      bedType: i % 2 === 1 ? 'top' : 'bottom',
      available: ![5, 9, 15, 23].includes(i) && seed > 5,
      pricePerNight: 15,
    });
  }
  return beds;
}

async function fetchPricingData(apiBase: string): Promise<number> {
  let pricePerNight = 15; // EUR default: €15
  try {
    const priceRes = await fetch(`${apiBase}/api/pricing`);
    if (priceRes.ok) {
      const priceData = await priceRes.json();
      if (typeof (priceData as Record<string, unknown>).price_eur === 'number') {
        pricePerNight = (priceData as Record<string, unknown>).price_eur as number;
      } else if (typeof (priceData as Record<string, unknown>).price_cents === 'number') {
        pricePerNight = ((priceData as Record<string, unknown>).price_cents as number) / 100;
      }
    }
  } catch {
    /* keep default */
  }
  return pricePerNight;
}

function isValidRoomData(roomData: Record<string, unknown>): boolean {
  return (
    typeof roomData.beds_count === 'number' &&
    typeof roomData.available === 'number' &&
    typeof roomData.name === 'string'
  );
}

function createBedsFromRoom(
  room: Record<string, unknown>,
  startBedNum: number,
  pricePerNight: number
): Array<{
  bedId: string;
  bedNumber: number;
  roomType: string;
  bedType: string;
  available: boolean;
  pricePerNight: number;
}> {
  const beds: Array<{
    bedId: string;
    bedNumber: number;
    roomType: string;
    bedType: string;
    available: boolean;
    pricePerNight: number;
  }> = [];
  const roomData = room as Record<string, unknown>;

  if (!isValidRoomData(roomData)) {
    return beds;
  }

  const bedsCount = roomData.beds_count as number;
  const occupied = bedsCount - (roomData.available as number);
  const roomType = (roomData.name as string).toLowerCase().replaceAll(/\s+/g, '_');

  for (let i = 0; i < bedsCount; i++) {
    const bedNumber = startBedNum + i;
    beds.push({
      bedId: `bed-${bedNumber}`,
      bedNumber,
      roomType,
      bedType: bedNumber % 2 === 1 ? 'top' : 'bottom',
      available: i >= occupied,
      pricePerNight,
    });
  }

  return beds;
}

async function fetchBedsFromRooms(
  apiBase: string,
  pricePerNight: number
): Promise<
  Array<{
    bedId: string;
    bedNumber: number;
    roomType: string;
    bedType: string;
    available: boolean;
    pricePerNight: number;
  }>
> {
  let beds: Array<{
    bedId: string;
    bedNumber: number;
    roomType: string;
    bedType: string;
    available: boolean;
    pricePerNight: number;
  }> = [];
  try {
    const roomsRes = await fetch(`${apiBase}/api/rooms`);
    if (roomsRes.ok) {
      const rooms = await roomsRes.json();
      if (Array.isArray(rooms)) {
        let bedNum = 0;
        for (const room of rooms) {
          const roomBeds = createBedsFromRoom(
            room as Record<string, unknown>,
            bedNum + 1,
            pricePerNight
          );
          beds = beds.concat(roomBeds);
          bedNum += roomBeds.length;
        }
      }
    }
  } catch {
    /* fallback to mock beds */
  }
  return beds;
}

async function fetchBookingLimits(): Promise<{ maxNights: number; maxAdvanceDays: number }> {
  let maxNights = 30;
  let maxAdvanceDays = 365;
  try {
    const apiBase = import.meta.env.PUBLIC_API_URL ?? '';
    if (apiBase) {
      const cfg = await fetch(`${apiBase}/api/info/hostel`).then((r) =>
        r.ok ? (r.json() as Promise<Record<string, unknown>>) : null
      );
      if (cfg) {
        if (typeof cfg['max_nights_per_booking'] === 'number')
          maxNights = cfg['max_nights_per_booking'];
        if (typeof cfg['max_booking_days_in_advance'] === 'number')
          maxAdvanceDays = cfg['max_booking_days_in_advance'];
      }
    }
  } catch {
    /* keep defaults */
  }
  return { maxNights, maxAdvanceDays };
}

function validateBookingDates(
  checkIn: string,
  checkOut: string,
  nights: number,
  maxNights: number,
  maxAdvanceDays: number
): void {
  if (nights < 1) {
    throw new Error('Check-out must be after check-in.');
  }
  if (nights > maxNights) {
    throw new Error(`Maximum stay is ${maxNights} nights.`);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(checkIn + 'T00:00:00');
  const daysInAdvance = Math.round((checkInDate.getTime() - today.getTime()) / 86400000);
  if (daysInAdvance > maxAdvanceDays) {
    throw new Error(`Bookings can only be made up to ${maxAdvanceDays} days in advance.`);
  }
  if (daysInAdvance < 0) {
    throw new Error('Check-in date cannot be in the past.');
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────
export const booking = {
  checkAvailability: defineAction({
    input: z.object({
      checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      persons: z.number().int().min(1).max(10).default(1),
    }),
    handler: async ({ checkIn, checkOut, persons }) => {
      const nights = nightsBetween(checkIn, checkOut);
      const pricePerNight = isMock()
        ? 15
        : await fetchPricingData(import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787');

      if (isMock()) {
        const beds = mockBeds(checkIn, checkOut);
        return {
          available: beds.some((b) => b.available),
          beds,
          pricePerNight,
          totalPrice: nights * pricePerNight * persons,
          currency: 'EUR',
        };
      }

      const apiBase = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';
      let beds = await fetchBedsFromRooms(apiBase, pricePerNight);

      if (beds.length === 0) {
        beds = mockBeds(checkIn, checkOut).map((b) => ({ ...b, pricePerNight }));
      }

      return {
        available: beds.some((b) => b.available),
        beds,
        pricePerNight,
        totalPrice: nights * pricePerNight * persons,
        currency: 'EUR',
      };
    },
  }),

  create: defineAction({
    input: z.object({
      checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      persons: z.number().int().min(1).max(10).default(1),
      estimatedArrival: z.string().optional(),
      notes: z.string().max(500).optional(),
    }),
    handler: async (input, context) => {
      const nights = nightsBetween(input.checkIn, input.checkOut);

      // ── Server-side booking rule validation ───────────────────────────────
      const { maxNights, maxAdvanceDays } = await fetchBookingLimits();
      validateBookingDates(input.checkIn, input.checkOut, nights, maxNights, maxAdvanceDays);

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
          paymentDeadline: new Date(Date.now() + 24 * 3_600_000).toISOString(),
        };
      }

      const token = context.locals.sessionToken;
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          check_in: input.checkIn,
          check_out: input.checkOut,
          num_guests: input.persons,
          notes: input.notes,
        }),
      });
      if (!res.ok) throw new Error(`Booking creation failed: HTTP ${res.status}`);
      return await res.json();
    },
  }),

  cancel: defineAction({
    input: z.object({
      bookingId: z.string().min(1),
      reason: z.string().max(200).optional(),
    }),
    handler: async ({ bookingId, reason }, context) => {
      if (isMock()) return { success: true };

      const token = context.locals.sessionToken;
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
      documentType: z.enum(['DNI', 'NIE', 'PASSPORT']),
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
      let endpoint: string;
      if (documentType === 'DNI') {
        endpoint = '/api/validate/dni';
      } else if (documentType === 'NIE') {
        endpoint = '/api/validate/nie';
      } else {
        endpoint = '/api/validate/passport';
      }
      const res = await fetch(`${apiBase.replace('/api', '')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_number: documentNumber, document_type: documentType }),
      });
      if (!res.ok) {
        return { valid: false, confidence: 0, errors: [`HTTP ${res.status}`], extractedData: null };
      }
      return await res.json();
    },
  }),
};
