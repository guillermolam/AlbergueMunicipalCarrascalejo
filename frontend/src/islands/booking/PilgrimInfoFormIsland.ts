/**
 * PilgrimInfoFormIsland — Step 3 personal-info form for each pilgrim.
 *
 * Wires per-person form navigation (save/load state between pilgrims),
 * real-time validation on submit attempt, country picker, phone
 * prefix picker, phone validation, and address autocomplete.
 *
 * Returns a validation function that the WizardNavigatorIsland calls
 * before allowing progression to Step 4.
 *
 * Extracted from the inline <script> block in book.astro
 * (renderStep3Nav, saveStep3State, loadStep3State, validateStep3).
 */

import { bookingDatesStore } from '../../stores/bookingDatesStore';
import {
  pilgrimStores,
  STEP3_FIELD_KEYS,
  type FieldKey,
  setPilgrimData,
} from '../../stores/bookingPilgrims';
import { initCountryPicker } from '../../utils/booking/countryPicker';
import { initPhonePicker, initPhoneValidation } from '../../utils/booking/phonePicker';
import { initAddressAutocomplete } from '../../utils/booking/addressAutocomplete';

// ── Field IDs saved to in-memory cache and persistent store ──────────────────

const FORM_FIELD_IDS = [
  'f-first', 'f-last', 'f-last2', 'f-dob', 'f-nat', 'f-nat-code',
  'f-email', 'f-phone', 'f-phone-cc', 'f-addr', 'f-addr2', 'f-zip',
  'f-city', 'f-country', 'f-country-code', 'f-ec-name', 'f-ec-phone', 'f-ec-phone-cc',
] as const;

const REQUIRED_FIELDS = ['f-first', 'f-last', 'f-email', 'f-zip', 'f-city'] as const;

// ── Country flag helper ──
function getCountryFlag(code: string): string {
  if (!code?.length || code.length !== 2) return '🌍';
  const pts = [...code.toUpperCase()].map((c) => 0x1f1e6 + (c.codePointAt(0) ?? 0) - 65);
  return String.fromCodePoint(...pts);
}

// ── Mark a required field as invalid (and auto-clear on correction) ──
function markFieldInvalid(el: HTMLInputElement): void {
  const fg = el.closest('.fg');
  fg?.classList.add('has-error');
  el.classList.add('invalid');
  el.addEventListener('input', () => {
    fg?.classList.remove('has-error');
    el.classList.remove('invalid');
  }, { once: true });
}

// ── Show validation errors for REQUIRED_FIELDS in current DOM ──
function showDomErrors(): boolean {
  let allOk = true;
  for (const id of REQUIRED_FIELDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    if (!el.value.trim()) { markFieldInvalid(el); allOk = false; }
  }
  const email = document.getElementById('f-email') as HTMLInputElement | null;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email?.value && !EMAIL_RE.test(email.value)) {
    const fg = email.closest('.fg');
    fg?.classList.add('has-error');
    email.classList.add('invalid');
    allOk = false;
  }
  return allOk;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface PilgrimInfoFormIslandOptions {
  /** Called when the "next" button can be enabled. */
  onValidChange?: (valid: boolean) => void;
}

export function initPilgrimInfoFormIsland(_opts: PilgrimInfoFormIslandOptions = {}): {
  validate: () => boolean;
} {
  const s = bookingDatesStore.get();
  const persons = Number(s.persons) || 1;

  // ── In-memory cache (mirrors what's in the persistent stores) ──
  let personFormData: Record<string, string>[] = Array.from({ length: persons }, (_, i) => {
    const stored = pilgrimStores[i].get();
    return Object.fromEntries(STEP3_FIELD_KEYS.map((k) => [k, stored[k] ?? '']));
  });

  let activePerson = 0;

  // ── Save current DOM → in-memory cache & persistent store ──
  function saveCurrentPerson(): void {
    const data: Record<string, string> = {};
    for (const id of FORM_FIELD_IDS) {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) data[id] = el.value;
    }
    personFormData[activePerson] = data;
    const storeData = Object.fromEntries(
      STEP3_FIELD_KEYS.map((k) => [k, data[k] ?? ''])
    ) as Record<FieldKey, string>;
    setPilgrimData(activePerson, storeData);
  }

  // ── Load from cache → DOM ──
  function loadCurrentPerson(): void {
    let data = personFormData[activePerson];
    if (!data || Object.values(data).every((v) => !v)) {
      const stored = pilgrimStores[activePerson].get();
      data = Object.fromEntries(STEP3_FIELD_KEYS.map((k) => [k, stored[k] ?? '']));
      personFormData[activePerson] = data;
    }
    for (const id of FORM_FIELD_IDS) {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = data[id] ?? '';
    }
    // Restore nationality emoji
    const natCode  = data['f-nat-code'] ?? '';
    const natFlag  = document.getElementById('f-nat-flag');
    if (natFlag) natFlag.textContent = natCode ? getCountryFlag(natCode) : '🌍';
    // Restore country emoji
    const cCode   = data['f-country-code'] ?? '';
    const cFlag   = document.getElementById('f-country-flag');
    if (cFlag) cFlag.textContent = cCode ? getCountryFlag(cCode) : '🌍';
  }

  // ── Render person tabs ──
  function renderPersonNav(): void {
    const nav  = document.getElementById('step3-person-nav');
    const tabs = document.getElementById('step3-pilgrim-tabs');
    const desc = document.getElementById('step3-desc');

    if (persons <= 1) {
      if (nav) nav.style.display = 'none';
      if (desc) desc.textContent = 'Complete your details below';
      return;
    }
    if (nav) nav.style.display = '';
    if (desc) desc.textContent = `Fill details for each pilgrim (${persons} total)`;
    if (!tabs) return;

    tabs.replaceChildren();

    for (let p = 0; p < persons; p++) {
      tabs.appendChild(buildPersonTab(p));
    }
  }

  function buildPersonTab(p: number): HTMLButtonElement {
    const data = readPersonData(p);
    const done = isPersonComplete(data);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `person-tab${p === activePerson ? ' active' : ''}${done ? ' done' : ''}`;
    btn.textContent = data['f-first'] ? `${data['f-first']} (P${p + 1})` : `Pilgrim ${p + 1}`;

    btn.addEventListener('click', () => {
      if (p === activePerson) return;
      saveCurrentPerson();
      activePerson = p;
      loadCurrentPerson();
      renderPersonNav();
    });
    return btn;
  }

  function readPersonData(p: number): Record<string, string> {
    if (p !== activePerson) return personFormData[p] ?? {};
    return Object.fromEntries(
      FORM_FIELD_IDS.map((id) => [
        id,
        (document.getElementById(id) as HTMLInputElement | null)?.value ?? '',
      ])
    );
  }

  function isPersonComplete(data: Record<string, string>): boolean {
    return !!(data['f-first'] && data['f-last'] && data['f-email'] && data['f-zip'] && data['f-city']);
  }

  // ── Wire utility pickers ──
  initCountryPicker({
    inputId:  'f-nat',
    dropId:   'f-nat-drop',
    flagId:   'f-nat-flag',
    hiddenId: 'f-nat-code',
    onSelect: () => saveCurrentPerson(),
  });
  initCountryPicker({
    inputId:  'f-country',
    dropId:   'f-country-drop',
    flagId:   'f-country-flag',
    hiddenId: 'f-country-code',
    onSelect: () => saveCurrentPerson(),
  });
  initPhonePicker({
    btnId:        'f-phone-cc-btn',
    dropId:       'f-phone-cc-drop',
    hiddenId:     'f-phone-cc',
    defaultCode:  'ES',
  });
  initPhoneValidation({
    inputId:   'f-phone',
    ccInputId: 'f-phone-cc',
    errorId:   'f-phone-err',
  });
  initPhonePicker({
    btnId:        'f-ec-phone-cc-btn',
    dropId:       'f-ec-phone-cc-drop',
    hiddenId:     'f-ec-phone-cc',
    defaultCode:  'ES',
  });
  initAddressAutocomplete();

  // ── Initial render ──
  loadCurrentPerson();
  renderPersonNav();

  // ── Validate before advancing to Step 4 ──
  function validate(): boolean {
    saveCurrentPerson();

    if (!showDomErrors()) return false;

    // Validate other persons' saved data
    if (persons <= 1) return true;

    const firstIncomplete = personFormData.findIndex((data, i) => {
      if (i === activePerson) return false;
      return !REQUIRED_FIELDS.every((id) => data[id]?.trim());
    });

    if (firstIncomplete === -1) return true;

    // Navigate to incomplete person and show their errors
    saveCurrentPerson();
    activePerson = firstIncomplete;
    loadCurrentPerson();
    renderPersonNav();
    showDomErrors();
    return false;
  }

  return { validate };
}
