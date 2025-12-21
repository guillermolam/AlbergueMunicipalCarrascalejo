export interface BookingData {
  pilgrimId: string
  arrivalDate: string
  departureDate: string
  nights: number
  roomType: 'shared' | 'private'
  guests: number
  specialRequests?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  totalAmount: number
  currency: string
}

export interface BookingResponse {
  bookingId: string
  status: string
  confirmationCode: string
  estimatedAmount: number
  expiresAt: string
}

export interface AvailabilityRequest {
  arrivalDate: string
  departureDate: string
  guests: number
  roomType?: 'shared' | 'private'
}

export interface AvailabilityResponse {
  available: boolean
  availableRooms: number
  pricePerNight: number
  totalPrice: number
  currency: string
}

export async function checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
  const response = await fetch('/api/booking/availability', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Availability check failed')
  }

  return response.json()
}

export async function createBooking(bookingData: BookingData): Promise<BookingResponse> {
  const response = await fetch('/api/booking/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  })

  if (!response.ok) {
    throw new Error('Booking creation failed')
  }

  return response.json()
}

export async function confirmBooking(bookingId: string): Promise<BookingResponse> {
  const response = await fetch(`/api/booking/${bookingId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Booking confirmation failed')
  }

  return response.json()
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const response = await fetch(`/api/booking/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Booking cancellation failed')
  }
}

export async function getBooking(bookingId: string): Promise<BookingData & { bookingId: string }> {
  const response = await fetch(`/api/booking/${bookingId}`)

  if (!response.ok) {
    throw new Error('Booking retrieval failed')
  }

  return response.json()
}