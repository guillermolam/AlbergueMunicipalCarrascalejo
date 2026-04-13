// @ts-check
import { defineConfig } from "wuchale";
import { adapter } from "@wuchale/astro";

const LOCALES = [
  "es", "en", "zh", "hi", "ar", "pt", "ru", "ja", "de", "fr",
  "it", "ko", "id", "tr", "vi", "ca", "eu", "gl", "ast",
];

export default defineConfig({
  locales: LOCALES,
  defaultLocale: "es",
  localesDir: "./src/locales",
  adapters: {
    main: adapter({
      // Only extract from Astro components (safer scope — avoids parser issues
      // with TypeScript-heavy islands/stores).
      // Layouts are excluded: they're mostly CSS/slots, and the large
      // inline <style> blocks confuse Wuchale's expression tracker (ESBuild
      // then fails with "Expected ']' but found '}'" on the rewritten output).
      files: ["src/components/**/*.astro"],
      sourceLocale: "es",
    }),
  },
  fallback: {
    ca: "es",
    eu: "es",
    gl: "es",
    ast: "es",
  },
  hmr: true,
  logLevel: "info",
});
