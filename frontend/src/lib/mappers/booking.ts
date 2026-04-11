import type { BookingDTO, BookingListDTO } from '../contracts/booking';

export function mapBooking(raw: Record<string, unknown>): BookingDTO {
  const checkIn = String(raw.check_in_date ?? raw.checkInDate ?? raw.check_in ?? '');
  const checkOut = String(raw.check_out_date ?? raw.checkOutDate ?? raw.check_out ?? '');
  const nights = raw.number_of_nights
    ? Number(raw.number_of_nights)
    : raw.nights
    ? Number(raw.nights)
    : checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
    : 0;

  return {
    id: String(raw.id ?? ''),
    referenceNumber: String(raw.reference_number ?? raw.referenceNumber ?? raw.ref ?? ''),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    nights,
    numberOfPersons: Number(raw.number_of_persons ?? raw.numberOfPersons ?? raw.persons ?? 1),
    status: (raw.status ?? 'reserved') as BookingDTO['status'],
    paymentStatus: (raw.payment_status ?? raw.paymentStatus ?? 'pending') as BookingDTO['paymentStatus'],
    totalAmount: Number(raw.total_amount ?? raw.totalAmount ?? raw.total ?? 0),
    currency: String(raw.currency ?? 'EUR'),
    bedId: raw.bed_id ? String(raw.bed_id) : null,
    bedNumber: raw.bed_number ? Number(raw.bed_number) : null,
    roomType: raw.room_type ? String(raw.room_type) : null,
    estimatedArrivalTime: raw.estimated_arrival_time ? String(raw.estimated_arrival_time) : null,
    notes: raw.notes ? String(raw.notes) : null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
  };
}

export function mapBookingList(raw: unknown): BookingListDTO {
  const items: BookingDTO[] = Array.isArray(raw)
    ? raw.map(b => mapBooking(b as Record<string, unknown>))
    : Array.isArray((raw as Record<string, unknown>)?.bookings)
    ? ((raw as Record<string, unknown>).bookings as unknown[]).map(b =>
        mapBooking(b as Record<string, unknown>)
      )
    : [];

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter(b => b.checkInDate >= now && b.status !== 'cancelled' && b.status !== 'expired');
  const past = items.filter(b => b.checkOutDate < now || b.status === 'checked_out');

  return {
    bookings: items,
    total: items.length,
    upcoming,
    past,
  };
}

/** Format a booking date for display in Spanish */
export function formatBookingDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/** Format a booking reference for display */
export function formatRef(ref: string): string {
  return ref.startsWith('BK-') ? ref : `BK-${ref}`;
}
