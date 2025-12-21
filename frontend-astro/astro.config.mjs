// @ts-check
import db from "@astrojs/db";
import solidJs from "@astrojs/solid-js";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  integrations: [solidJs(), db()],
  env: {
    schema: {
      FERMYON_CLOUD_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      EXPO_PUBLIC_SUPABASE_URL: envField.string({
        context: "client",
        access: "public",
      }),
      EXPO_PUBLIC_SUPABASE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
      DATABASE_URL: envField.string({ context: "server", access: "secret" }),
      SMTP_HOST: envField.string({ context: "server", access: "public" }),
      LOG_LEVEL: envField.string({
        context: "server",
        access: "public",
        default: "info",
      }),
      GOOGLE_OIDC_URL: envField.string({ context: "server", access: "public" }),
      GOOGLE_REDIRECT_URI: envField.string({
        context: "server",
        access: "public",
      }),
      JWT_SECRET: envField.string({ context: "server", access: "secret" }),
      JWT_EXPIRATION: envField.number({
        context: "server",
        access: "public",
        default: 3600,
      }),
      REDIS_LABS_LANCACHE_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      REDIS_CACHE_ID: envField.string({ context: "server", access: "public" }),
      REDIS_SVC_NAME: envField.string({ context: "server", access: "public" }),
      REDIS_DB_SUBSCRIPTION: envField.string({
        context: "server",
        access: "public",
      }),
      REDIS_PUBLIC_ENDPOINT: envField.string({
        context: "server",
        access: "public",
      }),
      REDIS_ADDRESS: envField.string({ context: "server", access: "public" }),
      MQTT_BROKER_URL: envField.string({ context: "server", access: "public" }),
      MQTT_CLIENT_ID: envField.string({ context: "server", access: "public" }),
      FIGMA_API_TOKEN: envField.string({ context: "server", access: "secret" }),
    },
  },
});
