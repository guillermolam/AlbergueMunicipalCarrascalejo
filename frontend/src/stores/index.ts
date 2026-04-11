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
  // ---- ACTIVE: used by UI state ----
  currentProfile,
  isAuthenticated,
  isPilgrimageActive,
  isSessionValid,
  pilgrimageProgress,
  pilgrimActions,
  pilgrimageActions,
  uiStateStore,
  upcomingBookings,
  // ---- DEPRECATED: data lives on the server; replace with API calls via src/lib/api/ ----
  // @deprecated Use GET /api/users/profile via src/lib/api/user.ts instead
  pilgrimProfileStore,
  // @deprecated Use GET /api/camino/progress via src/lib/api/user.ts instead
  currentPilgrimageStore,
  // @deprecated Use GET /api/bookings via src/lib/api/booking.ts instead
  bookingsStore,
  // @deprecated Use GET /api/accommodation/health via src/lib/api/hostel.ts instead
  healthSafetyStore,
  // @deprecated Merge into pilgrimProfileStore or remove entirely
  socialProfileStore,
  // @deprecated Use Astro.locals.user injected by middleware instead
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
