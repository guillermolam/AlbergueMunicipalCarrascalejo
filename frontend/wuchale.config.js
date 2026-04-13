// @ts-check
import { defineConfig } from "wuchale";
import { adapter } from "@wuchale/astro";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const LOCALES = [
  "es", "en", "zh", "hi", "ar", "pt", "ru", "ja", "de", "fr",
  "it", "ko", "id", "tr", "vi", "ca", "eu", "gl", "ast",
];

export default defineConfig({
  locales: LOCALES,
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
  // Auto-translate via Anthropic Claude Haiku. API key comes from 1Password:
  //
  //   op run --env-file=.env.wuchale -- pnpm wuchale:translate
  //
  // where .env.wuchale contains:
  //   ANTHROPIC_API_KEY="op://_Personal/Anthropic Claude - API Key/password"
  //
  // Without the env var this is a no-op (no accidental API calls on plain extract).
  ai: {
    name: "Claude Haiku",
    batchSize: 20,
    parallel: 1,
    group: {},
    translate: async (messages, instruction) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return messages;
      }
      // `messages` is already a JSON string: [{id, context, references}…]
      // `instruction` from Wuchale already specifies the exact output schema
      // and says "Respond ONLY with raw compact JSON." — relay both as-is.
      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: instruction,
        prompt: messages,
      });
      // Strip markdown fences defensively.
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      }
      return cleaned;
    },
  },
  hmr: true,
  logLevel: "info",
});
