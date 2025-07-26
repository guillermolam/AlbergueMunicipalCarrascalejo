// Mock data for testing - DO NOT USE IN PRODUCTION
export const mockBookingData = {
  id: 'test-booking-123',
  guestName: 'Juan García López',
  email: 'juan.test@example.com',
  phone: '+34600000000',
  nationality: 'ESP',
  documentType: 'DNI',
  documentNumber: '12345678A',
  checkIn: '2024-08-01T14:00:00Z',
  checkOut: '2024-08-03T12:00:00Z',
  bedType: 'dorm',
  bedNumber: 'A-05',
  status: 'confirmed',
  totalPrice: 30,
  createdAt: '2024-07-25T10:00:00Z'
}

export const mockBedStatus = [
  { id: 'A-01', type: 'dorm', status: 'occupied', guest: 'María Rodríguez' },
  { id: 'A-02', type: 'dorm', status: 'available' },
  { id: 'A-03', type: 'dorm', status: 'reserved', guest: 'Pierre Dubois' },
  { id: 'A-04', type: 'dorm', status: 'maintenance' },
  { id: 'A-05', type: 'dorm', status: 'available' },
  { id: 'P-01', type: 'private', status: 'occupied', guest: 'Hans Mueller' },
  { id: 'P-02', type: 'private', status: 'available' }
]