/**
 * PersonsPickerIsland — persons ± controls for Step 1.
 *
 * Wires the #persons-minus, #persons-plus, and #persons-input elements
 * to `bookingDatesStore`. When the person count changes the store update
 * will automatically trigger CalendarIsland's subscription re-render so
 * the price chips update without any direct coupling.
 *
 * Extracted from the inline <script> block in book.astro (updatePersonPicker).
 */

import {
  bookingDatesStore,
  setPersons,
  setHostelLimits,
} from '../../stores/bookingDatesStore';

export function initPersonsPickerIsland(): void {
  // ── Load booking limits from /api/info/hostel ──

  (async () => {
    try {
      const cfg = await fetch('/api/info/hostel').then((r) =>
        r.ok ? (r.json() as Promise<Record<string, unknown>>) : null
      );
      if (cfg) {
        const maxNights     = typeof cfg['max_nights_per_booking']      === 'number' ? cfg['max_nights_per_booking']      : 30;
        const maxAdvanceDays = typeof cfg['max_booking_days_in_advance']  === 'number' ? cfg['max_booking_days_in_advance']  : 365;
        const maxPersons    = typeof cfg['max_people_per_booking']       === 'number' ? cfg['max_people_per_booking']       : 10;
        setHostelLimits(maxNights as number, maxAdvanceDays as number, maxPersons as number);
      }
    } catch {
      /* keep defaults */
    }
    updatePersonPickerUI();
  })();

  // ── UI update ──

  function updatePersonPickerUI(): void {
    const input = document.getElementById('persons-input') as HTMLInputElement | null;
    const minus = document.getElementById('persons-minus') as HTMLButtonElement | null;
    const plus  = document.getElementById('persons-plus')  as HTMLButtonElement | null;
    const hint  = document.getElementById('persons-hint');
    if (!input) return;

    const s = bookingDatesStore.get();
    const v          = Number(s.persons)   || 1;
    const maxPersons = Number(s.maxPersons) || 10;

    input.max   = String(maxPersons);
    input.value = String(v);
    if (minus) minus.disabled = v <= 1;
    if (plus)  plus.disabled  = v >= maxPersons;
    if (hint) hint.textContent = v === 1 ? '1 pilgrim' : `${v} pilgrims`;
  }

  // ── Wire buttons ──

  document.getElementById('persons-minus')?.addEventListener('click', () => {
    const s = bookingDatesStore.get();
    const v = Number(s.persons) || 1;
    if (v > 1) {
      setPersons(v - 1);
      updatePersonPickerUI();
    }
  });

  document.getElementById('persons-plus')?.addEventListener('click', () => {
    const s = bookingDatesStore.get();
    const v          = Number(s.persons)   || 1;
    const maxPersons = Number(s.maxPersons) || 10;
    if (v < maxPersons) {
      setPersons(v + 1);
      updatePersonPickerUI();
    }
  });

  const personsInput = document.getElementById('persons-input') as HTMLInputElement | null;

  personsInput?.addEventListener('input', function () {
    const s = bookingDatesStore.get();
    const maxPersons = Number(s.maxPersons) || 10;
    let v = parseInt((this as HTMLInputElement).value) || 1;
    v = Math.max(1, Math.min(maxPersons, v));
    setPersons(v);
    updatePersonPickerUI();
  });

  personsInput?.addEventListener('blur', function () {
    const s = bookingDatesStore.get();
    const maxPersons = Number(s.maxPersons) || 10;
    let v = parseInt((this as HTMLInputElement).value) || 1;
    v = Math.max(1, Math.min(maxPersons, v));
    setPersons(v);
    updatePersonPickerUI();
  });

  // ── Initial UI sync ──
  updatePersonPickerUI();
}
