export type SectionActiveController = {
  /** Programmatically set data-active (string "true"/"false") on the root. */
  setActive: (active: boolean) => void;
  /** Current interpreted active state. */
  isActive: () => boolean;
  /** Stop observers and cleanup. */
  destroy: () => void;
};

function readActive(root: HTMLElement) {
  const v = root.getAttribute('data-active');
  if (v == null) return false;
  return v === '' || v === 'true' || v === '1';
}

export function attachSectionActive(
  root: HTMLElement,
  opts: {
    /**
     * If true, IntersectionObserver keeps data-active in sync with visibility.
     * Still uses data-active as the single source of truth for start/stop.
     */
    auto?: boolean;
    threshold?: number;
    rootMargin?: string;
    onChange: (active: boolean) => void;
  }
): SectionActiveController {
  const threshold = opts.threshold ?? 0.18;
  const rootMargin = opts.rootMargin ?? '200px 0px';

  let destroyed = false;
  let last = readActive(root);

  const emitIfChanged = () => {
    const next = readActive(root);
    if (next === last) return;
    last = next;
    opts.onChange(next);
  };

  const mo = new MutationObserver(() => emitIfChanged());
  mo.observe(root, { attributes: true, attributeFilter: ['data-active'] });

  let io: IntersectionObserver | null = null;
  if (opts.auto) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target !== root) continue;
          root.setAttribute('data-active', e.isIntersecting ? 'true' : 'false');
        }
      },
      { threshold, rootMargin }
    );
    io.observe(root);
  }

  // Initial call (so scenes can lazy-init when mounted already visible).
  queueMicrotask(() => {
    if (destroyed) return;
    opts.onChange(last);
  });

  return {
    setActive(active) {
      root.setAttribute('data-active', active ? 'true' : 'false');
    },
    isActive() {
      return last;
    },
    destroy() {
      destroyed = true;
      mo.disconnect();
      io?.disconnect();
      io = null;
    },
  };
}

export function createRafLoop(cb: (dt: number, t: number) => void) {
  let raf = 0;
  let running = false;
  let last = 0;

  const tick = (t: number) => {
    if (!running) return;
    const dt = last ? (t - last) / 1000 : 0;
    last = t;
    cb(dt, t);
    raf = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    get running() {
      return running;
    },
  };
}

