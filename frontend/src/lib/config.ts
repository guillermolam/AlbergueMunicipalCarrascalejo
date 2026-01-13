// Shared configuration and utilities
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '/api';
export const APP_NAME = 'Albergue Municipal Carrascalejo';
export const APP_VERSION = '1.0.0';

export const ROUTES = {
  HOME: '/',
  BOOKING: '/booking',
  AUTH: '/auth',
  ADMIN: '/admin',
  DASHBOARD: '/dashboard',
  INFO: '/info',
  CONTACT: '/contact',
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  INPUT: 'YYYY-MM-DD',
} as const;

export const CURRENCIES = {
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
} as const;

export const ROOM_TYPES = {
  SHARED: { id: 'shared', name: 'Shared Room', maxGuests: 8 },
  PRIVATE: { id: 'private', name: 'Private Room', maxGuests: 2 },
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// Utility functions
export function formatCurrency(amount: number, currency: keyof typeof CURRENCIES = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: string | Date, format: string = DATE_FORMATS.DISPLAY): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === DATE_FORMATS.DISPLAY) {
    return dateObj.toLocaleDateString('es-ES');
  }

  return dateObj.toISOString().split('T')[0];
}

export function calculateNights(arrivalDate: string, departureDate: string): number {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const diffTime = departure.getTime() - arrival.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
}

export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${timestamp}${random}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
