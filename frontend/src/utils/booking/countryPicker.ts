/**
 * Country + nationality picker utility.
 *
 * Extracted from initCountryPicker() in book.astro.
 * Mounts a searchable dropdown on an existing input element — no framework needed.
 */
import { COUNTRIES, type Country } from '../../data/countries';
import { clearEl } from './svgIcons';

export interface CountryPickerOpts {
  inputId: string;
  dropId: string;
  flagId: string;
  hiddenId: string;
  /** Called after a country is selected — use to sync stores or trigger side-effects. */
  onSelect?: (c: Country) => void;
  /** Initial country code to pre-select. Defaults to 'ES'. */
  defaultCode?: string;
}

/**
 * Wire a country picker onto three DOM elements.
 * The input shows the country name, the drop is a UL for suggestions,
 * the hidden input stores the ISO code.
 */
export function initCountryPicker(opts: CountryPickerOpts): void {
  const input  = document.getElementById(opts.inputId)  as HTMLInputElement | null;
  const drop   = document.getElementById(opts.dropId)   as HTMLUListElement  | null;
  const flagEl = document.getElementById(opts.flagId)   as HTMLElement | null;
  const hidden = document.getElementById(opts.hiddenId) as HTMLInputElement | null;
  if (!input || !drop) return;

  let activeIdx = -1;
  let filtered: Country[] = [];

  function renderList(q: string): void {
    if (!drop || !input) return;
    const lq = q.toLowerCase();
    filtered =
      q.length < 1
        ? COUNTRIES.slice(0, 60)
        : COUNTRIES.filter(
            (c) => c.n.toLowerCase().includes(lq) || c.c.toLowerCase().includes(lq)
          );
    clearEl(drop);
    activeIdx = -1;
    filtered.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('id', `${opts.dropId}-opt-${i}`);
      const s1 = document.createElement('span'); s1.textContent = c.f; li.appendChild(s1);
      const s2 = document.createElement('span'); s2.textContent = c.n; li.appendChild(s2);
      const s3 = document.createElement('span'); s3.className = 'cdl-code'; s3.textContent = c.c; li.appendChild(s3);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(c); });
      li.addEventListener('mouseenter', () => setActive(i));
      drop.appendChild(li);
    });
    drop.style.display = filtered.length ? 'block' : 'none';
    input.setAttribute('aria-expanded', filtered.length ? 'true' : 'false');
  }

  function setActive(idx: number): void {
    if (!drop || !input) return;
    drop.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === idx));
    activeIdx = idx;
    if (idx >= 0) input.setAttribute('aria-activedescendant', `${opts.dropId}-opt-${idx}`);
  }

  function choose(c: Country): void {
    if (!drop || !input) return;
    input.value = c.n;
    if (flagEl) flagEl.textContent = c.f;
    if (hidden) hidden.value = c.c;
    drop.style.display = 'none';
    input.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
    opts.onSelect?.(c);
  }

  // Pre-select default country
  const defaultCode = opts.defaultCode ?? 'ES';
  const initial = COUNTRIES.find((c) => c.c === defaultCode);
  if (initial) choose(initial);

  input.addEventListener('focus',  () => renderList(input.value));
  input.addEventListener('input',  () => renderList(input.value.trim()));
  input.addEventListener('blur',   () =>
    setTimeout(() => {
      if (!drop || !input) return;
      drop.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
    }, 160)
  );
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!drop || !input) return;
    const items = drop.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); choose(filtered[activeIdx]); }
    else if (e.key === 'Escape') { drop.style.display = 'none'; input.setAttribute('aria-expanded', 'false'); }
  });
}
