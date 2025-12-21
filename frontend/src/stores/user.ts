import { persistentMap } from "@nanostores/persistent";
import { atom } from "nanostores";

// SSR-safe initialization
const isServer = typeof window === "undefined";

export interface Pilgrim {
  id: string;
  name: string;
  email: string;
  country?: string;
  phone?: string;
  arrivalDate?: string;
  departureDate?: string;
  nights?: number;
  roomType?: "shared" | "private";
  status?: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export const currentUser = atom<Pilgrim | null>(null);

export const userPreferences = persistentMap<{
  language: string;
  theme: "light" | "dark";
  notifications: boolean;
}>(
  "preferences:",
  {
    language: "es",
    theme: "light",
    notifications: true,
  },
  {
    // SSR-safe: only persist on client side
    encode: isServer ? () => "" : undefined,
    decode: isServer ? () => ({}) : undefined,
  },
);

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

export function updateUserPreferences(
  updates: Partial<{
    language: string;
    theme: "light" | "dark";
    notifications: boolean;
  }>,
) {
  userPreferences.set(updates);
}

export function updateBookingCart(
  updates: Partial<{
    pilgrim: Pilgrim | null;
    roomId: string | null;
    nights: number;
    total: number;
  }>,
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
