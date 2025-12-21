# 🏠 Albergue Municipal Carrascalejo - Frontend

**Pure Astro + Tailwind v4 + Doodle Design System**

Static site generator with hand-drawn, sketchy aesthetics inspired by the Camino de Santiago.

---

## 🎯 Stack

- **Astro 5.16** - Static Site Generator (FSR - File System Routing)
- **Tailwind CSS v4** - Utility-first CSS framework
- **Motion** - Animation library (for future interactivity)
- **No TypeScript** - Pure JavaScript for simplicity
- **No frameworks** - No React, no Solid.js, no Vue
- **No stores** - No state management (yet)
- **No collections** - No content collections (yet)

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# Opens at http://localhost:3000

# Build for production
pnpm build

# Preview production build
pnpm preview
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── index.astro           ← Homepage (FSR)
│   ├── layouts/
│   │   └── Layout.astro          ← Base layout with header/footer
│   ├── components/
│   │   └── doodle/               ← Doodle design system (planned)
│   ├── styles/
│   │   └── global.css            ← Tailwind v4 + Doodle CSS
│   └── index.css                 ← Entry point (imports global.css)
├── public/                       ← Static assets (served as-is)
├── astro.config.mjs              ← Astro configuration
└── package.json                  ← Dependencies
```

---

## 🎨 Doodle Design System

Hand-drawn, sketchy aesthetics inspired by the Figma prototype.

### Typography Classes

```html
<!-- Body text (default) -->
<p>Patrick Hand font (default)</p>

<!-- Handwritten accents -->
<p class="hand-drawn">Shadows Into Light font</p>

<!-- Bold headings -->
<h1 class="sketch-title">Cabin Sketch bold font</h1>
```

### Border & Shadow Effects

```html
<!-- Organic hand-drawn border -->
<div class="doodle-border">
  <!-- border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px -->
</div>

<!-- Layered shadow effect -->
<div class="doodle-shadow">
  <!-- box-shadow: 2px 2px rgba(0,0,0,0.2), 4px 4px rgba(0,0,0,0.1) -->
</div>

<!-- Double sketchy outline -->
<div class="wired-border">
  <!-- Double ::before and ::after borders -->
</div>

<!-- Paper texture background -->
<div class="paper-texture">
  <!-- Subtle noise overlay -->
</div>
```

### Decorative Elements

```html
<!-- Wavy underline -->
<h2 class="sketch-underline">Title with squiggle</h2>

<!-- Cross-hatched background -->
<div class="sketchy-bg">Content</div>

<!-- Wavy decoration above -->
<div class="squiggle-top">Content</div>

<!-- Yellow highlighter effect -->
<p>This is <span class="highlight-doodle">highlighted</span></p>

<!-- Hand-drawn arrow after text -->
<span class="arrow-doodle">Click here</span>
```

### Animations

```html
<!-- Subtle rotation wobble -->
<div class="wobble">Icon or logo</div>

<!-- Floating motion -->
<div class="animate-float">Floating element</div>

<!-- Shimmer effect -->
<div class="animate-shimmer">Loading...</div>

<!-- Pulse primary color -->
<button class="animate-pulse-primary">Button</button>

<!-- Bounce entrance -->
<div class="animate-bounce-in">New content</div>

<!-- Slide up entrance -->
<div class="animate-slide-up">Content</div>

<!-- Fade in entrance -->
<div class="animate-fade-in">Content</div>
```

### Utilities

```html
<!-- Hide scrollbar -->
<div class="scrollbar-hide overflow-auto">
  Scrollable content without scrollbar
</div>

<!-- Text shadows -->
<p class="text-shadow">Subtle shadow</p>
<p class="text-shadow-lg">Large shadow</p>

<!-- Gradients -->
<div class="bg-gradient-primary">Green gradient</div>
<div class="bg-gradient-secondary">Yellow gradient</div>
<div class="bg-gradient-accent">Red gradient</div>
<div class="bg-gradient-blue">Blue gradient</div>

<!-- Shadows -->
<div class="shadow-glow">Glowing shadow</div>
<div class="shadow-button">Button shadow</div>
<div class="shadow-card">Card shadow</div>
```

---

## 🎨 Color Palette

### Extremadura Official Colors

```css
/* Primary - Green */
#00AB39  /* Main brand color */
#008A2E  /* Dark variant */
#33C161  /* Light variant */

/* Secondary Colors */
#EAC102  /* Yellow */
#ED1C24  /* Red */
#0071BC  /* Blue */

/* Backgrounds */
#FFF9F0  /* Cream/paper background */
#FFFFFF  /* White */
```

### Using Colors in Tailwind

```html
<!-- Backgrounds -->
<div class="bg-[#00AB39]">Green background</div>
<div class="bg-[#EAC102]">Yellow background</div>
<div class="bg-[#FFF9F0]">Cream background</div>

<!-- Text -->
<p class="text-[#00AB39]">Green text</p>
<p class="text-[#1A1A1A]">Dark text</p>
<p class="text-gray-700">Body text</p>

<!-- Borders -->
<div class="border-2 border-[#00AB39]">Green border</div>
```

---

## 🔤 Fonts

Automatically loaded from Google Fonts (via `global.css`):

1. **Patrick Hand** - Body text (default)
2. **Cabin Sketch** - Headings (bold)
3. **Shadows Into Light** - Handwritten accents
4. **Indie Flower** - Alternative handwritten

---

## 📄 Creating New Pages

Astro uses **File System Routing (FSR)**:

```
src/pages/
├── index.astro              → /
├── about.astro              → /about
├── contact.astro            → /contact
├── blog/
│   ├── index.astro          → /blog
│   └── [slug].astro         → /blog/my-post
└── book/
    └── [...step].astro      → /book/1, /book/2, etc.
```

### Example Page

```astro
---
// src/pages/about.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="About Us">
  <main class="max-w-4xl mx-auto px-4 py-12">
    <h1 class="sketch-title text-4xl text-[#1A1A1A] mb-6">
      About Our Albergue
      <div class="sketch-underline"></div>
    </h1>
    
    <div class="doodle-border doodle-shadow wired-border paper-texture bg-white p-8">
      <p class="text-lg text-gray-700 leading-relaxed">
        Welcome to our humble pilgrim hostel on the 
        <span class="highlight-doodle">Vía de la Plata</span>.
      </p>
    </div>
  </main>
</Layout>
```

---

## 🧩 Creating Components

```astro
---
// src/components/Button.astro
const { text, href, variant = 'primary' } = Astro.props;

const variants = {
  primary: 'bg-[#00AB39] text-white hover:bg-[#008A2E]',
  secondary: 'bg-[#EAC102] text-[#1A1A1A] hover:bg-[#FFD700]',
};
---

<a
  href={href}
  class={`doodle-border doodle-shadow px-8 py-3 inline-block font-bold hover:scale-105 transition-all ${variants[variant]}`}
>
  <span class="sketch-title">{text}</span>
</a>
```

Usage:

```astro
---
import Button from '../components/Button.astro';
---

<Button text="Reservar" href="/book" variant="primary" />
```

---

## 🛠️ Available Scripts

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Build for production (outputs to dist/)
pnpm preview      # Preview production build
pnpm clean        # Clean cache and build artifacts
pnpm format       # Format code with Prettier
```

---

## 🌐 Deployment

The site is **fully static** (no server needed):

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Option 2: Netlify
```bash
# Build command: pnpm build
# Publish directory: dist
```

### Option 3: Static Hosting
```bash
pnpm build
# Upload contents of dist/ folder to any static host
```

---

## 📚 Documentation

- **Astro**: https://docs.astro.build
- **Tailwind v4**: https://tailwindcss.com/blog/tailwindcss-v4-alpha
- **Motion**: https://motion.dev

---

## 🎯 Design Reference

Original Figma prototype:
```
docs/ux/assets/Figma/prototipo/
```

Key visual elements implemented:
- ✅ Hand-drawn doodle borders
- ✅ Patrick Hand & Cabin Sketch fonts
- ✅ Extremadura color palette (#00AB39 green)
- ✅ Wobble and float animations
- ✅ Paper texture backgrounds
- ✅ Sketch underlines and squiggles
- ✅ Yellow highlighter effect
- ✅ Organic border radius
- ✅ Layered shadows

---

## 🔮 Future Enhancements

Once the static site is working:

1. **Add interactivity** with Motion library
2. **Add TypeScript** for type safety
3. **Add stores** (nanostores) for state management
4. **Add content collections** for blog/legal pages
5. **Add i18n** for multi-language support
6. **Add API routes** for booking system
7. **Add database** integration (Supabase)

---

## 🐛 Troubleshooting

### Issue: Tailwind classes not working
**Solution**: Ensure `src/index.css` imports `src/styles/global.css`:
```css
@import './styles/global.css';
```

### Issue: Fonts not loading
**Solution**: Check browser DevTools → Network tab. Fonts are loaded from Google Fonts CDN via CSS import in `global.css`.

### Issue: Doodle classes not applying
**Solution**: Check that the class exists in `src/styles/global.css` under the `@layer utilities` section.

### Issue: Dev server won't start
**Solution**: 
```bash
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

---

## 📝 Notes

- **Pure static HTML** - No JavaScript required for rendering
- **Progressive enhancement** - Add interactivity later with Motion
- **Zero-config** - Works out of the box
- **Fast builds** - Static generation is instant
- **SEO-friendly** - All content in HTML (no hydration needed)

---

**Built with ❤️ for the Camino de Santiago** 🥾