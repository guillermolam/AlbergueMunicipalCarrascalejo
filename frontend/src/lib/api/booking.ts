import { serverFetch, apiFetch } from './core';
import { mapBooking, mapBookingList } from '../mappers/booking';
import type {
  BookingDTO,
  BookingListDTO,
  CreateBookingRequest,
  CreateBookingResponse,
  AvailabilityRequest,
  AvailabilityResponse,
} from '../contracts/booking';

export async function getUserBookings(userToken: string): Promise<BookingListDTO> {
  const result = await serverFetch<unknown>('/api/bookings', {}, userToken);
  if (!result.ok) return { bookings: [], total: 0, upcoming: [], past: [] };
  return mapBookingList(result.data);
}

export async function getBookingByRef(ref: string, userToken?: string): Promise<BookingDTO | null> {
  const result = await serverFetch<Record<string, unknown>>(
    `/api/bookings/${encodeURIComponent(ref)}`,
    {},
    userToken
  );
  if (!result.ok) return null;
  return mapBooking(result.data);
}

export async function checkAvailability(
  req: AvailabilityRequest
): Promise<AvailabilityResponse | null> {
  const result = await apiFetch<AvailabilityResponse>('/api/bookings/availability', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  if (!result.ok) return null;
  return result.data;
}

export async function createBooking(
  req: CreateBookingRequest,
  userToken?: string
): Promise<CreateBookingResponse | null> {
  const result = await apiFetch<CreateBookingResponse>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
  });
  if (!result.ok) return null;
  return result.data;
}
