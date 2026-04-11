# Figma Site Animation & Interaction Specification
# Source: https://curve-swoop-02687575.figma.site/
# Captured: 2026-04-05

This document captures every animation, micro-interaction, transition, hover effect, click effect,
and scroll-triggered animation observed in the Figma prototype of the Albergue Municipal Carrascalejo site.

---

## Technology Stack (from Figma site)

- **Animation library**: Framer Motion (React)
- **CSS framework**: Tailwind CSS v4.1.12
- **Fonts**: Indie Flower, Patrick Hand, Shadows Into Light, Cabin Sketch (all from Google Fonts)
- **UI library**: Lucide React (icons)
- **Runtime**: Figma Sites Runtime + React + React Router

---

## CSS @keyframes Definitions

```css
/* 1. Wobble - used on logo and other elements */
@keyframes wobble {
  0%, to { transform: rotate(0); }
  25% { transform: rotate(0.5deg); }
  75% { transform: rotate(-0.5deg); }
}
/* Usage: .wobble { animation: 3s ease-in-out infinite wobble; } */

/* 2. Spin - continuous rotation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 3. Pulse - opacity fade */
@keyframes pulse {
  50% { opacity: 0.5; }
}

/* 4. Enter - animate-in (modal/element entrance) */
@keyframes enter {
  0% {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0)
               scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))
               rotate(var(--tw-enter-rotate, 0));
    filter: blur(var(--tw-enter-blur, 0));
  }
}

/* 5. Exit - animate-out (modal/element exit) */
@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0)
               scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1))
               rotate(var(--tw-exit-rotate, 0));
    filter: blur(var(--tw-exit-blur, 0));
  }
}

/* 6. Accordion Down */
@keyframes accordion-down {
  0% { height: 0; }
  to { height: var(--radix-accordion-content-height, auto); }
}

/* 7. Accordion Up */
@keyframes accordion-up {
  0% { height: var(--radix-accordion-content-height, auto); }
  to { height: 0; }
}

/* 8. Caret Blink - for form inputs */
@keyframes caret-blink {
  0%, 70%, to { opacity: 1; }
  20%, 50% { opacity: 0; }
}
/* Usage: .animate-caret-blink { animation: 1.25s ease-out infinite caret-blink; } */

/* Special inline style on carousel */
.perspective-1000 {
  perspective: 1000px;
}
```

---

## Component Animations (Framer Motion)

### 1. Header / Nav Bar

**Trigger**: Page load
**Animation**: Slide down from above + fade in
```js
initial: { y: -100, opacity: 0 }
animate: { y: 0, opacity: 1 }
transition: { type: "spring", stiffness: 100 }
```
**Element**: `<header>` — sticky, `bg-white/80 backdrop-blur-md`

---

### 2. Logo Image (Header)

**Trigger**: Always-on (continuous loop)
**Animation**: Gentle wobble — rotate left-right + float up-down
```js
animate: { rotate: [0, 4, -4, 0], y: [0, -2, 0] }
transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
```
**Hover**: `whileHover: { scale: 1.03 }` (on the logo+text group)
**Tap**: `whileTap: { scale: 0.97 }`

**Logo source**: `/_assets/v11/6340c39809bbb6dce9c21e3fed2ac80a388b79b7.png`
**Local copy**: `/frontend/public/logos/logo.png` (110x109px PNG)

---

### 3. Language Pill ("Español" button)

**Trigger**: Hover
**Animation (CSS)**: Background fill transition (white → #00AB39), text/icon color flip
```css
/* SVG rect inside: */
className="transition-all group-hover:fill-[#00AB39]"
/* Icon + text: */
className="text-[#00AB39] group-hover:text-white transition-colors"
```
**Framer Motion**: `whileHover: { scale: 1.05 }`, `whileTap: { scale: 0.95 }`

**Green dot badge** on pill (top-right corner):
```js
animate: { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }
transition: { duration: 2, repeat: Infinity }
```

**Dropdown sparkle corners** (when open):
```js
animate: { rotate: [0, 180, 360], scale: [1, 1.15, 1] }
transition: { duration: 3, repeat: Infinity, delay: s * 0.5 }
```

**Dropdown items (language options)**:
```js
initial: { opacity: 0, x: -10 }
animate: { opacity: 1, x: 0 }
transition: { delay: index * 0.05 }
whileHover: { x: 3 }
```

**Active language indicator** (animated bar):
```js
layoutId: "activeLanguage"
transition: { type: "spring", stiffness: 300, damping: 30 }
```

**Selected language checkmark**:
```js
initial: { scale: 0, rotate: -180 }
animate: { scale: 1, rotate: 0 }
transition: { type: "spring", stiffness: 300, damping: 20 }
```

---

### 4. Entrar / Sign In Pill (Nav button)

**Trigger**: Hover
**Animation (CSS)**: Background fill + text color transition
```css
className="transition-all group-hover:fill-[#00AB39]"
className="group-hover:text-white transition-colors"
```
**Framer Motion**: `whileHover: { scale: 1.05 }`, `whileTap: { scale: 0.95 }`

**Green dot badge** (top-right, pulsing):
```js
animate: { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }
transition: { duration: 2, repeat: Infinity }
```

---

### 5. Background Particles (Hero section)

**Trigger**: Always-on, randomized positions
**Count**: 15 circles
**Animation**: Continuous slow rotation + subtle scale pulse
```js
animate: { rotate: [0, 360], scale: [1, 1.15, 1] }
transition: {
  duration: 12 + Math.random() * 8,  // 12-20s
  repeat: Infinity,
  delay: Math.random() * 3           // 0-3s random delay
}
```
**Element**: `opacity-10` SVG circles (alternating #00AB39 / #1A1A1A stroke), `fixed inset-0 -z-10`

---

### 6. Heart Icon (Hero)

**Trigger**: Always-on
**Animation**: Float + wobble (y-bounce + rotation)
```js
animate: { y: [0, -12, 0], rotate: [0, 8, -8, 0] }
transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
```
**Element**: Lucide Heart icon, `w-10 h-10 md:w-14 md:h-14 text-[#00AB39]`, filled green

---

### 7. "¡Bienvenido!" Title

**Trigger**: Page load (once)
```js
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { delay: 0.3 }
```
Font: Shadows Into Light, cursive

**Wave underline** beneath title:
```js
initial: { pathLength: 0 }
animate: { pathLength: 1 }
transition: { duration: 1, delay: 0.5 }
// SVG path: "M0,2 Q25,0 50,2 T100,2" stroke #00AB39
```

---

### 8. "Peregrino" Subtitle

**Trigger**: Page load (once)
```js
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { delay: 0.4 }
```
Font: Cabin Sketch, cursive, color #00AB39

---

### 9. Wave Divider (U6 component)

**Trigger**: Page load (once), configurable delay
**Animation**: SVG path drawing animation
```js
// U6({ delay: 0.6 }) called after Peregrino subtitle
initial: { pathLength: 0, opacity: 0 }
animate: { pathLength: 1, opacity: 0.6 }
transition: { duration: 1.5, delay: 0.6 }
// SVG path: "M0,2 Q10,0 20,2 T40,2 T60,2 T80,2 T100,2" stroke #00AB39
```

---

### 10. Hero Body Text

**Trigger**: Page load (once)
```js
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { delay: 0.5 }
```

---

### 11. Stat Boxes (€10 PRICE / 24 BEDS)

**Trigger**: Page load (entrance) + Always-on (float loop)

**Entrance animation**:
```js
initial: { opacity: 0, scale: 0.8 }
animate: {
  opacity: 1,
  scale: 1,
  y: [0, -5, 0],
  rotateZ: [0, -1.5, 0]   // box 0: -1.5deg, box 1: +1.5deg
}
transition: {
  opacity: { delay: 0.7 + index * 0.1 },
  scale: { delay: 0.7 + index * 0.1 },
  y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 },
  rotateZ: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }
}
```

**Hover**: `whileHover: { scale: 1.05, y: -7 }`

**Drop shadow animation** (SVG shadow rect below):
```js
animate: { y: [2, 4, 2], opacity: [0.08, 0.12, 0.08] }
transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
```

**Border stroke color animation** (animated SVG rect border):
```js
animate: { stroke: ["#1A1A1A", "#00AB39", "#1A1A1A"] }
transition: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }
```

**Stat value text** (scale pulse):
```js
animate: { scale: [1, 1.04, 1] }
transition: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.6 }
```

**Green dot** (top-right corner of each stat box):
```js
animate: { scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }
transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
```

---

### 12. "Start Booking Now" Button (M1 component, emphasis=true)

**Always-on idle animation** (gentle rock):
```js
animate: {
  rotateZ: [0, -1, 1, -1, 0],
  y: [0, -2, 0]
}
transition: {
  rotateZ: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
}
```

**Hover** (emphasis button):
```js
whileHover: { scale: 1.08, rotateZ: -5, y: -4 }
```

**Hover** (non-emphasis button, e.g. "Tell me more"):
```js
whileHover: { scale: 1.05, rotateZ: -2, y: -4 }
```

**Tap**: `whileTap: { scale: 0.95 }`

**Shadow elevation on hover** (SVG blur shadow):
```js
// idle: { y: 3, opacity: 0.15 }
// hovered: { y: 6, opacity: 0.3 }
```

**Background color on hover** (SVG rect inside button):
```js
// idle: { fill: "#00AB39" }
// hovered: { fill: "#00C843" }
```

**Button border**: black stroke, hand-drawn sketchy look via SVG rect with `rx: 10`, `strokeWidth: 2.5`

---

### 13. Feature List Items (below CTA button)

**Trigger**: Page load (staggered)
```js
// List wrapper:
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { delay: 1 }

// Each item:
initial: { opacity: 0, x: -15 }
animate: { opacity: 1, x: 0 }
transition: { delay: 1.1 + index * 0.1 }
whileHover: { x: 3 }
```

**Icon circle on each item**:
```js
whileHover: { scale: 1.15, rotate: 360 }
transition: { type: "spring", stiffness: 300 }
```

---

### 14. Carousel Frame (L6 component) — 3D Mouse Parallax

**Trigger**: Mouse move over carousel
**Type**: Real-time 3D perspective tilt
```js
// Container:
style: { transformStyle: "preserve-3d", rotateY: springX, rotateX: springY }
// Spring config:
useSpring(0, { stiffness: 150, damping: 20 })
// Mouse tracking:
rotateY = ((clientX - frameLeft) / frameWidth - 0.5) * 20  // ±10deg
rotateX = ((clientY - frameTop) / frameHeight - 0.5) * 20  // ±10deg
// Container class:
className="perspective-1000"  // perspective: 1000px
```
**On mouse leave**: Springs back to 0,0

**Background image** (parallax within frame):
```js
style: { x: springX, y: springY, transform: "translateZ(-20px) scale(1.1)" }
```

**Gradient overlay layers**: `translateZ(10px)`, `translateZ(20px)`, `translateZ(40px)`

---

### 15. Carousel Slide Transition

**Trigger**: Arrow click or auto (every 6 seconds)
**Type**: 3D page flip with slide

**Slide-in**:
```js
initial: {
  opacity: 0,
  x: direction > 0 ? 300 : -300,
  rotateY: direction > 0 ? 45 : -45,
  scale: 0.8
}
animate: { opacity: 1, x: 0, rotateY: 0, scale: 1 }
transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] }
```

**Slide-out**:
```js
exit: {
  opacity: 0,
  x: direction > 0 ? -300 : 300,
  rotateY: direction > 0 ? -45 : 45,
  scale: 0.8
}
```

**Carousel title fade-in** (each slide):
```js
initial: { scale: 0.9, opacity: 0 }
animate: { scale: 1, opacity: 1 }
transition: { delay: 0.4 }
```

**Carousel wave underline** (SVG path draw per slide):
```js
initial: { pathLength: 0 }
animate: { pathLength: 1 }
transition: { duration: 0.8, delay: 0.5 }
```

**Carousel location text**:
```js
initial: { x: -20, opacity: 0 }
animate: { x: 0, opacity: 1 }
transition: { delay: 0.6 }
```

**Carousel "You are here" badge**:
```js
initial: { x: 20, opacity: 0 }
animate: { x: 0, opacity: 1 }
transition: { delay: 0.7 }
```

**Calendar month change** (within booking section):
```js
initial: { opacity: 0, y: 10 }
animate: { opacity: 1, y: 0 }
exit: { opacity: 0, y: -10 }
transition: { duration: 0.3 }
// Also grid x-slide: initial: { opacity: 0, x: 20 }, exit: { x: -20 }
```

---

### 16. Floating Particles Inside Carousel (8 dots)

**Trigger**: Always-on per slide
**Count**: 8 white/translucent circles
```js
animate: { y: [0, -30, 0], opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }
transition: {
  duration: 3 + index * 0.5,    // 3s to 6.5s
  repeat: Infinity,
  delay: index * 0.2,
  ease: "easeInOut"
}
```
**Position**: Each at `translateZ: 15 + index * 3`px depth

---

### 17. Carousel Corner Sparkle Stars

**Trigger**: Always-on
**Location**: 4 corners of the carousel outer frame
```js
// Top-left: clockwise rotation
animate: { rotate: [0, 360] }
transition: { duration: 20, repeat: Infinity, ease: "linear" }

// Top-right: counter-clockwise rotation
animate: { rotate: [360, 0] }
transition: { duration: 20, repeat: Infinity, ease: "linear" }
```
**Element**: 4-pointed star SVG (Lucide Star variant, `Xl` component), `w-6 h-6`

---

### 18. Carousel Arrow Buttons

**Outer wrapper** — vertical float:
```js
animate: { y: [0, -5, 0] }
transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
// Right arrow has delay: 1
```

**Left arrow button hover**:
```js
whileHover: {
  scale: 1.2,
  rotate: -10,
  y: [-5, -15, -5],
  transition: { y: { duration: 0.5, repeat: Infinity } }
}
whileTap: { scale: 0.85 }
```

**Right arrow button hover**:
```js
whileHover: {
  scale: 1.2,
  rotate: 10,
  y: [-5, -15, -5],
  transition: { y: { duration: 0.5, repeat: Infinity } }
}
whileTap: { scale: 0.85 }
```

**Button shape**: Organic rounded shape (irregular border-radius), white background, #00AB39 border
**Dashed ring overlay**: SVG circle `strokeDasharray: "2,3"`, `opacity: 0.3`

---

### 19. Carousel Dot Indicators

**Active dot animation** (slide in/out of active state):
```js
// Active state:
animate: { opacity: t.isBottom ? 0.3 : 1, scale: t.isBottom ? 0.9 : 1, y: t.isBottom ? 0 : [0, -2, 0] }
// Inactive state:
animate: { opacity: t.isBottom ? 1 : 0.3, scale: t.isBottom ? 1 : 0.9, y: t.isBottom ? [0, -2, 0] : 0 }
```

---

### 20. Scroll-Triggered Card Animations (Ct wrapper component)

**Used on**: Partner cards, amenity cards, info sections throughout page
**Trigger**: Element enters viewport (once)

**Entrance**:
```js
initial: { opacity: 0, y: 20, rotate: -1 }
whileInView: { opacity: 1, y: 0, rotate: 0 }
transition: { duration: 0.5, delay: delay, type: "spring", stiffness: 80 }
viewport: { once: true }
```

**Hover** (card lift):
```js
whileHover: { y: -5, rotate: 1, scale: 1.02, transition: { duration: 0.2 } }
```

**Variants by section**:
- Partner logos: `initial: { opacity: 0, y: 20 }`, `whileInView: { opacity: 1, y: 0 }`, stagger `delay: index * 0.1`
- Feature rows (left/right alt): `initial: { opacity: 0, x: index % 2 === 0 ? -20 : 20 }`, `whileInView: { x: 0 }`
- Review cards: `initial: { opacity: 0, scale: 0.9 }`, `whileInView: { scale: 1 }`, `whileHover: { scale: 1.03, y: -5 }`
- Legal/Info sections: `initial: { opacity: 0, x: -20 }`, `whileInView: { x: 0 }`, stagger `delay: index * 0.1`

---

### 21. Footer Logo (in footer)

**Trigger**: Always-on
```js
animate: { rotate: [0, 5, -5, 0] }
transition: { duration: 4, repeat: Infinity }
```

**Footer columns**: Fade-in on scroll (staggered):
```js
initial: { opacity: 0, y: 20 }
whileInView: { opacity: 1, y: 0 }
viewport: { once: true }
transition: { delay: 0 | 0.1 | 0.2 | 0.3 }  // per column
```

---

### 22. Footer Links

**Internal/External nav links**:
```js
whileHover: { x: 5 }
// CSS: className="text-[#E8F5E9] hover:text-white transition-colors"
```

**Legal links**:
```js
whileHover: { x: 3 }
// CSS: className="hover:text-white transition-colors underline"
```

**Contact info items** (address, phone, email):
```js
whileHover: { x: 5 }
```

---

### 23. Social Media Icons (Footer)

**Trigger**: Hover
```js
whileHover: { scale: 1.15, rotate: 5 }
whileTap: { scale: 0.95 }
```
**CSS**: `hover:bg-white hover:text-[#006b24] transition-all`
Background: `bg-[#00AB39]` → white on hover (fill + icon color flip)

---

### 24. Certification/Badge Cards (Footer)

**Trigger**: Hover
```js
whileHover: { scale: 1.03 }
// CSS: "hover:bg-white/15 transition-colors"
```

**Compliance badges** (GDPR/LSSI/SSL):
```js
whileHover: { scale: 1.05 }
```

---

### 25. Login Modal (I6 component)

**Overlay backdrop**:
```js
initial: { opacity: 0 }
animate: { opacity: 1 }
exit: { opacity: 0 }
// CSS: bg-black/60 backdrop-blur-sm z-[10000]
```

**Modal container**:
```js
initial: { opacity: 0, scale: 0.9, y: 20 }
animate: { opacity: 1, scale: 1, y: 0 }
exit: { opacity: 0, scale: 0.9, y: 20 }
transition: { type: "spring", stiffness: 300, damping: 30 }
```

**Close button (X)**:
```js
whileHover: { scale: 1.1, rotate: 90 }
whileTap: { scale: 0.9 }
// CSS: group-hover:text-[#ED1C24] transition-colors
```

**Modal sparkle corners** (2 corners):
```js
animate: { rotate: [0, 180, 360], scale: [1, 1.2, 1] }
transition: { duration: 3, repeat: Infinity }
```

**Login form items** — staggered slide-in:
```js
initial: { opacity: 0, x: -10 }
animate: { opacity: 1, x: 0 }
transition: { delay: index * 0.05 }
whileHover: { x: 3 }
```

**Active language checkmark** (layout animation):
```js
layoutId: "activeLanguage"
transition: { type: "spring", stiffness: 300, damping: 30 }
```

**Demo account buttons**:
```js
whileHover: { scale: 1.05 }
whileTap: { scale: 0.95 }
```

---

### 26. Main Left Column (Page load)

**Trigger**: Page load
```js
initial: { opacity: 0, x: -30 }
animate: { opacity: 1, x: 0 }
transition: { delay: 0.2 }
```

---

### 27. Carousel Right Column (Page load)

**Trigger**: Page load
```js
initial: { opacity: 0, x: 30 }
animate: { opacity: 1, x: 0 }
transition: { delay: 0.4 }
```

**"Tell me more" button wrapper**:
```js
initial: { opacity: 0, y: -10 }
animate: { opacity: 1, y: 0 }
transition: { delay: 0.6 }
```

---

### 28. Booking Calendar (Date Picker)

**Date cells** — entrance:
```js
initial: { opacity: 0, scale: 0.8 }
animate: { opacity: 1, scale: 1 }
transition: { delay: cellIndex * 0.01 }
```

**Date cells** — hover:
```js
whileHover: { scale: 1.15, rotate: 3 }
whileTap: { scale: 0.9 }
```

**Selected date range indicator**:
```js
// Check-out preview on hover:
initial: { opacity: 0, scale: 0.8 }
animate: { opacity: 1, scale: 1 }
```

**Night counter badge**:
```js
initial: { scale: 0 }
animate: { scale: 1 }
```

**Confirm booking button section**:
```js
initial: { opacity: 0, scale: 0.8 }
animate: { opacity: 1, scale: 1 }
```

---

### 29. Progress Bar / Shimmer

**Used for loading states**:
```js
animate: { x: ["-100%", "200%"] }
transition: { duration: 2, ease: "linear" }
```

---

### 30. Scrolling/Marquee Text (Sonner/toast library)

**Toast entrance**:
```js
--y: translateY(100%);  /* bottom */
// Mounted: --y: translateY(0); opacity: 1;
transition: transform 0.4s, opacity 0.4s
```

---

## Transition Classes (Tailwind CSS)

```css
/* Applied on interactive elements throughout: */
.transition-all { transition-property: all; ... }
.transition-colors { transition-property: color, background-color, border-color, ... }
.transition-opacity { transition-property: opacity; ... }
.transition-transform { transition-property: transform, translate, scale, rotate; ... }

/* Durations used: */
.duration-200 { transition-duration: 0.2s }
.duration-300 { transition-duration: 0.3s }
.duration-1000 { transition-duration: 1s }

/* Easing: */
.ease-in-out { transition-timing-function: var(--ease-in-out) }
.ease-linear { transition-timing-function: linear }
```

---

## Color Palette (from Figma)

| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | `#00AB39` | Borders, accents, active states |
| Dark Green | `#006b24` | Hover state backgrounds, footer bg |
| Deeper Green | `#004d1f` | Footer bottom bar |
| Light Green | `#00C843` | Button hover fill |
| Off-White | `#E8F5E9` | Light green tint, tag backgrounds |
| Dark | `#1A1A1A` | Text, SVG borders |
| Warm White | `#FFF9F0` | Calendar date cells |
| Tan | `#D4A574` | Calendar today highlight |
| Brown | `#5D4E37` | Calendar day labels |

---

## Typography (from Google Fonts)

| Font | Weights | Usage |
|------|---------|-------|
| Shadows Into Light | 400 | `¡Bienvenido!`, carousel title text |
| Cabin Sketch | 400, 700 | `Peregrino`, stat labels, `.sketch-title` |
| Patrick Hand | 400 | Body text, nav labels, `.hand-drawn` |
| Indie Flower | 400 | Alternative handwritten text |

---

## Images & Assets

### Logo
| File | Size | Source |
|------|------|--------|
| `/frontend/public/logos/logo.png` | 110x109px | `/_assets/v11/6340c39809bbb6dce9c21e3fed2ac80a388b79b7.png` |
| `/frontend/public/logos/logo-48x48.png` | 48x48px | `/_assets/v11/0ba6f29ad33e17c0775f0928bf1017222425bfe7.png` |

### Carousel Images (Unsplash)
| File | Title | Unsplash ID |
|------|-------|-------------|
| `/frontend/public/images/carousel/camino-via-plata.jpg` | The Camino | photo-1711444898752-251183214453 |
| `/frontend/public/images/carousel/merida-roman-ruins.jpg` | Mérida | photo-1650103134649-5d7621808a1f |
| `/frontend/public/images/carousel/medieval-spain.jpg` | Medieval Spain | photo-1681849780303-d64fe9740b20 |
| `/frontend/public/images/carousel/extremadura-landscape.jpg` | Extremadura | photo-1601210026600-6673ca8d0a40 |
| `/frontend/public/images/carousel/journey-hiking.jpg` | The Journey | photo-1764938196166-744e1adb3807 |

### External Badges (Footer — rendered as SVG components, not images)
- `kE` — Camino de Santiago badge (SVG)
- `PE` — Turismo de Extremadura badge (SVG)
- `NE` — Quality seal badge (SVG)
- `F6` — Rotating star/compass SVG component with animation

---

## Interaction Summary Table

| Component | Trigger | Effect |
|-----------|---------|--------|
| Nav header | Page load | Spring slide-down from y:-100 |
| Logo img | Always | Wobble rotate±4deg + float y:-2 |
| Logo group | Hover | scale:1.03 |
| Logo group | Tap | scale:0.97 |
| Language pill | Hover | Fill green + text white (CSS transition) |
| Language pill dot | Always | Pulse scale 1→1.3→1 |
| Language dropdown items | Hover | x:3 slide |
| Active language bar | Select | layoutId spring animation |
| Entrar pill | Hover | Fill green + text white |
| Entrar dot | Always | Pulse scale 1→1.3→1 |
| Background circles | Always | Rotate 360° + scale 1→1.15, 12-20s |
| Heart icon | Always | Float y:[0,-12,0] + rotate:[0,8,-8,0] |
| ¡Bienvenido! | Load | fade-in delay:0.3 |
| Title underline wave | Load | SVG pathLength draw delay:0.5 |
| Peregrino | Load | fade-in delay:0.4 |
| Wave divider | Load | SVG pathLength draw delay:0.6 |
| Body text | Load | fade-in delay:0.5 |
| Stat box | Load | scale:0.8→1 + float y:[0,-5,0] |
| Stat box | Hover | scale:1.05, y:-7 |
| Stat border | Always | Stroke color cycles #1A1A1A→#00AB39 |
| Stat value | Always | scale:[1,1.04,1] |
| Stat dot | Always | scale:[1,1.4,1], opacity:[0.4,1,0.4] |
| CTA "Start Booking" | Always | Rock rotateZ:[-1,1,-1], y:[0,-2,0] |
| CTA button | Hover | scale:1.08, rotateZ:-5, y:-4 |
| "Tell me more" | Hover | scale:1.05, rotateZ:-2, y:-4 |
| Any M1 button | Tap | scale:0.95 |
| Feature list item | Hover | x:3 |
| Feature icon | Hover | scale:1.15, rotate:360 (spring) |
| Carousel frame | Mouse move | 3D tilt rotateX/Y ±10deg |
| Carousel slide | Arrow/auto | 3D flip x:±300 rotateY:±45 + scale:0.8 |
| Carousel particles | Always | Float y:[0,-30,0] per particle |
| Carousel corners | Always | Star rotate 360/counter-360, 20s linear |
| Left arrow | Always | Float y:[0,-5,0] |
| Right arrow | Always | Float y:[0,-5,0] delay:1 |
| Left arrow | Hover | scale:1.2, rotate:-10, y:bounce |
| Right arrow | Hover | scale:1.2, rotate:10, y:bounce |
| Arrow buttons | Tap | scale:0.85 |
| Scroll cards (Ct) | In view | opacity+y+rotate fade-in (spring) |
| Scroll cards (Ct) | Hover | y:-5, rotate:1, scale:1.02 |
| Footer logo | Always | Wobble rotate:[0,5,-5,0] |
| Footer columns | In view | opacity+y fade-in staggered |
| Footer nav links | Hover | x:5 |
| Social icons | Hover | scale:1.15, rotate:5; bg:white |
| Badge cards | Hover | scale:1.03 |
| Login modal bg | Open | opacity 0→1 |
| Login modal | Open | spring scale:0.9→1, y:20→0 |
| Close button | Hover | scale:1.1, rotate:90 |
| Close button | Tap | scale:0.9 |
| Date cells | Load | scale:0.8→1 staggered |
| Date cells | Hover | scale:1.15, rotate:3 |
| Date cells | Tap | scale:0.9 |

---

## Special Effects

### Sketchy/Hand-drawn Style
- All borders are SVG `<rect>` elements with hand-drawn `rx` (rounded corners), not CSS borders
- Drop shadows are blurred SVG rects (`filter: blur(2-4px)`) shifted below
- The carousel frame uses an SVG `<feTurbulence>` + `<feDisplacementMap>` filter for a "sketchy" look
- Buttons have double-border look: outer SVG rect (dark) + inner rect (green fill)

### Noise Texture
```css
background-image: url("data:image/svg+xml,...feTurbulence type='fractalNoise' baseFrequency='3' numOctaves='4'... opacity='0.03'");
```

### Paper Texture Video
- Carousel booking section background: `https://assets.mixkit.co/videos/preview/mixkit-paper-texture-close-up-4356-large.mp4`
- `opacity-10`, `mixBlendMode: multiply`, `filter: blur(1px) contrast(1.2) saturate(0.3)`

---

## Implementation Notes for React/Framer Motion

1. **Install**: `framer-motion` + `@emotion/react` (for CSS-in-JS if needed)
2. **Import**: `import { motion as C, AnimatePresence as Re, useSpring as A1 } from "framer-motion"`
3. **3D Parallax**: Use `useSpring` with `{ stiffness: 150, damping: 20 }` for smooth mouse tracking
4. **Carousel**: Use `AnimatePresence mode="wait"` with `custom` direction prop for slide direction
5. **Scroll animations**: Use `whileInView` + `viewport: { once: true }` for one-shot scroll reveals
6. **layoutId**: Language selector uses layoutId for shared element transitions
7. **Always-on loops**: Use `repeat: Infinity` (Framer Motion) not `Infinity` in vanilla CSS
8. **Spring defaults**: `stiffness: 300, damping: 20` for snappy UI; `stiffness: 80-100` for slower organic feel

---

### 31. Form Field Animations (Booking Flow)

**Trigger**: Page load (staggered fade-in-up per field)
```js
initial: { opacity: 0, y: 10 }
animate: { opacity: 1, y: 0 }
transition: { delay: 0.1 | 0.15 | 0.2 | 0.25 | ... (increments of 0.05-0.1) }
```

**Focus state** (CSS):
```css
/* Normal: */
className="focus:outline-none focus:ring-2 focus:ring-[#00AB39]"
/* Error state: */
className="focus:ring-[#ED1C24] border-[#ED1C24]"
/* Background: */
bg-[#FFF9F0]  /* warm off-white */
/* Border class: */
doodle-border  /* hand-drawn sketchy border style */
```

**Validation error messages** fade in with Patrick Hand font, `text-[#ED1C24]`

---

### 32. Booking Flow — Step Transitions

**Trigger**: Step completion, `window.scrollTo({ top: 0, behavior: "smooth" })`
Each step scrolls to top on advance. Steps use the same entrance animations as the page sections.

---

### 33. Booking Progress Sidebar (Logo in sidebar)

**Trigger**: Always-on (booking flow sidebar)
Logo in sidebar has the same wobble:
```js
animate: { rotate: [0, 4, -4, 0], y: [0, -2, 0] }
transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
```

---

### 34. Multi-step Progress Indicator

**Active step**: animated green fill transition
**Completed step**: scale in with spring:
```js
initial: { scale: 0, rotate: -10 }
animate: { scale: 1, rotate: 0 }
transition: { type: "spring", stiffness: 300, damping: 20 }
```

---

### 35. Bed Selection Grid

**Individual bed cells**:
```js
initial: { opacity: 0, scale: 0.8 }
animate: { opacity: 1, scale: 1 }
transition: { delay: index * 0.03 }
```

**Bed hover**: `whileHover: { scale: 1.05, y: -3 }`

**Selected bed** (pulsing border):
```js
boxShadow: [
  "0 6px 20px rgba(0, 171, 57, 0.4)",
  "0 8px 25px rgba(0, 171, 57, 0.6)",
  "0 6px 20px rgba(0, 171, 57, 0.4)"
]
transition: { duration: 2, repeat: Infinity }
```

---

### 36. Confirmation / Success State

**Trigger**: Form submission success
```js
initial: { scale: 0, rotate: -180 }
animate: { scale: 1, rotate: 0 }
transition: { type: "spring", stiffness: 200, damping: 25 }
```

**Confetti/sparkle burst** (scattered particles):
```js
animate: {
  x: Math.cos(index * 30 * Math.PI / 180) * 100,
  y: Math.sin(index * 30 * Math.PI / 180) * 100,
  scale: [0, 1.5, 0],
  opacity: [0, 1, 0]
}
transition: { duration: 1, repeat: Infinity }
```

---

### 37. Toast Notifications (Sonner library)

**Entrance**: `translateY(100%)` → `translateY(0)`, `opacity: 0 → 1`
**Duration**: `transition: transform 0.4s, opacity 0.4s`
**Exit**: Swipe gestures + `translateY(40%)` + `opacity: 0`, `transition: transform 0.5s, opacity 0.2s`

---

### 38. Rotating Stamp/Badge Component (F6)

**Trigger**: Always-on
```js
// SVG container:
animate: { rotate: [0, 10, -10, 0] }
transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }

// Inner path (star):
animate: { scale: [1, 1.1, 1] }
transition: { duration: 1.5, repeat: Infinity }
```

---

### 39. "You are here" Carousel Location Badge

**Background**: `bg-white/40 backdrop-blur-sm`
**Scale on hover**: `whileHover: { scale: 1.1, rotate: 5 }` (icon inside badge)

---

### 40. Input Field (motion.input in Login)

Login email/password use styled `<input>` with:
- `doodle-border` class for hand-drawn SVG border treatment
- `focus:ring-2 focus:ring-[#00AB39]` Tailwind focus ring
- Password field has eye-toggle icon button

---

## Scroll Behavior

- **All scroll navigation**: `window.scrollTo({ top: 0, behavior: "smooth" })`
- **Back to top on step advance**: Booking flow auto-scrolls on each step
- **Footer nav links**: `window.scrollTo({ top: 0, behavior: "smooth" })` on click
- **Sticky header**: `position: sticky; top: 0; z-index: 50; bg-white/80 backdrop-blur-md`

---

## Google Fonts Import

```css
@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&family=Patrick+Hand&family=Shadows+Into+Light&family=Cabin+Sketch:wght@400;700&display=swap');
```
