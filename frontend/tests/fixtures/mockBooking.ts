// Mock data for testing - DO NOT USE IN PRODUCTION

// Bed organization: 3 dorms with 4 double beds each (8 beds per dorm)
const DORMS = [
  { name: 'D1', beds: Array.from({ length: 8 }, (_, i) => `D1-${i + 1}`) },
  { name: 'D2', beds: Array.from({ length: 8 }, (_, i) => `D2-${i + 1}`) },
  { name: 'D3', beds: Array.from({ length: 8 }, (_, i) => `D3-${i + 1}`) },
];

// Mock booking data
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
  numberOfNights: 2,
  numberOfPersons: 1,
  numberOfRooms: 1,
  bedAssignmentId: 1,
  bedNumber: 'D1-01',
  status: 'confirmed',
  totalAmount: 30,
  currency: 'EUR',
  createdAt: '2024-07-25T10:00:00Z'
};

// Comprehensive mock bed status data
export const mockBedStatus = [
  // Dorm 1 (D1)
  { 
    id: 1, 
    bedNumber: 'D1-01', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'occupied', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    guest: 'María Rodríguez',
    lastCleanedAt: '2024-07-24T12:00:00Z'
  },
  { 
    id: 2, 
    bedNumber: 'D1-02', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 3, 
    bedNumber: 'D1-03', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'reserved', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    reservedUntil: '2024-07-28T14:00:00Z',
    guest: 'Pierre Dubois'
  },
  { 
    id: 4, 
    bedNumber: 'D1-04', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'maintenance', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    maintenanceNotes: 'Mattress replacement needed'
  },
  { 
    id: 5, 
    bedNumber: 'D1-05', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 6, 
    bedNumber: 'D1-06', 
    roomName: 'D1', 
    roomType: 'dormitory', 
    status: 'cleaning', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR'
  },

  // Dorm 2 (D2)
  { 
    id: 7, 
    bedNumber: 'D2-01', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 8, 
    bedNumber: 'D2-02', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'occupied', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    guest: 'Hans Mueller',
    lastCleanedAt: '2024-07-23T15:00:00Z'
  },
  { 
    id: 9, 
    bedNumber: 'D2-03', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'maintenance', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    maintenanceNotes: 'Light fixture broken'
  },
  { 
    id: 10, 
    bedNumber: 'D2-04', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 11, 
    bedNumber: 'D2-05', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 12, 
    bedNumber: 'D2-06', 
    roomName: 'D2', 
    roomType: 'dormitory', 
    status: 'cleaning', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR'
  },

  // Dorm 3 (D3)
  { 
    id: 13, 
    bedNumber: 'D3-01', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 14, 
    bedNumber: 'D3-02', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'occupied', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    guest: 'Ana Sánchez',
    lastCleanedAt: '2024-07-24T10:00:00Z'
  },
  { 
    id: 15, 
    bedNumber: 'D3-03', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'maintenance', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR',
    maintenanceNotes: 'Window screen needs repair'
  },
  { 
    id: 16, 
    bedNumber: 'D3-04', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 17, 
    bedNumber: 'D3-05', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'available', 
    isAvailable: true,
    pricePerNight: 15,
    currency: 'EUR'
  },
  { 
    id: 18, 
    bedNumber: 'D3-06', 
    roomName: 'D3', 
    roomType: 'dormitory', 
    status: 'cleaning', 
    isAvailable: false,
    pricePerNight: 15,
    currency: 'EUR'
  }
];