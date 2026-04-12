export type BookingStatus =
  | 'reserved'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'expired';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'online';

export interface BookingDTO {
  id: string;
  referenceNumber: string;
  checkInDate: string; // ISO date "YYYY-MM-DD"
  checkOutDate: string;
  nights: number;
  numberOfPersons: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  bedId: string | null;
  bedNumber: number | null;
  roomType: string | null;
  estimatedArrivalTime: string | null;
  notes: string | null;
  createdAt: string;
}

export interface BookingListDTO {
  bookings: BookingDTO[];
  total: number;
  upcoming: BookingDTO[];
  past: BookingDTO[];
}

export interface CreateBookingRequest {
  checkInDate: string;
  checkOutDate: string;
  numberOfPersons: number;
  pilgrimId?: string;
  notes?: string;
  estimatedArrivalTime?: string;
}

export interface CreateBookingResponse {
  booking: BookingDTO;
  paymentDeadline: string;
  confirmationCode: string;
}

export interface AvailabilityRequest {
  checkIn: string;
  checkOut: string;
  persons?: number;
}

export interface AvailabilityResponse {
  available: boolean;
  beds: import('./hostel').BedAvailabilityDTO[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  expires: string; // ISO timestamp — reservation holds until
}
