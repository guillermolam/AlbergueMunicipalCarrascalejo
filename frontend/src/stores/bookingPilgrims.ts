/**
 * Per-pilgrim persistent form-data stores for the /book wizard.
 *
 * Each slot (0–9) gets its own `persistentMap` backed by sessionStorage so the
 * user's data survives a page refresh but is cleared when the tab is closed.
 * When the pilgrim count changes `resetPilgrims(count)` clears stale slots.
 */
import { persistentMap } from '@nanostores/persistent';

export const STEP3_FIELD_KEYS = [
  'f-first',
  'f-last',
  'f-last2',
  'f-dob',
  'f-doc-num',
  'f-doc-type',
  'f-expiry',
  'f-gender',
  'f-nat',
  'f-nat-code',
  'f-email',
  'f-phone',
  'f-phone-cc',
  'f-addr',
  'f-addr2',
  'f-zip',
  'f-city',
  'f-country',
  'f-country-code',
  'f-ec-name',
  'f-ec-phone',
  'f-ec-phone-cc',
] as const;

export type FieldKey = (typeof STEP3_FIELD_KEYS)[number];
export type PilgrimFormData = Record<FieldKey, string>;

const EMPTY_PILGRIM: PilgrimFormData = {
  'f-first': '',
  'f-last': '',
  'f-last2': '',
  'f-dob': '',
  'f-doc-num': '',
  'f-doc-type': 'dni',
  'f-expiry': '',
  'f-gender': '',
  'f-nat': '',
  'f-nat-code': '',
  'f-email': '',
  'f-phone': '',
  'f-phone-cc': 'ES',
  'f-addr': '',
  'f-addr2': '',
  'f-zip': '',
  'f-city': '',
  'f-country': '',
  'f-country-code': '',
  'f-ec-name': '',
  'f-ec-phone': '',
  'f-ec-phone-cc': 'ES',
};

export const MAX_PILGRIMS = 10;

/**
 * One persistent store per pilgrim slot (backed by localStorage so data
 * survives accidental tab closure during a long booking flow).
 */
export const pilgrimStores = Array.from({ length: MAX_PILGRIMS }, (_, i) =>
  persistentMap<PilgrimFormData>(`booking:pilgrim:${i}:`, { ...EMPTY_PILGRIM })
);

/** Clear all slots ≥ count so stale data doesn't leak across bookings. */
export function resetPilgrims(count: number): void {
  const active = Math.min(Math.max(count, 1), MAX_PILGRIMS);
  for (let i = active; i < MAX_PILGRIMS; i++) {
    pilgrimStores[i].set({ ...EMPTY_PILGRIM });
  }
}

/** Read the persisted form data for pilgrim at `index`. */
export function getPilgrimData(index: number): PilgrimFormData {
  return pilgrimStores[Math.min(index, MAX_PILGRIMS - 1)].get();
}

/** Merge `data` into the persisted form data for pilgrim at `index`. */
export function setPilgrimData(index: number, data: Partial<PilgrimFormData>): void {
  const store = pilgrimStores[Math.min(index, MAX_PILGRIMS - 1)];
  store.set({ ...store.get(), ...data } as PilgrimFormData);
}
