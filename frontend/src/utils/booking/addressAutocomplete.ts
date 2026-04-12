/**
 * Address autocomplete utility (Geoapify via SSR proxy /api/autocomplete).
 *
 * Extracted from the inline initAddressAutocomplete IIFE in book.astro.
 * The API key is kept server-side — never exposed to the browser.
 */
import { COUNTRIES } from '../../data/countries';
import { clearEl } from './svgIcons';

interface Suggestion {
  label: string;
  street: string;
  city: string;
  postcode: string;
  countryCode: string;
}

/**
 * Wire address autocomplete onto the address form fields.
 * All element IDs match the HTML rendered by StepPersonalInfo.astro.
 */
export function initAddressAutocomplete(): void {
  const addrInput   = document.getElementById('f-addr')           as HTMLInputElement | null;
  const suggestList = document.getElementById('addr-suggestions') as HTMLUListElement | null;
  const cityInput   = document.getElementById('f-city')           as HTMLInputElement | null;
  const zipInput    = document.getElementById('f-zip')            as HTMLInputElement | null;
  if (!addrInput || !suggestList) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let activeIdx = -1;
  let justSelected = false;

  function showSuggestions(items: Suggestion[]): void {
    if (!suggestList || !addrInput) return;
    clearEl(suggestList);
    activeIdx = -1;
    if (!items.length) { hideSuggestions(); return; }

    items.forEach((s, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('id', `addr-opt-${i}`);
      li.style.cssText =
        'padding:0.6rem 0.9rem;cursor:pointer;font-family:var(--font-patrick-hand);font-size:0.9rem;color:#3D2B1F;border-bottom:1px solid #F3EAE0;list-style:none';
      // li.textContent is safe — s.label comes from the SSR proxy, not raw user input
      li.textContent = s.label;
      li.addEventListener('mousedown', (e) => { e.preventDefault(); selectSuggestion(s); });
      li.addEventListener('mouseenter', () => setActive(i));
      suggestList.appendChild(li);
    });

    suggestList.style.display = 'block';
    addrInput.setAttribute('aria-expanded', 'true');
  }

  function hideSuggestions(): void {
    if (!suggestList || !addrInput) return;
    suggestList.style.display = 'none';
    addrInput.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  }

  function setActive(idx: number): void {
    if (!suggestList || !addrInput) return;
    suggestList.querySelectorAll('li').forEach((li, i) => {
      (li as HTMLElement).style.background = i === idx ? '#F0FFF4' : '';
      li.setAttribute('aria-selected', String(i === idx));
    });
    activeIdx = idx;
    addrInput.setAttribute('aria-activedescendant', idx >= 0 ? `addr-opt-${idx}` : '');
  }

  function selectSuggestion(s: Suggestion): void {
    if (!suggestList || !addrInput) return;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

    addrInput.value = s.street || s.label;
    if (cityInput && s.city)     cityInput.value = s.city;
    if (zipInput  && s.postcode) zipInput.value  = s.postcode;

    if (s.countryCode) {
      const cc = s.countryCode.toUpperCase();
      const countryInput  = document.getElementById('f-country')      as HTMLInputElement | null;
      const countryFlag   = document.getElementById('f-country-flag') as HTMLElement | null;
      const countryHidden = document.getElementById('f-country-code') as HTMLInputElement | null;
      const match = COUNTRIES.find((c) => c.c === cc);
      if (match && countryInput) {
        countryInput.value = match.n;
        if (countryFlag)   countryFlag.textContent = match.f;
        if (countryHidden) countryHidden.value = match.c;
      }
    }

    hideSuggestions();
    justSelected = true;
    addrInput.dispatchEvent(new Event('change', { bubbles: true }));
    justSelected = false;
  }

  async function fetchSuggestions(text: string): Promise<void> {
    if (text.length < 2) { hideSuggestions(); return; }
    try {
      const res  = await fetch(`/api/autocomplete?text=${encodeURIComponent(text)}&lang=es&limit=6`);
      const data = (await res.json()) as { suggestions?: Suggestion[] };
      showSuggestions(data.suggestions ?? []);
    } catch {
      hideSuggestions();
    }
  }

  addrInput.addEventListener('input', () => {
    if (justSelected) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(addrInput.value.trim()), 300);
  });

  addrInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!suggestList) return;
    const items = suggestList.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      (items[activeIdx] as HTMLElement).dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') hideSuggestions();
  });

  addrInput.addEventListener('blur', () => setTimeout(hideSuggestions, 150));
}
