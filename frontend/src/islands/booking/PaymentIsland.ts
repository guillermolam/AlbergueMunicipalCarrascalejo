/**
 * PaymentIsland — Step 5/6 payment form + booking submission.
 *
 * Handles:
 * - Card number and expiry field formatters
 * - Populating the summary card before Step 6 renders
 * - Submitting the booking via the booking.create action and redirecting
 *   to /booking-confirmed (or falling back to an offline confirmation)
 * - Confetti animation on the confirmed screen
 *
 * Extracted from the inline <script> block in book.astro
 * (submitBooking, populateSummary, launchConfetti, card formatters).
 */

import { bookingDatesStore } from '../../stores/bookingDatesStore';
import { pilgrimStores } from '../../stores/bookingPilgrims';

// ── Async action helper ──────────────────────────────────────────────────────

async function callAction<T>(
  name: string,
  input: unknown
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`/_actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    const json = await res.json();
    return { data: (json as { data?: T }).data ?? (json as T), error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── Date formatter ────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface PaymentIslandOptions {
  /** Called after populateSummary() is complete. */
  onSummaryPopulated?: () => void;
  /** Overrides the booking submit (for testing). */
  onSubmit?: () => Promise<void>;
}

export function initPaymentIsland(_opts: PaymentIslandOptions = {}): void {
  // ── Card number formatter ──
  document.getElementById('f-card')?.addEventListener('input', function () {
    const el = this as HTMLInputElement;
    const v = el.value.replaceAll(/\D/g, '');
    el.value = v
      .replaceAll(/(.{4})/g, '$1 ')
      .trim()
      .substring(0, 19);
  });

  // ── Expiry formatter (MM/YY) ──
  document.getElementById('f-expiry')?.addEventListener('input', function () {
    const el = this as HTMLInputElement;
    const v = el.value.replaceAll(/\D/g, '');
    if (v.length >= 3) el.value = v.substring(0, 2) + '/' + v.substring(2, 4);
    else el.value = v;
  });
}

// ── Populate the booking summary (called before rendering Step 6) ──────────

function set(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function populateSummary(): void {
  const s = bookingDatesStore.get();

  const ciStr = s.checkin  ? fmtDate(s.checkin)  : '—';
  const coStr = s.checkout ? fmtDate(s.checkout) : '—';

  set('sum-dates',   `${ciStr} → ${coStr}`);
  set('sum-nights',  s.nights);
  set('sum-persons', s.persons);
  set('sum-bed',     s.bed || '—');
  const passportLabel = s.docType === 'passport' ? 'Passport' : '—';
  const docTypeLabel =
    s.docType === 'dni'
      ? 'DNI / NIE / EU ID Card'
      : passportLabel;
  set('sum-doc', docTypeLabel);

  // Primary pilgrim name (from persistent store)
  const p0 = pilgrimStores[0].get();
  const firstName = p0['f-first'] || '';
  const lastName  = p0['f-last']  || '';
  const persons   = Number(s.persons) || 1;
  const pilgrimLabel =
    persons > 1
      ? `${firstName} ${lastName}`.trim() + ` + ${persons - 1} more`
      : `${firstName} ${lastName}`.trim() || '—';
  set('sum-pilgrim', pilgrimLabel);

  const nights = Number(s.nights) || 0;
  const pricePerNight = Number(s.pricePerNight) || 0;
  const total = Number(s.totalPrice) > 0
    ? Number(s.totalPrice)
    : nights * pricePerNight;

  set('sum-total', `EUR ${total}`);
  set('pay-total', `EUR ${total}`);
}

// ── Submit booking ───────────────────────────────────────────────────────────

export async function submitBooking(): Promise<void> {
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement | null;
  if (btnNext) btnNext.disabled = true;
  const originalLabel = btnNext?.textContent ?? '';
  if (btnNext) btnNext.textContent = 'Confirmando…';

  const s = bookingDatesStore.get();
  const p0 = pilgrimStores[0].get();
  const firstName = p0['f-first'] || '';
  const lastName  = p0['f-last']  || '';
  const email     = p0['f-email'] || '';

  const nights = Number(s.nights) || 0;
  const pricePerNight = Number(s.pricePerNight) || 0;
  const total = Number(s.totalPrice) > 0
    ? Number(s.totalPrice)
    : nights * pricePerNight;

  function buildRedirectParams(confCode: string, bookingRef: string): URLSearchParams {
    return new URLSearchParams({
      conf:     confCode,
      ref:      bookingRef,
      name:     `${firstName} ${lastName}`.trim() || 'Peregrino',
      checkin:  s.checkin,
      checkout: s.checkout,
      nights:   s.nights,
      total:    String(total),
      bed:      s.bed,
      persons:  s.persons,
      email,
    });
  }

  try {
    // Gather all pilgrim data from persistent stores
    const pilgrimCount = Number(s.persons) || 1;
    const pilgrimsNote = Array.from({ length: pilgrimCount }, (_, i) => {
      const ps = pilgrimStores[i].get();
      const first = (ps['f-first'] ?? '').trim();
      const last  = (ps['f-last']  ?? '').trim();
      return first ? `P${i + 1}: ${first} ${last}`.trim() : `P${i + 1}: —`;
    }).join(', ');

    const result = await callAction<{ booking: unknown; confirmationCode: string }>(
      'booking.create',
      {
        checkIn:  s.checkin,
        checkOut: s.checkout,
        persons:  Number(s.persons),
        notes: [
          s.bed     ? `Cama: ${s.bed}` : '',
          s.docType ? `Doc: ${s.docType.toUpperCase()}` : '',
          pilgrimsNote ? `Peregrinos: ${pilgrimsNote}` : '',
        ]
          .filter(Boolean)
          .join('. '),
      }
    );

    const data = result.data ?? {};
    const rawConfCode = (data as Record<string, unknown>).confirmationCode;
    const confCode = typeof rawConfCode === 'string' && rawConfCode.trim()
      ? rawConfCode
      : 'CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const rawBooking = (data as Record<string, unknown>).booking as Record<string, unknown> | null;
    
    let bookingRef: string;
    if (rawBooking?.id && typeof rawBooking.id === 'string') {
      bookingRef = 'BK-' + rawBooking.id.substring(0, 6).toUpperCase();
    } else if (rawBooking?.id && typeof rawBooking.id === 'number') {
      bookingRef = 'BK-' + String(rawBooking.id).substring(0, 6).toUpperCase();
    } else {
      bookingRef = 'BK-' + Date.now().toString(36).toUpperCase().slice(-6);
    }

    globalThis.location.href = `/booking-confirmed?${buildRedirectParams(confCode, bookingRef)}`;
  } catch (err) {
    console.warn('[booking] API call failed, using offline confirmation', err);
    const confCode   = 'CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingRef = 'BK-'   + Date.now().toString(36).toUpperCase().slice(-6);
    const params = buildRedirectParams(confCode, bookingRef);
    params.set('offline', '1');
    globalThis.location.href = `/booking-confirmed?${params}`;
  } finally {
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.textContent = originalLabel;
    }
  }
}

// ── Confetti ─────────────────────────────────────────────────────────────────

export function launchConfetti(): void {
  const c = document.getElementById('confetti-book');
  if (!c) return;
  c.style.display = 'block';

  const colors = ['#00AB39', '#EAC102', '#006b24', '#ffffff', '#ED1C24'];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 80; i++) {
    const dot = document.createElement('div');
    const size  = 5 + Math.random() * 9;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 100 + Math.random() * 200;
    dot.style.cssText = [
      'position:absolute',
      `width:${size}px`,
      `height:${size}px`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `left:${40 + Math.random() * 20}vw`,
      'top:40vh',
      `animation:conf-fly ${1.5 + Math.random() * 2}s ease ${Math.random() * 0.5}s forwards`,
      `--dx:${Math.cos(angle) * dist}px`,
      `--dy:${Math.sin(angle) * dist - 200}px`,
    ].join(';');
    fragment.appendChild(dot);
  }
  c.appendChild(fragment);

  // Inject keyframes once
  if (!document.getElementById('__conf-style')) {
    const style = document.createElement('style');
    style.id = '__conf-style';
    style.textContent =
      '@keyframes conf-fly{to{transform:translate(var(--dx),var(--dy)) rotate(720deg);opacity:0}}';
    document.head.appendChild(style);
  }

  setTimeout(() => {
    c.style.display = 'none';
    while (c.firstChild) c.firstChild.remove();
  }, 4000);
}
