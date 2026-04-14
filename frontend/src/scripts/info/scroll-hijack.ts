type Preset = {
  id: string;
  apply: (outgoing: HTMLElement, incoming: HTMLElement, p: number, dir: number) => void;
};

class SectionManager {
  private root: HTMLElement;
  private stageEl: HTMLElement;
  private unlockScroll: () => void;
  private prefersReducedMotion: boolean;
  private presets: Preset[];
  private sections: Array<{ el: HTMLElement; n: number }>;
  private count: number;
  private currentSection: number;
  private isAnimating: boolean;
  private abort: AbortController | null;

  constructor(opts: {
    root: HTMLElement;
    stageEl: HTMLElement;
    unlockScroll: () => void;
    prefersReducedMotion: boolean;
    presets: Preset[];
    initialIndex: number;
  }) {
    this.root = opts.root;
    this.stageEl = opts.stageEl;
    this.unlockScroll = opts.unlockScroll;
    this.prefersReducedMotion = opts.prefersReducedMotion;
    this.presets = opts.presets;
    this.sections = [];
    this.count = 0;
    this.currentSection = opts.initialIndex;
    this.isAnimating = false;
    this.abort = null;

    this.sections = Array.from(this.stageEl.querySelectorAll('.ip-section'))
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .map((el) => {
        const n = Number(el.getAttribute('data-section') || '0');
        return { el, n };
      })
      .filter((s) => Number.isFinite(s.n) && s.n > 0)
      .sort((a, b) => a.n - b.n);

    this.count = this.sections.length;
    this.currentSection = clamp(this.currentSection, 0, Math.max(0, this.count - 1));

    for (const s of this.sections) {
      s.el.style.position = 'fixed';
      s.el.style.inset = '0';
      s.el.style.transformStyle = 'preserve-3d';
      s.el.style.willChange = 'transform, opacity';
      s.el.style.zIndex = String(s.n);
    }

    this.applyBase();
    this.bind();
    this.updateNav();
  }

  goTo(n: number) {
    const next = clamp(n - 1, 0, this.count - 1);
    if (next === this.currentSection) return;
    this.transitionTo(next);
  }

  next() {
    this.transitionTo(this.currentSection + 1);
  }

  prev() {
    this.transitionTo(this.currentSection - 1);
  }

  destroy() {
    this.abort?.abort();
    this.unlockScroll();
  }

  private applyBase() {
    for (let i = 0; i < this.count; i++) {
      const s = this.sections[i].el;
      const base = baseForIndex(i, this.currentSection);
      s.style.transform = base.t;
      s.style.opacity = String(base.o);
      s.style.visibility = base.v;
      s.style.pointerEvents = i === this.currentSection ? 'auto' : 'none';
      s.setAttribute('data-active', i === this.currentSection ? 'true' : 'false');
      s.style.zIndex = String(this.sections[i].n);
    }
  }

  private updateNav() {
    const buttons = Array.from(this.root.querySelectorAll<HTMLElement>('.ip-dot'));
    for (const btn of buttons) {
      const n = Number(btn.getAttribute('data-dot') || '0');
      const active = n === this.currentSection + 1;
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    }
  }

  private transitionTo(nextIndex: number) {
    if (this.isAnimating) return;
    const next = clamp(nextIndex, 0, this.count - 1);
    if (next === this.currentSection) return;

    const outgoing = this.sections[this.currentSection]?.el;
    const incoming = this.sections[next]?.el;
    if (!outgoing || !incoming) return;

    this.isAnimating = true;

    const dir = next > this.currentSection ? 1 : -1;
    const preset = this.presets[(this.currentSection + next) % this.presets.length];
    const duration = this.prefersReducedMotion ? 1 : 720;
    const startAt = performance.now();

    outgoing.style.visibility = 'visible';
    incoming.style.visibility = 'visible';
    outgoing.style.opacity = '1';
    incoming.style.opacity = '0';
    outgoing.style.pointerEvents = 'none';
    incoming.style.pointerEvents = 'none';

    outgoing.setAttribute('data-active', 'true');
    incoming.setAttribute('data-active', 'true');

    const outgoingBaseZ = outgoing.style.zIndex;
    const incomingBaseZ = incoming.style.zIndex;
    outgoing.style.zIndex = '999';
    incoming.style.zIndex = '1000';

    const tick = (now: number) => {
      const p = clamp((now - startAt) / duration, 0, 1);
      const e = this.prefersReducedMotion ? 1 : smootherStep(p);

      preset.apply(outgoing, incoming, e, dir);
      outgoing.style.opacity = String(1 - e);
      incoming.style.opacity = String(e);

      if (p < 1) requestAnimationFrame(tick);
      else {
        outgoing.style.zIndex = outgoingBaseZ;
        incoming.style.zIndex = incomingBaseZ;
        this.currentSection = next;
        this.applyBase();
        this.updateNav();
        this.isAnimating = false;
      }
    };

    requestAnimationFrame(tick);
  }

  private bind() {
    const ac = new AbortController();
    this.abort = ac;

    let wheelAccum = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (this.isAnimating) return;
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < 40) return;
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      if (dir > 0) this.next();
      else this.prev();
    };
    window.addEventListener('wheel', onWheel, { passive: false, signal: ac.signal });

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown') {
        e.preventDefault();
        this.next();
      } else if (k === 'ArrowUp' || k === 'PageUp') {
        e.preventDefault();
        this.prev();
      }
    };
    window.addEventListener('keydown', onKey, { signal: ac.signal });

    let touchStartY = 0;
    let touchStartX = 0;
    let isPinch = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        isPinch = true;
        return;
      }
      isPinch = false;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isPinch || e.touches.length > 1) return;
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (isPinch) return;
      const endY = e.changedTouches?.[0]?.clientY ?? touchStartY;
      const endX = e.changedTouches?.[0]?.clientX ?? touchStartX;
      const dy = endY - touchStartY;
      const dx = endX - touchStartX;
      if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      if (dy < 0) this.next();
      else this.prev();
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true, signal: ac.signal });
    window.addEventListener('touchmove', onTouchMove, { passive: false, signal: ac.signal });
    window.addEventListener('touchend', onTouchEnd, { passive: true, signal: ac.signal });

    const onDotClick = (e: Event) => {
      const t = e.target;
      const el = t instanceof Element ? t : null;
      const btn = el?.closest?.('.ip-dot');
      if (!(btn instanceof HTMLButtonElement)) return;
      const n = Number(btn.getAttribute('data-dot') || '0');
      if (n) this.goTo(n);
    };
    this.root.querySelector('.ip-nav')?.addEventListener('click', onDotClick, { signal: ac.signal });

    const onDestroy = () => {
      this.destroy();
    };
    window.addEventListener('pagehide', onDestroy, { once: true });
    document.addEventListener('astro:before-swap', onDestroy, { once: true });
  }
}

declare global {
  interface Window {
    __sectionManager?: any;
    __ipSectionManagers?: any[];
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smootherStep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const baseForIndex = (i: number, current: number) => {
  if (i === current) return { t: 'translateZ(0px) rotateX(0deg)', o: 1, v: 'visible' };
  if (i > current) return { t: 'translateZ(800px) rotateX(-15deg)', o: 0, v: 'hidden' };
  return { t: 'translateZ(-900px) rotateX(15deg)', o: 0, v: 'hidden' };
};

const lockScroll = (() => {
  const COUNT_KEY = '__ipScrollLockCount';
  const STATE_KEY = '__ipScrollLockState';

  return () => {
    const w = window as any;
    const prevCount = Number(w[COUNT_KEY] || 0);
    w[COUNT_KEY] = prevCount + 1;

    if (prevCount === 0) {
      w[STATE_KEY] = {
        bodyOverflow: document.body.style.overflow,
        htmlOverflow: document.documentElement.style.overflow,
      };
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      const current = Number(w[COUNT_KEY] || 0);
      const next = Math.max(0, current - 1);
      w[COUNT_KEY] = next;

      if (next === 0) {
        const state = w[STATE_KEY];
        document.body.style.overflow = state?.bodyOverflow ?? '';
        document.documentElement.style.overflow = state?.htmlOverflow ?? '';
        try {
          delete w[STATE_KEY];
        } catch {}
      }
    };
  };
})();

const presets: Preset[] = [
  {
    id: 'cube',
    apply(outgoing, incoming, p, dir) {
      const s = dir > 0 ? 1 : -1;
      outgoing.style.transform = `perspective(1600px) rotateX(${p * 78 * s}deg) translateZ(${p * -320}px)`;
      incoming.style.transform = `perspective(1600px) rotateX(${(1 - p) * -78 * s}deg) translateZ(${(1 - p) * 320}px)`;
    },
  },
  {
    id: 'wormhole',
    apply(outgoing, incoming, p, dir) {
      const z = dir > 0 ? 1 : -1;
      outgoing.style.transform = `perspective(1600px) scale(${1 + p * 1.35}) translateZ(${p * 760 * z}px) rotateY(${p * 10 * z}deg)`;
      incoming.style.transform = `perspective(1600px) scale(${(1 - p) * 0.22 + 0.78}) translateZ(${(1 - p) * -260 * z}px)`;
    },
  },
  {
    id: 'flip',
    apply(outgoing, incoming, p, dir) {
      const s = dir > 0 ? 1 : -1;
      outgoing.style.transform = `perspective(1400px) rotateY(${p * -82 * s}deg) translateZ(${p * -180}px)`;
      incoming.style.transform = `perspective(1400px) rotateY(${(1 - p) * 82 * s}deg) translateZ(${(1 - p) * 180}px)`;
    },
  },
];

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

const roots = Array.from(document.querySelectorAll('[data-scroll-hijack-root]')).filter(
  (el): el is HTMLElement => el instanceof HTMLElement
);

for (const root of roots) {
  if (root.dataset.ipInit === 'true') continue;
  const stage = root.querySelector('[data-scroll-hijack-stage]');
  if (!(stage instanceof HTMLElement)) continue;
  const initialSections = Array.from(stage.querySelectorAll('.ip-section'));
  if (initialSections.length < 2) continue;
  root.dataset.ipInit = 'true';

  const unlockScroll = lockScroll();
  const cleanup = () => unlockScroll();
  window.addEventListener('pagehide', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });

  const initialIndex = Number(root.getAttribute('data-initial') || '1') - 1;
  const manager = new SectionManager({
    root,
    stageEl: stage,
    unlockScroll,
    prefersReducedMotion,
    presets,
    initialIndex,
  });

  window.__ipSectionManagers ??= [];
  window.__ipSectionManagers.push(manager);
  window.__sectionManager = manager;
}

export {};
