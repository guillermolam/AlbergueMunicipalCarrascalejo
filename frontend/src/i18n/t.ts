import { i18nStore, type TranslationKeys } from '../stores/i18nStore';

type Vars = Record<string, string | number>;

export function t<K extends keyof TranslationKeys>(key: K, vars?: Vars): string {
  const state = i18nStore.get();
  const raw = state.messages?.[key] ?? String(key);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, name: string) => String(vars[name] ?? `{${name}}`));
}
