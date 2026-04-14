/**
 * Date selection & person count store for the /book booking flow.
 *
 * Sourced from the inline `state` object in the original book.astro.
 * Persisted to sessionStorage so a page refresh mid-flow doesn't lose dates.
 */
import { persistentMap } from '@nanostores/persistent';

export type DatesKey =
  | 'checkin'
  | 'checkout'
  | 'nights'
  | 'persons'
  | 'pricePerNight'
  | 'totalPrice'
  | 'docType'
  | 'bed'
  | 'maxNights'
  | 'maxAdvanceDays'
  | 'maxPersons';

export type DatesState = Record<DatesKey, string>;

const INITIAL: DatesState = {
  checkin: '',
  checkout: '',
  nights: '0',
  persons: '1',
  pricePerNight: '15',
  totalPrice: '0',
  docType: '',
  bed: '',
  maxNights: '30',
  maxAdvanceDays: '365',
  maxPersons: '10',
};

export const bookingDatesStore = persistentMap<DatesState>('booking:dates:', INITIAL);

// ── Actions ──────────────────────────────────────────────────────────────────

export function setDates(checkin: string, checkout: string): void {
  const nights =
    checkin && checkout
      ? String(
          Math.round(
            (new Date(checkout + 'T00:00:00').getTime() -
              new Date(checkin + 'T00:00:00').getTime()) /
              86400000
          )
        )
      : '0';
  bookingDatesStore.setKey('checkin', checkin);
  bookingDatesStore.setKey('checkout', checkout);
  bookingDatesStore.setKey('nights', nights);
}

export function setPersons(count: number): void {
  bookingDatesStore.setKey('persons', String(count));
}

export function setPricePerNight(price: number): void {
  bookingDatesStore.setKey('pricePerNight', String(price));
  _recalcTotal();
}

export function setTotalPrice(price: number): void {
  bookingDatesStore.setKey('totalPrice', String(price));
}

export function setDocType(type: string): void {
  bookingDatesStore.setKey('docType', type);
}

export function setBed(bed: string): void {
  bookingDatesStore.setKey('bed', bed);
}

export function setHostelLimits(maxNights: number, maxAdvanceDays: number, maxPersons: number): void {
  bookingDatesStore.setKey('maxNights', String(maxNights));
  bookingDatesStore.setKey('maxAdvanceDays', String(maxAdvanceDays));
  bookingDatesStore.setKey('maxPersons', String(maxPersons));
}

function _recalcTotal(): void {
  const s = bookingDatesStore.get();
  const total = Number(s.persons) * Number(s.nights) * Number(s.pricePerNight);
  bookingDatesStore.setKey('totalPrice', String(total));
}

/** Clear all date/booking selections (call on "start over" or confirmed). */
export function resetDates(): void {
  bookingDatesStore.set({ ...INITIAL });
}
