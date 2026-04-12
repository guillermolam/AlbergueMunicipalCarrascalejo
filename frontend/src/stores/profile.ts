/**
 * Profile Store — flat, typed nanostore for pilgrim profile data
 * Source of truth for all profile panels; syncs with Clerk metadata.
 *
 * Architecture:
 *   Clerk unsafeMetadata.pilgrimProfile → personal / camino / badges
 *   Clerk publicMetadata               → emergency / vehicles / belongings / pets / lockerNum
 *
 * All panel islands subscribe to this store and update it on save.
 * The store is NOT persisted to localStorage — it mirrors Clerk on load
 * to avoid stale data overriding server state.
 */

import { map } from 'nanostores';
import type {
  PhoneNumber,
  StructuredAddress,
  PilgrimDocument,
  EmergencyContactEntry,
  PilgrimVehicle,
  PilgrimBelonging,
  PilgrimPet,
} from '../types/pilgrim';

// ── Re-export canonical types under store-local aliases ───────────────────────

/** Canonical phone type — exported for backward compat */
export type { PhoneNumber, StructuredAddress, PilgrimDocument };

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Personal profile data sourced from Clerk unsafeMetadata.pilgrimProfile.
 * Phone and address support both new structured objects and legacy flat strings.
 */
export interface PersonalProfile {
  /** Structured phone (new) or flat E.164 string (legacy) */
  phone?: PhoneNumber | string;
  phoneCC?: string;
  dob?: string;
  nationality?: string;
  /** Structured address (new) or flat string (legacy) */
  address?: StructuredAddress | string;
  bio?: string;
  /** Legacy flat document fields (still written during booking check-in) */
  docType?: string;
  docId?: string;
  docUrl?: string;
  country?: string;
  /** Structured documents array (new — populated from Clerk unsafeMetadata) */
  documents?: PilgrimDocument[];
}

/**
 * Emergency contact (store alias for EmergencyContactEntry).
 * phone supports both structured objects (new) and flat strings (legacy).
 */
export type EmergencyContact = EmergencyContactEntry;

/** Vehicle registered by the pilgrim (store alias for PilgrimVehicle) */
export type Vehicle = PilgrimVehicle;

/** Stored item / belonging (store alias for PilgrimBelonging) */
export type Belonging = PilgrimBelonging;

/** Pet travelling with the pilgrim (store alias for PilgrimPet) */
export type Pet = PilgrimPet;

/** Camino journey data (store alias for CaminoMetadata) */
export interface CaminoData {
  stages?: string[];
  route?: string;
  start?: string;
  origin?: string;
  stageDetails?: Record<string, any>;
}

export interface ProfileStoreState {
  /** Loaded and ready (Clerk data has been read at least once) */
  ready: boolean;
  /** In-flight Clerk read/write */
  loading: boolean;
  /** Last error message, null when clean */
  error: string | null;

  // ── Panel data ─────────────────────────────────────────────────────────────
  personal: PersonalProfile;
  emergency: EmergencyContact;
  emergencyContacts: EmergencyContact[];
  vehicles: Vehicle[];
  belongings: Belonging[];
  pets: Pet[];
  lockerNum: string;
  camino: CaminoData;
  manualBadges: string[];
}

const DEFAULTS: ProfileStoreState = {
  ready: false,
  loading: false,
  error: null,
  personal: {},
  emergency: {},
  emergencyContacts: [],
  vehicles: [],
  belongings: [],
  pets: [],
  lockerNum: '',
  camino: {},
  manualBadges: [],
};

/**
 * Central profile store.
 * Import this in any island script; subscribe to get reactive updates.
 *
 * @example
 *   import { profileStore } from '../stores/profile';
 *   profileStore.subscribe(state => renderPersonalDisplay(state.personal));
 */
export const profileStore = map<ProfileStoreState>(DEFAULTS);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Merge raw Clerk metadata into the store */
export function syncStoreFromClerk(
  unsafe: Record<string, any>,
  pub: Record<string, any>
): void {
  const profile = (unsafe.pilgrimProfile as Record<string, any>) ?? {};
  profileStore.set({
    ...profileStore.get(),
    ready: true,
    loading: false,
    error: null,
    personal: {
      phone:       profile.phone,
      phoneCC:     profile.phoneCC,
      dob:         profile.dob,
      nationality: profile.nationality,
      address:     profile.address,
      bio:         profile.bio,
      docType:     profile.docType,
      docId:       profile.docId,
      docUrl:      profile.docUrl,
      country:     profile.country,
      documents:   profile.documents,
    },
    emergency:    (pub.emergency  as EmergencyContact) ?? {},
    emergencyContacts: (pub.emergencyContacts as EmergencyContact[]) ??
                       (pub.emergency ? [pub.emergency as EmergencyContact] : []),
    vehicles:     (pub.vehicles   as Vehicle[])        ?? [],
    belongings:   (pub.belongings as Belonging[])      ?? [],
    pets:         (pub.pets       as Pet[])            ?? [],
    lockerNum:    (pub.lockerNum  as string)           ?? '',
    camino:       (profile.camino as CaminoData)       ?? {},
    manualBadges: (profile.manualBadges as string[])   ?? [],
  });
}

/** Patch the personal sub-object and mark loading state */
export function patchPersonal(patch: Partial<PersonalProfile>): void {
  profileStore.setKey('personal', { ...profileStore.get().personal, ...patch });
}

/** Patch the emergency sub-object */
export function patchEmergency(patch: Partial<EmergencyContact>): void {
  profileStore.setKey('emergency', { ...profileStore.get().emergency, ...patch });
}

/** Replace the full emergency contacts array */
export function setEmergencyContacts(contacts: EmergencyContact[]): void {
  profileStore.setKey('emergencyContacts', contacts);
}

/** Replace the full vehicles array */
export function setVehicles(vehicles: Vehicle[]): void {
  profileStore.setKey('vehicles', vehicles);
}

/** Replace the full belongings array */
export function setBelongings(belongings: Belonging[]): void {
  profileStore.setKey('belongings', belongings);
}

/** Replace the full pets array */
export function setPets(pets: Pet[]): void {
  profileStore.setKey('pets', pets);
}

/** Update locker number */
export function setLockerNum(num: string): void {
  profileStore.setKey('lockerNum', num);
}

/** Update camino data */
export function setCamino(camino: CaminoData): void {
  profileStore.setKey('camino', camino);
}

/** Update manual badges */
export function setManualBadges(badges: string[]): void {
  profileStore.setKey('manualBadges', badges);
}

/** Set loading / error state */
export function setLoading(loading: boolean): void {
  profileStore.setKey('loading', loading);
}

export function setError(error: string | null): void {
  profileStore.setKey('error', error);
}
