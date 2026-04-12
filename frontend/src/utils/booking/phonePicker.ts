/**
 * Phone prefix picker + phone number validation utilities.
 *
 * Extracted from initPhonePicker() and initPhoneValidation() in book.astro.
 */
import { isValidPhoneNumber, parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';
import { COUNTRIES, type Country } from '../../data/countries';
import { clearEl } from './svgIcons';

// ── Phone Prefix Picker ──────────────────────────────────────────────────────

export interface PhonePickerOpts {
  btnId: string;
  dropId: string;
  /** Optional — ID of the flag-emoji display element */
  flagId?: string;
  /** Optional — ID of the dial-code display element */
  dialId?: string;
  hiddenId: string;
  /** Ignored — kept for backward-compat callers that pass defaultCode */
  defaultCode?: string;
}

export function initPhonePicker(opts: PhonePickerOpts): void {
  const btn    = document.getElementById(opts.btnId)    as HTMLButtonElement | null;
  const drop   = document.getElementById(opts.dropId);
  const flagEl = opts.flagId ? document.getElementById(opts.flagId) : null;
  const dialEl = opts.dialId ? document.getElementById(opts.dialId) : null;
  const hidden = document.getElementById(opts.hiddenId) as HTMLInputElement | null;
  if (!btn || !drop) return;

  const searchInput = drop.querySelector<HTMLInputElement>('.phone-drop-search');
  const list        = drop.querySelector<HTMLUListElement>('.phone-drop-list');
  if (!list) return;

  let activeIdx = -1;
  let filtered: Country[] = [];

  function renderList(q: string): void {
    const lq = q.toLowerCase().replace(/^\+/, '');
    filtered =
      q.length < 1
        ? COUNTRIES.slice(0, 80)
        : COUNTRIES.filter(
            (c) =>
              c.n.toLowerCase().includes(lq) ||
              c.d.replace('+', '').startsWith(lq) ||
              c.c.toLowerCase().startsWith(lq)
          );
    clearEl(list!);
    activeIdx = -1;

    function setActive(idx: number): void {
      list!.querySelectorAll('li').forEach((l, j) => l.classList.toggle('active', j === idx));
      activeIdx = idx;
    }

    filtered.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      const p1 = document.createElement('span'); p1.textContent = c.f; li.appendChild(p1);
      const p2 = document.createElement('span'); p2.textContent = c.n; li.appendChild(p2);
      const p3 = document.createElement('span'); p3.className = 'pdl-dial'; p3.textContent = c.d; li.appendChild(p3);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(c); });
      li.addEventListener('mouseenter', () => setActive(i));
      list!.appendChild(li);
    });
  }

  function choose(c: Country): void {
    if (!btn || !drop) return;
    if (flagEl) flagEl.textContent = c.f;
    if (dialEl) dialEl.textContent = c.d;
    if (hidden) hidden.value = c.c;
    btn.setAttribute('aria-expanded', 'false');
    drop.classList.remove('open');
    if (searchInput) searchInput.value = '';
    renderList('');
  }

  function open(): void {
    if (!drop || !btn) return;
    renderList('');
    drop.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => searchInput?.focus(), 30);
  }

  function close(): void {
    if (!drop || !btn) return;
    drop.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drop.classList.contains('open') ? close() : open();
  });

  searchInput?.addEventListener('input', () => renderList(searchInput.value.trim()));
  searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    const items = list.querySelectorAll<HTMLElement>('li');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      choose(filtered[activeIdx]);
    } else if (e.key === 'Escape') close();
  });

  document.addEventListener('click', (e) => {
    if (!drop.contains(e.target as Node) && e.target !== btn) close();
  });

  renderList('');
}

// ── Phone Validation ─────────────────────────────────────────────────────────

export interface PhoneValidationOpts {
  /** ID of the phone number text input */
  inputId: string;
  /** ID of the hidden ISO country-code input — accepts either ccId or ccInputId */
  ccId?: string;
  /** Alias for ccId (backward compat) */
  ccInputId?: string;
  /** ID of the span showing the dial code (optional) */
  dialId?: string;
  /** ID of the .ferr error span — accepts either errId or errorId */
  errId?: string;
  /** Alias for errId (backward compat) */
  errorId?: string;
}

export function initPhoneValidation(opts: PhoneValidationOpts): void {
  const input = document.getElementById(opts.inputId) as HTMLInputElement | null;
  const ccEl  = document.getElementById(opts.ccId ?? opts.ccInputId ?? '') as HTMLInputElement | null;
  const errEl = document.getElementById(opts.errId ?? opts.errorId ?? '');
  if (!input || !errEl) return;

  const wrap = input.closest('.phone-wrap') as HTMLElement | null;
  const fg   = input.closest('.fg')         as HTMLElement | null;

  function setError(msg: string | null): void {
    if (msg) {
      errEl!.textContent = msg;
      wrap?.classList.add('invalid');
      fg?.classList.add('has-error');
    } else {
      wrap?.classList.remove('invalid');
      fg?.classList.remove('has-error');
    }
  }

  const ALLOWED_KEYS = new Set([
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  ]);

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (
      ALLOWED_KEYS.has(e.key) ||
      e.ctrlKey || e.metaKey ||
      /^\d$/.test(e.key) ||
      (e.key === '+' && input.selectionStart === 0)
    ) return;
    e.preventDefault();
  });

  input.addEventListener('input', () => {
    const raw = input.value;
    // Remove non-phone chars then strip mid-string '+' signs (only leading '+' is valid)
    const cleaned = raw
      .replaceAll(/[^\d\s()+-]/g, '')
      .replaceAll(/(?!^)\+/g, '');
    if (cleaned !== raw) {
      const sel = input.selectionStart ?? cleaned.length;
      input.value = cleaned;
      input.setSelectionRange(sel, sel);
    }
    setError(null);
  });

  input.addEventListener('blur', () => {
    const raw = input.value.trim();
    if (!raw) { setError(null); return; }

    const cc = (ccEl?.value ?? 'ES').toUpperCase() as CountryCode;
    const dialEl = opts.dialId ? document.getElementById(opts.dialId) : null;
    const dialCode = dialEl?.textContent?.trim() ?? '';
    const fullNumber = raw.startsWith('+') ? raw : `${dialCode}${raw}`;

    try {
      const opts2 = { defaultCountry: cc };
      const valid = isValidPhoneNumber(fullNumber, opts2);
      if (valid) {
        const parsed = parsePhoneNumberWithError(fullNumber, opts2);
        input.value = parsed.formatInternational();
        setError(null);
      } else {
        setError('Please enter a valid phone number for the selected country');
      }
    } catch {
      setError('Please enter a valid phone number');
    }
  });
}
