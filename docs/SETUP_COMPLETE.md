# ✅ SETUP COMPLETE - Pure Astro + Tailwind v4

## 🎉 What's Ready

Your frontend is now a **pure static site generator** with the Figma doodle design system.

### Stack (Simplified)

- ✅ **Astro 5.16** - Static site generator
- ✅ **Tailwind CSS v4** - Via Vite plugin (no PostCSS)
- ✅ **Motion** - Animation library (installed, ready to use)
- ✅ **Doodle Design System** - All CSS classes from Figma
- ❌ **No TypeScript** - Pure JavaScript
- ❌ **No React/Solid** - Pure Astro components
- ❌ **No stores** - Not needed yet
- ❌ **No collections** - Not needed yet

---

## 🚀 Start Working

```bash
cd frontend
pnpm dev
# Opens at http://localhost:3000
```

You should see a working homepage with:

- Hand-drawn aesthetics
- Doodle borders and shadows
- Patrick Hand & Cabin Sketch fonts
- Extremadura green color palette (#00AB39)
- Wobble animations
- Paper texture backgrounds

---

## 📁 Key Files

### 1. `src/pages/index.astro`

The homepage - **pure Astro, no frameworks**

- Hero section with "¡Bienvenido Peregrino!"
- Info cards (€10/night, 24 beds)
- Features grid
- Services section
- CTA section

### 2. `src/layouts/Layout.astro`

Base layout with:

- Fixed language selector (top-right)
- Sticky header with logo
- Footer with 3 columns
- All pure HTML, no JS

### 3. `src/styles/global.css`

**Complete doodle design system:**

- All Tailwind v4 utilities
- Custom doodle classes (.doodle-border, .sketch-underline, etc.)
- Animations (.wobble, .animate-float, etc.)
- Color palette (CSS custom properties)
- Google Fonts import

### 4. `src/index.css`

Entry point - just imports global.css

### 5. `astro.config.mjs`

Minimal config:

- Static output
- Tailwind v4 via Vite plugin
- Path aliases (@/components, @/layouts, etc.)

---

## 🎨 Using Doodle Classes

### Example Component

```astro
---
// src/components/InfoCard.astro
const { title, value, subtitle } = Astro.props;
---

<div class="doodle-border doodle-shadow wired-border paper-texture bg-white p-4 hover:scale-105 transition-transform">
  <p class="text-xs text-gray-600 uppercase">{title}</p>
  <p class="text-3xl font-bold text-[#00AB39]">{value}</p>
  <p class="text-xs text-gray-500">{subtitle}</p>
</div>
```

Usage:

```astro
---
import InfoCard from '../components/InfoCard.astro';
---

<InfoCard title="Price" value="€10" subtitle="/night" />
```

### Example Button

```astro
<a
  href="/book"
  class="doodle-border doodle-shadow bg-[#00AB39] text-white px-8 py-3 font-bold hover:bg-[#008A2E] hover:scale-105 hover:rotate-[-2deg] transition-all inline-block"
>
  <span class="sketch-title">Reservar Ahora</span>
</a>
```

---

## 🎨 Complete Doodle Class Reference

### Typography

```html
<p>Default (Patrick Hand)</p>
<p class="hand-drawn">Shadows Into Light</p>
<h1 class="sketch-title">Cabin Sketch bold</h1>
```

### Borders & Shadows

```html
<div class="doodle-border">Organic rounded borders</div>
<div class="doodle-shadow">Layered shadow effect</div>
<div class="wired-border">Double sketchy outline</div>
<div class="paper-texture">Subtle noise overlay</div>
```

### Decorations

```html
<h2 class="sketch-underline">Wavy underline</h2>
<div class="sketchy-bg">Cross-hatched pattern</div>
<div class="squiggle-top">Wavy decoration above</div>
<span class="highlight-doodle">Yellow highlighter</span>
<span class="arrow-doodle">Text with arrow →</span>
```

### Animations

```html
<div class="wobble">Subtle rotation</div>
<div class="animate-float">Floating motion</div>
<div class="animate-shimmer">Shimmer effect</div>
<div class="animate-bounce-in">Bounce entrance</div>
<div class="animate-slide-up">Slide up entrance</div>
<div class="animate-fade-in">Fade entrance</div>
```

### Utilities

```html
<div class="scrollbar-hide">Hide scrollbar</div>
<p class="text-shadow">Subtle shadow</p>
<p class="text-shadow-lg">Large shadow</p>
<div class="bg-gradient-primary">Green gradient</div>
<div class="shadow-glow">Glowing shadow</div>
```

---

## 🎨 Color Palette

### Extremadura Colors

```css
#00AB39  /* Primary green */
#008A2E  /* Dark green */
#33C161  /* Light green */
#EAC102  /* Yellow */
#ED1C24  /* Red */
#0071BC  /* Blue */
#FFF9F0  /* Cream background */
#1A1A1A  /* Dark text */
```

### Usage in HTML

```html
<div class="bg-[#00AB39]">Green background</div>
<p class="text-[#00AB39]">Green text</p>
<div class="border-[#00AB39]">Green border</div>
```

---

## 📄 Adding New Pages

Just create `.astro` files in `src/pages/`:

```astro
---
// src/pages/about.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="About">
  <main class="max-w-4xl mx-auto px-4 py-12">
    <h1 class="sketch-title text-4xl text-[#1A1A1A]">
      About Us
      <div class="sketch-underline"></div>
    </h1>

    <div class="doodle-border doodle-shadow bg-white p-8 mt-6">
      <p class="text-lg text-gray-700">
        Content here...
      </p>
    </div>
  </main>
</Layout>
```

File system routing:

- `src/pages/index.astro` → `/`
- `src/pages/about.astro` → `/about`
- `src/pages/contact.astro` → `/contact`
- `src/pages/blog/[slug].astro` → `/blog/my-post`

---

## 🔧 Common Tasks

### Add a new section to homepage

1. Open `src/pages/index.astro`
2. Add HTML with doodle classes
3. Save and refresh browser

### Create a reusable component

1. Create `src/components/MyComponent.astro`
2. Import and use in pages

```astro
---
import MyComponent from '../components/MyComponent.astro';
---

<MyComponent />
```

### Change colors globally

1. Open `src/styles/global.css`
2. Edit `:root` CSS variables
3. All pages update automatically

### Add custom animations

1. Open `src/styles/global.css`
2. Add keyframes in `@keyframes` section
3. Create utility class in `@layer utilities`

---

## 🏗️ Build & Deploy

```bash
# Build static site
pnpm build

# Output in dist/ folder
# Upload to any static host:
# - Vercel
# - Netlify
# - GitHub Pages
# - Cloudflare Pages
# - AWS S3
# - Any HTTP server
```

---

## 📚 Next Steps

### Immediate (Pure Static)

1. ✅ Homepage is done - add more content
2. ⬜ Create `/book` page (booking form)
3. ⬜ Create `/info` page (albergue info)
4. ⬜ Create `/dashboard` page (user bookings)
5. ⬜ Create `/admin` page (admin panel)
6. ⬜ Create legal pages (privacy, terms, cookies)

### Later (Add Interactivity)

1. Add Motion animations (already installed)
2. Add JavaScript for form validation
3. Add API routes (Astro API endpoints)
4. Add database (Supabase integration)
5. Add authentication (better-auth)
6. Add i18n (multi-language)
7. Consider TypeScript for type safety

---

## 📖 Documentation

- **Astro Docs**: https://docs.astro.build
- **Tailwind v4**: https://tailwindcss.com/docs
- **Figma Reference**: `docs/ux/assets/Figma/prototipo/`
- **Full Doodle Guide**: See `README.md`

---

## 🎯 Design Checklist

From the Figma prototype, we have:

- ✅ Hand-drawn doodle borders (`.doodle-border`)
- ✅ Patrick Hand font (body text)
- ✅ Cabin Sketch font (headings)
- ✅ Extremadura green (#00AB39)
- ✅ Wobble animations (`.wobble`)
- ✅ Paper texture (`.paper-texture`)
- ✅ Sketch underlines (`.sketch-underline`)
- ✅ Yellow highlighter (`.highlight-doodle`)
- ✅ Layered shadows (`.doodle-shadow`)
- ✅ Organic borders (`.wired-border`)

---

## 🐛 Troubleshooting

### Dev server won't start

```bash
cd frontend
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Styles not applying

Check that `src/index.css` imports `src/styles/global.css`:

```css
@import "./styles/global.css";
```

### Fonts not loading

Fonts are loaded from Google Fonts CDN. Check browser Network tab.

---

## ✅ Success Criteria

You should now have:

1. ✅ Working dev server at `http://localhost:3000`
2. ✅ Homepage with hand-drawn aesthetics
3. ✅ All doodle CSS classes available
4. ✅ No TypeScript errors (because no TypeScript!)
5. ✅ No React/Solid dependencies
6. ✅ Clean, simple codebase
7. ✅ Fast builds (static HTML)
8. ✅ Easy to understand and modify

---

## 🎉 You're Ready!

Start building pages with pure Astro and the doodle design system.

**Everything is static HTML + CSS. No frameworks needed.** 🚀

Just create `.astro` files, use the doodle classes, and you're done.

---

**Questions?**

- Check `README.md` for detailed component examples
- Check `src/styles/global.css` for all available classes
- Check `src/pages/index.astro` for real-world usage examples

**Happy coding!** 🏠 ☘️
