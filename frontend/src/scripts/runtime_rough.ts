import rough from 'roughjs/bundled/rough.esm.js'

type Texture = 'none' | 'hachure' | 'cross-hatch'

type RoughConfig = {
  radius: number
  roughness: number
  bowing: number
  strokeWidth: number
  texture: Texture
  textureOpacity: number
  seed: number
}

const DEFAULTS: RoughConfig = {
  radius: 18,
  roughness: 2.4,
  bowing: 1.2,
  strokeWidth: 2.2,
  texture: 'hachure',
  textureOpacity: 0.12,
  seed: 7,
}

function numAttr(el: Element, name: string, fallback: number) {
  const v = el.getAttribute(name)
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strAttr<T extends string>(el: Element, name: string, fallback: T) {
  const v = el.getAttribute(name)
  return (v ? (v as T) : fallback)
}

function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  const x2 = x + w
  const y2 = y + h
  return [
    `M ${x + rr} ${y}`,
    `L ${x2 - rr} ${y}`,
    `Q ${x2} ${y} ${x2} ${y + rr}`,
    `L ${x2} ${y2 - rr}`,
    `Q ${x2} ${y2} ${x2 - rr} ${y2}`,
    `L ${x + rr} ${y2}`,
    `Q ${x} ${y2} ${x} ${y2 - rr}`,
    `L ${x} ${y + rr}`,
    `Q ${x} ${y} ${x + rr} ${y}`,
    'Z',
  ].join(' ')
}

function draw(svg: SVGSVGElement, cfg: RoughConfig) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  const rc = rough.svg(svg)
  const outline = rc.path(roundedPath(6, 6, 88, 28, cfg.radius), {
    seed: cfg.seed,
    stroke: 'currentColor',
    strokeWidth: cfg.strokeWidth,
    roughness: cfg.roughness,
    bowing: cfg.bowing,
    fill: 'transparent',
  })
  svg.appendChild(outline)
  if (cfg.texture !== 'none') {
    const fillStyle = cfg.texture === 'cross-hatch' ? 'cross-hatch' : 'hachure'
    const tex = rc.path(roundedPath(8, 8, 84, 24, Math.max(8, cfg.radius - 6)), {
      seed: cfg.seed + 1,
      stroke: 'currentColor',
      strokeWidth: 1,
      roughness: cfg.roughness + 0.6,
      bowing: cfg.bowing,
      fill: 'currentColor',
      fillStyle,
      fillWeight: 0.7,
      hachureGap: 3.2,
      hachureAngle: -35,
    })
    tex.style.opacity = String(cfg.textureOpacity)
    svg.appendChild(tex)
  }
}

function initOne(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('svg[data-rough-svg]')
  if (!svg) return
  const cfg: RoughConfig = {
    radius: numAttr(root, 'data-rough-radius', DEFAULTS.radius),
    roughness: numAttr(root, 'data-rough-roughness', DEFAULTS.roughness),
    bowing: numAttr(root, 'data-rough-bowing', DEFAULTS.bowing),
    strokeWidth: numAttr(root, 'data-rough-stroke-width', DEFAULTS.strokeWidth),
    texture: strAttr<Texture>(root, 'data-rough-texture', DEFAULTS.texture),
    textureOpacity: numAttr(root, 'data-rough-texture-opacity', DEFAULTS.textureOpacity),
    seed: numAttr(root, 'data-rough-seed', DEFAULTS.seed),
  }
  const redraw = () => draw(svg, cfg)
  redraw()
  const ro = new ResizeObserver(() => redraw())
  ro.observe(root)
  if (root.hasAttribute('data-rough-hover')) {
    root.addEventListener('pointerenter', () => {
      cfg.seed += 1
      redraw()
    })
  }
}

export function initRough(scope: ParentNode = document) {
  const nodes = Array.from(scope.querySelectorAll<HTMLElement>('[data-rough-frame]'))
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        initOne(e.target as HTMLElement)
      }
    },
    { rootMargin: '200px' }
  )
  for (const n of nodes) io.observe(n)
}
