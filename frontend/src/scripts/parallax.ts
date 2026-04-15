type ParallaxController = {
  destroy: () => void;
};

type Section = {
  el: HTMLElement;
  top: number;
  height: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function initParallax(opts?: {
  root?: HTMLElement;
  track?: HTMLElement;
}): ParallaxController {
  const root = opts?.root ?? document.documentElement;
  const track =
    opts?.track ?? document.querySelector<HTMLElement>('[data-parallax-track]') ?? document.body;

  const prevOverflow = document.documentElement.style.overflow;
  const prevBodyOverflow = document.body.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  let destroyed = false;
  let sections: Section[] = [];
  let maxY = 0;

  let y = 0;
  let targetY = 0;
  let raf = 0;
  let lastT = 0;

  const compute = () => {
    const nodes = Array.from(track.querySelectorAll<HTMLElement>('[data-parallax-section]'));
    const list = nodes.length ? nodes : [track];
    sections = list.map((el) => {
      const rect = el.getBoundingClientRect();
      return { el, top: 0, height: rect.height };
    });

    let acc = 0;
    for (const s of sections) {
      s.top = acc;
      acc += s.height;
    }

    const viewportH = Math.max(1, window.innerHeight);
    maxY = Math.max(0, acc - viewportH);
    y = clamp(y, 0, maxY);
    targetY = clamp(targetY, 0, maxY);
  };

  const apply = () => {
    track.style.willChange = 'transform';
    track.style.transform = `translate3d(0, ${-y}px, 0)`;
    root.style.setProperty('--parallax-y', String(y));

    for (const s of sections) {
      const cy = y - s.top;
      const progress = s.height > 0 ? clamp(cy / s.height, -1, 2) : 0;
      s.el.style.setProperty('--parallax-progress', String(progress));
    }

    const depthNodes = Array.from(track.querySelectorAll<HTMLElement>('[data-parallax-depth]'));
    for (const el of depthNodes) {
      const dRaw = el.getAttribute('data-parallax-depth');
      const depth = dRaw ? Number(dRaw) : 0.08;
      const dd = Number.isFinite(depth) ? depth : 0.08;
      el.style.willChange = 'transform';
      el.style.transform = `translate3d(0, ${y * dd}px, 0) translateZ(0)`;
    }
  };

  const tick = (t: number) => {
    if (destroyed) return;
    const dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    const k = 1 - Math.pow(0.001, dt);
    y = y + (targetY - y) * k;
    apply();
    raf = requestAnimationFrame(tick);
  };

  const onWheel = (e: WheelEvent) => {
    if (destroyed) return;
    const dy = e.deltaY;
    if (Math.abs(dy) < 1) return;
    e.preventDefault();
    const speed = e.deltaMode === 1 ? 38 : 1;
    targetY = clamp(targetY + dy * speed * 0.9, 0, maxY);
  };

  const onKey = (e: KeyboardEvent) => {
    if (destroyed) return;
    const step = Math.max(240, Math.floor(window.innerHeight * 0.7));
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      targetY = clamp(targetY + step, 0, maxY);
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      targetY = clamp(targetY - step, 0, maxY);
    }
    if (e.key === 'Home') {
      e.preventDefault();
      targetY = 0;
    }
    if (e.key === 'End') {
      e.preventDefault();
      targetY = maxY;
    }
  };

  const onResize = () => {
    compute();
    apply();
  };

  const ro = new ResizeObserver(() => onResize());
  ro.observe(track);

  compute();
  apply();
  raf = requestAnimationFrame(tick);

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey, { passive: false });
  window.addEventListener('resize', onResize, { passive: true });

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('wheel', onWheel as any);
    window.removeEventListener('keydown', onKey as any);
    window.removeEventListener('resize', onResize as any);
    document.documentElement.style.overflow = prevOverflow;
    document.body.style.overflow = prevBodyOverflow;
    track.style.willChange = '';
    track.style.transform = '';
    root.style.removeProperty('--parallax-y');
  };

  return { destroy };
}
