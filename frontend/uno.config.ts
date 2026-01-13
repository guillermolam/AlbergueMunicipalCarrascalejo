import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetUno,
  transformerVariantGroup,
} from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
      collections: {
        logos: () => import('@iconify-json/logos/icons.json').then((i) => i.default as any),
        uil: () => import('@iconify-json/uil/icons.json').then((l) => l.default as any),
      },
    }),
    presetTypography(),
  ],
  theme: {
    colors: {
      primary: '#00AB39',
      white: '#FFFFFF',
      black: '#000000',
      yellow: '#EAC102',
      red: '#ED1C24',
      blue: '#0071BC',
      brand: {
        green: '#00AB39',
        blue: '#0071BC',
        yellow: '#EAC102',
        ink: '#111111',
      },
    },
  },
  shortcuts: [
    ['card-brut', 'border-4 border-black bg-white shadow-[8px_8px_0_0_#000] rounded-none p-4'],
    ['btn', 'px-4 py-2 rounded-none border-3 border-black font-700 transition-transform'],
    ['btn-primary', 'btn bg-primary text-white hover:scale-105 active:scale-95'],
    ['btn-secondary', 'btn bg-yellow text-black hover:scale-105 active:scale-95'],
    [
      'badge-doodle',
      'inline-flex items-center gap-1 px-3 py-1 border-2 border-black bg-white text-black',
    ],
    ['ds-card', 'bg-white ring-1 ring-stone-200 shadow-sm rounded-3xl'],
    ['ds-muted', 'text-stone-600'],
    [
      'ds-btn',
      'inline-flex items-center justify-center font-900 rounded-2xl px-6 py-3 transition select-none',
    ],
    ['ds-btn-primary', 'bg-brand-green text-white hover:(translate-y--0.5) active:(translate-y-0)'],
    ['ds-btn-outline', 'bg-white text-stone-900 hover:(translate-y--0.5) active:(translate-y-0)'],
  ],
  safelist: ['i-logos-astro', 'i-uil-football', 'i-uil-heart', 'i-logos-unocss'],
  transformers: [transformerVariantGroup()],
});
