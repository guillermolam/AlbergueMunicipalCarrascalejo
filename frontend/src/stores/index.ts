// Stores Index - Centralized state management
// Export all stores and utilities from a single entry point

// Booking and localization stores
export {
  bookingActions,
  bookingSelectors,
  bookingStore,
  loadPersistedBooking,
  persistBooking,
} from './bookingStore';
export { i18nActions, i18nStore, loadPersistedLocale, t } from './i18nStore';

// Camino progress stores
export {
  currentStageProgress,
  dailyGoalKm,
  isBusy,
  lastError,
  remainingDays,
  setDailyGoal,
  setStageProgress,
  syncProgressToServer,
} from './app';

// User stores
export {
  bookingCart,
  clearBookingCart,
  clearCurrentUser,
  currentUser,
  setCurrentUser,
  updateBookingCart,
  updateUserPreferences,
  userPreferences,
} from './user';

// Pilgrim stores
export { authActions, authStore, permissionsStore, sessionStore } from './pilgrim-auth';
export {
  bookingsStore,
  currentPilgrimageStore,
  currentProfile,
  healthSafetyStore,
  isAuthenticated,
  isPilgrimageActive,
  isSessionValid,
  pilgrimageActions,
  pilgrimageProgress,
  pilgrimActions,
  pilgrimProfileStore,
  socialProfileStore,
  uiStateStore,
  upcomingBookings,
  userAuthStore,
} from './pilgrim';

// Infrastructure
export {
  closeRedisConnection,
  deleteRedisKey,
  getRedisClient,
  getRedisKey,
  setRedisKey,
} from './redis';

// Re-export nanostores utilities actually used in this project
export { persistentMap } from '@nanostores/persistent';
