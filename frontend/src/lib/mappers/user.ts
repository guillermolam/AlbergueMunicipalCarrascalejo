import type { AuthUserDTO, PilgrimProfileDTO, UserStatsDTO } from '../contracts/user';

export function mapAuthUser(raw: Record<string, unknown>): AuthUserDTO {
  return {
    id: String(raw.id ?? raw.sub ?? ''),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? raw.full_name ?? raw.displayName ?? 'Peregrino'),
    role: (raw.role ?? (raw.roles as unknown[])?.[0] ?? 'pilgrim') as AuthUserDTO['role'],
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : raw.picture ? String(raw.picture) : null,
    sessionToken: String(raw.session_token ?? raw.access_token ?? raw.token ?? ''),
    expiresAt: String(raw.expires_at ?? raw.exp ?? ''),
  };
}

export function mapPilgrimProfile(raw: Record<string, unknown>): PilgrimProfileDTO {
  const em = raw.emergency as Record<string, unknown> | null;
  const camino = raw.camino as Record<string, unknown> | null;

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? raw.full_name ?? 'Peregrino'),
    email: String(raw.email ?? ''),
    phone: raw.phone ? String(raw.phone) : null,
    country: raw.country ? String(raw.country) : null,
    city: raw.city ? String(raw.city) : null,
    bio: raw.bio ? String(raw.bio) : null,
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : null,
    lockerNumber: raw.locker_number ? String(raw.locker_number) : null,
    emergency: em
      ? {
          name: String(em.name ?? ''),
          relation: String(em.relation ?? ''),
          phone: String(em.phone ?? ''),
          email: em.email ? String(em.email) : null,
        }
      : null,
    camino: {
      route: String(camino?.route ?? 'vdlp'),
      startDate: camino?.start_date ? String(camino.start_date) : null,
      origin: camino?.origin ? String(camino.origin) : null,
      completedStageIds: Array.isArray(camino?.stages)
        ? (camino.stages as unknown[]).map(String)
        : [],
    },
    badges: Array.isArray(raw.badges) ? (raw.badges as unknown[]).map(String) : [],
    vehicles: Array.isArray(raw.vehicles)
      ? (raw.vehicles as Record<string, unknown>[]).map((v) => ({
          id: String(v.id ?? ''),
          type: String(v.type ?? ''),
          plate: String(v.plate ?? ''),
          model: v.model ? String(v.model) : null,
          color: v.color ? String(v.color) : null,
          notes: v.notes ? String(v.notes) : null,
        }))
      : [],
    belongings: Array.isArray(raw.belongings)
      ? (raw.belongings as Record<string, unknown>[]).map((b) => ({
          id: String(b.id ?? ''),
          category: String(b.category ?? ''),
          name: String(b.name ?? ''),
          notes: b.notes ? String(b.notes) : null,
        }))
      : [],
  };
}

export function mapUserStats(raw: Record<string, unknown>): UserStatsDTO {
  return {
    totalBookings: Number(raw.total_bookings ?? 0),
    totalNights: Number(raw.total_nights ?? 0),
    totalKm: Number(raw.total_km ?? 0),
    stamps: Number(raw.stamps ?? 0),
    completedStages: Number(raw.completed_stages ?? 0),
  };
}

export const DEFAULT_PROFILE: PilgrimProfileDTO = {
  id: '',
  name: 'Peregrino',
  email: '',
  phone: null,
  country: null,
  city: null,
  bio: null,
  avatarUrl: null,
  lockerNumber: null,
  emergency: null,
  camino: { route: 'vdlp', startDate: null, origin: null, completedStageIds: [] },
  badges: [],
  vehicles: [],
  belongings: [],
};

export const DEFAULT_STATS: UserStatsDTO = {
  totalBookings: 0,
  totalNights: 0,
  totalKm: 0,
  stamps: 0,
  completedStages: 0,
};
