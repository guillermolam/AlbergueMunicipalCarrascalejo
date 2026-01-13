// Stores Index - Centralized state management
// Export all stores and utilities from a single entry point

// Core stores
export {
  bookingActions,
  bookingSelectors,
  bookingStore,
  loadPersistedBooking,
  persistBooking,
} from './bookingStore';
export { i18nActions, i18nStore, loadPersistedLocale, t } from './i18nStore';

// User stores
export { authActions, authSelectors, authStore } from './authStore';
export { userActions, userSelectors, userStore } from './userStore';

// Admin stores
export { adminActions, adminSelectors, adminStore } from './adminStore';

// UI stores
export { themeActions, themeStore } from './themeStore';
export { uiActions, uiSelectors, uiStore } from './uiStore';

// Data stores
export { availabilityActions, availabilityStore } from './availabilityStore';
export { notificationsActions, notificationsStore } from './notificationsStore';

// Utility functions
export { createPersistentStore, createStore } from './utils';

// Types
export type {
  AdminState,
  AuthState,
  AvailabilityState,
  BookingState,
  ContactInfo,
  I18nState,
  Locale,
  NotificationsState,
  PaymentInfo,
  Pilgrim,
  ThemeState,
  TranslationKeys,
  UIState,
  UserState,
} from './types';

// Re-export nanostores utilities
export { persistentMap } from '@nanostores/persistent';
export { useStore } from '@nanostores/solid';
