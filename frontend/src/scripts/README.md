# Runtime Scripts

This directory contains the base runtime foundation for Astro islands with UnoCSS, RoughJS, AlpineJS, and Nano Stores.

## Data-* Contract Conventions

### RoughJS Islands (`runtime_rough.ts`)

Components using RoughJS should include these data attributes:

- `data-rough-frame` - Marks the container element for RoughJS initialization
- `svg[data-rough-svg]` - SVG element inside the container that will receive the rough drawing
- `data-rough-radius` - Corner radius (default: 18)
- `data-rough-roughness` - Roughness level (default: 2.4)
- `data-rough-bowing` - Bowing amount (default: 1.2)
- `data-rough-stroke-width` - Stroke width (default: 2.2)
- `data-rough-texture` - Texture type: 'none' | 'hachure' | 'cross-hatch' (default: 'hachure')
- `data-rough-texture-opacity` - Texture opacity (default: 0.12)
- `data-rough-seed` - Random seed for consistent rendering (default: 7)
- `data-rough-hover` - Enable hover redrawing with new seed

Example:
```html
<div data-rough-frame data-rough-texture="cross-hatch" data-rough-hover>
  <svg data-rough-svg width="100" height="40"></svg>
</div>
```

### Nano Stores Bridge (`runtime_stores_bridge.ts`)

Elements can bind to stores and trigger actions:

- `data-store="storeName"` - Binds element text content to store value
  - Available stores: `dailyGoalKm`, `stageProgress`, `remainingDays`

- `data-action="actionName"` - Defines clickable action
  - Available actions: `goal:inc`, `goal:dec`, `stage:inc`, `stage:dec`, `progress:sync`

Example:
```html
<span data-store="dailyGoalKm">25</span>
<button data-action="goal:inc">Increase Goal</button>
<button data-action="progress:sync">Sync Progress</button>
```

## Architecture

- **Non-blocking initialization**: Uses `queueMicrotask`, `requestAnimationFrame`, `requestIdleCallback`
- **IntersectionObserver**: RoughJS islands initialize when visible (+200px margin)
- **ResizeObserver**: RoughJS islands redraw on container resize
- **Event delegation**: All store actions use passive event listeners
- **Idempotent**: Safe to call init functions multiple times

## Usage

The runtime is automatically loaded from the main layout. All initialization happens after DOMContentLoaded to ensure SSR compatibility.