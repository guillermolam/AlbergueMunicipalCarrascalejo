import { atom, map } from 'nanostores';

// Booking state types
export interface BookingState {
  checkInDate: string | null;
  checkOutDate: string | null;
  numberOfGuests: number;
  pilgrims: Pilgrim[];
  selectedBedIds: string[];
  totalPrice: number;
  currency: string;
  currentStep: number;
  bookingId: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  contactInfo: ContactInfo;
  paymentInfo: PaymentInfo;
}

export interface Pilgrim {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  idType: 'dni' | 'passport' | 'nie';
  idNumber: string;
  idFile?: File;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  specialNeeds?: string;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface PaymentInfo {
  method: 'card' | 'paypal' | 'bank_transfer' | 'cash';
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cvv?: string;
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

// Initial state
const initialBookingState: BookingState = {
  checkInDate: null,
  checkOutDate: null,
  numberOfGuests: 1,
  pilgrims: [],
  selectedBedIds: [],
  totalPrice: 0,
  currency: 'EUR',
  currentStep: 1,
  bookingId: null,
  status: 'draft',
  contactInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  },
  paymentInfo: {
    method: 'card',
  },
};

// Create the booking store
export const bookingStore = map<BookingState>(initialBookingState);

// Booking actions
export const bookingActions = {
  // Date management
  setCheckInDate: (date: string) => {
    bookingStore.setKey('checkInDate', date);
  },
  
  setCheckOutDate: (date: string) => {
    bookingStore.setKey('checkOutDate', date);
  },
  
  // Guest management
  setNumberOfGuests: (count: number) => {
    bookingStore.setKey('numberOfGuests', count);
  },
  
  addPilgrim: (pilgrim: Omit<Pilgrim, 'id'>) => {
    const newPilgrim: Pilgrim = {
      ...pilgrim,
      id: `pilgrim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    bookingStore.setKey('pilgrims', [...bookingStore.get().pilgrims, newPilgrim]);
  },
  
  updatePilgrim: (id: string, updates: Partial<Pilgrim>) => {
    const pilgrims = bookingStore.get().pilgrims.map(pilgrim =>
      pilgrim.id === id ? { ...pilgrim, ...updates } : pilgrim
    );
    bookingStore.setKey('pilgrims', pilgrims);
  },
  
  removePilgrim: (id: string) => {
    const pilgrims = bookingStore.get().pilgrims.filter(pilgrim => pilgrim.id !== id);
    bookingStore.setKey('pilgrims', pilgrims);
  },
  
  // Bed selection
  selectBed: (bedId: string) => {
    const currentBeds = bookingStore.get().selectedBedIds;
    if (!currentBeds.includes(bedId)) {
      bookingStore.setKey('selectedBedIds', [...currentBeds, bedId]);
    }
  },
  
  deselectBed: (bedId: string) => {
    const currentBeds = bookingStore.get().selectedBedIds;
    bookingStore.setKey('selectedBedIds', currentBeds.filter(id => id !== bedId));
  },
  
  clearBedSelection: () => {
    bookingStore.setKey('selectedBedIds', []);
  },
  
  // Pricing
  setTotalPrice: (price: number) => {
    bookingStore.setKey('totalPrice', price);
  },
  
  setCurrency: (currency: string) => {
    bookingStore.setKey('currency', currency);
  },
  
  // Booking flow
  setCurrentStep: (step: number) => {
    bookingStore.setKey('currentStep', step);
  },
  
  nextStep: () => {
    const currentStep = bookingStore.get().currentStep;
    bookingStore.setKey('currentStep', currentStep + 1);
  },
  
  previousStep: () => {
    const currentStep = bookingStore.get().currentStep;
    if (currentStep > 1) {
      bookingStore.setKey('currentStep', currentStep - 1);
    }
  },
  
  // Contact info
  setContactInfo: (info: Partial<ContactInfo>) => {
    const current = bookingStore.get().contactInfo;
    bookingStore.setKey('contactInfo', { ...current, ...info });
  },
  
  // Payment info
  setPaymentInfo: (info: Partial<PaymentInfo>) => {
    const current = bookingStore.get().paymentInfo;
    bookingStore.setKey('paymentInfo', { ...current, ...info });
  },
  
  // Booking completion
  setBookingId: (id: string) => {
    bookingStore.setKey('bookingId', id);
  },
  
  setStatus: (status: BookingState['status']) => {
    bookingStore.setKey('status', status);
  },
  
  // Reset booking
  resetBooking: () => {
    bookingStore.set(initialBookingState);
  },
  
  // Load booking from storage
  loadBooking: (bookingData: Partial<BookingState>) => {
    bookingStore.set({ ...initialBookingState, ...bookingData });
  },
};

// Computed values
export const bookingSelectors = {
  isBookingValid: () => {
    const state = bookingStore.get();
    return (
      state.checkInDate &&
      state.checkOutDate &&
      state.pilgrims.length > 0 &&
      state.selectedBedIds.length === state.numberOfGuests &&
      state.contactInfo.email &&
      state.contactInfo.firstName &&
      state.contactInfo.lastName
    );
  },
  
  getBookingDuration: () => {
    const state = bookingStore.get();
    if (!state.checkInDate || !state.checkOutDate) return 0;
    
    const checkIn = new Date(state.checkInDate);
    const checkOut = new Date(state.checkOutDate);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },
  
  getSelectedBedsCount: () => {
    return bookingStore.get().selectedBedIds.length;
  },
  
  isStepComplete: (step: number) => {
    const state = bookingStore.get();
    
    switch (step) {
      case 1: // Dates
        return !!state.checkInDate && !!state.checkOutDate;
      case 2: // Guests
        return state.pilgrims.length === state.numberOfGuests;
      case 3: // Beds
        return state.selectedBedIds.length === state.numberOfGuests;
      case 4: // Contact
        return !!state.contactInfo.email && !!state.contactInfo.firstName && !!state.contactInfo.lastName;
      case 5: // Payment
        return !!state.paymentInfo.method;
      default:
        return false;
    }
  },
};

// Persistence
export const persistBooking = () => {
  const state = bookingStore.get();
  localStorage.setItem('albergue-booking', JSON.stringify(state));
};

export const loadPersistedBooking = () => {
  const stored = localStorage.getItem('albergue-booking');
  if (stored) {
    try {
      const bookingData = JSON.parse(stored);
      bookingActions.loadBooking(bookingData);
    } catch (error) {
      console.error('Error loading persisted booking:', error);
    }
  }
};

// Auto-persist on changes
bookingStore.subscribe(persistBooking);

// Load persisted booking on initialization
if (typeof window !== 'undefined') {
  loadPersistedBooking();
}