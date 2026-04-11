// Hostel configuration DTOs — read models consumed by the frontend
// These are shaped by what the backend/admin control plane exposes

export interface HostelScheduleDTO {
  checkIn: string;      // e.g. "14:00"
  checkInEnd: string;   // e.g. "22:00"
  checkOut: string;     // e.g. "09:00"
  reception: string;    // e.g. "08:00–22:00"
  keyAvailable: boolean; // 24h key access
}

export interface HostelServiceDTO {
  id: string;
  icon: string;
  name: string;
  price: number;        // EUR
  unit: string;         // "por uso", "por noche", "por hora", etc.
  description: string;
  available: boolean;
}

export interface HostelWifiDTO {
  ssid: string;
  password: string;
  security: 'WPA2' | 'WPA3' | 'open';
  coverageZones: string[];
}

export interface HostelContactDTO {
  phone: string;
  whatsapp: string | null;   // full wa.me URL or null
  telegram: string | null;   // t.me URL or null
  email: string;
}

export interface PricingRuleDTO {
  id: string;
  roomType: 'dorm_a' | 'dorm_b' | 'private';
  pricePerNight: number;
  currency: string;
  seasonalMultiplier: number;
  effectiveDate: string;      // ISO date
  specialEvent: string | null;
}

export interface BedAvailabilityDTO {
  bedId: string;
  bedNumber: number;
  roomType: string;
  bedType: string;
  available: boolean;
  pricePerNight: number;
}

export interface RoomAvailabilityDTO {
  checkIn: string;
  checkOut: string;
  available: boolean;
  beds: BedAvailabilityDTO[];
  totalAvailable: number;
}

export interface EmergencyContactDTO {
  type: 'national' | 'local' | 'hostel';
  name: string;
  number: string;
  href: string;        // tel: or wa.me: link
  emoji: string;
}

export interface DashboardStatsDTO {
  totalBookings: number;
  upcomingCheckIns: number;
  currentGuests: number;
  confirmedBookings: number;
  pendingBookings: number;
  occupancyRate: number;   // 0–100
}

// Admin-specific shape (editable)
export interface AdminServiceEditDTO extends HostelServiceDTO {
  enabled: boolean;
}

export interface AdminPricingEditDTO extends PricingRuleDTO {
  label: string;
  fromDate: string;
  toDate: string;
}

export interface AdminScheduleEditDTO extends HostelScheduleDTO {
  updatedAt: string;
}
