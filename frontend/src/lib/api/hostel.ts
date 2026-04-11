import { serverFetch, apiFetch } from './core';
import {
  mapService,
  mapSchedule,
  mapPricingRule,
  mapEmergencyContact,
  mapContact,
  mapDashboardStats,
  DEFAULT_SCHEDULE,
  DEFAULT_STATS,
} from '../mappers/hostel';
import type {
  HostelServiceDTO,
  HostelScheduleDTO,
  PricingRuleDTO,
  EmergencyContactDTO,
  HostelContactDTO,
  HostelWifiDTO,
  DashboardStatsDTO,
} from '../contracts/hostel';

export async function getServices(token?: string): Promise<HostelServiceDTO[]> {
  const result = await serverFetch<unknown[]>('/api/accommodation/services', {}, token);
  if (!result.ok) return [];
  return (Array.isArray(result.data) ? result.data : []).map(s =>
    mapService(s as Record<string, unknown>)
  );
}

export async function getSchedule(token?: string): Promise<HostelScheduleDTO> {
  const result = await serverFetch<Record<string, unknown>>('/api/accommodation/schedule', {}, token);
  if (!result.ok) return DEFAULT_SCHEDULE;
  return mapSchedule(result.data);
}

export async function getPricingRules(token?: string): Promise<PricingRuleDTO[]> {
  const result = await serverFetch<unknown>('/api/pricing', {}, token);
  if (!result.ok) return [];
  const data = result.data as Record<string, unknown>;
  const list = Array.isArray(data) ? data : Array.isArray(data?.pricing) ? data.pricing as unknown[] : [];
  return (list as Record<string, unknown>[]).map(mapPricingRule);
}

export async function getEffectivePrice(
  roomType: string,
  checkIn: string,
  _token?: string
): Promise<number> {
  const rules = await getPricingRules(_token);
  const applicable = rules
    .filter(r => r.roomType === roomType && r.effectiveDate <= checkIn)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  if (!applicable.length) return 15; // fallback default
  const rule = applicable[0];
  return Math.round(rule.pricePerNight * rule.seasonalMultiplier * 100) / 100;
}

export async function getEmergencyContacts(token?: string): Promise<EmergencyContactDTO[]> {
  const result = await serverFetch<unknown[]>('/api/info/emergency-contacts', {}, token);
  if (!result.ok) return [];
  return (Array.isArray(result.data) ? result.data : []).map(c =>
    mapEmergencyContact(c as Record<string, unknown>)
  );
}

export async function getHostelContact(token?: string): Promise<HostelContactDTO | null> {
  const result = await serverFetch<Record<string, unknown>>('/api/info/carrascalejo-info', {}, token);
  if (!result.ok) return null;
  const raw = result.data?.contact ?? result.data;
  return mapContact(raw as Record<string, unknown>);
}

export async function getWifiConfig(userToken: string): Promise<HostelWifiDTO | null> {
  const result = await serverFetch<Record<string, unknown>>('/api/accommodation/wifi', {}, userToken);
  if (!result.ok) return null;
  return {
    ssid: String(result.data.ssid ?? ''),
    password: String(result.data.password ?? ''),
    security: (result.data.security ?? 'WPA2') as HostelWifiDTO['security'],
    coverageZones: Array.isArray(result.data.coverage_zones)
      ? (result.data.coverage_zones as unknown[]).map(String)
      : ['Dormitorios', 'Salón', 'Jardín'],
  };
}

export interface HostelConfig {
  name: string;
  tagline: string;
  address_street: string;
  address_postcode: string;
  address_town: string;
  address_province: string;
  address_country: string;
  phone: string;
  email: string;
  website: string;
  cif: string;
  tourism_license: string;
  insurance_policy: string;
  check_in_time: string;
  check_out_time: string;
  reception_hours: string;
  latitude?: number;
  longitude?: number;
}

export async function getHostelInfo(token?: string): Promise<HostelConfig | null> {
  const result = token
    ? await serverFetch<HostelConfig>('/api/info/hostel', {}, token)
    : await apiFetch<HostelConfig>('/api/info/hostel');
  return result.ok ? result.data : null;
}

export async function getDashboardStats(adminToken: string): Promise<DashboardStatsDTO> {
  const result = await serverFetch<Record<string, unknown>>(
    '/api/dashboard/stats',
    {},
    adminToken
  );
  if (!result.ok) return DEFAULT_STATS;
  return mapDashboardStats(result.data);
}

