import { serverFetch } from './core';
import { mapPilgrimProfile, mapUserStats, DEFAULT_PROFILE, DEFAULT_STATS } from '../mappers/user';
import type { PilgrimProfileDTO, UserStatsDTO } from '../contracts/user';

export async function getUserProfile(userToken: string): Promise<PilgrimProfileDTO> {
  const result = await serverFetch<Record<string, unknown>>('/api/users/profile', {}, userToken);
  if (!result.ok) return DEFAULT_PROFILE;
  return mapPilgrimProfile(result.data);
}

export async function getUserStats(userToken: string): Promise<UserStatsDTO> {
  const result = await serverFetch<Record<string, unknown>>('/api/camino/stats', {}, userToken);
  if (!result.ok) return DEFAULT_STATS;
  return mapUserStats(result.data);
}
