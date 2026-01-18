import { atom } from 'nanostores';

export interface Pilgrim {
  id: string;
  name: string;
  email: string;
  country?: string;
  phone?: string;
  arrivalDate?: string;
  departureDate?: string;
  nights?: number;
  roomType?: 'shared' | 'private';
  status?: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export type UserPreferences = {
  language: string;
  theme: 'light' | 'dark';
  notifications: boolean;
};

export const currentUser = atom<Pilgrim | null>(null);

export const userPreferences = atom<UserPreferences>({
  language: 'es',
  theme: 'light',
  notifications: true,
});

export const bookingCart = atom<{
  pilgrim: Pilgrim | null;
  roomId: string | null;
  nights: number;
  total: number;
}>({
  pilgrim: null,
  roomId: null,
  nights: 0,
  total: 0,
});

export function setCurrentUser(user: Pilgrim) {
  currentUser.set(user);
}

export function clearCurrentUser() {
  currentUser.set(null);
}

export function updateUserPreferences(updates: Partial<UserPreferences>) {
  userPreferences.set({ ...userPreferences.get(), ...updates });
}

export function updateBookingCart(
  updates: Partial<{
    pilgrim: Pilgrim | null;
    roomId: string | null;
    nights: number;
    total: number;
  }>
) {
  bookingCart.set({ ...bookingCart.get(), ...updates });
}

export function clearBookingCart() {
  bookingCart.set({
    pilgrim: null,
    roomId: null,
    nights: 0,
    total: 0,
  });
}
