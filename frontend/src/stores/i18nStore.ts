import { map } from 'nanostores';

// Supported languages with flags
export type Locale =
  | 'es'
  | 'en'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'ko'
  | 'ja'
  | 'zh'
  | 'ru'
  | 'cs'
  | 'sk'
  | 'hu'
  | 'ca'
  | 'eu'
  | 'gl'
  | 'oc'
  | 'Gode';

export interface Language {
  code: Locale;
  name: string;
  flag: string;
}

// Language definitions
export const LANGUAGES: Record<Locale, Language> = {
  es: { code: 'es', name: 'Español', flag: '🇪🇸' },
  en: { code: 'en', name: 'English', flag: '🇬🇧' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  pt: { code: 'pt', name: 'Português', flag: '🇵🇹' },
  nl: { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  pl: { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  ko: { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ja: { code: 'ja', name: '日本語', flag: '🇯🇵' },
  zh: { code: 'zh', name: '中文', flag: '🇨🇳' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  cs: { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  sk: { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  hu: { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  ca: { code: 'ca', name: 'Català', flag: '🏴' },
  eu: { code: 'eu', name: 'Euskara', flag: '🏴' },
  gl: { code: 'gl', name: 'Galego', flag: '🏴' },
  oc: { code: 'oc', name: 'Occitan (Aranés)', flag: '🏴' },
  Gode: { code: 'Gode', name: 'Gothic', flag: '🏴' },
};

// Translation keys type
export type TranslationKeys = {
  // Common
  'common.welcome': string;
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.save': string;
  'common.edit': string;
  'common.delete': string;
  'common.confirm': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.finish': string;

  // Navigation
  'nav.home': string;
  'nav.booking': string;
  'nav.dashboard': string;
  'nav.admin': string;
  'nav.contact': string;
  'nav.legal': string;

  // Booking
  'booking.title': string;
  'booking.step1': string;
  'booking.step2': string;
  'booking.step3': string;
  'booking.step4': string;
  'booking.step5': string;
  'booking.checkIn': string;
  'booking.checkOut': string;
  'booking.guests': string;
  'booking.pilgrims': string;
  'booking.beds': string;
  'booking.contact': string;
  'booking.payment': string;
  'booking.confirmation': string;
  'booking.selectDates': string;
  'booking.selectBeds': string;
  'booking.enterDetails': string;
  'booking.paymentMethod': string;
  'booking.totalPrice': string;
  'booking.currency': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.welcome': string;
  'dashboard.myBookings': string;
  'dashboard.currentBooking': string;
  'dashboard.bookingHistory': string;
  'dashboard.profile': string;
  'dashboard.settings': string;

  // Admin
  'admin.title': string;
  'admin.dashboard': string;
  'admin.bookings': string;
  'admin.guests': string;
  'admin.beds': string;
  'admin.analytics': string;
  'admin.settings': string;

  // Messages
  'message.bookingSuccess': string;
  'message.bookingError': string;
  'message.validationError': string;
  'message.networkError': string;
  'message.sessionExpired': string;
};

// i18n state
export interface I18nState {
  locale: Locale;
  fallbackLocale: Locale;
  messages: TranslationKeys;
  isLoading: boolean;
  error: string | null;
}

// Create the i18n store
export const i18nStore = map<I18nState>({
  locale: 'es',
  fallbackLocale: 'es',
  messages: {} as TranslationKeys,
  isLoading: false,
  error: null,
});

// i18n actions
export const i18nActions = {
  // Load translations from locale files
  loadTranslations: async (locale: Locale): Promise<TranslationKeys> => {
    try {
      // Try to load from locale files first
      const common = await import(
        `../components/LanguageSelector/locales/${locale}/common.json`
      ).catch(() => ({}));
      const navigation = await import(
        `../components/LanguageSelector/locales/${locale}/navigation.json`
      ).catch(() => ({}));
      const booking = await import(
        `../components/LanguageSelector/locales/${locale}/booking.json`
      ).catch(() => ({}));
      const dashboard = await import(
        `../components/LanguageSelector/locales/${locale}/dashboard.json`
      ).catch(() => ({}));
      const admin = await import(
        `../components/LanguageSelector/locales/${locale}/admin.json`
      ).catch(() => ({}));
      const messages = await import(
        `../components/LanguageSelector/locales/${locale}/messages.json`
      ).catch(() => ({}));

      // Merge all categories
      const translations = {
        ...common,
        ...navigation,
        ...booking,
        ...dashboard,
        ...admin,
        ...messages,
      };

      // If no translations found, use fallback
      if (Object.keys(translations).length === 0) {
        throw new Error('No translations found');
      }

      return translations as TranslationKeys;
    } catch (error) {
      console.warn(`Failed to load translations for ${locale}:`, error);

      // Return empty translations - will use fallback
      return {} as TranslationKeys;
    }
  },

  // Set locale with dynamic loading
  setLocale: async (locale: Locale): Promise<void> => {
    if (!LANGUAGES[locale]) {
      console.warn(`Unsupported locale: ${locale}`);
      return;
    }

    i18nStore.setKey('isLoading', true);
    i18nStore.setKey('error', null);

    try {
      const translations = await i18nActions.loadTranslations(locale);

      // If no translations loaded, use fallback
      if (Object.keys(translations).length === 0) {
        throw new Error('No translations available');
      }

      i18nStore.setKey('locale', locale);
      i18nStore.setKey('messages', translations);

      // Update HTML lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
      }

      // Store preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('preferred-language', locale);
      }
    } catch (error) {
      console.error('Failed to set locale:', error);
      i18nStore.setKey('error', error instanceof Error ? error.message : 'Unknown error');

      // Fallback to Spanish
      if (locale !== 'es') {
        await i18nActions.setLocale('es');
      }
    } finally {
      i18nStore.setKey('isLoading', false);
    }
  },

  getMessage: (key: keyof TranslationKeys, fallback?: string): string => {
    const state = i18nStore.get();
    const messages = state.messages;

    // Return the translated message if available
    if (messages && messages[key]) {
      return messages[key];
    }

    // Return fallback or the key itself
    return fallback || key;
  },

  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const locale = i18nStore.get().locale;
    return date.toLocaleDateString(locale, options);
  },

  formatNumber: (number: number, options?: Intl.NumberFormatOptions): string => {
    const locale = i18nStore.get().locale;
    return new Intl.NumberFormat(locale, options).format(number);
  },

  formatCurrency: (amount: number, currency: string = 'EUR'): string => {
    const locale = i18nStore.get().locale;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  },

  // Get current language info
  getCurrentLanguage: (): Language => {
    const locale = i18nStore.get().locale;
    return LANGUAGES[locale] || LANGUAGES.es;
  },

  // Get all available languages
  getAvailableLanguages: (): Language[] => {
    return Object.values(LANGUAGES);
  },

  // Check if locale is supported
  isSupportedLocale: (locale: string): locale is Locale => {
    return locale in LANGUAGES;
  },
};

// Load persisted locale
export const loadPersistedLocale = async (): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    const persisted = localStorage.getItem('preferred-language');
    if (persisted && i18nActions.isSupportedLocale(persisted)) {
      await i18nActions.setLocale(persisted);
      return;
    }
  }

  // Fallback to browser preference
  if (typeof navigator !== 'undefined') {
    const browserLocale = navigator.language.split('-')[0];
    if (i18nActions.isSupportedLocale(browserLocale)) {
      await i18nActions.setLocale(browserLocale);
      return;
    }
  }

  // Final fallback to Spanish
  await i18nActions.setLocale('es');
};

// Initialize with persisted locale or browser preference
if (typeof window !== 'undefined') {
  // Initialize with Spanish first to avoid empty state
  i18nActions.setLocale('es').then(() => {
    loadPersistedLocale();
  });
}

// Helper function for components
export const t = (key: keyof TranslationKeys, fallback?: string): string => {
  return i18nActions.getMessage(key, fallback);
};

// Export store for reactive usage
export default i18nStore;
