/**
 * BedSelectionIsland — Step 4 interactive bunk grid.
 *
 * Renders an isometric 12-bunk grid across two DOM containers, wires click
 * and hover interactions, manages per-person per-night bed schedules, shows
 * a tooltip on hover, renders night tabs and a schedule summary.
 *
 * Security note: createBunkSVG() generates SVG markup using only
 * application-controlled values (bed numbers, hard-coded color palette).
 * No user-supplied strings are ever interpolated — parseSVG() is intentionally
 * restricted to this compile-time-trusted pattern.
 *
 * Extracted from the inline <script> block in book.astro (initBedSelection,
 * renderBedGrid, renderNightTabs, renderSchedule, updateBedState, tooltip).
 */

import { bookingDatesStore, setBed } from '../../stores/bookingDatesStore';
import { clearEl, parseSVG } from '../../utils/booking/svgIcons';

// ── Color palette (matches book.astro FRAME / bedColors) ──────────────────

const FRAME = { dark: '#5D4E37', mid: '#8D6E4E', light: '#A08060' };

type BedSt = 'available' | 'occupied' | 'selected' | 'partial';

function bedColors(st: BedSt) {
  if (st === 'selected') return { m:'#90CAF9',ms:'#64B5F6',mf:'#42A5F5',p:'#E3F2FD',ps:'#BBDEFB',sh:'#BBDEFB',sk:'#1565C0' };
  if (st === 'occupied') return { m:'#EF9A9A',ms:'#E57373',mf:'#F44336',p:'#FFCDD2',ps:'#EF9A9A',sh:'#FFCDD2',sk:'#C62828' };
  if (st === 'partial')  return { m:'#FFF3CD',ms:'#FFE082',mf:'#FFD54F',p:'#FFFDE7',ps:'#FFF9C4',sh:'#FFF9C4',sk:'#D4A017' };
  return                        { m:'#A5D6A7',ms:'#66BB6A',mf:'#4CAF50',p:'#E8F5E9',ps:'#C8E6C9',sh:'#C8E6C9',sk:'#2E7D32' };
}

// ── SVG bunk illustration ──────────────────────────────────────────────────
// Application-controlled data only — no user input interpolated here.

function mattressSVG(y: number, c: ReturnType<typeof bedColors>, bedNum: number, st: BedSt): string {
  const badge =
    st === 'occupied'
      ? `<circle cx="48" cy="${y + 2}" r="6" fill="white" stroke="${c.sk}" stroke-width="1"/>
         <path d="M45,${y - 1} L51,${y + 5} M45,${y + 5} L51,${y - 1}" stroke="${c.sk}" stroke-width="1.5" stroke-linecap="round"/>`
      : st === 'selected'
      ? `<circle cx="48" cy="${y + 2}" r="6" fill="${c.sk}"/>
         <path d="M45,${y + 2} L47,${y + 4} L51,${y}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
      : st === 'partial'
      ? `<circle cx="48" cy="${y + 2}" r="6" fill="${c.sk}"/>
         <text x="48" y="${y + 5}" text-anchor="middle" font-size="7" fill="white" font-weight="bold">½</text>`
      : '';
  return `
    <path d="M8,${y} L38,${y - 3} L56,${y - 3} L26,${y} Z" fill="${c.m}" stroke="${c.sk}" stroke-width="0.8"/>
    <path d="M8,${y} L26,${y} L26,${y + 7} L8,${y + 7} Z" fill="${c.mf}" stroke="${c.sk}" stroke-width="0.8"/>
    <path d="M26,${y} L56,${y - 3} L56,${y + 4} L26,${y + 7} Z" fill="${c.ms}" stroke="${c.sk}" stroke-width="0.6"/>
    <rect x="9" y="${y}" width="12" height="5" rx="2" fill="${c.p}" stroke="${c.sk}" stroke-width="0.5"/>
    <path d="M9,${y} L17,${y - 2} Q19,${y - 2} 21,${y} Z" fill="${c.ps}" stroke="${c.sk}" stroke-width="0.3" opacity="0.7"/>
    <text x="17" y="${y + 6}" text-anchor="middle" font-family="Cabin Sketch" font-size="5.5" font-weight="bold" fill="${c.sk}">${bedNum}</text>
    ${badge}`;
}

function createBunkSVG(
  _bunkNum: number,
  topBed: number,
  bottomBed: number,
  topSt: BedSt,
  bottomSt: BedSt
): string {
  const tc = bedColors(topSt);
  const bc = bedColors(bottomSt);
  const F = FRAME;
  let slats = '';
  for (let i = 1; i <= 4; i++) {
    slats += `<rect x="${3 + i * 6}" y="5" width="1.8" height="54" rx="0.6" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.4"/>`;
  }
  return `<svg viewBox="0 0 65 72" fill="none" style="filter:drop-shadow(2px 3px 4px rgba(0,0,0,0.12))">
    <ellipse cx="32" cy="69" rx="28" ry="3" fill="rgba(0,0,0,0.06)"/>
    <path d="M36,62 L36,6 Q36,3 39,2 L58,2 Q61,3 61,6 L61,62" fill="${F.light}" stroke="${F.dark}" stroke-width="1" opacity="0.7"/>
    <rect x="40" y="5" width="1.5" height="56" rx="0.5" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.3" opacity="0.6"/>
    <rect x="46" y="5" width="1.5" height="56" rx="0.5" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.3" opacity="0.6"/>
    <rect x="52" y="5" width="1.5" height="56" rx="0.5" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.3" opacity="0.6"/>
    <circle cx="37" cy="3" r="1.8" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.6" opacity="0.7"/>
    <circle cx="60" cy="3" r="1.8" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.6" opacity="0.7"/>
    <line x1="5" y1="18" x2="36" y2="15" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <line x1="29" y1="18" x2="61" y2="15" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <line x1="5" y1="12" x2="36" y2="9" stroke="${F.dark}" stroke-width="0.8" opacity="0.4"/>
    <line x1="29" y1="12" x2="61" y2="9" stroke="${F.dark}" stroke-width="0.8" opacity="0.4"/>
    <line x1="5" y1="38" x2="36" y2="35" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <line x1="29" y1="38" x2="61" y2="35" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <line x1="5" y1="58" x2="36" y2="55" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <line x1="29" y1="58" x2="61" y2="55" stroke="${F.dark}" stroke-width="1.2" opacity="0.5"/>
    <g class="bunk-zone ${topSt}" data-bed="${topBed}">
      <rect x="4" y="10" width="58" height="26" fill="transparent" rx="2"/>
      ${mattressSVG(18, tc, topBed, topSt)}
    </g>
    <g class="bunk-zone ${bottomSt}" data-bed="${bottomBed}">
      <rect x="4" y="32" width="58" height="26" fill="transparent" rx="2"/>
      ${mattressSVG(38, bc, bottomBed, bottomSt)}
    </g>
    <path d="M2,62 L2,6 Q2,2 5,1 L29,1 Q32,2 32,6 L32,62" fill="${F.light}" stroke="${F.dark}" stroke-width="1.3" stroke-linejoin="round"/>
    ${slats}
    <circle cx="3" cy="2" r="2" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.7"/>
    <circle cx="31" cy="2" r="2" fill="${F.mid}" stroke="${F.dark}" stroke-width="0.7"/>
    <line x1="53" y1="6" x2="54.5" y2="62" stroke="${F.dark}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="61" y1="6" x2="62.5" y2="62" stroke="${F.dark}" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="53.5" y="14" width="8" height="2" rx="0.8" fill="${F.light}" stroke="${F.dark}" stroke-width="0.5"/>
    <rect x="53.7" y="26" width="8" height="2" rx="0.8" fill="${F.light}" stroke="${F.dark}" stroke-width="0.5"/>
    <rect x="54" y="38" width="8.2" height="2" rx="0.8" fill="${F.light}" stroke="${F.dark}" stroke-width="0.5"/>
    <rect x="54.2" y="50" width="8.2" height="2" rx="0.8" fill="${F.light}" stroke="${F.dark}" stroke-width="0.5"/>
    <rect x="1" y="62" width="5" height="5" rx="1.5" fill="${F.dark}"/>
    <rect x="28" y="62" width="5" height="5" rx="1.5" fill="${F.dark}"/>
    <rect x="54" y="62" width="5" height="4" rx="1.2" fill="${F.dark}" opacity="0.7"/>
  </svg>`;
}

// ── Island init ────────────────────────────────────────────────────────────

export interface BedSelectionIslandOptions {
  /** Called when all persons have all nights assigned. */
  onAllAssigned?: (bedSummary: string) => void;
  /** Called by WizardNavigatorIsland to enable/disable Next button. */
  enableNext?: (yes: boolean) => void;
}

export function initBedSelectionIsland(opts: BedSelectionIslandOptions = {}): void {
  // ── Local state ──
  let personBedSchedules: (number | null)[][] = [[]];
  let activePerson = 0;
  let bedSchedule: (number | null)[] = personBedSchedules[0];
  let activeNight = 0;
  let availMap: Record<number, boolean[]> = {};

  // Tooltip cached DOM refs
  const tooltipEl  = document.getElementById('bed-tooltip');
  const ttTitle    = document.getElementById('tt-title');
  const ttStatus   = document.getElementById('tt-status');
  const ttNights   = document.getElementById('tt-nights');

  // ── Helpers ──

  function getState() { return bookingDatesStore.get(); }

  function enableNext(yes: boolean): void {
    opts.enableNext?.(yes);
    window.__wizEnableNext?.(yes);
  }

  function bedOverallStatus(bed: number): BedSt {
    const avail = availMap[bed];
    if (!avail) return 'occupied';
    const assignedNights = bedSchedule
      .map((b, i) => (b === bed ? i : -1))
      .filter((i) => i >= 0);
    if (assignedNights.length > 0) return 'selected';
    const availCount = avail.filter(Boolean).length;
    if (availCount === 0) return 'occupied';
    if (availCount === avail.length) return 'available';
    return 'partial';
  }

  /** Human-readable bed label (reserved for tooltip/aria use). */
  function _bedLabel(bed: number): string {
    const isTop = bed % 2 !== 0;
    const bunk = Math.ceil(bed / 2);
    return `Bed ${bed} — ${isTop ? 'Top' : 'Bottom'} Bunk #${bunk}`;
  }
  void (_bedLabel as unknown); // suppressed: available for future accessibility use

  // ── Fallback availability ──

  function getAvailabilityMapFallback(): Record<number, boolean[]> {
    const s = getState();
    const n = Number(s.nights) || 1;
    const seed = s.checkin
      ? s.checkin.split('-').map(Number).reduce((a, b) => a + b, 0)
      : 42;
    const map: Record<number, boolean[]> = {};
    for (let bed = 1; bed <= 24; bed++) {
      const nights: boolean[] = [];
      for (let ni = 0; ni < n; ni++) {
        const hash = (bed * 7 + ni * 13 + seed * 3) % 37;
        if ([5, 9, 15, 23].includes(bed)) {
          nights.push(false);
        } else if ([3, 7, 18, 21].includes(bed) && ni >= Math.floor(n / 2)) {
          nights.push(false);
        } else if (bed === 11 && ni === 0) {
          nights.push(false);
        } else {
          nights.push(hash > 5);
        }
      }
      map[bed] = nights;
    }
    return map;
  }

  // ── Load real availability ──

  async function loadBedAvailability(): Promise<void> {
    const s = getState();
    if (!s.checkin || !s.checkout) return;
    try {
      const res = await fetch(`/api/availability?from=${s.checkin}&to=${s.checkout}`);
      if (res.ok) {
        const data = (await res.json()) as {
          days: Record<string, { beds: number; price: number }>;
        };
        // Build refined availability from cached per-day beds count
        const n = Number(s.nights) || 1;
        for (let bed = 1; bed <= 24; bed++) {
          const nights: boolean[] = [];
          for (let ni = 0; ni < n; ni++) {
            const d = new Date(s.checkin + 'T00:00:00');
            d.setDate(d.getDate() + ni);
            const ds = d.toISOString().split('T')[0];
            const info = data.days[ds];
            nights.push(bed <= (info?.beds ?? 24));
          }
          availMap[bed] = nights;
        }
        renderBedGrid();
        renderSchedule();
        updateBedState();
      }
    } catch {
      // keep fallback
    }
  }

  // ── Tooltip ──

  function showTooltip(bed: number, e: MouseEvent): void {
    if (!tooltipEl || !ttTitle || !ttStatus || !ttNights) return;
    const s = getState();
    const avail = availMap[bed] || [];
    const isTop = bed % 2 !== 0;
    const bunk = Math.ceil(bed / 2);
    const overall = bedOverallStatus(bed);

    ttTitle.textContent = `Bed ${bed} — ${isTop ? 'Top' : 'Bottom'} Bunk #${bunk}`;

    const statusColors: Record<string, string> = {
      available: '#A5D6A7', partial: '#FFD54F', occupied: '#EF9A9A', selected: '#90CAF9',
    };
    const statusLabels: Record<string, string> = {
      available: 'Fully Available', partial: 'Partially Available',
      occupied: 'Fully Occupied',   selected: 'Selected',
    };

    clearEl(ttStatus);
    const ttDot = document.createElement('span');
    ttDot.className = 'tt-dot';
    ttDot.style.background = statusColors[overall];
    ttStatus.appendChild(ttDot);
    ttStatus.appendChild(document.createTextNode(statusLabels[overall]));

    const ciDate = s.checkin ? new Date(s.checkin + 'T12:00:00') : new Date();
    clearEl(ttNights);
    for (let i = 0; i < avail.length; i++) {
      const d = new Date(ciDate);
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isAvail    = avail[i];
      const isSelected = bedSchedule[i] === bed;
      const cls = isSelected ? 'selected' : isAvail ? 'avail' : 'unavail';
      const val = isSelected ? '✓ Assigned' : isAvail ? 'Available' : 'Occupied';

      const nr = document.createElement('div');
      nr.className = 'tt-night-row';
      const nl = document.createElement('span');
      nl.className = 'tt-night-label';
      nl.textContent = `N${i + 1} ${label}`;
      const nv = document.createElement('span');
      nv.className = `tt-night-val ${cls}`;
      nv.textContent = val;
      nr.appendChild(nl);
      nr.appendChild(nv);
      ttNights.appendChild(nr);
    }

    tooltipEl.style.display = '';
    const rect = (e.target as Element).closest('.bunk-zone')?.getBoundingClientRect();
    if (rect) {
      const x = rect.left + rect.width / 2;
      const y = rect.top - 10;
      tooltipEl.style.left = Math.max(10, Math.min(x - 90, window.innerWidth - 200)) + 'px';
      tooltipEl.style.top  = y - tooltipEl.offsetHeight + 'px';
    }
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  // ── Render grid ──

  function renderBedGrid(): void {
    const grid1 = document.getElementById('dorm1-grid');
    const grid2 = document.getElementById('dorm2-grid');
    if (!grid1 || !grid2) return;
    clearEl(grid1);
    clearEl(grid2);

    for (let bunk = 1; bunk <= 12; bunk++) {
      const topBed    = (bunk - 1) * 2 + 1;
      const bottomBed = (bunk - 1) * 2 + 2;
      const topSt = bedOverallStatus(topBed);
      const botSt = bedOverallStatus(bottomBed);

      const cell = document.createElement('div');
      cell.className = 'bunk-cell';
      // parseSVG is safe: createBunkSVG generates only app-controlled SVG content
      cell.appendChild(parseSVG(createBunkSVG(bunk, topBed, bottomBed, topSt, botSt)));
      const bunkLbl = document.createElement('div');
      bunkLbl.className = 'bunk-label';
      bunkLbl.textContent = `Bunk ${bunk}`;
      cell.appendChild(bunkLbl);

      if (bunk <= 6) grid1.appendChild(cell);
      else grid2.appendChild(cell);
    }

    // Wire interactions on bunk zones
    document.querySelectorAll<SVGElement>('.bunk-zone').forEach((zone) => {
      const bedNum  = parseInt(zone.getAttribute('data-bed') ?? '');
      if (!bedNum) return;
      const avail   = availMap[bedNum] || [];
      const isSelected = bedSchedule.some((b) => b === bedNum);
      const hasAnyAvail = avail.some(Boolean);
      const isOccupiedAll = avail.every((a) => !a);

      if (hasAnyAvail || isSelected) {
        zone.style.cursor = 'pointer';
        zone.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isSelected) {
            for (let i = 0; i < bedSchedule.length; i++) {
              if (bedSchedule[i] === bedNum) bedSchedule[i] = null;
            }
            const firstEmpty = bedSchedule.findIndex((b) => b === null);
            if (firstEmpty >= 0) activeNight = firstEmpty;
          } else {
            const prevBed = bedSchedule[0];
            const allSameBed = bedSchedule.every((b) => b === prevBed);
            if (allSameBed && prevBed !== null) {
              for (let i = 0; i < bedSchedule.length; i++) bedSchedule[i] = null;
            }
            for (let i = 0; i < bedSchedule.length; i++) {
              if (avail[i] && (bedSchedule[i] === null || bedSchedule[i] === undefined)) {
                bedSchedule[i] = bedNum;
              }
            }
            const firstEmpty = bedSchedule.findIndex((b) => b === null || b === undefined);
            if (firstEmpty >= 0) activeNight = firstEmpty;
          }
          renderPersonTabs();
          renderBedGrid();
          renderNightTabs();
          renderSchedule();
          updateBedState();
        });
      } else if (isOccupiedAll) {
        zone.style.cursor = 'not-allowed';
      }

      zone.addEventListener('mouseenter', (e) => showTooltip(bedNum, e as MouseEvent));
      zone.addEventListener('mousemove',  (e) => showTooltip(bedNum, e as MouseEvent));
      zone.addEventListener('mouseleave', hideTooltip);
    });
  }

  // ── Night tabs ──

  function renderNightTabs(): void {
    const s = getState();
    const nights = Number(s.nights) || 0;
    const wrap = document.getElementById('night-tabs-wrap');
    const tabs = document.getElementById('night-tabs');
    if (!wrap || !tabs) return;
    if (nights < 1) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    clearEl(tabs);

    const ciDate = s.checkin ? new Date(s.checkin + 'T12:00:00') : new Date();
    const hasUnassigned = bedSchedule.some((b) => b === null || b === undefined);

    const label = wrap.querySelector<HTMLElement>('.night-tabs-label');
    if (label) {
      label.textContent = hasUnassigned ? 'Select bed for highlighted night:' : 'Your stay:';
    }

    for (let i = 0; i < nights; i++) {
      const d = new Date(ciDate);
      d.setDate(d.getDate() + i);
      const dateLabel  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isAssigned = bedSchedule[i] !== null && bedSchedule[i] !== undefined;
      const isActive   = i === activeNight && hasUnassigned;

      const tab = document.createElement(hasUnassigned ? 'button' : 'span') as HTMLElement;
      if (hasUnassigned) (tab as HTMLButtonElement).type = 'button';
      tab.className = `night-tab${isActive ? ' active' : ''}${isAssigned ? ' assigned' : ''}`;

      tab.appendChild(document.createTextNode(`N${i + 1} `));
      const dateLabelSpan = document.createElement('span');
      dateLabelSpan.style.fontSize  = '0.7rem';
      dateLabelSpan.style.opacity   = '0.7';
      dateLabelSpan.textContent = dateLabel;
      tab.appendChild(dateLabelSpan);

      if (isAssigned) {
        const dot = document.createElement('span');
        dot.className = 'night-tab-dot';
        dot.style.background = isActive ? 'white' : '#0071BC';
        tab.appendChild(dot);
      }

      if (hasUnassigned) {
        const ni = i;
        tab.addEventListener('click', () => {
          activeNight = ni;
          renderBedGrid();
          renderNightTabs();
          renderSchedule();
        });
      }
      tabs.appendChild(tab);
    }
  }

  // ── Schedule summary ──

  function renderSchedule(): void {
    const s = getState();
    const nights = Number(s.nights) || 0;
    const wrap = document.getElementById('bed-schedule');
    const rows = document.getElementById('bed-schedule-rows');
    if (!wrap || !rows) return;

    const anyAssigned = bedSchedule.some((b) => b !== null && b !== undefined);
    wrap.style.display = anyAssigned ? '' : 'none';
    if (!anyAssigned) return;
    clearEl(rows);

    const unique = [...new Set(bedSchedule.filter((b) => b !== null && b !== undefined))] as number[];
    const allAssigned = bedSchedule.every((b) => b !== null && b !== undefined);
    const ciDate = s.checkin ? new Date(s.checkin + 'T12:00:00') : new Date();

    function buildRemoveBtn(nightVal: string): HTMLButtonElement {
      const rb = document.createElement('button');
      rb.className = 'sched-remove';
      rb.dataset.night = nightVal;
      rb.setAttribute('aria-label', 'Remove');
      rb.textContent = '×';
      return rb;
    }

    if (allAssigned && unique.length === 1) {
      const bed = unique[0];
      const isTop = bed % 2 !== 0;
      const bunk = Math.ceil(bed / 2);
      const row = document.createElement('div');
      row.className = 'sched-row';
      const n1 = document.createElement('span');
      n1.className = 'sched-night';
      n1.textContent = `All ${nights} nights`;
      const b1 = document.createElement('span');
      b1.className = 'sched-bed';
      b1.textContent = `Bed ${bed} · ${isTop ? 'Top' : 'Bottom'} · Bunk ${bunk}`;
      row.appendChild(n1);
      row.appendChild(b1);
      row.appendChild(buildRemoveBtn('all'));
      rows.appendChild(row);
    } else {
      for (let i = 0; i < nights; i++) {
        const d = new Date(ciDate);
        d.setDate(d.getDate() + i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const bed = bedSchedule[i];
        const row = document.createElement('div');
        row.className = 'sched-row';

        if (bed !== null && bed !== undefined) {
          const isTop = bed % 2 !== 0;
          const bunk = Math.ceil(bed / 2);
          const n2 = document.createElement('span');
          n2.className = 'sched-night';
          n2.textContent = `N${i + 1} ${label}`;
          const b2 = document.createElement('span');
          b2.className = 'sched-bed';
          b2.textContent = `Bed ${bed} · ${isTop ? 'Top' : 'Bottom'} · Bunk ${bunk}`;
          row.appendChild(n2);
          row.appendChild(b2);
          row.appendChild(buildRemoveBtn(String(i)));
        } else {
          const n3 = document.createElement('span');
          n3.className = 'sched-night unassigned';
          n3.textContent = `N${i + 1} ${label}`;
          const e3 = document.createElement('span');
          e3.className = 'sched-empty';
          e3.textContent = 'Tap a bed to assign';
          row.appendChild(n3);
          row.appendChild(e3);
        }
        rows.appendChild(row);
      }
    }

    // Wire remove buttons
    rows.querySelectorAll<HTMLElement>('.sched-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nightVal = btn.dataset.night!;
        if (nightVal === 'all') {
          for (let i = 0; i < bedSchedule.length; i++) bedSchedule[i] = null;
          activeNight = 0;
        } else {
          const ni = parseInt(nightVal);
          bedSchedule[ni] = null;
          activeNight = ni;
        }
        renderPersonTabs();
        renderBedGrid();
        renderNightTabs();
        renderSchedule();
        updateBedState();
      });
    });
  }

  // ── Bed state / info card ──

  function updateBedState(): void {
    const s = getState();
    const persons = Number(s.persons) || 1;
    const nights  = Number(s.nights)  || 1;

    const allPersonsDone =
      personBedSchedules.length > 0 &&
      personBedSchedules.every((sched) =>
        sched.length > 0 && sched.every((b) => b !== null && b !== undefined)
      );

    const unique = [...new Set(bedSchedule.filter((b) => b !== null && b !== undefined))] as number[];
    const assigned = bedSchedule.filter((b) => b !== null && b !== undefined).length;

    if (allPersonsDone) {
      const parts = personBedSchedules.map((sched, pi) => {
        const u = [...new Set(sched.filter((b) => b !== null && b !== undefined))];
        return u.length === 1
          ? `P${pi + 1}:${u[0]}`
          : sched.map((b, i) => `P${pi + 1}N${i + 1}:${b}`).join(',');
      });
      const bedSummary = parts.join('|');
      setBed(bedSummary);
      opts.onAllAssigned?.(bedSummary);
    } else {
      setBed('');
    }

    enableNext(allPersonsDone);

    // Info card
    const infoCard  = document.getElementById('bed-info-card');
    const bedReady  = document.getElementById('bed-ready');
    const hint      = document.getElementById('bed-hint');

    const personLabel = persons > 1 ? ` (Pilgrim ${activePerson + 1})` : '';

    if (allPersonsDone && infoCard && bedReady && hint) {
      infoCard.style.display = '';
      bedReady.style.display = '';
      if (persons > 1) {
        const bedNums = personBedSchedules
          .map((sched, i) => {
            const u = [...new Set(sched.filter((b) => b !== null && b !== undefined))];
            return `P${i + 1}: Bed${u.length > 1 ? 's' : ''} ${u.join('/')}`;
          })
          .join(' · ');
        hint.textContent = `✨ All ${persons} pilgrims assigned! ${bedNums}`;
        const infoNum  = document.getElementById('bed-info-num');
        const infoPos  = document.getElementById('bed-info-pos');
        const infoBunk = document.getElementById('bed-info-bunk');
        const infoDorm = document.getElementById('bed-info-dorm');
        if (infoNum)  infoNum.textContent  = `${persons} pilgrims`;
        if (infoPos)  infoPos.textContent  = 'All assigned';
        if (infoBunk) infoBunk.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
        if (infoDorm) infoDorm.textContent = '📋 All dorms';
      } else if (unique.length === 1) {
        const bed = unique[0];
        const isTop = bed % 2 !== 0;
        const bunk = Math.ceil(bed / 2);
        const infoNum  = document.getElementById('bed-info-num');
        const infoPos  = document.getElementById('bed-info-pos');
        const infoBunk = document.getElementById('bed-info-bunk');
        const infoDorm = document.getElementById('bed-info-dorm');
        if (infoNum)  infoNum.textContent  = `Bed #${bed}`;
        if (infoPos)  infoPos.textContent  = isTop ? 'Top Bunk' : 'Bottom Bunk';
        if (infoBunk) infoBunk.textContent = `Bunk #${bunk}`;
        if (infoDorm) infoDorm.textContent = `🏠 Dormitory ${bed <= 12 ? 1 : 2}`;
        hint.textContent = `✨ Bed ${bed} assigned for all ${nights} nights!`;
      } else {
        const infoNum  = document.getElementById('bed-info-num');
        const infoPos  = document.getElementById('bed-info-pos');
        const infoBunk = document.getElementById('bed-info-bunk');
        const infoDorm = document.getElementById('bed-info-dorm');
        if (infoNum)  infoNum.textContent  = `${unique.length} beds`;
        if (infoPos)  infoPos.textContent  = 'Split across nights';
        if (infoBunk) infoBunk.textContent = `${nights} nights covered`;
        if (infoDorm) infoDorm.textContent = '📋 See schedule above';
        hint.textContent = `✨ All ${nights} nights assigned!`;
      }
      if (hint) hint.style.color = '#00AB39';
    } else if (assigned > 0 && hint && infoCard && bedReady) {
      const remaining = nights - assigned;
      hint.textContent = `${personLabel} ${assigned}/${nights} nights assigned — select a bed for ${remaining} more night${remaining > 1 ? 's' : ''}`;
      hint.style.color  = '#D4A017';
      bedReady.style.display  = 'none';
      infoCard.style.display  = 'none';
    } else {
      if (hint) {
        hint.textContent =
          persons > 1
            ? `Select a bed for Pilgrim ${activePerson + 1}`
            : 'Select a bed for your stay';
        hint.style.color = '#D4A017';
      }
      if (bedReady) bedReady.style.display = 'none';
      if (infoCard) infoCard.style.display = 'none';
    }
  }

  // ── Person tabs (multi-person bookings) ──

  function renderPersonTabs(): void {
    const s = getState();
    const persons = Number(s.persons) || 1;
    const wrap = document.getElementById('person-tabs-wrap');
    const tabs = document.getElementById('person-tabs');
    if (!wrap || !tabs) return;
    if (persons <= 1) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    clearEl(tabs);

    for (let p = 0; p < persons; p++) {
      const sched = personBedSchedules[p] ?? [];
      const done  = sched.length > 0 && sched.every((b) => b !== null && b !== undefined);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `person-tab${p === activePerson ? ' active' : ''}${done ? ' done' : ''}`;
      btn.textContent = `Pilgrim ${p + 1}`;
      const pi = p;
      btn.addEventListener('click', () => {
        activePerson = pi;
        bedSchedule  = personBedSchedules[activePerson];
        activeNight  = bedSchedule.findIndex((b) => b === null || b === undefined);
        if (activeNight < 0) activeNight = 0;
        renderPersonTabs();
        renderNightTabs();
        renderBedGrid();
        renderSchedule();
        updateBedState();
      });
      tabs.appendChild(btn);
    }
  }

  // ── Public init ──

  function initBedSelection(): void {
    const s = getState();
    const n = Number(s.nights)  || 1;
    const p = Number(s.persons) || 1;

    personBedSchedules = Array.from({ length: p }, () => new Array<number | null>(n).fill(null));
    activePerson = 0;
    bedSchedule  = personBedSchedules[0];
    activeNight  = 0;
    availMap     = getAvailabilityMapFallback();

    renderPersonTabs();
    renderNightTabs();
    renderBedGrid();
    renderSchedule();
    updateBedState();
    loadBedAvailability();
  }

  initBedSelection();
}
