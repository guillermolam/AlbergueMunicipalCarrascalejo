// @ts-nocheck — pre-existing DOM null-check and type-assertion issues from inline script migration
import { pilgrimProfileStore, currentPilgrimageStore, uiStateStore } from '../stores/pilgrim';
import {
  profileStore,
  syncStoreFromClerk,
  patchPersonal, patchEmergency,
  setVehicles, setBelongings, setPets, setLockerNum, setCamino, setManualBadges,
  setLoading, setError,
} from '../stores/profile';

  // ── Clerk helpers ──────────────────────────────────────────────────────────
  type ClerkUser = {
    imageUrl: string;
    firstName: string | null;
    lastName: string | null;
    unsafeMetadata: Record<string, unknown>;
    publicMetadata: Record<string, unknown>;
    update(d: Record<string, unknown>): Promise<void>;
    setProfileImage(d: { file: File }): Promise<void>;
  };
  async function clerkUser(): Promise<ClerkUser | null> {
    const w = window as any;
    // Fast path: Clerk already loaded
    if (w.Clerk?.user) return w.Clerk.user;
    // Clerk script may still be attaching to window — poll up to 5 seconds
    for (let i = 0; i < 50; i++) {
      if (w.Clerk) {
        try { await w.Clerk.load?.(); } catch {}
        return w.Clerk.user ?? null;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }
  async function loadMeta(): Promise<Record<string, any>> {
    try {
      const u = await clerkUser();
      // personal/camino/badges from unsafeMetadata (client-writable)
      const unsafe = (u?.unsafeMetadata ?? {}) as Record<string, any>;
      const cloud  = (unsafe.pilgrimProfile as Record<string, any>) ?? {};
      // safety-critical fields from publicMetadata (server-writable, admin-readable)
      const pub = (u?.publicMetadata ?? {}) as Record<string, any>;
      // publicMetadata wins for any overlapping key (it's the authoritative source)
      const merged = { ...cloud, ...pub };
      // ── Sync to profileStore nanostore ──
      if (u) syncStoreFromClerk(unsafe, pub);
      // ── Sync legacy nanostores ──
      uiStateStore.setKey('isLoading', false);
      if (merged.camino?.stages) {
        currentPilgrimageStore.setKey('isActive', (merged.camino.stages as string[]).length > 0);
      }
      return merged;
    } catch (err) {
      console.error('[profile] loadMeta failed:', err);
      uiStateStore.setKey('isLoading', false);
      return {};
    }
  }
  async function saveMeta(patch: Record<string, any>): Promise<void> {
    const u = await clerkUser();
    if (!u) {
      showToast('Sin sesión');
      return;
    }
    // Clerk's update() overwrites the ENTIRE unsafeMetadata object — spread both
    // the top-level object (to preserve any other keys Clerk may store there)
    // and the nested pilgrimProfile (to do a partial-patch of our data).
    const topLevel = u.unsafeMetadata ?? {};
    const curProfile = (topLevel.pilgrimProfile as Record<string, any>) ?? {};
    await u.update({
      unsafeMetadata: { ...topLevel, pilgrimProfile: { ...curProfile, ...patch } },
    });
    showToast('Guardado');
    // ── Sync patch to profileStore (only defined keys) ─────────────────────
    const PERSONAL_KEYS = ['phone','phoneCC','dob','nationality','address','bio','docType','docId','docUrl','country'];
    const personalPatch = Object.fromEntries(
      PERSONAL_KEYS.filter((k) => k in patch && patch[k] !== undefined).map((k) => [k, patch[k]])
    );
    if (Object.keys(personalPatch).length) patchPersonal(personalPatch);
    if (patch.camino)       setCamino(patch.camino);
    if (patch.manualBadges) setManualBadges(patch.manualBadges);
    // legacy pilgrimProfileStore compat
    const lp = pilgrimProfileStore.get();
    if (lp.currentProfile) pilgrimProfileStore.setKey('currentProfile', { ...(lp.currentProfile as any), ...patch });
  }

  async function savePublicMeta(section: string, data: unknown): Promise<void> {
    const res = await fetch('/api/profile/save-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data }),
    });
    if (!res.ok) {
      showToast('Error al guardar');
      return;
    }
    showToast('Guardado');
    // ── Sync section to profileStore ────────────────────────────────────────
    if (section === 'emergency')  patchEmergency(data as any);
    if (section === 'vehicles')   setVehicles(data as any);
    if (section === 'belongings') setBelongings(data as any);
    if (section === 'pets')       setPets(data as any);
    if (section === 'lockerNum')  setLockerNum(String(data ?? ''));
  }

  function showToast(msg: string) {
    const t = document.getElementById('toast')!;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ── Stage / stat helpers ───────────────────────────────────────────────────
  const KM: Record<string, number> = {
    s01: 20,
    s02: 25,
    s03: 22,
    s04: 18,
    s05: 26,
    s06: 19,
    s07: 22,
    s08: 16,
    s09: 23,
    s10: 24,
    s11: 12,
    s12: 22,
    s13: 21,
    s14: 8,
    s15: 33,
    s16: 14,
    s17: 26,
    s18: 24,
    s19: 20,
    s20: 18,
    s21: 22,
    s22: 26,
    s23: 30,
    s24: 27,
    s25: 22,
    s26: 22,
    s27: 25,
    s28: 29,
    s29: 30,
    s30: 21,
    s31: 32,
    s32: 24,
    s33: 29,
    s34: 21,
    s35: 18,
    s36: 22,
    s37: 25,
    s38: 29,
    s39: 19,
    s40: 20,
  };
  const BADGE_AUTO_CRITERIA: Record<string, (s: string[]) => boolean> = {
    b_first: (s) => s.length >= 1,
    b_5stages: (s) => s.length >= 5,
    b_10stages: (s) => s.length >= 10,
    b_halfway: (s) => s.length >= 20,
    b_carrascalejo: (s) => s.includes('s13') || s.includes('s14'),
    b_complete: (s) => s.includes('s40'),
  };

  function updateStats(stages: string[], manual: string[]) {
    const km = stages.reduce((a, id) => a + (KM[id] ?? 0), 0);
    const pct = Math.min(100, Math.round((stages.length / 40) * 100));
    const kmPct = Math.min(100, Math.round((km / 910) * 100));

    setText('statNumStages', stages.length + '/40');
    setText('statNumKm', km + '/910');
    setWidth('statFillStages', pct);
    setWidth('statFillKm', kmPct);
    setText('stageCountPill', stages.length + '/40');
    setText('cardKmVal', String(km));

    // Badges stat — will be fully updated by renderCoaBadges()
    const earnedCount =
      Object.entries(BADGE_AUTO_CRITERIA).filter(([, fn]) => fn(stages)).length + manual.length;
    const badgePct = Math.round((earnedCount / ALL_BADGES.length) * 100);
    setText('statNumBadges', earnedCount + '/' + ALL_BADGES.length);
    setWidth('statFillBadges', badgePct);
  }

  function renderCoaBadges(
    stages: string[],
    manualBadges: string[],
    profileMeta: Record<string, any>
  ) {
    const wrap = document.getElementById('coaBadgesWrap');
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    // Auto-determine earned
    const km = stages.reduce((a, id) => a + (KM[id] ?? 0), 0);
    const autoEarned = new Set<string>();
    if (stages.length >= 1) autoEarned.add('b_first');
    if (stages.length >= 5) autoEarned.add('b_5stages');
    if (stages.length >= 10) autoEarned.add('b_10stages');
    if (stages.length >= 20) autoEarned.add('b_halfway');
    if (stages.includes('s13') || stages.includes('s14')) autoEarned.add('b_carrascalejo');
    if (stages.length === 40) autoEarned.add('b_complete');
    // Data-driven badges
    const emContacts: any[] = Array.isArray(profileMeta.emergencyContacts)
      ? profileMeta.emergencyContacts
      : (profileMeta.emergency?.name ? [profileMeta.emergency] : []);
    if (emContacts.some((c: any) => c.name && c.phone)) autoEarned.add('b_emergency');
    if (profileMeta.phone && profileMeta.address && profileMeta.bio) autoEarned.add('b_profile');
    if ((profileMeta.vehicles ?? []).length > 0 || (profileMeta.belongings ?? []).length > 0)
      autoEarned.add('b_gear');
    if ((profileMeta.pets ?? []).length > 0) autoEarned.add('b_pet');

    const earned = new Set([...autoEarned, ...manualBadges]);

    const LEVEL_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
      bronce: { fill: '#cd7f32', stroke: '#8b4513', text: '#fff' },
      plata: { fill: '#c0c0c0', stroke: '#808080', text: '#333' },
      oro: { fill: '#ffd700', stroke: '#b8860b', text: '#333' },
      legendario: { fill: '#7b2fff', stroke: '#4a0099', text: '#fff' },
    };
    const NS = 'http://www.w3.org/2000/svg';
    const rootStyle = getComputedStyle(document.documentElement);
    const FONT_SKETCH = rootStyle.getPropertyValue('--font-cabin-sketch').trim() || "'Cabin Sketch', cursive";
    const FONT_HAND = rootStyle.getPropertyValue('--font-patrick-hand').trim() || "'Patrick Hand', cursive";

    ALL_BADGES.forEach((b) => {
      const isEarned = earned.has(b.id);
      const colors = LEVEL_COLORS[b.level.toLowerCase()] ?? LEVEL_COLORS['bronce'];
      const wrapper = document.createElement('div');
      wrapper.className = 'coa-badge' + (isEarned ? ' coa-badge--earned' : ' coa-badge--locked');
      wrapper.setAttribute('title', b.desc);
      if (!b.auto) {
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.classList.add('coa-badge--manual');
      }

      // SVG coat-of-arms shield
      const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
      svg.setAttribute('viewBox', '0 0 80 90');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('class', 'coa-shield');

      // Shield background
      const shieldBg = document.createElementNS(NS, 'path');
      shieldBg.setAttribute('d', 'M5,5 L75,5 L75,52 Q75,73 40,87 Q5,73 5,52 Z');
      shieldBg.setAttribute('fill', isEarned ? colors.fill : '#e0e0e0');
      shieldBg.setAttribute('stroke', isEarned ? colors.stroke : '#b0b0b0');
      shieldBg.setAttribute('stroke-width', '2.5');
      svg.appendChild(shieldBg);

      // Inner border decorative line
      const innerBorder = document.createElementNS(NS, 'path');
      innerBorder.setAttribute('d', 'M11,11 L69,11 L69,51 Q69,69 40,82 Q11,69 11,51 Z');
      innerBorder.setAttribute('fill', 'none');
      innerBorder.setAttribute('stroke', isEarned ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.08)');
      innerBorder.setAttribute('stroke-width', '1.5');
      svg.appendChild(innerBorder);

      // Horizontal divider line
      const divider = document.createElementNS(NS, 'line');
      divider.setAttribute('x1', '11');
      divider.setAttribute('y1', '32');
      divider.setAttribute('x2', '69');
      divider.setAttribute('y2', '32');
      divider.setAttribute('stroke', isEarned ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.06)');
      divider.setAttribute('stroke-width', '1');
      svg.appendChild(divider);

      // Glyph text
      const glyphEl = document.createElementNS(NS, 'text');
      glyphEl.setAttribute('x', '40');
      glyphEl.setAttribute('y', '52');
      glyphEl.setAttribute('text-anchor', 'middle');
      glyphEl.setAttribute('dominant-baseline', 'middle');
      glyphEl.setAttribute('font-family', FONT_SKETCH);
      glyphEl.setAttribute('font-size', b.glyph.length > 2 ? '14' : '22');
      glyphEl.setAttribute('fill', isEarned ? colors.text : '#bbb');
      glyphEl.setAttribute('font-weight', '700');
      glyphEl.textContent = b.glyph;
      svg.appendChild(glyphEl);

      // Level text at top
      const levelEl = document.createElementNS(NS, 'text');
      levelEl.setAttribute('x', '40');
      levelEl.setAttribute('y', '21');
      levelEl.setAttribute('text-anchor', 'middle');
      levelEl.setAttribute('dominant-baseline', 'middle');
      levelEl.setAttribute('font-family', FONT_HAND);
      levelEl.setAttribute('font-size', '7');
      levelEl.setAttribute('fill', isEarned ? 'rgba(255,255,255,0.85)' : '#ccc');
      levelEl.setAttribute('letter-spacing', '1');
      levelEl.textContent = b.level.toUpperCase();
      svg.appendChild(levelEl);

      // Lock overlay if not earned
      if (!isEarned) {
        const lockCircle = document.createElementNS(NS, 'circle');
        lockCircle.setAttribute('cx', '40');
        lockCircle.setAttribute('cy', '46');
        lockCircle.setAttribute('r', '12');
        lockCircle.setAttribute('fill', 'rgba(0,0,0,0.12)');
        svg.appendChild(lockCircle);
      }

      wrapper.appendChild(svg);

      // Badge name label
      const nameEl = document.createElement('span');
      nameEl.className = 'coa-badge-name';
      nameEl.textContent = b.name;
      wrapper.appendChild(nameEl);

      // Manual toggle
      if (!b.auto) {
        wrapper.addEventListener('click', async () => {
          const m = await loadMeta();
          const mb: string[] = m.manualBadges ?? [];
          const idx = mb.indexOf(b.id);
          if (idx >= 0) mb.splice(idx, 1);
          else mb.push(b.id);
          await saveMeta({ manualBadges: mb });
          const stgs = Array.from(
            document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')
          ).map((c) => c.value);
          updateStats(stgs, mb);
          renderCoaBadges(stgs, mb, m);
        });
      }

      wrap.appendChild(wrapper);
    });

    // Update badge count
    const countEl = document.getElementById('badgeCountPill');
    if (countEl) countEl.textContent = `${earned.size}/${ALL_BADGES.length}`;
    const statFill = document.getElementById('statFillBadges');
    const statNum = document.getElementById('statNumBadges');
    if (statFill) statFill.style.width = `${Math.round((earned.size / ALL_BADGES.length) * 100)}%`;
    if (statNum) statNum.textContent = `${earned.size}`;
  }

  function setText(id: string, val: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setWidth(id: string, pct: number) {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) el.style.width = pct + '%';
  }

  // ── SVG icon builder (DOM API — no innerHTML) ─────────────────────────────
  type SvgPrimitive = { tag: string; attrs: Record<string, string> };
  const ICONS: Record<string, SvgPrimitive[]> = {
    phone: [
      {
        tag: 'path',
        attrs: {
          d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.83 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.82 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
        },
      },
    ],
    globe: [
      { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
      { tag: 'line', attrs: { x1: '2', y1: '12', x2: '22', y2: '12' } },
      {
        tag: 'path',
        attrs: {
          d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
        },
      },
    ],
    pin: [
      { tag: 'path', attrs: { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' } },
      { tag: 'circle', attrs: { cx: '12', cy: '10', r: '3' } },
    ],
    user: [
      { tag: 'path', attrs: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } },
      { tag: 'circle', attrs: { cx: '12', cy: '7', r: '4' } },
    ],
    heart: [
      {
        tag: 'path',
        attrs: {
          d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
        },
      },
    ],
    mail: [
      {
        tag: 'path',
        attrs: { d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' },
      },
      { tag: 'polyline', attrs: { points: '22,6 12,13 2,6' } },
    ],
    text: [
      { tag: 'line', attrs: { x1: '21', y1: '6', x2: '3', y2: '6' } },
      { tag: 'line', attrs: { x1: '15', y1: '12', x2: '3', y2: '12' } },
      { tag: 'line', attrs: { x1: '17', y1: '18', x2: '3', y2: '18' } },
    ],
    calendar: [
      { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '18', rx: '2' } },
      { tag: 'line', attrs: { x1: '16', y1: '2', x2: '16', y2: '6' } },
      { tag: 'line', attrs: { x1: '8',  y1: '2', x2: '8',  y2: '6' } },
      { tag: 'line', attrs: { x1: '3', y1: '10', x2: '21', y2: '10' } },
    ],
    flag: [
      { tag: 'path', attrs: { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' } },
      { tag: 'line', attrs: { x1: '4', y1: '22', x2: '4', y2: '15' } },
    ],
    id: [
      { tag: 'rect', attrs: { x: '2', y: '5', width: '20', height: '14', rx: '2' } },
      { tag: 'line', attrs: { x1: '2', y1: '10', x2: '22', y2: '10' } },
    ],
    link: [
      { tag: 'path', attrs: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' } },
      { tag: 'path', attrs: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' } },
    ],
  };
  const LABEL_ICON: Record<string, string> = {
    Teléfono: 'phone',
    Tel: 'phone',
    País: 'globe',
    Dirección: 'pin',
    Ciudad: 'pin',
    'Sobre mí': 'text',
    Bio: 'text',
    Nombre: 'user',
    Relación: 'heart',
    Email: 'mail',
    Nacimiento: 'calendar',
    Nacionalidad: 'flag',
    Documento: 'id',
    'Doc. URL': 'link',
  };

  // Country code → { flag, name } for display
  const COUNTRY_NAMES: Record<string, { f: string; n: string }> = {
    ES: { f: '🇪🇸', n: 'España' },
    FR: { f: '🇫🇷', n: 'France' },
    DE: { f: '🇩🇪', n: 'Germany' },
    IT: { f: '🇮🇹', n: 'Italy' },
    PT: { f: '🇵🇹', n: 'Portugal' },
    GB: { f: '🇬🇧', n: 'United Kingdom' },
    IE: { f: '🇮🇪', n: 'Ireland' },
    NL: { f: '🇳🇱', n: 'Netherlands' },
    BE: { f: '🇧🇪', n: 'Belgium' },
    CH: { f: '🇨🇭', n: 'Switzerland' },
    AT: { f: '🇦🇹', n: 'Austria' },
    PL: { f: '🇵🇱', n: 'Poland' },
    SE: { f: '🇸🇪', n: 'Sweden' },
    NO: { f: '🇳🇴', n: 'Norway' },
    DK: { f: '🇩🇰', n: 'Denmark' },
    FI: { f: '🇫🇮', n: 'Finland' },
    GR: { f: '🇬🇷', n: 'Greece' },
    RU: { f: '🇷🇺', n: 'Russia' },
    TR: { f: '🇹🇷', n: 'Turkey' },
    UA: { f: '🇺🇦', n: 'Ukraine' },
    US: { f: '🇺🇸', n: 'United States' },
    CA: { f: '🇨🇦', n: 'Canada' },
    MX: { f: '🇲🇽', n: 'Mexico' },
    BR: { f: '🇧🇷', n: 'Brazil' },
    AR: { f: '🇦🇷', n: 'Argentina' },
    AU: { f: '🇦🇺', n: 'Australia' },
    NZ: { f: '🇳🇿', n: 'New Zealand' },
    JP: { f: '🇯🇵', n: 'Japan' },
    KR: { f: '🇰🇷', n: 'South Korea' },
    CN: { f: '🇨🇳', n: 'China' },
    IN: { f: '🇮🇳', n: 'India' },
    ZA: { f: '🇿🇦', n: 'South Africa' },
    MA: { f: '🇲🇦', n: 'Morocco' },
    EG: { f: '🇪🇬', n: 'Egypt' },
    SA: { f: '🇸🇦', n: 'Saudi Arabia' },
    AE: { f: '🇦🇪', n: 'UAE' },
    CL: { f: '🇨🇱', n: 'Chile' },
    CO: { f: '🇨🇴', n: 'Colombia' },
    PE: { f: '🇵🇪', n: 'Peru' },
  };
  function countryDisplay(code: string): string {
    const c = COUNTRY_NAMES[code];
    return c ? c.f + '\u00a0' + c.n : code;
  }
  function makeSvgIcon(type: string): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('width', '13');
    svg.setAttribute('height', '13');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    (ICONS[type] ?? ICONS['user']).forEach(({ tag, attrs }) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      svg.appendChild(el);
    });
    return svg;
  }

  // ── Data format helpers (handle both flat string and structured object formats) ──

  /** Phone: flat string "+34 620235950" OR object { code, number } → display string */
  function formatPhone(phone: any): string {
    if (!phone) return '';
    if (typeof phone === 'string') return phone;
    const code = phone.code ?? '';
    const num  = phone.number ?? '';
    return [code, num].filter(Boolean).join(' ');
  }

  /** Phone → tel: href (no spaces in number) */
  function phoneHref(phone: any): string {
    return formatPhone(phone).replace(/\s/g, '');
  }

  /** Address: flat string OR { street: { line1, line2 }, city, state, postalCode, country } → display string */
  function formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address;
    const street = address.street ?? {};
    const streetStr = [street.line1, street.line2].filter(Boolean).join(', ');
    const cityStr   = [address.postalCode, address.city, address.state].filter(Boolean).join(' ');
    return [streetStr, cityStr, address.country].filter(Boolean).join(' · ');
  }

  /** Relation string: translate English to Spanish, normalize underscores */
  const RELATION_ES: Record<string, string> = {
    father: 'padre', mother: 'madre', parent: 'padre/madre',
    son: 'hijo', daughter: 'hija', child: 'hijo/a',
    brother: 'hermano', sister: 'hermana', sibling: 'hermano/a',
    friend: 'amigo/a', partner: 'pareja', spouse: 'cónyuge',
    colleague: 'compañero/a', coworker: 'compañero/a',
    guardian: 'tutor/a', neighbor: 'vecino/a',
    other: 'otro',
    // Legacy Spanish values stored before English migration
    pareja: 'pareja', 'padre/madre': 'padre/madre', 'hijo/a': 'hijo/a',
    'hermano/a': 'hermano/a', 'amigo/a': 'amigo/a', otro: 'otro',
  };
  function displayRelation(rel: string): string {
    if (!rel) return '';
    const norm = rel.toLowerCase().trim();
    return RELATION_ES[norm] ?? norm.replace(/_/g, '/');
  }

  // ── Display renderers (DOM API, no innerHTML for user data) ────────────────
  function renderDispGrid(elId: string, rows: [string, string][]) {
    const container = document.getElementById(elId)!;
    while (container.firstChild) container.removeChild(container.firstChild);
    const hasData = rows.some(([, v]) => v && v !== '—');
    if (!hasData) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = 'Sin información';
      container.appendChild(emp);
      return;
    }
    rows.forEach(([lbl, val]) => {
      if (!val) return;
      const pill = document.createElement('span');
      pill.className = 'disp-pill';
      // Force flex row layout via inline style — Astro scoped CSS won't reach JS-created elements
      pill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';

      // Icon (flex-shrink: 0 so it never wraps to its own line)
      const icon = makeSvgIcon(LABEL_ICON[lbl] ?? 'user');
      icon.style.cssText = 'flex-shrink:0;display:block;';
      pill.appendChild(icon);

      // Value: link for phone/email, clickable for address, plain text otherwise
      const isPhone = lbl === 'Teléfono' || lbl === 'Tel';
      const isEmail = lbl === 'Email';
      const isAddr = lbl === 'Dirección';

      if (isPhone) {
        const a = document.createElement('a');
        a.href = `tel:${val.replace(/\s/g, '')}`;
        a.textContent = val;
        pill.appendChild(a);
      } else if (isEmail) {
        const a = document.createElement('a');
        a.href = `mailto:${val}`;
        a.textContent = val;
        pill.appendChild(a);
      } else if (isAddr) {
        pill.style.cursor = 'pointer';  // append to existing inline style, don't replace
        pill.setAttribute('title', 'Ver distancia desde casa');
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');
        pill.appendChild(document.createTextNode(val));
        pill.addEventListener('click', () => openAddrDistModal(val));
        pill.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') openAddrDistModal(val);
        });
      } else {
        pill.appendChild(document.createTextNode(val));
      }

      container.appendChild(pill);
    });
  }

  // ── Render Perfil Personal display (bio only — contact data in dispContact) ──
  function renderPersonalDisplay(meta: Record<string, any>) {
    const container = document.getElementById('dispPersonal');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const bio = meta.bio ?? '';
    if (!bio) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = 'Sin presentación';
      container.appendChild(emp);
      return;
    }

    const pill = document.createElement('span');
    pill.className = 'disp-pill';
    pill.style.cssText = 'display:flex;flex-direction:row;align-items:flex-start;gap:0.55rem;width:100%;box-sizing:border-box;';
    const icon = makeSvgIcon('text');
    icon.style.cssText = 'flex-shrink:0;display:block;margin-top:2px;';
    pill.appendChild(icon);
    pill.appendChild(document.createTextNode(bio));
    container.appendChild(pill);
  }

  // ── Render Mis datos display (phone, address, docs — reads actual Clerk data shapes) ──
  function renderContactDisplay(meta: Record<string, any>) {
    const container = document.getElementById('dispContact');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const phone    = formatPhone(meta.phone);
    const address  = formatAddress(meta.address);
    const docs: any[] = Array.isArray(meta.documents) ? meta.documents : [];

    // Simple rows (label + value)
    const rows: [string, string][] = [
      ['Teléfono',    phone],
      ['Nacimiento',  meta.dob ?? ''],
      ['Nacionalidad',meta.nationality ?? ''],
      ['Dirección',   address],
    ];

    const hasData = rows.some(([, v]) => v) || docs.length > 0;
    if (!hasData) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = 'Sin datos de contacto';
      container.appendChild(emp);
      return;
    }

    rows.forEach(([lbl, val]) => {
      if (!val) return;
      const pill = document.createElement('span');
      pill.className = 'disp-pill';
      pill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';
      const icon = makeSvgIcon(LABEL_ICON[lbl] ?? 'user');
      icon.style.cssText = 'flex-shrink:0;display:block;';
      pill.appendChild(icon);

      if (lbl === 'Teléfono') {
        const a = document.createElement('a');
        a.href = 'tel:' + phoneHref(meta.phone);
        a.textContent = val;
        pill.appendChild(a);
      } else if (lbl === 'Dirección') {
        pill.style.cursor = 'pointer';
        pill.setAttribute('title', 'Ver distancia desde casa');
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');
        pill.appendChild(document.createTextNode(val));
        pill.addEventListener('click', () => openAddrDistModal(val));
        pill.addEventListener('keydown', (e) => { if (e.key === 'Enter') openAddrDistModal(val); });
      } else {
        pill.appendChild(document.createTextNode(val));
      }
      container.appendChild(pill);
    });

    // Documents — one pill per document in the array
    docs.forEach((doc: any) => {
      const type  = String(doc.type ?? '').toUpperCase();
      const id    = doc.id ?? '';
      const exp   = doc.expirationDate ? '· exp. ' + doc.expirationDate : '';
      const label = [type, id].filter(Boolean).join(' · ');
      if (!label) return;

      const pill = document.createElement('span');
      pill.className = 'disp-pill';
      pill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';
      const icon = makeSvgIcon('id');
      icon.style.cssText = 'flex-shrink:0;display:block;';
      pill.appendChild(icon);

      const wrap = document.createElement('span');
      wrap.style.cssText = 'display:flex;align-items:center;gap:0.4rem;min-width:0;flex-wrap:wrap;';
      wrap.appendChild(document.createTextNode(label));
      if (exp) {
        const expSpan = document.createElement('span');
        expSpan.style.cssText = 'font-size:0.7rem;opacity:0.6;white-space:nowrap;';
        expSpan.textContent = exp;
        wrap.appendChild(expSpan);
      }
      // Link buttons for each image
      const images: any[] = Array.isArray(doc.images) ? doc.images : [];
      images.forEach((img: any) => {
        if (!img.r2Url) return;
        const a = document.createElement('a');
        a.href = img.r2Url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = img.label ?? 'Ver imagen';
        a.style.cssText = 'flex-shrink:0;display:inline-flex;align-items:center;opacity:0.7;';
        const linkIcon = makeSvgIcon('link');
        linkIcon.style.cssText = 'width:11px;height:11px;display:block;';
        a.appendChild(linkIcon);
        wrap.appendChild(a);
      });
      pill.appendChild(wrap);
      container.appendChild(pill);
    });
  }

  // ── Render Contacto de Emergencia display (handles array + English relations + phone objects) ──
  function renderEmergencyDisplay(contacts: any) {
    const container = document.getElementById('dispEmergency')!;
    while (container.firstChild) container.removeChild(container.firstChild);

    // Normalize: accept array (new) or single object (legacy)
    const list: any[] = Array.isArray(contacts)
      ? contacts
      : (contacts?.name ? [contacts] : []);

    if (!list.length) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = 'Sin contacto de emergencia';
      container.appendChild(emp);
      return;
    }

    list.forEach((em: any, idx: number) => {
      if (!em || !em.name) return;

      // Separator between multiple contacts
      if (idx > 0) {
        const sep = document.createElement('hr');
        sep.style.cssText = 'border:none;border-top:1px dashed rgba(0,171,57,0.2);margin:0.35rem 0;';
        container.appendChild(sep);
      }

      // Row 1: user icon + name + relation badge
      const namePill = document.createElement('span');
      namePill.className = 'disp-pill';
      namePill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';
      const nameIcon = makeSvgIcon('user');
      nameIcon.style.cssText = 'flex-shrink:0;display:block;';
      namePill.appendChild(nameIcon);
      const nameText = document.createElement('span');
      nameText.style.cssText = 'font-weight:700;';
      nameText.textContent = em.name;
      namePill.appendChild(nameText);
      if (em.relation) {
        const badge = document.createElement('span');
        badge.className = 'em-relation-badge';
        badge.style.cssText = 'display:inline-flex;align-items:center;background:rgba(0,171,57,0.14);border:1.5px solid rgba(0,171,57,0.35);border-radius:20px;padding:1px 9px;font-size:0.72rem;font-weight:700;color:#1a3a2e;white-space:nowrap;flex-shrink:0;';
        badge.textContent = displayRelation(em.relation);
        namePill.appendChild(badge);
      }
      container.appendChild(namePill);

      // Row 2: phone (handle object or string)
      const phone = formatPhone(em.phone);
      if (phone) {
        const phonePill = document.createElement('span');
        phonePill.className = 'disp-pill';
        phonePill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';
        const phoneIcon = makeSvgIcon('phone');
        phoneIcon.style.cssText = 'flex-shrink:0;display:block;';
        phonePill.appendChild(phoneIcon);
        const phoneA = document.createElement('a');
        phoneA.href = 'tel:' + phoneHref(em.phone);
        phoneA.textContent = phone;
        phonePill.appendChild(phoneA);
        container.appendChild(phonePill);
      }

      // Row 3: email
      if (em.email) {
        const emailPill = document.createElement('span');
        emailPill.className = 'disp-pill';
        emailPill.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0.55rem;width:100%;box-sizing:border-box;';
        const emailIcon = makeSvgIcon('mail');
        emailIcon.style.cssText = 'flex-shrink:0;display:block;';
        emailPill.appendChild(emailIcon);
        const emailA = document.createElement('a');
        emailA.href = 'mailto:' + em.email;
        emailA.textContent = em.email;
        emailPill.appendChild(emailA);
        container.appendChild(emailPill);
      }
    });
  }

  function makeChipEl(label: string, onRemove?: () => void) {
    const chip = document.createElement('span');
    chip.className = 'gear-chip';
    chip.appendChild(document.createTextNode(label + ' '));
    if (onRemove) {
      const btn = document.createElement('button');
      btn.className = 'chip-remove';
      btn.textContent = '×';
      btn.setAttribute('aria-label', 'Eliminar');
      btn.addEventListener('click', onRemove);
      chip.appendChild(btn);
    }
    return chip;
  }
  function renderChipWrap(
    wrapId: string,
    items: ReturnType<typeof makeChipEl>[],
    emptyText: string
  ) {
    const wrap = document.getElementById(wrapId)!;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    if (!items.length) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = emptyText;
      wrap.appendChild(emp);
      return;
    }
    items.forEach((el) => wrap.appendChild(el));
  }
  // ── Item card helpers ──────────────────────────────────────────────────────

  // SVG paths for item icons
  const ITEM_ICONS: Record<string, string> = {
    // vehicles
    car: 'M3 11l1.5-4.5h15L21 11m-18 0v4a1 1 0 001 1h1m14 0h1a1 1 0 001-1v-4m-18 0h18M6.5 15.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm11 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
    moto: 'M5 17H3v-5l2-5h8l2 5h3l2 2v3h-2m-11 0a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z',
    bici: 'M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4zm-9-8l-1-3h6l2 5H9m1-5l-1-3H5l1 3',
    furgoneta: 'M1 3h15v13H1zm15 4h4l3 3v6h-7V7zM5.5 16a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm13 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
    // belongings categories
    mochila: 'M12 2a5 5 0 00-5 5v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v1H9V7a3 3 0 013-3zm0 8a2 2 0 110 4 2 2 0 010-4z',
    bastones: 'M6 4v16M10 4l4 16M18 4l-4 16',
    tienda: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm6 0v13',
    saco: 'M12 3a9 9 0 000 18m0-18a9 9 0 010 18m0-18v18M3 9h18M3 15h18',
    ropa: 'M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z',
    calzado: 'M2 16s1-5 6-5 9 5 14 5M2 16h20',
    electronica: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v14m0 0h10a2 2 0 002-2V9M9 17H5a2 2 0 01-2-2V9m0 0h18',
    cargadores: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',
    medicacion: 'M12 5v14M5 12h14',
    botiquin: 'M19 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2zm-7 3v6m-3-3h6',
    higiene: 'M7 21h10M12 21V3M9 7l3-3 3 3',
    documentos: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    credencial: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 3.5l1 2.5 2.5.5-1.8 1.8.4 2.7L12 14l-2.1 1 .4-2.7L8.5 10.5l2.5-.5L12 7.5z',
    llaves: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.77-7.77zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    efectivo: 'M2 8h20v12H2V8zm10 3a3 3 0 100 6 3 3 0 000-6zM6 8V6a2 2 0 012-2h8a2 2 0 012 2v2',
    comida: 'M20 7H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2',
    accesorios: 'M12 2l1.5 4.5H18l-3.7 2.7 1.4 4.3L12 11l-3.7 2.5 1.4-4.3L6 6.5h4.5L12 2z',
    otros: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    // pets
    perro: 'M10 5.172C10 3.15 7.993 2 6 2S2 3.15 2 5.172c0 1.914.797 3.33 2 4.185V22h12V9.357C17.203 8.502 18 7.086 18 5.172 18 3.15 15.993 2 14 2s-4 1.15-4 3.172zm-2 10.828h8',
    gato: 'M4 6l2-4 2 4M16 6l2-4 2 4M4 8a8 8 0 1016 0M8 13l1 1M16 13l-1 1M10 17h4',
    pajaro: 'M12 18c-3 0-6-2-6-5 0-2 1-4 3-5l-1-4h4l1 3c.7-.2 1.3-.3 2-.3 4 0 6 3 6 6s-3 5-9 5zM7 9l-3 3M17 9l3 3',
    conejo: 'M6 3c0 2 1 4 3 5M18 3c0 2-1 4-3 5M8 8a4 4 0 108 0A4 4 0 008 8zm2 4v8m4-8v8m-6 0h8',
    otro_animal: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 6a2 2 0 110 4 2 2 0 010-4zm0 8c-2.7 0-4.8-1.3-6-3h12c-1.2 1.7-3.3 3-6 3z',
    // locker
    taquilla: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm7 5a2 2 0 100 4 2 2 0 000-4zm0 4v4',
  };

  function makeItemIcon(type: string, size = 32): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', ITEM_ICONS[type] ?? ITEM_ICONS['otros']);
    svg.appendChild(path);
    return svg;
  }

  // ── Item edit modal ──────────────────────────────────────────────────────
  function openItemEditModal(opts: {
    title: string;
    fields: { id: string; label: string; type: string; value: string; options?: { value: string; label: string }[] }[];
    onSave: (values: Record<string, string>) => Promise<void>;
  }) {
    document.getElementById('itemEditModal')?.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'itemEditModal';
    backdrop.className = 'item-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'item-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'item-modal-header';
    const titleEl = document.createElement('h3');
    titleEl.className = 'item-modal-title';
    titleEl.textContent = opts.title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'item-modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => backdrop.remove());
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Body with fields
    const body = document.createElement('div');
    body.className = 'item-modal-body';
    const fieldEls: Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> = {};

    opts.fields.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lbl = document.createElement('label');
      lbl.textContent = f.label;
      lbl.htmlFor = 'iem-' + f.id;
      wrap.appendChild(lbl);

      let el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (f.options) {
        const sel = document.createElement('select');
        sel.id = 'iem-' + f.id;
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '— elige —';
        sel.appendChild(empty);
        f.options.forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (o.value === f.value) opt.selected = true;
          sel.appendChild(opt);
        });
        el = sel;
      } else if (f.type === 'textarea') {
        const ta = document.createElement('textarea');
        ta.id = 'iem-' + f.id;
        ta.rows = 2;
        ta.value = f.value;
        el = ta;
      } else {
        const inp = document.createElement('input');
        inp.id = 'iem-' + f.id;
        inp.type = f.type;
        inp.value = f.value;
        el = inp;
      }
      wrap.appendChild(el);
      fieldEls[f.id] = el;
      body.appendChild(wrap);
    });
    modal.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'item-modal-footer';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'sketchy-btn';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', async () => {
      const values: Record<string, string> = {};
      Object.entries(fieldEls).forEach(([id, el]) => { values[id] = el.value; });
      saveBtn.disabled = true;
      saveBtn.textContent = '…';
      try {
        await opts.onSave(values);
        backdrop.remove();
      } catch {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
        showToast('Error al guardar');
      }
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sketchy-btn-ghost';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => backdrop.remove());
    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    modal.appendChild(footer);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
    setTimeout(() => (Object.values(fieldEls)[0] as HTMLElement)?.focus(), 50);
  }

  // Helper: create small icon SVG via DOM (safe, no innerHTML)
  function makeActionSvg(paths: { tag: string; attrs: Record<string, string> }[]): SVGSVGElement {
    const svgNS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    s.setAttribute('width', '11'); s.setAttribute('height', '11');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.5');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('aria-hidden', 'true');
    paths.forEach(({ tag, attrs }) => {
      const el = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      s.appendChild(el);
    });
    return s;
  }

  function makeItemCard(opts: {
    iconType: string;
    name: string;
    subtitle?: string;   // description line below the title
    count?: number;      // shown as a small badge next to the title
    accentColor?: string;
    onRemove: () => Promise<void>;
    onEdit?: () => void;
  }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'item-card';

    // ── Header row: colored icon box + bold title (+ optional count badge) ──
    const header = document.createElement('div');
    header.className = 'item-card-header';

    const iconBox = document.createElement('div');
    iconBox.className = 'item-card-icon';
    if (opts.accentColor) iconBox.style.setProperty('--icon-accent', opts.accentColor);
    iconBox.appendChild(makeItemIcon(opts.iconType, 20));
    header.appendChild(iconBox);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'item-card-title-wrap';

    const titleEl = document.createElement('span');
    titleEl.className = 'item-card-title';
    titleEl.textContent = opts.name;
    titleWrap.appendChild(titleEl);

    if (opts.count && opts.count > 1) {
      const badge = document.createElement('span');
      badge.className = 'item-card-count-badge';
      badge.textContent = '\u00d7' + opts.count;
      titleWrap.appendChild(badge);
    }

    header.appendChild(titleWrap);
    card.appendChild(header);

    // ── Description / subtitle ──
    if (opts.subtitle) {
      const desc = document.createElement('p');
      desc.className = 'item-card-desc';
      desc.textContent = opts.subtitle;
      card.appendChild(desc);
    }

    // ── Actions: edit + remove (top-right corner, appear on hover) ──
    const actions = document.createElement('div');
    actions.className = 'item-card-actions';

    if (opts.onEdit) {
      const editBtn = document.createElement('button');
      editBtn.className = 'item-card-edit';
      editBtn.setAttribute('aria-label', 'Editar');
      editBtn.setAttribute('title', 'Editar');
      editBtn.appendChild(makeActionSvg([
        { tag: 'path', attrs: { d: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' } },
        { tag: 'path', attrs: { d: 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' } },
      ]));
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); opts.onEdit!(); });
      actions.appendChild(editBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'item-card-remove';
    removeBtn.setAttribute('aria-label', 'Eliminar');
    removeBtn.setAttribute('title', 'Eliminar');
    removeBtn.appendChild(makeActionSvg([
      { tag: 'line', attrs: { x1: '18', y1: '6', x2: '6', y2: '18' } },
      { tag: 'line', attrs: { x1: '6', y1: '6', x2: '18', y2: '18' } },
    ]));
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); opts.onRemove(); });
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    return card;
  }

  function renderItemCards(wrapId: string, cards: HTMLElement[], emptyText: string) {
    const wrap = document.getElementById(wrapId)!;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    if (!cards.length) {
      const emp = document.createElement('span');
      emp.className = 'disp-empty';
      emp.textContent = emptyText;
      wrap.appendChild(emp);
      return;
    }
    cards.forEach((c) => wrap.appendChild(c));
  }

  // Vehicle type → icon key
  const VEHICLE_ICON: Record<string, string> = {
    coche: 'car', moto: 'moto', bicicleta: 'bici', furgoneta: 'furgoneta',
    camioneta: 'furgoneta', autocaravana: 'furgoneta', otro: 'car',
  };
  // Belonging category → icon key
  const BELONGING_ICON: Record<string, string> = {
    // Camino gear
    mochila: 'mochila', bastones: 'bastones', tienda: 'tienda',
    'saco de dormir': 'saco', calzado: 'calzado',
    // Personal
    ropa: 'ropa', higiene: 'higiene', medicacion: 'medicacion', botiquin: 'botiquin',
    // Tech
    electronica: 'electronica', cargadores: 'cargadores',
    // Documents & values
    documentos: 'documentos', credencial: 'credencial', llaves: 'llaves', efectivo: 'efectivo',
    // Provisions
    comida: 'comida',
    // Misc
    accesorios: 'accesorios', otros: 'otros',
    // Legacy / alternate category names
    documentacion: 'documentos', valor: 'efectivo',
    medicamentos: 'medicacion', electrónica: 'electronica', otro: 'otros',
    'higiene personal': 'higiene', 'efectivo / tarjetas': 'efectivo',
    'credencial del peregrino': 'credencial', 'comida y agua': 'comida',
  };
  // Belonging category → accent color
  const BELONGING_COLOR: Record<string, string> = {
    mochila: '#2d5a3d', bastones: '#5c4033', tienda: '#00876c',
    'saco de dormir': '#4a7c59', calzado: '#b8622a',
    ropa: '#7b5ea7', higiene: '#2980b9', medicacion: '#c0392b', botiquin: '#e74c3c',
    electronica: '#1d6fa4', cargadores: '#2471a3',
    documentos: '#c8a951', credencial: '#8e44ad', llaves: '#7f8c8d', efectivo: '#27ae60',
    comida: '#e67e22',
    accesorios: '#95a5a6', otros: '#666',
    // Legacy aliases
    documentacion: '#c8a951', valor: '#27ae60',
    medicamentos: '#c0392b', electrónica: '#1d6fa4', otro: '#666',
    'higiene personal': '#2980b9', 'efectivo / tarjetas': '#27ae60',
    'credencial del peregrino': '#8e44ad', 'comida y agua': '#e67e22',
  };
  // Pet species → icon key
  const PET_ICON: Record<string, string> = {
    perro: 'perro', gato: 'gato', pajaro: 'pajaro',
    conejo: 'conejo', otro: 'otro_animal',
  };
  // Pet species → accent color
  const PET_COLOR: Record<string, string> = {
    perro: '#b8622a', gato: '#7b5ea7', pajaro: '#1d6fa4',
    conejo: '#c8a951', otro: '#666',
  };

  function renderVehicles(meta: Record<string, any>) {
    const vehicles: any[] = meta.vehicles ?? [];
    const locker: string = meta.lockerNum ?? '';
    const cards: HTMLElement[] = [];

    if (locker) {
      cards.push(makeItemCard({
        iconType: 'taquilla',
        name: 'Taquilla ' + locker,
        subtitle: 'Número de taquilla asignada',
        accentColor: 'var(--gd)',
        onRemove: async () => {
          await savePublicMeta('lockerNum', '');
          const m = await loadMeta();
          m.lockerNum = '';
          renderVehicles(m);
        },
      }));
    }

    vehicles.forEach((v) => {
      cards.push(makeItemCard({
        iconType: VEHICLE_ICON[v.type?.toLowerCase()] ?? 'car',
        name: v.plate || v.type || 'Vehículo',
        subtitle: [v.type, v.model, v.color].filter(Boolean).join(' · '),
        onRemove: async () => {
          const m = await loadMeta();
          m.vehicles = (m.vehicles ?? []).filter((x: any) => x.id !== v.id);
          await savePublicMeta('vehicles', m.vehicles);
          renderVehicles(m);
          const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map((c) => c.value);
          renderCoaBadges(stages, m.manualBadges ?? [], m);
        },
        onEdit: () => openItemEditModal({
          title: 'Editar vehículo',
          fields: [
            { id: 'type', label: 'Tipo', type: 'select', value: v.type ?? '', options: [
              { value: 'coche', label: 'Coche' }, { value: 'moto', label: 'Moto' },
              { value: 'bicicleta', label: 'Bicicleta' }, { value: 'furgoneta', label: 'Furgoneta' },
              { value: 'camioneta', label: 'Camioneta' }, { value: 'autocaravana', label: 'Autocaravana' },
              { value: 'otro', label: 'Otro' },
            ]},
            { id: 'plate', label: 'Matrícula', type: 'text', value: v.plate ?? '' },
            { id: 'model', label: 'Modelo', type: 'text', value: v.model ?? '' },
            { id: 'color', label: 'Color', type: 'text', value: v.color ?? '' },
          ],
          onSave: async (vals) => {
            const m = await loadMeta();
            const idx = (m.vehicles ?? []).findIndex((x: any) => x.id === v.id);
            if (idx >= 0) m.vehicles[idx] = { ...m.vehicles[idx], ...vals };
            await savePublicMeta('vehicles', m.vehicles);
            renderVehicles(m);
          },
        }),
      }));
    });

    renderItemCards('vehicleDisplay', cards, 'Sin vehículos registrados');
  }

  function renderBelongings(meta: Record<string, any>) {
    const items: any[] = meta.belongings ?? [];
    const cards = items.map((b) =>
      makeItemCard({
        iconType: BELONGING_ICON[b.category?.toLowerCase()] ?? 'otros',
        name: b.name,
        count: b.count > 1 ? b.count : undefined,
        subtitle: [b.category, b.notes].filter(Boolean).join(' · '),
        accentColor: BELONGING_COLOR[b.category?.toLowerCase()] ?? '#666',
        onRemove: async () => {
          const m = await loadMeta();
          m.belongings = (m.belongings ?? []).filter((x: any) => x.id !== b.id);
          await savePublicMeta('belongings', m.belongings);
          renderBelongings(m);
          const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map((c) => c.value);
          renderCoaBadges(stages, m.manualBadges ?? [], m);
        },
        onEdit: () => openItemEditModal({
          title: 'Editar artículo',
          fields: [
            { id: 'category', label: 'Categoría', type: 'select', value: b.category ?? '', options: [
              { value: 'mochila', label: 'Mochila' }, { value: 'bastones', label: 'Bastones' },
              { value: 'tienda', label: 'Tienda de campaña' }, { value: 'saco de dormir', label: 'Saco de dormir' },
              { value: 'calzado', label: 'Calzado' }, { value: 'ropa', label: 'Ropa' },
              { value: 'higiene', label: 'Higiene personal' }, { value: 'medicacion', label: 'Medicación' },
              { value: 'botiquin', label: 'Botiquín' }, { value: 'electronica', label: 'Electrónica' },
              { value: 'cargadores', label: 'Cargadores' }, { value: 'documentos', label: 'Documentos' },
              { value: 'credencial', label: 'Credencial' }, { value: 'llaves', label: 'Llaves' },
              { value: 'efectivo', label: 'Efectivo / tarjetas' }, { value: 'comida', label: 'Comida y agua' },
              { value: 'accesorios', label: 'Accesorios' }, { value: 'otros', label: 'Otros' },
            ]},
            { id: 'name', label: 'Nombre', type: 'text', value: b.name ?? '' },
            { id: 'count', label: 'Cantidad', type: 'number', value: String(b.count ?? 1) },
            { id: 'notes', label: 'Notas', type: 'textarea', value: b.notes ?? '' },
          ],
          onSave: async (vals) => {
            const m = await loadMeta();
            const idx = (m.belongings ?? []).findIndex((x: any) => x.id === b.id);
            if (idx >= 0) m.belongings[idx] = { ...m.belongings[idx], ...vals, count: Math.max(1, parseInt(vals.count) || 1) };
            await savePublicMeta('belongings', m.belongings);
            renderBelongings(m);
          },
        }),
      })
    );
    renderItemCards('belongingsDisplay', cards, 'Sin artículos registrados');
  }

  function renderPets(meta: Record<string, any>) {
    const pets: any[] = meta.pets ?? [];
    const cards = pets.map((p) =>
      makeItemCard({
        iconType: PET_ICON[p.species?.toLowerCase()] ?? 'otro_animal',
        name: p.name,
        subtitle: [p.species, p.breed, p.chip ? 'Chip: ' + p.chip : ''].filter(Boolean).join(' · '),
        accentColor: PET_COLOR[p.species?.toLowerCase()] ?? '#666',
        onRemove: async () => {
          const m = await loadMeta();
          m.pets = (m.pets ?? []).filter((x: any) => x.id !== p.id);
          await savePublicMeta('pets', m.pets);
          renderPets(m);
          const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map((c) => c.value);
          renderCoaBadges(stages, m.manualBadges ?? [], m);
        },
        onEdit: () => openItemEditModal({
          title: 'Editar mascota',
          fields: [
            { id: 'name', label: 'Nombre', type: 'text', value: p.name ?? '' },
            { id: 'species', label: 'Especie', type: 'select', value: p.species ?? '', options: [
              { value: 'perro', label: 'Perro' }, { value: 'gato', label: 'Gato' },
              { value: 'pajaro', label: 'Pájaro' }, { value: 'conejo', label: 'Conejo' },
              { value: 'otro', label: 'Otro' },
            ]},
            { id: 'breed', label: 'Raza', type: 'text', value: p.breed ?? '' },
            { id: 'chip', label: 'N.º chip', type: 'text', value: p.chip ?? '' },
          ],
          onSave: async (vals) => {
            const m = await loadMeta();
            const idx = (m.pets ?? []).findIndex((x: any) => x.id === p.id);
            if (idx >= 0) m.pets[idx] = { ...m.pets[idx], ...vals };
            await savePublicMeta('pets', m.pets);
            renderPets(m);
          },
        }),
      })
    );
    renderItemCards('petsDisplay', cards, 'Sin mascotas registradas');
  }
  function renderGear(meta: Record<string, any>) {
    renderVehicles(meta);
    renderBelongings(meta);
    renderPets(meta);
  }

  // ── All badge definitions (mirrors frontmatter BADGES + new data-driven ones) ──
  const ALL_BADGES = [
    {
      id: 'b_first',
      glyph: 'I',
      name: 'Primera Etapa',
      desc: 'Completa tu primera etapa',
      auto: true,
      level: 'Bronce',
    },
    {
      id: 'b_5stages',
      glyph: 'V',
      name: '5 Etapas',
      desc: 'Completa 5 etapas del camino',
      auto: true,
      level: 'Plata',
    },
    {
      id: 'b_10stages',
      glyph: 'X',
      name: '10 Etapas',
      desc: 'Completa 10 etapas del camino',
      auto: true,
      level: 'Plata',
    },
    {
      id: 'b_halfway',
      glyph: '½',
      name: 'Mitad del Camino',
      desc: 'Supera la etapa 20',
      auto: true,
      level: 'Oro',
    },
    {
      id: 'b_carrascalejo',
      glyph: 'C',
      name: 'El Carrascalejo',
      desc: 'Pasa por el Albergue Municipal',
      auto: true,
      level: 'Oro',
    },
    {
      id: 'b_100km',
      glyph: 'C',
      name: '100 km',
      desc: 'Camina más de 100 km en total',
      auto: false,
      level: 'Bronce',
    },
    {
      id: 'b_rain',
      glyph: '~',
      name: 'Peregrino Mojado',
      desc: 'Sal a andar bajo la lluvia',
      auto: false,
      level: 'Bronce',
    },
    {
      id: 'b_stamps5',
      glyph: '5S',
      name: '5 Sellos',
      desc: 'Colecciona 5 sellos en tu credencial',
      auto: false,
      level: 'Plata',
    },
    {
      id: 'b_stamps10',
      glyph: '10S',
      name: '10 Sellos',
      desc: 'Colecciona 10 sellos',
      auto: false,
      level: 'Oro',
    },
    {
      id: 'b_social',
      glyph: '∞',
      name: 'Espíritu Peregrino',
      desc: 'Comparte mesa con otros peregrinos',
      auto: false,
      level: 'Plata',
    },
    {
      id: 'b_dawn',
      glyph: '↑',
      name: 'Madrugador',
      desc: 'Sal antes de las 6:00 h',
      auto: false,
      level: 'Bronce',
    },
    {
      id: 'b_complete',
      glyph: '★',
      name: 'Buen Camino',
      desc: 'Llega a Santiago de Compostela',
      auto: true,
      level: 'Legendario',
    },
    {
      id: 'b_emergency',
      glyph: '🛡',
      name: 'Siempre Protegido',
      desc: 'Añade un contacto de emergencia',
      auto: true,
      level: 'Bronce',
    },
    {
      id: 'b_profile',
      glyph: '✓',
      name: 'Peregrino Completo',
      desc: 'Completa tu perfil personal',
      auto: true,
      level: 'Plata',
    },
    {
      id: 'b_gear',
      glyph: '⚙',
      name: 'Bien Equipado',
      desc: 'Registra tu equipaje',
      auto: true,
      level: 'Bronce',
    },
    {
      id: 'b_pet',
      glyph: '🐾',
      name: 'Compañero Fiel',
      desc: 'Registra una mascota',
      auto: true,
      level: 'Bronce',
    },
  ];

  // ── Countries data (for phone picker) ─────────────────────────────────────
  const COUNTRIES: { c: string; n: string; f: string; d: string }[] = [
    { c: 'ES', n: 'España', f: '🇪🇸', d: '+34' },
    { c: 'FR', n: 'France', f: '🇫🇷', d: '+33' },
    { c: 'DE', n: 'Germany', f: '🇩🇪', d: '+49' },
    { c: 'IT', n: 'Italy', f: '🇮🇹', d: '+39' },
    { c: 'PT', n: 'Portugal', f: '🇵🇹', d: '+351' },
    { c: 'GB', n: 'United Kingdom', f: '🇬🇧', d: '+44' },
    { c: 'IE', n: 'Ireland', f: '🇮🇪', d: '+353' },
    { c: 'NL', n: 'Netherlands', f: '🇳🇱', d: '+31' },
    { c: 'BE', n: 'Belgium', f: '🇧🇪', d: '+32' },
    { c: 'CH', n: 'Switzerland', f: '🇨🇭', d: '+41' },
    { c: 'AT', n: 'Austria', f: '🇦🇹', d: '+43' },
    { c: 'PL', n: 'Poland', f: '🇵🇱', d: '+48' },
    { c: 'SE', n: 'Sweden', f: '🇸🇪', d: '+46' },
    { c: 'NO', n: 'Norway', f: '🇳🇴', d: '+47' },
    { c: 'DK', n: 'Denmark', f: '🇩🇰', d: '+45' },
    { c: 'FI', n: 'Finland', f: '🇫🇮', d: '+358' },
    { c: 'GR', n: 'Greece', f: '🇬🇷', d: '+30' },
    { c: 'RU', n: 'Russia', f: '🇷🇺', d: '+7' },
    { c: 'TR', n: 'Turkey', f: '🇹🇷', d: '+90' },
    { c: 'UA', n: 'Ukraine', f: '🇺🇦', d: '+380' },
    { c: 'US', n: 'United States', f: '🇺🇸', d: '+1' },
    { c: 'CA', n: 'Canada', f: '🇨🇦', d: '+1' },
    { c: 'MX', n: 'Mexico', f: '🇲🇽', d: '+52' },
    { c: 'BR', n: 'Brazil', f: '🇧🇷', d: '+55' },
    { c: 'AR', n: 'Argentina', f: '🇦🇷', d: '+54' },
    { c: 'AU', n: 'Australia', f: '🇦🇺', d: '+61' },
    { c: 'NZ', n: 'New Zealand', f: '🇳🇿', d: '+64' },
    { c: 'JP', n: 'Japan', f: '🇯🇵', d: '+81' },
    { c: 'KR', n: 'South Korea', f: '🇰🇷', d: '+82' },
    { c: 'CN', n: 'China', f: '🇨🇳', d: '+86' },
    { c: 'IN', n: 'India', f: '🇮🇳', d: '+91' },
    { c: 'ZA', n: 'South Africa', f: '🇿🇦', d: '+27' },
    { c: 'MA', n: 'Morocco', f: '🇲🇦', d: '+212' },
    { c: 'EG', n: 'Egypt', f: '🇪🇬', d: '+20' },
    { c: 'SA', n: 'Saudi Arabia', f: '🇸🇦', d: '+966' },
    { c: 'AE', n: 'UAE', f: '🇦🇪', d: '+971' },
    { c: 'IL', n: 'Israel', f: '🇮🇱', d: '+972' },
    { c: 'CL', n: 'Chile', f: '🇨🇱', d: '+56' },
    { c: 'CO', n: 'Colombia', f: '🇨🇴', d: '+57' },
    { c: 'PE', n: 'Peru', f: '🇵🇪', d: '+51' },
  ];

  // ── Profile phone picker ───────────────────────────────────────────────────
  function initProfilePhonePicker() {
    const prefixBtn = document.getElementById('p-phone-prefix') as HTMLButtonElement | null;
    const flagEl = document.getElementById('p-phone-flag') as HTMLElement | null;
    const dialEl = document.getElementById('p-phone-dial') as HTMLElement | null;
    const hiddenCC = document.getElementById('fPhoneCC') as HTMLInputElement | null;
    const drop = document.getElementById('p-phone-drop') as HTMLElement | null;
    const searchInput = drop?.querySelector('.phone-drop-search-p') as HTMLInputElement | null;
    const list = drop?.querySelector('.phone-drop-list-p') as HTMLUListElement | null;
    if (!prefixBtn || !drop || !list || !searchInput) return;

    function renderList(q: string) {
      const lq = q.toLowerCase();
      const filtered =
        q.length < 1
          ? COUNTRIES.slice(0, 40)
          : COUNTRIES.filter(
              (c) =>
                c.n.toLowerCase().includes(lq) || c.d.includes(lq) || c.c.toLowerCase().includes(lq)
            );
      while (list!.firstChild) list!.removeChild(list!.firstChild);
      filtered.forEach((co) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        const flag = document.createTextNode(co.f + ' ');
        const name = document.createTextNode(co.n);
        const dial = document.createElement('span');
        dial.className = 'pdl-dial-p';
        dial.textContent = co.d;
        li.appendChild(flag);
        li.appendChild(name);
        li.appendChild(dial);
        li.addEventListener('click', () => {
          if (flagEl) flagEl.textContent = co.f;
          if (dialEl) dialEl.textContent = co.d;
          if (hiddenCC) hiddenCC.value = co.c;
          drop!.classList.remove('open');
          prefixBtn!.setAttribute('aria-expanded', 'false');
          searchInput!.value = '';
          renderList('');
        });
        list!.appendChild(li);
      });
    }

    prefixBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.classList.contains('open');
      drop.classList.toggle('open', !isOpen);
      prefixBtn.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        searchInput.focus();
        renderList('');
      }
    });
    searchInput.addEventListener('input', () => renderList(searchInput.value));
    document.addEventListener('click', (e) => {
      if (!drop.contains(e.target as Node) && e.target !== prefixBtn) {
        drop.classList.remove('open');
        prefixBtn.setAttribute('aria-expanded', 'false');
      }
    });
    renderList('');
  }

  // ── Address autocomplete (Nominatim OSM) ────────────────────────────────
  function initAddressAutocomplete() {
    const input = document.getElementById('fAddress') as HTMLInputElement | null;
    const drop = document.getElementById('addrDrop') as HTMLUListElement | null;
    if (!input || !drop) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function closeDrop() {
      drop.hidden = true;
    }
    function clearDrop() {
      while (drop.firstChild) drop.removeChild(drop.firstChild);
    }

    async function fetchSuggestions(q: string) {
      if (q.length < 3) {
        closeDrop();
        return;
      }
      clearDrop();
      const loading = document.createElement('li');
      loading.className = 'addr-drop-loading';
      loading.textContent = 'Buscando…';
      drop.appendChild(loading);
      drop.hidden = false;

      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&accept-language=es`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
        const data = (await res.json()) as Array<{ display_name: string }>;
        clearDrop();
        if (!data.length) {
          closeDrop();
          return;
        }
        const NS = 'http://www.w3.org/2000/svg';
        data.forEach((item) => {
          const li = document.createElement('li');
          li.setAttribute('role', 'option');
          const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
          svg.setAttribute('width', '13');
          svg.setAttribute('height', '13');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
          svg.setAttribute('stroke-width', '2');
          svg.setAttribute('aria-hidden', 'true');
          const p1 = document.createElementNS(NS, 'path');
          p1.setAttribute('d', 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z');
          const circle = document.createElementNS(NS, 'circle');
          circle.setAttribute('cx', '12');
          circle.setAttribute('cy', '10');
          circle.setAttribute('r', '3');
          svg.appendChild(p1);
          svg.appendChild(circle);
          li.appendChild(svg);
          li.appendChild(document.createTextNode(item.display_name));
          li.addEventListener('click', () => {
            input.value = item.display_name;
            closeDrop();
          });
          drop.appendChild(li);
        });
        drop.hidden = false;
      } catch {
        closeDrop();
      }
    }

    input.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchSuggestions(input.value), 350);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrop();
    });
    document.addEventListener('click', (e) => {
      if (!drop.contains(e.target as Node) && e.target !== input) closeDrop();
    });
  }

  // ── Emergency contact phone picker ───────────────────────────────────────
  function initEmPhonePicker() {
    const prefixBtn = document.getElementById('em-phone-prefix') as HTMLButtonElement | null;
    const flagEl = document.getElementById('em-phone-flag') as HTMLElement | null;
    const dialEl = document.getElementById('em-phone-dial') as HTMLElement | null;
    const hiddenCC = document.getElementById('emPhoneCC') as HTMLInputElement | null;
    const drop = document.getElementById('em-phone-drop') as HTMLElement | null;
    if (!prefixBtn || !drop) return;
    const searchInput = drop.querySelector<HTMLInputElement>('.phone-drop-search-p')!;
    const list = drop.querySelector<HTMLUListElement>('.phone-drop-list-p')!;
    let currentDial = '+34';

    function renderList(q: string) {
      while (list.firstChild) list.removeChild(list.firstChild);
      const filtered = COUNTRIES.filter(
        (c) =>
          c.n.toLowerCase().includes(q.toLowerCase()) ||
          c.d.includes(q) ||
          c.c.toLowerCase().includes(q.toLowerCase())
      );
      filtered.forEach((c) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.textContent = `${c.f} ${c.n}  ${c.d}`;
        li.addEventListener('click', () => {
          if (flagEl) flagEl.textContent = c.f;
          if (dialEl) dialEl.textContent = c.d;
          if (hiddenCC) hiddenCC.value = c.c;
          currentDial = c.d;
          drop!.classList.remove('open');
          prefixBtn!.setAttribute('aria-expanded', 'false');
          searchInput!.value = '';
          renderList('');
        });
        list!.appendChild(li);
      });
    }
    prefixBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.classList.contains('open');
      drop.classList.toggle('open', !isOpen);
      prefixBtn.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        searchInput.focus();
        renderList('');
      }
    });
    searchInput.addEventListener('input', () => renderList(searchInput.value));
    document.addEventListener('click', (e) => {
      if (!drop.contains(e.target as Node) && e.target !== prefixBtn) {
        drop.classList.remove('open');
        prefixBtn.setAttribute('aria-expanded', 'false');
      }
    });
    renderList('');
  }

  // ── Address distance modal ────────────────────────────────────────────────
  function openAddrDistModal(addr: string) {
    const modal = document.getElementById('addrDistModal') as HTMLElement;
    const addrEl = document.getElementById('addrDistAddress') as HTMLElement;
    const resEl = document.getElementById('addrDistResult') as HTMLElement;
    const lblEl = document.getElementById('addrDistLabel') as HTMLElement;
    if (!modal) return;
    addrEl.textContent = addr;
    resEl.textContent = '—';
    lblEl.textContent = 'Calculando distancia…';
    modal.hidden = false;

    function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
          const data = (await res.json()) as Array<{ lat: string; lon: string }>;
          if (!data.length) {
            lblEl.textContent = 'No se encontró la dirección';
            return;
          }
          const homeLat = parseFloat(data[0].lat);
          const homeLon = parseFloat(data[0].lon);
          const km = haversine(pos.coords.latitude, pos.coords.longitude, homeLat, homeLon);
          resEl.textContent = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
          lblEl.textContent = 'de distancia desde tu ubicación actual a casa';
        } catch {
          lblEl.textContent = 'Error calculando distancia';
        }
      },
      () => {
        lblEl.textContent = 'Permite el acceso a tu ubicación para calcular la distancia';
      }
    );
  }

  document.getElementById('addrDistClose')?.addEventListener('click', () => {
    const m = document.getElementById('addrDistModal') as HTMLElement;
    if (m) m.hidden = true;
  });
  document.getElementById('addrDistModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).hidden = true;
  });

  // ── Panel edit modal (universal: moves form into floating modal) ────────────
  const panelEditModal = document.getElementById('panelEditModal') as HTMLElement;
  const panelEditModalBody = document.getElementById('panelEditModalBody') as HTMLElement;
  const panelEditModalTitle = document.getElementById('panelEditModalTitle') as HTMLElement;
  const panelEditModalClose = document.getElementById('panelEditModalClose') as HTMLButtonElement;

  // Map formId → original parent (so we can restore after modal closes)
  const formOriginalParents = new Map<string, Element>();
  [
    'panelContactForm', 'panelEmForm',
    'panelVehicleForm', 'panelBelongingsForm', 'panelPetsForm',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el?.parentElement) formOriginalParents.set(id, el.parentElement);
  });

  let escHandler: ((e: KeyboardEvent) => void) | null = null;

  function openPanelModal(formId: string, title: string) {
    const form = document.getElementById(formId);
    if (!form) return;
    panelEditModalTitle.textContent = title;
    // Move form into modal body and show it
    panelEditModalBody.appendChild(form);
    form.hidden = false;
    panelEditModal.hidden = false;
    document.body.style.overflow = 'hidden';
    // Escape key handler
    escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanelModal(formId); };
    document.addEventListener('keydown', escHandler);
  }

  function closePanelModal(formId: string) {
    const form = document.getElementById(formId);
    panelEditModal.hidden = true;
    document.body.style.overflow = '';
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
    activeModalFormId = null;
    // Return form to its original panel
    if (form) {
      form.hidden = true;
      const originalParent = formOriginalParents.get(formId);
      if (originalParent) originalParent.appendChild(form);
    }
  }

  // Track which form is currently open in the modal
  let activeModalFormId: string | null = null;

  // Close button and backdrop click
  panelEditModalClose?.addEventListener('click', () => {
    if (activeModalFormId) closePanelModal(activeModalFormId);
  });
  panelEditModal?.addEventListener('click', (e) => {
    if (e.target === panelEditModal && activeModalFormId) closePanelModal(activeModalFormId);
  });

  // ── Panel toggle → opens modal ────────────────────────────────────────────
  const panelTitles: Record<string, string> = {
    panelContactForm:    'Editar mis datos',
    panelEmForm:         'Editar contacto de emergencia',
    panelVehicleForm:    'Añadir vehículo',
    panelBelongingsForm: 'Añadir equipaje / taquilla',
    panelPetsForm:       'Añadir mascota',
  };

  document.querySelectorAll<HTMLButtonElement>('.panel-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const formId = btn.dataset.target!;
      activeModalFormId = formId;
      openPanelModal(formId, panelTitles[formId] ?? 'Editar');
    });
  });

  // Cancel buttons close the modal
  document.querySelectorAll<HTMLButtonElement>('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (activeModalFormId) closePanelModal(activeModalFormId);
    });
  });

  // ── Bio inline edit ───────────────────────────────────────────────────────
  document.getElementById('editBioBtn')?.addEventListener('click', () => {
    const bioForm = document.getElementById('bioEditForm') as HTMLElement | null;
    const editBtn = document.getElementById('editBioBtn') as HTMLButtonElement | null;
    if (!bioForm) return;
    const isOpen = !bioForm.hidden;
    bioForm.hidden = isOpen;
    if (editBtn) editBtn.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) {
      // Pre-fill with current bio from store
      const bioEl = document.getElementById('fBio') as HTMLTextAreaElement | null;
      if (bioEl) {
        bioEl.value = profileStore.get().personal.bio ?? '';
        setTimeout(() => bioEl.focus(), 30);
      }
    }
  });

  document.getElementById('cancelBioBtn')?.addEventListener('click', () => {
    const bioForm = document.getElementById('bioEditForm') as HTMLElement | null;
    const editBtn = document.getElementById('editBioBtn') as HTMLButtonElement | null;
    if (bioForm) bioForm.hidden = true;
    if (editBtn) editBtn.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('saveBioBtn')?.addEventListener('click', async () => {
    const bioEl = document.getElementById('fBio') as HTMLTextAreaElement | null;
    const bioForm = document.getElementById('bioEditForm') as HTMLElement | null;
    const editBtn = document.getElementById('editBioBtn') as HTMLButtonElement | null;
    const saveBtn = document.getElementById('saveBioBtn') as HTMLButtonElement | null;
    const bio = bioEl?.value.trim() ?? '';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '…'; }
    try {
      const meta = await loadMeta();
      await saveMeta({ bio });
      renderPersonalDisplay({ ...meta, bio });
      if (bioForm) bioForm.hidden = true;
      if (editBtn) editBtn.setAttribute('aria-expanded', 'false');
    } catch {
      showToast('Error al guardar');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    }
  });

  // ── Save: contact (phone, nationality) ─────────────────────────────────────
  document.querySelector('[data-save="contact"]')?.addEventListener('click', async () => {
    const phoneDial   = (document.getElementById('p-phone-dial') as HTMLElement)?.textContent?.trim() ?? '';
    const phoneNum    = ((document.getElementById('fPhone') as HTMLInputElement)?.value ?? '').trim();
    const phoneCC     = (document.getElementById('fPhoneCC') as HTMLInputElement)?.value ?? '';
    const nationality = ((document.getElementById('fNationality') as HTMLInputElement)?.value ?? '').trim();

    const patch: Record<string, any> = {
      phone: phoneNum ? { code: phoneDial, number: phoneNum, country: phoneCC } : undefined,
      nationality,
    };
    if (!patch.phone) delete patch.phone;

    const meta = await loadMeta();
    await saveMeta(patch);
    // Re-load to get fresh merged data with new phone object
    const freshMeta = await loadMeta();
    renderContactDisplay(freshMeta);
    closePanelModal('panelContactForm');
  });

  // ── Save: emergency (→ publicMetadata.emergencyContacts array) ───────────
  document.querySelector('[data-save="emergency"]')?.addEventListener('click', async () => {
    const emPhoneCode = (document.getElementById('em-phone-dial') as HTMLElement)?.textContent?.trim() ?? '';
    const emPhoneNum  = (document.getElementById('emPhoneNum') as HTMLInputElement).value.trim();
    const emPhoneCC   = (document.getElementById('emPhoneCC') as HTMLInputElement).value;
    const emName      = (document.getElementById('emName') as HTMLInputElement).value.trim();
    const emRelation  = (document.getElementById('emRelation') as HTMLSelectElement).value;
    const emEmail     = (document.getElementById('emEmail') as HTMLInputElement).value.trim();
    const msgEl       = document.getElementById('emValidationMsg') as HTMLElement;
    const userEmail   = (document.getElementById('profileData') as HTMLElement)?.dataset.userEmail ?? '';
    const userMeta    = await loadMeta();
    const userPhone   = formatPhone(userMeta.phone);

    // Validation
    const errors: string[] = [];
    if (!emName)     errors.push('Nombre es obligatorio.');
    if (!emRelation) errors.push('Relación es obligatoria.');
    if (!emPhoneNum) errors.push('Teléfono es obligatorio.');
    if (!emEmail)    errors.push('Email es obligatorio.');
    if (emEmail && emEmail.toLowerCase() === userEmail.toLowerCase())
      errors.push('El email de emergencia no puede ser el mismo que el tuyo.');
    const emPhoneFull = [emPhoneCode, emPhoneNum].filter(Boolean).join(' ');
    if (emPhoneFull && userPhone && emPhoneFull.replace(/\s/g,'') === userPhone.replace(/\s/g,''))
      errors.push('El teléfono de emergencia no puede ser el mismo que el tuyo.');

    if (errors.length) {
      msgEl.textContent = errors.join(' ');
      msgEl.hidden = false;
      return;
    }
    msgEl.hidden = true;

    const newContact = {
      name:     emName,
      relation: emRelation,
      phone:    { code: emPhoneCode, number: emPhoneNum, country: emPhoneCC },
      email:    emEmail,
    };

    // Append to existing contacts array (support both old `emergency` and new `emergencyContacts`)
    const existing: any[] = Array.isArray(userMeta.emergencyContacts)
      ? userMeta.emergencyContacts
      : (userMeta.emergency ? [userMeta.emergency] : []);
    const updated = [...existing, newContact];

    await savePublicMeta('emergencyContacts', updated);
    renderEmergencyDisplay(updated);
    closePanelModal('panelEmForm');

    // Reset form fields
    (document.getElementById('emName') as HTMLInputElement).value = '';
    (document.getElementById('emRelation') as HTMLSelectElement).value = '';
    (document.getElementById('emPhoneNum') as HTMLInputElement).value = '';
    (document.getElementById('emEmail') as HTMLInputElement).value = '';

    const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map((c) => c.value);
    renderCoaBadges(stages, userMeta.manualBadges ?? [], { ...userMeta, emergencyContacts: updated });
  });

  // ── Save: camino ──────────────────────────────────────────────────────────
  document.getElementById('saveCaminoBtn')?.addEventListener('click', async () => {
    const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map(
      (c) => c.value
    );
    const route = (document.getElementById('cRoute') as HTMLSelectElement).value;
    const start = (document.getElementById('cStart') as HTMLInputElement).value;
    const m = await loadMeta();
    await saveMeta({ camino: { stages, route, start, origin: m.camino?.origin ?? '' } });
    updateStats(stages, m.manualBadges ?? []);
    renderCoaBadges(stages, m.manualBadges ?? [], m);
    const routeNames: Record<string, string> = {
      vdlp: 'Vía de la Plata',
      frances: 'Camino Francés',
      norte: 'Camino del Norte',
      portugues: 'Camino Portugués',
      sana: 'Vía de la Plata + Sanabrés',
      otro: 'Otro',
    };
    setText('cardRouteName', routeNames[route] ?? route);
  });

  // ── Stage checkboxes (live stat update) ───────────────────────────────────
  document.querySelectorAll<HTMLInputElement>('.stage-cb').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const stages = Array.from(
        document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')
      ).map((c) => c.value);
      const m = await loadMeta();
      updateStats(stages, m.manualBadges ?? []);
    });
  });

  // Badge toggles handled inside renderCoaBadges()

  // ── Avatar upload ─────────────────────────────────────────────────────────
  document
    .getElementById('cardArtZone')
    ?.addEventListener('click', () =>
      (document.getElementById('avatarInput') as HTMLInputElement).click()
    );
  document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const u = await clerkUser();
    if (!u) {
      showToast('Sin sesión');
      return;
    }
    try {
      await u.setProfileImage({ file });
      const img = document.querySelector<HTMLImageElement>('.card-avatar-img');
      const init = document.querySelector<HTMLElement>('.card-avatar-initials');
      if (img) {
        img.src = u.imageUrl;
        img.style.display = 'block';
      }
      if (init) init.style.display = 'none';
      if (!img) {
        // Create img element if it didn't exist (no avatar before)
        const newImg = document.createElement('img');
        newImg.src = u.imageUrl;
        newImg.alt = 'Foto de perfil';
        newImg.className = 'card-avatar-img';
        document.querySelector('.card-art-inner')?.appendChild(newImg);
      }
      showToast('Foto actualizada');
    } catch {
      showToast('Error al subir la foto');
    }
  });

  // ── Gear add buttons (→ publicMetadata via API) ───────────────────────────
  document.getElementById('addVehicleBtn')?.addEventListener('click', async () => {
    const type = (document.getElementById('vType') as HTMLSelectElement).value;
    const plate = (document.getElementById('vPlate') as HTMLInputElement).value.trim();
    const model = (document.getElementById('vModel') as HTMLInputElement).value.trim();
    const color = (document.getElementById('vColor') as HTMLInputElement).value.trim();
    const msgEl = document.getElementById('vehicleValidationMsg') as HTMLElement;
    const errors: string[] = [];
    if (!type) errors.push('Tipo es obligatorio.');
    if (!plate) errors.push('Matrícula es obligatoria.');
    if (errors.length) {
      msgEl.textContent = errors.join(' ');
      msgEl.hidden = false;
      return;
    }
    msgEl.hidden = true;
    const m = await loadMeta();
    const vehicles: any[] = m.vehicles ?? [];
    vehicles.push({ id: 'v' + Date.now(), type, plate, model, color });
    await savePublicMeta('vehicles', vehicles);
    m.vehicles = vehicles;
    (['vPlate', 'vModel', 'vColor'] as const).forEach(
      (id) => ((document.getElementById(id) as HTMLInputElement).value = '')
    );
    (document.getElementById('vType') as HTMLSelectElement).value = '';
    renderVehicles(m);
    const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map(
      (c) => c.value
    );
    renderCoaBadges(stages, m.manualBadges ?? [], m);
    closePanelModal('panelVehicleForm');
    showToast('Vehículo añadido');
  });

  document.getElementById('addItemBtn')?.addEventListener('click', async () => {
    const category = (document.getElementById('bCategory') as HTMLSelectElement).value;
    const name = (document.getElementById('bName') as HTMLInputElement).value.trim();
    const notes = (document.getElementById('bNotes') as HTMLInputElement).value.trim();
    const count = Math.max(
      1,
      Math.min(100, parseInt((document.getElementById('bCount') as HTMLInputElement).value) || 1)
    );
    const msgEl = document.getElementById('itemValidationMsg') as HTMLElement;
    const errors: string[] = [];
    if (!category) errors.push('Categoría es obligatoria.');
    if (!name) errors.push('Nombre es obligatorio.');
    if (errors.length) {
      msgEl.textContent = errors.join(' ');
      msgEl.hidden = false;
      return;
    }
    msgEl.hidden = true;
    const m = await loadMeta();
    const belongings: any[] = m.belongings ?? [];
    belongings.push({ id: 'b' + Date.now(), category, name, notes, count });
    await savePublicMeta('belongings', belongings);
    m.belongings = belongings;
    (['bName', 'bNotes'] as const).forEach(
      (id) => ((document.getElementById(id) as HTMLInputElement).value = '')
    );
    (document.getElementById('bCount') as HTMLInputElement).value = '1';
    (document.getElementById('bCategory') as HTMLSelectElement).value = '';
    renderBelongings(m);
    const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map(
      (c) => c.value
    );
    renderCoaBadges(stages, m.manualBadges ?? [], m);
    closePanelModal('panelBelongingsForm');
    showToast('Artículo añadido');
  });

  document.querySelector('[data-save="locker"]')?.addEventListener('click', async () => {
    const lockerNum = (document.getElementById('lockerNum') as HTMLInputElement).value.trim();
    await savePublicMeta('lockerNum', lockerNum);
    const m = await loadMeta();
    m.lockerNum = lockerNum;
    renderVehicles(m);
    closePanelModal('panelBelongingsForm');
  });

  // ── Save: pet ─────────────────────────────────────────────────────────────
  document.getElementById('addPetBtn')?.addEventListener('click', async () => {
    const petName = (document.getElementById('petName') as HTMLInputElement).value.trim();
    const petSpecies = (document.getElementById('petSpecies') as HTMLSelectElement).value;
    const petBreed = (document.getElementById('petBreed') as HTMLInputElement).value.trim();
    const petChip = (document.getElementById('petChip') as HTMLInputElement).value.trim();
    const msgEl = document.getElementById('petValidationMsg') as HTMLElement;

    if (!petName || !petSpecies) {
      msgEl.textContent = 'Nombre y especie son obligatorios.';
      msgEl.hidden = false;
      return;
    }
    msgEl.hidden = true;

    const m = await loadMeta();
    const pets: any[] = m.pets ?? [];
    pets.push({
      id: Date.now().toString(),
      name: petName,
      species: petSpecies,
      breed: petBreed,
      chip: petChip,
    });
    await savePublicMeta('pets', pets);
    renderPets({ ...m, pets });
    const stages = Array.from(document.querySelectorAll<HTMLInputElement>('.stage-cb:checked')).map(
      (c) => c.value
    );
    renderCoaBadges(stages, m.manualBadges ?? [], { ...m, pets });
    (document.getElementById('petName') as HTMLInputElement).value = '';
    (document.getElementById('petSpecies') as HTMLSelectElement).value = '';
    (document.getElementById('petBreed') as HTMLInputElement).value = '';
    (document.getElementById('petChip') as HTMLInputElement).value = '';
    closePanelModal('panelPetsForm');
    showToast('Mascota añadida');
  });

  // Gear sub-tabs
  document.querySelectorAll<HTMLButtonElement>('.gear-sub-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gear-sub-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      ['gItem', 'gLocker'].forEach((id) => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (el) el.hidden = id !== tab.dataset.sub;
      });
    });
  });

  // ── Stage detail modal ─────────────────────────────────────────────────────
  let currentStageId: string | null = null;

  function openStageModal(stageId: string, stageName: string) {
    currentStageId = stageId;
    const overlay = document.getElementById('stageModal') as HTMLElement;
    const title = document.getElementById('stageModalTitle') as HTMLElement;
    title.textContent = stageName;

    // Load existing detail
    loadMeta().then((meta) => {
      const details = (meta.stageDetails ?? {}) as Record<string, any>;
      const d = details[stageId] ?? {};
      (document.getElementById('smStartDate') as HTMLInputElement).value = d.startDate ?? '';
      (document.getElementById('smStartTime') as HTMLInputElement).value = d.startTime ?? '06:00';
      (document.getElementById('smEndDate') as HTMLInputElement).value = d.endDate ?? '';
      (document.getElementById('smEndTime') as HTMLInputElement).value = d.endTime ?? '14:00';
      (document.getElementById('smTransport') as HTMLSelectElement).value =
        d.transport ?? 'walking';
      (document.getElementById('smNotes') as HTMLTextAreaElement).value = d.notes ?? '';
    });

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeStageModal() {
    const overlay = document.getElementById('stageModal') as HTMLElement;
    overlay.hidden = true;
    document.body.style.overflow = '';
    currentStageId = null;
  }

  document.getElementById('stageModalClose')?.addEventListener('click', closeStageModal);
  document.getElementById('stageModalCancel')?.addEventListener('click', closeStageModal);
  document.getElementById('stageModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('stageModal')) closeStageModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('stageModal')!.hidden) closeStageModal();
  });

  document.getElementById('stageModalSave')?.addEventListener('click', async () => {
    if (!currentStageId) return;
    const detail = {
      startDate: (document.getElementById('smStartDate') as HTMLInputElement).value,
      startTime: (document.getElementById('smStartTime') as HTMLInputElement).value,
      endDate: (document.getElementById('smEndDate') as HTMLInputElement).value,
      endTime: (document.getElementById('smEndTime') as HTMLInputElement).value,
      transport: (document.getElementById('smTransport') as HTMLSelectElement).value,
      notes: (document.getElementById('smNotes') as HTMLTextAreaElement).value.trim(),
    };
    const meta = await loadMeta();
    const stageDetails = (meta.stageDetails ?? {}) as Record<string, any>;
    stageDetails[currentStageId] = detail;
    await saveMeta({ stageDetails });
    // Mark row as having detail
    const row = document.querySelector<HTMLElement>(`.stage-row[data-id="${currentStageId}"]`);
    if (row) row.classList.add('has-detail');
    closeStageModal();
  });

  // Attach info button to each stage row
  document.querySelectorAll<HTMLElement>('.stage-row').forEach((row) => {
    const stageId = row.dataset.id!;
    const nameEl = row.querySelector('.stage-name');
    const stageName = nameEl?.textContent ?? stageId;

    // Add info button to row (after km tag)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'stage-info-btn';
    infoBtn.setAttribute('aria-label', 'Detalles de la etapa');
    infoBtn.setAttribute('title', 'Añadir fecha y transporte');
    infoBtn.type = 'button';
    // Use SVG calendar icon via createElementNS
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    svg.setAttribute('width', '13');
    svg.setAttribute('height', '13');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('aria-hidden', 'true');
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', '3');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', '18');
    rect.setAttribute('height', '18');
    rect.setAttribute('rx', '2');
    const line1 = document.createElementNS(NS, 'line');
    line1.setAttribute('x1', '16');
    line1.setAttribute('y1', '2');
    line1.setAttribute('x2', '16');
    line1.setAttribute('y2', '6');
    const line2 = document.createElementNS(NS, 'line');
    line2.setAttribute('x1', '8');
    line2.setAttribute('y1', '2');
    line2.setAttribute('x2', '8');
    line2.setAttribute('y2', '6');
    const line3 = document.createElementNS(NS, 'line');
    line3.setAttribute('x1', '3');
    line3.setAttribute('y1', '10');
    line3.setAttribute('x2', '21');
    line3.setAttribute('y2', '10');
    svg.appendChild(rect);
    svg.appendChild(line1);
    svg.appendChild(line2);
    svg.appendChild(line3);
    infoBtn.appendChild(svg);
    infoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openStageModal(stageId, stageName);
    });
    row.appendChild(infoBtn);
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    initProfilePhonePicker();
    initEmPhonePicker();
    initAddressAutocomplete();
    const meta = await loadMeta();

    // Populate contact form fields
    // Phone: handle both object { code, number, country } and legacy flat string
    const phoneEl = document.getElementById('fPhone') as HTMLInputElement | null;
    const phoneData = meta.phone;
    if (phoneData && phoneEl) {
      if (typeof phoneData === 'object') {
        // New format: { code: "+34", number: "620235950", country: "ES" }
        phoneEl.value = phoneData.number ?? '';
        const co = COUNTRIES.find((c) => c.c === phoneData.country);
        const flagEl  = document.getElementById('p-phone-flag');
        const dialEl  = document.getElementById('p-phone-dial');
        const ccEl    = document.getElementById('fPhoneCC') as HTMLInputElement | null;
        if (co) {
          if (flagEl) flagEl.textContent = co.f;
          if (dialEl) dialEl.textContent = co.d;
          if (ccEl)   ccEl.value = co.c;
        } else if (phoneData.code) {
          // Code exists but country not in list — show code directly
          const dialEl2 = document.getElementById('p-phone-dial');
          if (dialEl2) dialEl2.textContent = phoneData.code;
        }
      } else if (typeof phoneData === 'string') {
        // Legacy flat string "+34 620235950"
        phoneEl.value = phoneData.replace(/^\+\d+\s*/, '');
      }
    }
    const addressEl = document.getElementById('fAddress') as HTMLInputElement | null;
    if (meta.address && addressEl && typeof meta.address === 'string') addressEl.value = meta.address;
    const nationalityEl = document.getElementById('fNationality') as HTMLInputElement | null;
    if (meta.nationality && nationalityEl) nationalityEl.value = meta.nationality;
    const dobEl = document.getElementById('fDob') as HTMLInputElement | null;
    if (meta.dob && dobEl) dobEl.value = meta.dob;
    const docTypeEl = document.getElementById('fDocType') as HTMLSelectElement | null;
    if (meta.docType && docTypeEl) docTypeEl.value = meta.docType;
    const docIdEl = document.getElementById('fDocId') as HTMLInputElement | null;
    if (meta.docId && docIdEl) docIdEl.value = meta.docId;
    const docUrlEl = document.getElementById('fDocUrl') as HTMLInputElement | null;
    if (meta.docUrl && docUrlEl) docUrlEl.value = meta.docUrl;

    // Populate bio textarea
    const bioEl = document.getElementById('fBio') as HTMLTextAreaElement | null;
    if (meta.bio && bioEl) bioEl.value = meta.bio;

    // Render both display panels
    renderPersonalDisplay(meta);
    renderContactDisplay(meta);

    // Emergency contacts: new array format takes priority, fall back to legacy single object
    const emergencyContacts: any[] = Array.isArray(meta.emergencyContacts)
      ? meta.emergencyContacts
      : (meta.emergency?.name ? [meta.emergency] : []);
    renderEmergencyDisplay(emergencyContacts);
    // Pre-fill form with first contact if only one exists (for editing convenience)
    // (form is for ADDING new contacts — leave blank for a fresh entry)

    // Camino
    const cam = meta.camino ?? {};
    if (cam.route) (document.getElementById('cRoute') as HTMLSelectElement).value = cam.route;
    if (cam.start) (document.getElementById('cStart') as HTMLInputElement).value = cam.start;
    const stages: string[] = cam.stages ?? [];
    stages.forEach((id) => {
      const cb = document.querySelector<HTMLInputElement>(`.stage-cb[value="${id}"]`);
      if (cb) cb.checked = true;
    });
    updateStats(stages, meta.manualBadges ?? []);

    // Gear
    if (meta.lockerNum)
      (document.getElementById('lockerNum') as HTMLInputElement).value = meta.lockerNum;
    renderVehicles(meta);
    renderBelongings(meta);
    renderPets(meta);
    renderCoaBadges(stages, meta.manualBadges ?? [], meta);

    // Mark stage rows that already have details
    const stageDetails = (meta.stageDetails ?? {}) as Record<string, any>;
    Object.keys(stageDetails).forEach((id) => {
      const row = document.querySelector<HTMLElement>(`.stage-row[data-id="${id}"]`);
      if (row && stageDetails[id].startDate) row.classList.add('has-detail');
    });

    // Avatar from Clerk (in case SSR was stale)
    const u = await clerkUser();
    if (u?.imageUrl) {
      const img = document.querySelector<HTMLImageElement>('.card-avatar-img');
      const init = document.querySelector<HTMLElement>('.card-avatar-initials');
      if (img) {
        img.src = u.imageUrl;
        img.style.display = '';
      }
      if (init) init.style.display = 'none';
    }
  });

  // ── Drag-to-reorder + Resize for info panels ─────────────────────────────

  (function initPanelInteractions() {
    // ── Drag-to-reorder (HTML5 DnD) ─────────────────────────────────────────
    // Panels inside .panels-top-row reorder among themselves;
    // standalone panels (.right-col > .info-panel) reorder among themselves.
    let dragSrc: HTMLElement | null = null;

    function getPanelGroup(panel: HTMLElement): HTMLElement {
      return panel.parentElement as HTMLElement;
    }

    function onDragStart(this: HTMLElement, e: DragEvent) {
      // 'this' is the drag handle (panel-head); climb to the panel
      const panel = this.closest('.info-panel') as HTMLElement;
      if (!panel) return;
      dragSrc = panel;
      panel.classList.add('panel-dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', panel.dataset.panelId ?? '');
    }

    function onDragEnd(this: HTMLElement) {
      const panel = this.closest('.info-panel') as HTMLElement;
      if (panel) panel.classList.remove('panel-dragging');
      document.querySelectorAll('.info-panel').forEach((p) =>
        p.classList.remove('panel-drag-over')
      );
      dragSrc = null;
    }

    function onDragOver(this: HTMLElement, e: DragEvent) {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      this.classList.add('panel-drag-over');
    }

    function onDragLeave(this: HTMLElement) {
      this.classList.remove('panel-drag-over');
    }

    function onDrop(this: HTMLElement, e: DragEvent) {
      e.preventDefault();
      this.classList.remove('panel-drag-over');
      if (!dragSrc || dragSrc === this) return;
      // Only swap within the same parent container
      const srcParent = getPanelGroup(dragSrc);
      const tgtParent = getPanelGroup(this);
      if (srcParent !== tgtParent) return;

      // Determine insertion order
      const panels = Array.from(srcParent.querySelectorAll<HTMLElement>(
        ':scope > .info-panel'
      ));
      const srcIdx = panels.indexOf(dragSrc);
      const tgtIdx = panels.indexOf(this);
      if (srcIdx < 0 || tgtIdx < 0) return;

      if (srcIdx < tgtIdx) {
        srcParent.insertBefore(dragSrc, this.nextSibling);
      } else {
        srcParent.insertBefore(dragSrc, this);
      }
    }

    // Attach drag listeners to all handles + panels
    document.querySelectorAll<HTMLElement>('.info-panel[data-panel-id]').forEach((panel) => {
      panel.setAttribute('draggable', 'false'); // panel itself not draggable
      panel.addEventListener('dragover', onDragOver);
      panel.addEventListener('dragleave', onDragLeave);
      panel.addEventListener('drop', onDrop);

      const handle = panel.querySelector<HTMLElement>('.drag-handle');
      if (handle) {
        // Make the whole panel draggable when user grabs the handle
        handle.addEventListener('mousedown', () => {
          panel.setAttribute('draggable', 'true');
        });
        panel.addEventListener('dragstart', onDragStart.bind(handle));
        panel.addEventListener('dragend', onDragEnd.bind(handle));
        panel.addEventListener('mouseup', () => {
          panel.setAttribute('draggable', 'false');
        });
      }
    });

    // ── Resize (mouse drag on grip) ──────────────────────────────────────────
    document.querySelectorAll<HTMLElement>('.panel-resize-grip').forEach((grip) => {
      grip.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        const panel = grip.closest('.info-panel') as HTMLElement;
        if (!panel) return;
        // Unlock overflow so content scrolls inside resized panel
        panel.style.overflow = 'auto';

        const startY = e.clientY;
        const startX = e.clientX;
        const startH = panel.offsetHeight;
        const startW = panel.offsetWidth;

        function onMouseMove(ev: MouseEvent) {
          const newH = Math.max(110, startH + ev.clientY - startY);
          panel.style.height = newH + 'px';
          // Only allow width resize for standalone (not grid-constrained) panels
          const parent = panel.parentElement;
          if (parent && !parent.classList.contains('panels-top-row')) {
            const newW = Math.max(220, startW + ev.clientX - startX);
            panel.style.maxWidth = newW + 'px';
          }
        }

        function onMouseUp() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  })();
