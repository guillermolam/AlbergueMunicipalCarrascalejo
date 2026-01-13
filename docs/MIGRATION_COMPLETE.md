# ✅ Migration Complete: Tailwind v4 + Doodle Design System

## What's Been Done

### 1. ✅ Upgraded to Tailwind CSS v4

- **Removed**: Tailwind v3 configuration files
  - `tailwind.config.mjs` (deleted)
  - `tailwind.config.js` (deleted)
  - `postcss.config.js` (deleted)
- **Added**: Tailwind v4 with native CSS imports
  - Using `@import 'tailwindcss'` in CSS files
  - Modern CSS-first configuration approach
  - No JavaScript config needed

### 2. ✅ Added Motion Library

- Installed `motion` v11.18.2 for Solid.js animations
- Replaces Framer Motion with Solid-compatible animations
- Ready for interactive island components

### 3. ✅ Implemented Doodle Design System

Based on the exact Figma prototype specifications:

#### **Typography Classes**

- `.hand-drawn` - Shadows Into Light font
- `.sketch-title` - Cabin Sketch bold font
- Default body: Patrick Hand font

#### **Doodle Border Effects**

- `.doodle-border` - Organic, hand-drawn border radius
  ```
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px
  ```
- `.doodle-shadow` - Layered shadow effect
  ```
  box-shadow: 2px 2px rgba(0,0,0,0.2), 4px 4px rgba(0,0,0,0.1)
  ```

#### **Decorative Elements**

- `.sketch-underline` - Wavy hand-drawn underline (SVG)
- `.sketchy-bg` - Cross-hatched background pattern
- `.paper-texture` - Subtle noise/grain overlay
- `.wired-border` - Double sketchy outline (::before & ::after)
- `.squiggle-top` - Decorative wavy line above element
- `.arrow-doodle` - Hand-drawn arrow (→) after text
- `.highlight-doodle` - Yellow highlighter effect

#### **Animations**

- `.wobble` - Subtle rotation animation (3s infinite)
- `.animate-float` - Floating motion (3s ease-in-out)
- `.animate-shimmer` - Shimmer effect (1.5s infinite)
- `.animate-pulse-primary` - Primary color pulse (2s infinite)
- `.animate-bounce-in` - Bounce entrance animation
- `.animate-slide-up` - Slide up entrance
- `.animate-fade-in` - Fade in entrance

#### **Utility Classes**

- `.scrollbar-hide` - Hide scrollbars
- `.text-shadow` - Subtle text shadow
- `.text-shadow-lg` - Large text shadow
- `.bg-gradient-primary` - Extremadura green gradient
- `.bg-gradient-secondary` - Yellow gradient
- `.bg-gradient-accent` - Red accent gradient
- `.bg-gradient-blue` - Blue gradient
- `.shadow-glow` - Glowing shadow effect
- `.shadow-button` - Button-specific shadow
- `.shadow-card` - Card shadow

### 4. ✅ Extremadura Color Palette

CSS Custom Properties defined in `:root`:

```css
/* Primary - Extremadura Green */
--color-primary-main: #00ab39 --color-primary-dark: #008a2e
  --color-primary-light: #33c161 /* Secondary Colors */
  --color-secondary-yellow: #eac102 --color-secondary-red: #ed1c24
  --color-secondary-blue: #0071bc /* Semantic Colors */
  --color-success-500: #10b981 --color-warning-500: #f59e0b
  --color-error-500: #ef4444 --color-info-500: #3b82f6
  /* Neutral Palette (50-900) */ /* And many more... */;
```

### 5. ✅ Google Fonts Auto-Loaded

The following fonts are automatically imported:

- **Patrick Hand** (body text)
- **Cabin Sketch** (headings)
- **Shadows Into Light** (special accents)
- **Indie Flower** (alternative handwritten)

### 6. ✅ Project Structure

```
frontend/
├── src/
│   ├── styles/
│   │   └── global.css          ← Tailwind v4 + Doodle System
│   ├── index.css               ← Imports global.css
│   ├── components/
│   │   └── doodle/
│   │       ├── DoodleButton.astro
│   │       ├── DoodleCard.astro
│   │       ├── DoodleBadge.astro
│   │       ├── DoodleIcons.astro
│   │       ├── DoodlePattern.astro
│   │       └── index.ts
│   ├── islands/               ← Solid.js islands go here
│   ├── layouts/
│   └── pages/
├── astro.config.mjs           ← Configured for Tailwind v4
└── package.json               ← Updated dependencies
```

---

## 🚀 Next Steps

### Step 1: Start Development Server

```bash
cd frontend
pnpm dev
```

The server should start at `http://localhost:3000`

### Step 2: Build the Homepage

Now you need to recreate the Figma prototype homepage using:

1. **Static Astro Components** for non-interactive elements
2. **Solid.js Islands** for interactive elements

#### Example Homepage Structure:

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import { DoodleButton, DoodleCard } from '../components/doodle';
import ParallaxHero from '../islands/home/ParallaxHero.tsx';
---

<Layout title="Albergue Municipal Carrascalejo">
  <!-- Hero with parallax (Solid island) -->
  <ParallaxHero client:load />

  <!-- Static content with doodle styles -->
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Left Column -->
      <div class="space-y-6">
        <div class="wobble">
          <svg class="w-14 h-14 text-[#00AB39]">
            <!-- Heart icon -->
          </svg>
        </div>

        <h2 class="sketch-title text-6xl text-[#1A1A1A]">
          ¡Bienvenido!
          <div class="sketch-underline"></div>
        </h2>

        <h3 class="hand-drawn text-4xl text-[#00AB39]">
          Peregrino
        </h3>

        <p class="text-lg text-gray-700">
          Your resting place on the historic
          <span class="highlight-doodle">Vía de la Plata</span>
        </p>

        <div class="flex gap-4">
          <DoodleCard class="doodle-border doodle-shadow p-4">
            <p class="text-sm text-gray-600">Price</p>
            <p class="text-2xl font-bold text-[#00AB39]">€10</p>
            <p class="text-xs text-gray-500">/night</p>
          </DoodleCard>

          <DoodleCard class="doodle-border doodle-shadow p-4">
            <p class="text-sm text-gray-600">Beds</p>
            <p class="text-2xl font-bold text-[#00AB39]">24</p>
            <p class="text-xs text-gray-500">available</p>
          </DoodleCard>
        </div>

        <DoodleButton variant="primary" size="lg" href="/book">
          Reservar Ahora
        </DoodleButton>
      </div>

      <!-- Right Column - 3D Carousel -->
      <VisualCarousel client:visible />
    </div>
  </main>
</Layout>
```

### Step 3: Create Solid Islands for Interactivity

#### Example: ParallaxHero Island

```tsx
// src/islands/home/ParallaxHero.tsx
import { createSignal, onMount } from "solid-js";
import { Motion } from "motion/solid";

export default function ParallaxHero() {
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

  onMount(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
  });

  return (
    <Motion.div
      style={{
        transform: `translate(${mousePos().x}px, ${mousePos().y}px)`,
      }}
      class="relative h-screen"
    >
      {/* Parallax content */}
    </Motion.div>
  );
}
```

### Step 4: Reference the Figma Prototype

Copy the exact structure from:

```
docs/ux/assets/Figma/prototipo/src/components/
```

Key files to reference:

- `HomePage.tsx` - Overall structure
- `SketchyButton` component - Button animations
- `VisualAreaShowcase.tsx` - 3D carousel
- `doodle/*.tsx` - Doodle component patterns

### Step 5: Use Doodle Classes

Apply the doodle classes throughout:

```html
<!-- Hand-drawn card -->
<div class="doodle-border doodle-shadow wired-border paper-texture p-6">
  <h3 class="sketch-title">Title</h3>
  <p class="hand-drawn">Content</p>
</div>

<!-- Animated heading -->
<h1 class="sketch-title wobble">
  Albergue Municipal
  <span class="sketch-underline"></span>
</h1>

<!-- Highlighted text -->
<p>
  Welcome to the
  <span class="highlight-doodle">Camino de Santiago</span>
</p>

<!-- Floating animation -->
<div class="animate-float">
  <img src="/icon.svg" alt="Icon" />
</div>
```

---

## 📚 Key Differences from React

| React (Figma Prototype) | Astro + Solid (New)        |
| ----------------------- | -------------------------- |
| `motion/react`          | `motion/solid`             |
| `useState`              | `createSignal`             |
| `useEffect`             | `onMount` / `createEffect` |
| `React.FC`              | Plain functions            |
| All client-side         | Static + Islands           |
| `.tsx` everywhere       | `.astro` + `.tsx` islands  |

### Solid.js Quick Reference

```tsx
// State
const [count, setCount] = createSignal(0);

// Derived state
const doubled = () => count() * 2;

// Effects
createEffect(() => {
  console.log("Count changed:", count());
});

// Lifecycle
onMount(() => {
  // Component mounted
});

// JSX (almost identical to React)
return <div onClick={() => setCount(count() + 1)}>Count: {count()}</div>;
```

---

## 🎨 Design Tokens Available

### Colors (use with Tailwind)

```html
<!-- Backgrounds -->
bg-[#00AB39]
<!-- Primary green -->
bg-[#EAC102]
<!-- Yellow -->
bg-[#ED1C24]
<!-- Red -->
bg-[#0071BC]
<!-- Blue -->
bg-[#FFF9F0]
<!-- Cream background -->

<!-- Text -->
text-[#1A1A1A]
<!-- Dark text -->
text-[#00AB39]
<!-- Primary green text -->
text-gray-700
<!-- Body text -->
```

### Fonts

```html
font-['Patrick_Hand']
<!-- Body -->
font-['Cabin_Sketch']
<!-- Headings -->
font-['Shadows_Into_Light']
<!-- Accents -->
```

Or use utility classes:

```html
class="hand-drawn"
<!-- Shadows Into Light -->
class="sketch-title"
<!-- Cabin Sketch bold -->
<!-- Default is Patrick Hand -->
```

---

## 🐛 Troubleshooting

### Issue: Tailwind classes not working

**Solution**: Make sure `src/index.css` imports `src/styles/global.css`:

```css
@import "./styles/global.css";
```

### Issue: Fonts not loading

**Solution**: Fonts are auto-imported via Google Fonts in `global.css`. Check browser DevTools Network tab.

### Issue: Motion animations not working

**Solution**:

1. Use `motion/solid` not `motion/react`
2. Import `{ Motion }` from `motion/solid`
3. Use in `.tsx` files (islands), not `.astro` files

### Issue: Doodle classes not applying

**Solution**: Check that the class is in the `@layer utilities` section of `global.css`

---

## 📖 Documentation Links

- **Astro Docs**: https://docs.astro.build
- **Solid.js Docs**: https://solidjs.com
- **Motion (Solid)**: https://motion.dev/solid/quick-start
- **Tailwind v4**: https://tailwindcss.com/blog/tailwindcss-v4-alpha

---

## ✅ Checklist

- [x] Tailwind v4 installed and configured
- [x] Doodle design system CSS implemented
- [x] Extremadura color palette defined
- [x] Google Fonts loaded (Patrick Hand, Cabin Sketch, etc.)
- [x] Motion library installed for Solid.js
- [x] Project structure organized
- [x] Astro config updated
- [ ] **TODO**: Build homepage with doodle components
- [ ] **TODO**: Create Solid islands for interactivity
- [ ] **TODO**: Implement booking flow (7 steps)
- [ ] **TODO**: Build dashboard
- [ ] **TODO**: Build admin panel

---

## 🎯 Goal

Recreate the exact visual design from the Figma prototype at:
`docs/ux/assets/Figma/prototipo/`

**Key Visual Elements:**

1. ✅ Hand-drawn, sketchy aesthetics (doodle border, shadows)
2. ✅ Patrick Hand font for body text
3. ✅ Cabin Sketch bold for headings
4. ✅ Extremadura color palette (#00AB39 green)
5. ✅ Wobble and float animations
6. ✅ Paper texture backgrounds
7. ✅ Sketch underlines and squiggles
8. 🔲 Parallax scrolling (needs Solid island)
9. 🔲 3D carousel (needs Solid island)
10. 🔲 Interactive buttons with spring physics

**You're ready to start building! 🚀**

Run `pnpm dev` and begin recreating the homepage.
