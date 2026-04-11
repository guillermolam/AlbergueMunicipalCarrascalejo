// Explicit re-exports to avoid name collisions (hostel.ts and user.ts both
// export DEFAULT_STATS, which causes a ts(2308) ambiguity when using export *).

export {
  mapService,
  mapSchedule,
  mapPricingRule,
  mapEmergencyContact,
  mapContact,
  mapDashboardStats,
  DEFAULT_SCHEDULE,
  DEFAULT_STATS as DEFAULT_DASHBOARD_STATS,
} from './hostel';

export * from './booking';

export {
  mapAuthUser,
  mapPilgrimProfile,
  mapUserStats,
  DEFAULT_PROFILE,
  DEFAULT_STATS as DEFAULT_USER_STATS,
} from './user';
