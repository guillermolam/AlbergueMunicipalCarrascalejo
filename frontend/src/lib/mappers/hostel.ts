import type {
  HostelServiceDTO,
  HostelScheduleDTO,
  PricingRuleDTO,
  EmergencyContactDTO,
  HostelContactDTO,
  DashboardStatsDTO,
} from '../contracts/hostel';

// Maps raw backend response → clean frontend DTO

export function mapService(raw: Record<string, unknown>): HostelServiceDTO {
  return {
    id: String(raw.id ?? ''),
    icon: String(raw.icon ?? ''),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? raw.price_per_use ?? 0),
    unit: String(raw.unit ?? raw.billing_unit ?? 'por uso'),
    description: String(raw.description ?? raw.desc ?? ''),
    available: Boolean(raw.available ?? raw.is_available ?? raw.enabled ?? true),
  };
}

export function mapSchedule(raw: Record<string, unknown>): HostelScheduleDTO {
  return {
    checkIn: String(raw.check_in ?? raw.checkIn ?? '14:00'),
    checkInEnd: String(raw.check_in_end ?? raw.checkInEnd ?? '22:00'),
    checkOut: String(raw.check_out ?? raw.checkOut ?? '09:00'),
    reception: String(raw.reception ?? '08:00–22:00'),
    keyAvailable: Boolean(raw.key_available ?? raw.keyAvailable ?? true),
  };
}

export function mapPricingRule(raw: Record<string, unknown>): PricingRuleDTO {
  return {
    id: String(raw.id ?? ''),
    roomType: (raw.room_type ?? raw.roomType ?? 'dorm_a') as PricingRuleDTO['roomType'],
    pricePerNight: Number(raw.price_per_night ?? raw.pricePerNight ?? 15),
    currency: String(raw.currency ?? 'EUR'),
    seasonalMultiplier: Number(raw.seasonal_multiplier ?? raw.seasonalMultiplier ?? 1.0),
    effectiveDate: String(
      raw.effective_date ?? raw.effectiveDate ?? new Date().toISOString().slice(0, 10)
    ),
    specialEvent: raw.special_event ? String(raw.special_event) : null,
  };
}

export function mapEmergencyContact(raw: Record<string, unknown>): EmergencyContactDTO {
  const number = String(raw.phone ?? raw.number ?? '');
  return {
    type: (raw.type ?? 'local') as EmergencyContactDTO['type'],
    name: String(raw.name ?? ''),
    number,
    href:
      number.startsWith('+') || /^\d/.test(number) ? `tel:${number.replace(/\s/g, '')}` : number,
    emoji: String(raw.emoji ?? '📞'),
  };
}

export function mapContact(raw: Record<string, unknown>): HostelContactDTO {
  const phone = String(raw.phone ?? '');
  const wa = raw.whatsapp ? String(raw.whatsapp) : null;
  const tg = raw.telegram ? String(raw.telegram) : null;
  return {
    phone,
    whatsapp: wa
      ? wa.startsWith('https://')
        ? wa
        : `https://wa.me/${wa.replace(/[^0-9]/g, '')}`
      : null,
    telegram: tg ? (tg.startsWith('https://') ? tg : `https://t.me/${tg.replace('@', '')}`) : null,
    email: String(raw.email ?? ''),
  };
}

export function mapDashboardStats(raw: Record<string, unknown>): DashboardStatsDTO {
  return {
    totalBookings: Number(raw.total_bookings ?? raw.totalBookings ?? 0),
    upcomingCheckIns: Number(raw.upcoming_check_ins ?? raw.upcomingCheckIns ?? 0),
    currentGuests: Number(raw.current_guests ?? raw.currentGuests ?? 0),
    confirmedBookings: Number(raw.confirmed_bookings ?? raw.confirmedBookings ?? 0),
    pendingBookings: Number(raw.pending_bookings ?? raw.pendingBookings ?? 0),
    occupancyRate: Number(raw.occupancy_rate ?? raw.occupancyRate ?? 0),
  };
}

// Fallback defaults when API is unavailable (graceful degradation)
export const DEFAULT_SCHEDULE: HostelScheduleDTO = {
  checkIn: '14:00',
  checkInEnd: '22:00',
  checkOut: '09:00',
  reception: '08:00–22:00',
  keyAvailable: true,
};

export const DEFAULT_STATS: DashboardStatsDTO = {
  totalBookings: 0,
  upcomingCheckIns: 0,
  currentGuests: 0,
  confirmedBookings: 0,
  pendingBookings: 0,
  occupancyRate: 0,
};
