export type UserRole = 'pilgrim' | 'admin' | 'moderator' | 'accommodation_manager';

export interface AuthUserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  sessionToken: string;
  expiresAt: string;
}

export interface PilgrimProfileDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
  lockerNumber: string | null;
  emergency: EmergencyContactProfileDTO | null;
  camino: CaminoProfileDTO;
  badges: string[];          // earned badge IDs
  vehicles: VehicleDTO[];
  belongings: BelongingDTO[];
}

export interface EmergencyContactProfileDTO {
  name: string;
  relation: string;
  phone: string;
  email: string | null;
}

export interface CaminoProfileDTO {
  route: string;
  startDate: string | null;
  origin: string | null;
  completedStageIds: string[];
}

export interface VehicleDTO {
  id: string;
  type: string;
  plate: string;
  model: string | null;
  color: string | null;
  notes: string | null;
}

export interface BelongingDTO {
  id: string;
  category: string;
  name: string;
  notes: string | null;
}

export interface UserStatsDTO {
  totalBookings: number;
  totalNights: number;
  totalKm: number;
  stamps: number;
  completedStages: number;
}
