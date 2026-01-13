# Runtime Scripts

This directory contains small client-side runtime modules used for progressive enhancement.

## Entry point

- `runtime.ts` boots Alpine and initializes the other runtime modules.

The runtime is loaded from layouts:

- `src/layouts/Layout.astro`
- `src/layouts/BaseLayout.astro`

## Data-\* contracts

### RoughJS islands (`runtime_rough.ts`)

Components using RoughJS should include these data attributes:

- `data-rough-frame` - Marks the container element for RoughJS initialization
- `svg[data-rough-svg]` - SVG element inside the container that will receive the rough drawing
- `data-rough-radius` - Corner radius (default: 18)
- `data-rough-roughness` - Roughness level (default: 2.4)
- `data-rough-bowing` - Bowing amount (default: 1.2)
- `data-rough-stroke-width` - Stroke width (default: 2.2)
- `data-rough-texture` - Texture type: `none` | `hachure` | `cross-hatch` (default: `hachure`)
- `data-rough-texture-opacity` - Texture opacity (default: 0.12)
- `data-rough-seed` - Random seed for consistent rendering (default: 7)
- `data-rough-hover` - Enable hover redrawing with new seed

Example:

```html
<div data-rough-frame data-rough-texture="cross-hatch" data-rough-hover>
  <svg data-rough-svg width="100" height="40"></svg>
</div>
```

### Nano Stores bridge (`runtime_stores_bridge.ts`)

Elements can bind to stores and trigger actions:

- `data-store="dailyGoalKm"`
- `data-store="stageProgress"`
- `data-store="remainingDays"`

Actions:

- `data-action="goal:inc" | "goal:dec" | "stage:inc" | "stage:dec" | "progress:sync"`

Example:

```html
<span data-store="dailyGoalKm">25</span>
<button data-action="goal:inc">Increase Goal</button>
<button data-action="progress:sync">Sync Progress</button>
```

## Runtime behavior

- Non-blocking initialization (`queueMicrotask`, `requestAnimationFrame`, `requestIdleCallback` when
  available)
- RoughJS initializes when elements are visible (IntersectionObserver)
- Idempotent init functions
