/**
 * CalendarIsland — Step 1 date selection.
 *
 * Reads and writes `bookingDatesStore`. Renders an interactive monthly
 * calendar grid with per-day availability and pricing sourced from
 * /api/availability.  When both check-in and check-out are selected,
 * fetches a confirmed price from the /_actions/booking.checkAvailability
 * action and updates the date-summary chips.
 *
 * Extracted from the inline <script> block in book.astro (renderCalendar,
 * fetchMonthAvailability, updateDateSummary, fetchPriceForSelection).
 */

import {
  bookingDatesStore,
  setDates,
  setTotalPrice,
  setPricePerNight,
} from '../../stores/bookingDatesStore';

// ── Async action helper (no static import to avoid 504 on stale Vite cache) ──

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
    const json = (await res.json()) as { data?: T; error?: { message?: string } };
    return { data: (json as { data?: T }).data ?? (json as T), error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── Safe DOM helper ──

function clearEl(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ── Public API ──

export interface CalendarIslandOptions {
  /** ID of the 7-column grid container. */
  gridId: string;
  /** ID of the month/year heading element. */
  titleId: string;
  /** ID of the "previous month" button. */
  prevBtnId: string;
  /** ID of the "next month" button. */
  nextBtnId: string;
  /** ID of the "today" shortcut button. */
  todayBtnId: string;
  /** ID of the date-range error message element. */
  dateErrorId: string;
  /** ID of the "clear dates" button (optional). */
  clearBtnId?: string;
  /** Called whenever canProceed state changes. */
  onCanProceed?: (can: boolean) => void;
  /** Overrides for booking limits (falls back to store's maxNights/maxAdvanceDays). */
  maxNights?: number;
  maxAdvanceDays?: number;
}

export function initCalendarIsland(opts: CalendarIslandOptions): void {
  // ── Local state ──
  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  const dayInfoCache: Record<string, { beds: number; price: number }> = {};
  let calFetchController: AbortController | null = null;

  // ── Helpers ──

  function getDayInfo(dateStr: string): { beds: number; price: number } | null {
    return dayInfoCache[dateStr] ?? null;
  }

  function getMaxNights(): number {
    return opts.maxNights ?? (Number(bookingDatesStore.get().maxNights) || 30);
  }

  function getMaxAdvanceDays(): number {
    return opts.maxAdvanceDays ?? (Number(bookingDatesStore.get().maxAdvanceDays) || 365);
  }

  // ── Fetch availability ──

  async function fetchMonthAvailability(year: number, month: number): Promise<void> {
    const mm = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const from = `${year}-${mm}-01`;
    const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

    calFetchController?.abort();
    calFetchController = new AbortController();

    try {
      const res = await fetch(`/api/availability?from=${from}&to=${to}`, {
        signal: calFetchController.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          days: Record<string, { beds: number; price: number }>;
        };
        Object.assign(dayInfoCache, data.days);
        renderCalendar();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.warn('[availability] fetch failed', e);
    }
  }

  // ── Price fetch ──

  async function fetchPriceForSelection(): Promise<void> {
    const s = bookingDatesStore.get();
    if (!s.checkin || !s.checkout) return;
    try {
      const result = await callAction<{ pricePerNight: number; totalPrice: number }>(
        'booking.checkAvailability',
        {
          checkIn: s.checkin,
          checkOut: s.checkout,
          persons: Number(s.persons),
        }
      );
      if (result.data) {
        if (result.data.pricePerNight != null) setPricePerNight(result.data.pricePerNight);
        if (result.data.totalPrice != null) setTotalPrice(result.data.totalPrice);
        updateDateSummary();
      }
    } catch {
      // keep default price — no UI disruption
    }
  }

  // ── Calendar render ──

  function renderCalendar(): void {
    const grid = document.getElementById(opts.gridId);
    const titleEl = document.getElementById(opts.titleId);
    if (!grid || !titleEl) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    titleEl.textContent = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const todayBtn = document.getElementById(opts.todayBtnId);
    if (todayBtn) {
      const isCurrentMonth =
        calYear === today.getFullYear() && calMonth === today.getMonth();
      todayBtn.style.display = isCurrentMonth ? 'none' : '';
    }

    clearEl(grid);

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const s = bookingDatesStore.get();
    const checkinDate = s.checkin ? new Date(s.checkin + 'T00:00:00') : null;
    const checkoutDate = s.checkout ? new Date(s.checkout + 'T00:00:00') : null;

    const NS = 'http://www.w3.org/2000/svg';

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isCheckin = s.checkin === dateStr;
      const isCheckout = s.checkout === dateStr;
      const inRange =
        checkinDate && checkoutDate && date > checkinDate && date < checkoutDate;

      const info = getDayInfo(dateStr);
      const isLoading = !isPast && !isToday && info === null;
      const isSoldOut = !isLoading && info !== null && info.beds === 0;

      let fillColor = '#FFF9F0';
      let strokeColor = '#D4A574';
      let strokeWidth = '2.5';

      if (isPast && !isToday) { fillColor = '#f5f5f5'; strokeColor = '#e0e0e0'; }
      if (isLoading)           { fillColor = '#f5f5f5'; strokeColor = '#d0d0d0'; }
      if (isToday)             { fillColor = '#EAC102'; strokeColor = '#D4A574'; }
      if (isSoldOut)           { fillColor = '#FFF0F0'; strokeColor = '#EF9A9A'; }
      if (isCheckin || isCheckout) {
        fillColor = '#00AB39'; strokeColor = '#005a1e'; strokeWidth = '3';
      }
      if (inRange) { fillColor = '#C8E6C9'; strokeColor = '#81C784'; }

      const isDisabled = (isPast && !isToday) || isSoldOut || isLoading;

      const classes = [
        'cal-day',
        isDisabled ? 'disabled' : '',
        isLoading  ? 'loading'  : '',
        isToday    ? 'today'    : '',
        isCheckin  ? 'checkin'  : '',
        isCheckout ? 'checkout' : '',
        inRange    ? 'in-range' : '',
      ].filter(Boolean).join(' ');

      const bedsClass =
        info === null ? '' : info.beds === 0 ? 'none' : info.beds <= 3 ? 'low' : '';
      const bedsLabel =
        info === null ? '…' : info.beds === 0 ? 'Full' : `${info.beds} left`;
      const priceLabel = info === null ? '…' : `€${info.price}`;

      const btn = document.createElement('button');
      btn.className = classes;
      btn.dataset.date = dateStr;
      btn.dataset.price = info ? String(info.price) : '';
      btn.dataset.beds  = info ? String(info.beds)  : '';
      if (isDisabled) btn.disabled = true;
      btn.setAttribute(
        'aria-label',
        info === null
          ? `${dateStr} - loading`
          : `${dateStr} - €${info.price}/night - ${info.beds} beds left`
      );

      // SVG background squircle
      const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
      svg.setAttribute('class', 'cal-day-bg');
      svg.setAttribute('viewBox', '0 0 100 100');
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', '5');
      rect.setAttribute('y', '5');
      rect.setAttribute('width', '90');
      rect.setAttribute('height', '90');
      rect.setAttribute('rx', '15');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', strokeColor);
      rect.setAttribute('stroke-width', strokeWidth);
      svg.appendChild(rect);
      btn.appendChild(svg);

      const numSpan = document.createElement('span');
      numSpan.className = 'cal-day-num';
      numSpan.textContent = String(d);
      btn.appendChild(numSpan);

      const bedsSpan = document.createElement('span');
      bedsSpan.className = `cal-day-beds${bedsClass ? ' ' + bedsClass : ''}`;
      bedsSpan.textContent = bedsLabel;
      btn.appendChild(bedsSpan);

      const priceSpan = document.createElement('span');
      priceSpan.className = 'cal-day-price';
      priceSpan.textContent = priceLabel;
      btn.appendChild(priceSpan);

      if (isToday) {
        const dot = document.createElement('div');
        dot.className = 'today-dot';
        btn.appendChild(dot);
      }

      grid.appendChild(btn);
    }

    // Wire click handlers after all buttons are in the DOM
    const dateErrorEl = document.getElementById(opts.dateErrorId);

    function showDateError(msg: string): void {
      if (!dateErrorEl) return;
      dateErrorEl.textContent = msg;
      dateErrorEl.style.display = '';
    }
    function clearDateError(): void {
      if (!dateErrorEl) return;
      dateErrorEl.textContent = '';
      dateErrorEl.style.display = 'none';
    }

    grid.querySelectorAll<HTMLButtonElement>('.cal-day:not(.disabled)').forEach((dayBtn) => {
      dayBtn.addEventListener('click', () => {
        const clickedDate = dayBtn.dataset.date!;
        const cur = bookingDatesStore.get();

        if (!cur.checkin || (cur.checkin && cur.checkout)) {
          // Start fresh selection
          setDates(clickedDate, '');
          bookingDatesStore.setKey('nights', '0');
          clearDateError();
        } else {
          if (clickedDate <= cur.checkin) {
            // Clicked on or before check-in → restart
            setDates(clickedDate, '');
            bookingDatesStore.setKey('nights', '0');
            clearDateError();
          } else {
            const ms =
              new Date(clickedDate + 'T00:00:00').getTime() -
              new Date(cur.checkin + 'T00:00:00').getTime();
            const nights = Math.round(ms / 86400000);

            if (nights > getMaxNights()) {
              showDateError(
                `Maximum stay is ${getMaxNights()} nights. Please choose a check-out within ${getMaxNights()} nights of your check-in.`
              );
              return;
            }

            const todayNow = new Date();
            todayNow.setHours(0, 0, 0, 0);
            const checkinDateObj = new Date(cur.checkin + 'T00:00:00');
            const daysInAdvance = Math.round(
              (checkinDateObj.getTime() - todayNow.getTime()) / 86400000
            );
            if (daysInAdvance > getMaxAdvanceDays()) {
              showDateError(
                `Bookings can only be made up to ${getMaxAdvanceDays()} days in advance.`
              );
              return;
            }

            clearDateError();
            setDates(cur.checkin, clickedDate);
            fetchPriceForSelection(); // async — updates store when API responds
          }
        }

        updateDateSummary();
        renderCalendar();

        const updated = bookingDatesStore.get();
        opts.onCanProceed?.(!!(updated.checkin && updated.checkout));
      });
    });
  }

  // ── Date summary chips ──

  function updateDateSummary(): void {
    const s = bookingDatesStore.get();

    const ci        = document.getElementById('checkin-display');
    const co        = document.getElementById('checkout-display');
    const cichip    = document.getElementById('checkin-chip');
    const cochip    = document.getElementById('checkout-chip');
    const nchip     = document.getElementById('nights-chip');
    const nval      = document.getElementById('nights-val');
    const acts      = document.getElementById('date-actions');
    const priceChip = document.getElementById('price-chip');
    const priceTotal = document.getElementById('price-total');
    const priceBreakdown = document.getElementById('price-breakdown');
    const priceRows = document.getElementById('price-rows');
    const priceTotalRow = document.getElementById('price-total-row');

    if (ci) {
      if (s.checkin) {
        ci.textContent = new Date(s.checkin + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        cichip?.classList.add('filled');
      } else {
        ci.textContent = '—';
        cichip?.classList.remove('filled');
      }
    }

    if (co) {
      if (s.checkout) {
        co.textContent = new Date(s.checkout + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        cochip?.classList.add('filled');
        if (nchip) nchip.style.display = '';
        if (nval) nval.textContent = s.nights;
        if (acts) acts.style.display = '';

        // Build per-night price breakdown
        const ciDate = new Date(s.checkin + 'T12:00:00');
        const persons = Number(s.persons) || 1;
        const nights = Number(s.nights) || 0;
        let total = 0;

        if (priceRows) {
          clearEl(priceRows);
          for (let i = 0; i < nights; i++) {
            const d = new Date(ciDate);
            d.setDate(d.getDate() + i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const info = getDayInfo(ds);
            const nightPrice = (info?.price ?? Number(s.pricePerNight)) * persons;
            total += nightPrice;

            const label = d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            const row = document.createElement('div');
            row.className = 'price-row';

            const n = document.createElement('span');
            n.className = 'price-row-night';
            n.textContent = `Night ${i + 1} · ${label}${persons > 1 ? ` × ${persons}` : ''}`;

            const a = document.createElement('span');
            a.className = 'price-row-amt';
            a.textContent = `€${nightPrice}`;

            row.appendChild(n);
            row.appendChild(a);
            priceRows.appendChild(row);
          }
        }

        setTotalPrice(total);

        if (priceChip)     priceChip.style.display = '';
        if (priceTotal)    priceTotal.textContent = `€${total}`;
        if (priceBreakdown) priceBreakdown.style.display = '';

        if (priceTotalRow) {
          clearEl(priceTotalRow);
          const lblSpan = document.createElement('span');
          lblSpan.className = 'price-total-label';
          lblSpan.textContent = `Total (${nights} night${nights > 1 ? 's' : ''}${persons > 1 ? ` × ${persons} pilgrims` : ''})`;
          const amtSpan = document.createElement('span');
          amtSpan.className = 'price-total-amt';
          amtSpan.textContent = `€${total}`;
          priceTotalRow.appendChild(lblSpan);
          priceTotalRow.appendChild(amtSpan);
        }
      } else {
        co.textContent = '—';
        cochip?.classList.remove('filled');
        if (nchip)         nchip.style.display = 'none';
        if (acts)          acts.style.display = 'none';
        if (priceChip)     priceChip.style.display = 'none';
        if (priceBreakdown) priceBreakdown.style.display = 'none';
      }
    }
  }

  // ── Animation helper for month title ──

  function animateMonthTitle(dir: 'forward' | 'back'): void {
    const titleEl = document.getElementById(opts.titleId);
    if (!titleEl) return;
    titleEl.style.animation = 'none';
    titleEl.offsetHeight; // reflow
    titleEl.style.animation =
      dir === 'forward'
        ? 'step-enter 280ms ease forwards'
        : 'step-enter-back 280ms ease forwards';
  }

  // ── Wire nav buttons ──

  document.getElementById(opts.prevBtnId)?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    animateMonthTitle('back');
    renderCalendar();
    fetchMonthAvailability(calYear, calMonth);
  });

  document.getElementById(opts.nextBtnId)?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    animateMonthTitle('forward');
    renderCalendar();
    fetchMonthAvailability(calYear, calMonth);
  });

  document.getElementById(opts.todayBtnId)?.addEventListener('click', () => {
    calYear  = new Date().getFullYear();
    calMonth = new Date().getMonth();
    renderCalendar();
    fetchMonthAvailability(calYear, calMonth);
  });

  // ── Clear dates button ──
  if (opts.clearBtnId) {
    document.getElementById(opts.clearBtnId)?.addEventListener('click', () => {
      setDates('', '');
      bookingDatesStore.setKey('nights', '0');
      opts.onCanProceed?.(false);
    });
  }

  // ── Subscribe to store changes that affect the render ──
  // (persons count changes need a calendar + summary repaint; date changes
  //  also need to update the wizard Next-button state reactively)
  bookingDatesStore.subscribe((state) => {
    // Debounce: only repaint on the next microtask to batch multiple setKey calls
    queueMicrotask(() => {
      renderCalendar();
      updateDateSummary();
      opts.onCanProceed?.(!!(state.checkin && state.checkout));
    });
  });

  // ── Initial render ──
  renderCalendar();
  updateDateSummary();
  fetchMonthAvailability(calYear, calMonth);

  const { checkin, checkout } = bookingDatesStore.get();
  opts.onCanProceed?.(!!(checkin && checkout));
}
