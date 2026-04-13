// @ts-check
import { defineConfig } from "wuchale";
import { adapter } from "@wuchale/astro";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
  // Auto-translate missing .po entries via OpenAI. The API key comes from
  // 1Password at runtime — run extraction through `op run`:
  //
  //   op run --env-file=.env.wuchale -- pnpm wuchale:translate
  //
  // where `.env.wuchale` contains:
  //   OPENAI_API_KEY="op://Employee/OpenAI - API Key/password"
  //
  // Without the env var `ai` is a no-op translator (returns input unchanged)
  // so a plain `npx wuchale` doesn't make accidental paid API calls.
  ai: {
    name: "GPT-5",
    batchSize: 50,
    parallel: 1,
    group: {},
    translate: async (messages, instruction) => {
      if (!process.env.OPENAI_API_KEY) {
        // No key — return input untouched; Wuchale will keep the catalog
        // entry as "fuzzy" / untranslated.
        return messages;
      }
      // Wuchale calls JSON.parse() on our return value, so we MUST emit a
      // JSON array string matching the input array's length/order. We force
      // json_object mode and append an explicit JSON-only instruction.
      const jsonInstruction =
        instruction +
        "\n\nIMPORTANT: Respond with ONLY a valid JSON array of translated strings, " +
        "in the SAME order and count as the input. Do not wrap in markdown fences, " +
        "do not include prose, commentary, or object keys — output MUST be a bare " +
        'JSON array, e.g. ["translated 1","translated 2"]. Preserve all ' +
        "placeholders like {0}, {1}, %s, %d verbatim.";
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: jsonInstruction,
        prompt:
          "Translate this JSON array. Input:\n" +
          JSON.stringify(messages) +
          "\n\nReturn a JSON array of the translations, same length and order.",
        providerOptions: {
          openai: {
            responseFormat: { type: "json_object" },
          },
        },
      });
      // Strip markdown fences defensively (models sometimes ignore json mode).
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      }
      // If the model returned {"translations":[...]} instead of a bare array,
      // unwrap it.
      if (cleaned.startsWith("{")) {
        try {
          const obj = JSON.parse(cleaned);
          const firstArr = Object.values(obj).find((v) => Array.isArray(v));
          if (firstArr) return JSON.stringify(firstArr);
        } catch {
          /* fall through */
        }
      }
      return cleaned;
    },
  },
  hmr: true,
  logLevel: "info",
});
