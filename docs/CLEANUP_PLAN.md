# Frontend Cleanup - Archivos a Eliminar

## DELETION PLAN

### 1. Archivos de Configuración Duplicados/Legacy

- `tailwind.config.js` - Legacy Tailwind config
- `tailwind.config.ts` - Duplicado con shadcn
- `vite.config.ts` - Vite legacy para React
- `vite.config.mts` - Vite config duplicado
- `drizzle.config.ts` - Drizzle en frontend (debe estar en database/)
- `index.html` - HTML legacy para Vite
- `index.css` - CSS legacy para Vite
- `components.json` - shadcn/ui config legacy

### 2. Componentes Duplicados (versión antigua en raíz)

- `src/components/Button.astro` - Duplicado de core/Button.astro
- `src/components/Card.astro` - Duplicado de core/Card.astro
- `src/components/Head.astro` - Duplicado de layout/Head.astro
- `src/components/Hero.astro` - Duplicado de layout/Hero.astro
- `src/components/Stats.astro` - Duplicado de core/Stats.astro

### 3. Componentes Legacy No Utilizados

- `src/components/BookingConfirmation.solid.tsx` - Solid island no referenciado
- `src/components/CaminoDashboard.astro` - Dashboard no referenciado
- `src/components/CaminoDashboard.css` - CSS del dashboard
- `src/components/UserProfile.astro` - Perfil no referenciado
- `src/components/UserProfile.css` - CSS del perfil
- `src/components/Stats.astro` - Stats duplicado

### 4. Layouts Alternativos No Utilizados

- `src/layouts/BaseLayout.astro` - Layout base no usado
- `src/layouts/FigmaLayout.astro` - Solo usado en figma-demo

### 5. Páginas Demo/Legacy

- `src/pages/_app.astro` - App legacy vacío
- `src/pages/admin.astro` - Admin no referenciado
- `src/pages/auth.astro` - Auth no referenciado
- `src/pages/camino-dashboard.astro` - Dashboard no referenciado
- `src/pages/camino.astro` - Camino no referenciado
- `src/pages/dashboard.astro` - Dashboard no referenciado
- `src/pages/figma-demo.astro` - Demo de Figma
- `src/pages/demo-*.astro` - Todas las páginas demo
- `src/pages/booking-*.astro` - Páginas de booking duplicadas
- `src/pages/slug..astro` - Página con nombre malformado

### 6. Directorios de Componentes Duplicados

- `src/components/core/` - Duplicados de componentes principales
- `src/components/ui/` - Utilidades duplicadas
- `src/components/doodle/` - Duplicados de componentes doodle
- `src/components/analytics/` - Analytics no utilizado
- `src/components/layout/` - Layouts duplicados

### 7. Islas Solid No Utilizadas

- `src/islands/` - Islas Solid no referenciadas en páginas core

### 8. Librerías No Utilizadas

- `src/lib/` - Librerías complejas no usadas por páginas core

### 9. Stores No Utilizados

- `src/stores/` - Stores no referenciados en páginas core

### 10. Tipos No Utilizados

- `src/types/` - Tipos no referenciados

### 11. Tests Legacy

- `tests/` - Tests TSX/Solid no alineados con arquitectura

### 12. Archivos Públicos Legacy

- `public/index.html` - HTML legacy
- `public/vite.svg` - Icono Vite
- `public/videos/ambient-background.mp4` - Video no referenciado

### 13. Scripts de Build Legacy

- `scripts/build-frontend.sh` - Script bash
- `scripts/type-check.js` - Script duplicado

### 14. Archivos de Configuración Spin

- `spin.toml` - Config Spin no utilizada

### 15. Archivos de Documentación/Migración

- `MIGRATION_COMPLETE.md` - Documento de migración
- `MIGRATION_SUMMARY.md` - Resumen de migración
- `SETUP_COMPLETE.md` - Setup completado
- `TYPESCRIPT_GUIDE.md` - Guía TypeScript

### 16. Artefactos de Build

- `.astro/` - Directorio de build Astro
- `migrations/` - Migrations SQL no utilizadas

## Archivos a Mantener (Core Architecture)

### Configuración Esencial

- `package.json` - Dependencias core
- `astro.config.mjs` - Config Astro principal
- `uno.config.ts` - Config UnoCSS
- `prettier.config.mjs` - Config Prettier
- `vitest.config.ts` - Config Vitest
- `playwright.config.ts` - Config Playwright

### Layout Principal

- `src/layouts/Layout.astro` - Layout base usado por páginas core

### Páginas Core

- `src/pages/index.astro` - Homepage
- `src/pages/book.astro` - Booking
- `src/pages/info.astro` - Info
- `src/pages/404.astro` - Error

### API Core

- `src/pages/api/health.ts` - Health check
- `src/pages/api/progress.ts` - Progress sync

### Componentes Core

- `src/components/RoughFrame.astro`
- `src/components/InfoBadge.astro`
- `src/components/SketchyButton.astro`
- `src/components/DoodleCard.astro`
- `src/components/FeatureCard.astro`
- `src/components/index.ts`

### Runtime Core

- `src/scripts/runtime.ts`
- `src/scripts/runtime_rough.ts`
- `src/scripts/runtime_stores_bridge.ts`
- `src/scripts/README.md`

### Stores Core

- `src/stores/app.ts`

### Estilos Core

- `src/styles/global.css`

### Tests Core

- `tests/lib/api/client.test.ts`
- `tests/integration/frontend.test.ts`
- `tests/e2e/frontend.spec.ts`
- `tests/setup.ts`

### Documentación

- `docs/CONNECTIVITY_TESTING.md`

### Archivos Públicos

- `public/_redirects` - Netlify redirects
- `public/favicon.svg` - Favicon

## Proceso de Limpieza

1. Primero eliminar archivos 100% seguros (configs duplicados, HTML legacy)
2. Luego eliminar componentes duplicados
3. Después páginas demo/no utilizadas
4. Finalmente directorios completos no utilizados
5. Verificar build y tests después de cada paso
