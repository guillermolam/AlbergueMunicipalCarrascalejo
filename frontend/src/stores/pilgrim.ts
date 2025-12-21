// Secure and efficient stores for pilgrim management
// SSR-compatible nanostores with encryption and validation

import { atom, map, computed } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';
import type {
  PilgrimProfile,
  Pilgrimage,
  Booking,
  ProgressTracking,
  HealthSafety,
  SocialProfile,
  UserAuth,
  ValidationResult,
  ApiResponse,
} from '@/types/pilgrim';
import type { CreatePilgrimProfileDto, UpdatePilgrimProfileDto } from '@/types/pilgrim-operations';

// SSR-safe environment check
const isServer = typeof window === 'undefined';

/**
 * Encryption helper for sensitive data (simplified - use proper crypto in production)
 */
class DataEncryption {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  encrypt(data: any): string {
    if (isServer) return JSON.stringify(data);
    // In production, use proper encryption like crypto.subtle
    return btoa(JSON.stringify(data) + this.key);
  }
  
  decrypt(encrypted: string): any {
    if (isServer) return JSON.parse(encrypted);
    try {
      const decoded = atob(encrypted);
      return JSON.parse(decoded.replace(this.key, ''));
    } catch {
      return null;
    }
  }
}

const encryption = new DataEncryption('pilgrim-secure-key-v1');

/**
 * Pilgrim Profile Store
 * Manages pilgrim personal information and profile data
 */
export const pilgrimProfileStore = persistentMap<{
  currentProfile: PilgrimProfile | null;
  profiles: Record<string, PilgrimProfile>;
  isLoading: boolean;
  error: string | null;
}>('pilgrim:profile:', {
  currentProfile: null,
  profiles: {},
  isLoading: false,
  error: null,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { currentProfile: null, profiles: {}, isLoading: false, error: null };
  }
});

/**
 * Current Pilgrimage Store
 * Manages active pilgrimage data and progress
 */
export const currentPilgrimageStore = persistentMap<{
  pilgrimage: Pilgrimage | null;
  progress: ProgressTracking | null;
  isActive: boolean;
  lastUpdate: string | null;
}>('pilgrim:pilgrimage:', {
  pilgrimage: null,
  progress: null,
  isActive: false,
  lastUpdate: null,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { pilgrimage: null, progress: null, isActive: false, lastUpdate: null };
  }
});

/**
 * Bookings Store
 * Manages accommodation bookings
 */
export const bookingsStore = persistentMap<{
  bookings: Record<string, Booking>;
  upcomingBookings: string[];
  pastBookings: string[];
  isLoading: boolean;
}>('pilgrim:bookings:', {
  bookings: {},
  upcomingBookings: [],
  pastBookings: [],
  isLoading: false,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { bookings: {}, upcomingBookings: [], pastBookings: [], isLoading: false };
  }
});

/**
 * Health & Safety Store
 * Manages health tracking and safety incidents
 */
export const healthSafetyStore = persistentMap<{
  healthData: HealthSafety | null;
  dailyChecks: Record<string, any>;
  incidents: Record<string, any>;
  emergencyContacts: any[];
}>('pilgrim:health:', {
  healthData: null,
  dailyChecks: {},
  incidents: {},
  emergencyContacts: [],
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { healthData: null, dailyChecks: {}, incidents: {}, emergencyContacts: [] };
  }
});

/**
 * Social Profile Store
 * Manages social features and community interactions
 */
export const socialProfileStore = persistentMap<{
  socialProfile: SocialProfile | null;
  friends: string[];
  friendRequests: any[];
  blockedUsers: string[];
  isLookingForCompanions: boolean;
}>('pilgrim:social:', {
  socialProfile: null,
  friends: [],
  friendRequests: [],
  blockedUsers: [],
  isLookingForCompanions: false,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { socialProfile: null, friends: [], friendRequests: [], blockedUsers: [], isLookingForCompanions: false };
  }
});

/**
 * User Authentication Store
 * Manages user authentication and authorization
 */
export const userAuthStore = persistentMap<{
  userAuth: UserAuth | null;
  isAuthenticated: boolean;
  sessionToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
}>('pilgrim:auth:', {
  userAuth: null,
  isAuthenticated: false,
  sessionToken: null,
  refreshToken: null,
  expiresAt: null,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    return encryption.encrypt(value);
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    return encryption.decrypt(value) || { userAuth: null, isAuthenticated: false, sessionToken: null, refreshToken: null, expiresAt: null };
  }
});

/**
 * UI State Store
 * Manages UI-related state
 */
export const uiStateStore = atom({
  isLoading: false,
  error: null as string | null,
  success: null as string | null,
  currentPage: 'home',
  modal: {
    isOpen: false,
    type: null as string | null,
    data: null as any,
  },
  sidebar: {
    isOpen: false,
    activeSection: 'profile',
  },
});

/**
 * Computed stores for derived data
 */

// Current pilgrim profile
export const currentProfile = computed(pilgrimProfileStore, (state) => state.currentProfile);

// Is pilgrimage active
export const isPilgrimageActive = computed(currentPilgrimageStore, (state) => state.isActive);

// Progress percentage
export const pilgrimageProgress = computed(currentPilgrimageStore, (state) => {
  if (!state.pilgrimage || !state.progress) return 0;
  return Math.round((state.progress.completedDistance / state.pilgrimage.totalDistance) * 100);
});

// Upcoming bookings
export const upcomingBookings = computed(bookingsStore, (state) => {
  return state.upcomingBookings.map(id => state.bookings[id]).filter(Boolean);
});

// Active friend requests
export const activeFriendRequests = computed(socialProfileStore, (state) => {
  return state.friendRequests.filter(request => request.status === 'pending');
});

// Is user authenticated
export const isAuthenticated = computed(userAuthStore, (state) => state.isAuthenticated);

// Session validity
export const isSessionValid = computed(userAuthStore, (state) => {
  if (!state.sessionToken || !state.expiresAt) return false;
  return new Date(state.expiresAt) > new Date();
});

/**
 * Action creators for pilgrim profile
 */
export const pilgrimActions = {
  async createProfile(profileData: CreatePilgrimProfileDto): Promise<void> {
    pilgrimProfileStore.setKey('isLoading', true);
    pilgrimProfileStore.setKey('error', null);
    
    try {
      // Validate profile data
      const validation = await validatePilgrimProfile(profileData);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]?.message || 'Invalid profile data');
      }
      
      // Create profile with server
      const profile = await createPilgrimProfileOnServer(profileData);
      
      // Update store
      pilgrimProfileStore.setKey('currentProfile', profile);
      pilgrimProfileStore.setKey('profiles', {
        ...pilgrimProfileStore.get().profiles,
        [profile.id]: profile,
      });
      
      uiStateStore.setKey('success', 'Profile created successfully');
    } catch (error) {
      pilgrimProfileStore.setKey('error', error instanceof Error ? error.message : 'Failed to create profile');
      throw error;
    } finally {
      pilgrimProfileStore.setKey('isLoading', false);
    }
  },
  
  async updateProfile(profileId: string, updates: UpdatePilgrimProfileDto): Promise<void> {
    pilgrimProfileStore.setKey('isLoading', true);
    pilgrimProfileStore.setKey('error', null);
    
    try {
      // Update profile on server
      const updatedProfile = await updatePilgrimProfileOnServer(profileId, updates);
      
      // Update store
      pilgrimProfileStore.setKey('currentProfile', updatedProfile);
      pilgrimProfileStore.setKey('profiles', {
        ...pilgrimProfileStore.get().profiles,
        [profileId]: updatedProfile,
      });
      
      uiStateStore.setKey('success', 'Profile updated successfully');
    } catch (error) {
      pilgrimProfileStore.setKey('error', error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    } finally {
      pilgrimProfileStore.setKey('isLoading', false);
    }
  },
  
  async deleteProfile(profileId: string): Promise<void> {
    pilgrimProfileStore.setKey('isLoading', true);
    pilgrimProfileStore.setKey('error', null);
    
    try {
      // Delete profile on server
      await deletePilgrimProfileOnServer(profileId);
      
      // Update store
      const profiles = { ...pilgrimProfileStore.get().profiles };
      delete profiles[profileId];
      
      pilgrimProfileStore.setKey('profiles', profiles);
      
      if (pilgrimProfileStore.get().currentProfile?.id === profileId) {
        pilgrimProfileStore.setKey('currentProfile', null);
      }
      
      uiStateStore.setKey('success', 'Profile deleted successfully');
    } catch (error) {
      pilgrimProfileStore.setKey('error', error instanceof Error ? error.message : 'Failed to delete profile');
      throw error;
    } finally {
      pilgrimProfileStore.setKey('isLoading', false);
    }
  },
  
  async loadProfile(profileId: string): Promise<void> {
    pilgrimProfileStore.setKey('isLoading', true);
    pilgrimProfileStore.setKey('error', null);
    
    try {
      // Load profile from server
      const profile = await loadPilgrimProfileFromServer(profileId);
      
      // Update store
      pilgrimProfileStore.setKey('currentProfile', profile);
      pilgrimProfileStore.setKey('profiles', {
        ...pilgrimProfileStore.get().profiles,
        [profileId]: profile,
      });
    } catch (error) {
      pilgrimProfileStore.setKey('error', error instanceof Error ? error.message : 'Failed to load profile');
      throw error;
    } finally {
      pilgrimProfileStore.setKey('isLoading', false);
    }
  },
};

/**
 * Action creators for pilgrimage
 */
export const pilgrimageActions = {
  async startPilgrimage(pilgrimageData: any): Promise<void> {
    currentPilgrimageStore.setKey('isActive', false);
    
    try {
      // Create pilgrimage on server
      const pilgrimage = await createPilgrimageOnServer(pilgrimageData);
      const progress = await initializeProgressTracking(pilgrimage.id);
      
      // Update store
      currentPilgrimageStore.setKey('pilgrimage', pilgrimage);
      currentPilgrimageStore.setKey('progress', progress);
      currentPilgrimageStore.setKey('isActive', true);
      currentPilgrimageStore.setKey('lastUpdate', new Date().toISOString());
      
      uiStateStore.setKey('success', 'Pilgrimage started successfully');
    } catch (error) {
      uiStateStore.setKey('error', error instanceof Error ? error.message : 'Failed to start pilgrimage');
      throw error;
    }
  },
  
  async updateProgress(progressData: any): Promise<void> {
    try {
      const currentState = currentPilgrimageStore.get();
      if (!currentState.isActive || !currentState.pilgrimage) {
        throw new Error('No active pilgrimage');
      }
      
      // Update progress on server
      const updatedProgress = await updateProgressOnServer(currentState.pilgrimage.id, progressData);
      
      // Update store
      currentPilgrimageStore.setKey('progress', updatedProgress);
      currentPilgrimageStore.setKey('lastUpdate', new Date().toISOString());
      
      uiStateStore.setKey('success', 'Progress updated successfully');
    } catch (error) {
      uiStateStore.setKey('error', error instanceof Error ? error.message : 'Failed to update progress');
      throw error;
    }
  },
  
  async completePilgrimage(completionData: any): Promise<void> {
    try {
      const currentState = currentPilgrimageStore.get();
      if (!currentState.isActive || !currentState.pilgrimage) {
        throw new Error('No active pilgrimage');
      }
      
      // Complete pilgrimage on server
      await completePilgrimageOnServer(currentState.pilgrimage.id, completionData);
      
      // Update store
      currentPilgrimageStore.setKey('isActive', false);
      currentPilgrimageStore.setKey('lastUpdate', new Date().toISOString());
      
      uiStateStore.setKey('success', 'Pilgrimage completed successfully');
    } catch (error) {
      uiStateStore.setKey('error', error instanceof Error ? error.message : 'Failed to complete pilgrimage');
      throw error;
    }
  },
};

/**
 * Helper functions (these would be implemented with actual API calls)
 */
async function validatePilgrimProfile(data: CreatePilgrimProfileDto): Promise<ValidationResult> {
  // Implement validation logic
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

async function createPilgrimProfileOnServer(data: CreatePilgrimProfileDto): Promise<PilgrimProfile> {
  // Implement API call to create profile
  const profile: PilgrimProfile = {
    id: crypto.randomUUID(),
    personalInfo: data.personalInfo,
    languages: data.languages,
    experienceLevel: data.experienceLevel,
    preferredPace: data.preferredPace,
    motivation: data.motivation,
    previousCaminoExperience: data.previousCaminoExperience || [],
    socialLinks: data.socialLinks,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    isActive: true,
  };
  
  return profile;
}

async function updatePilgrimProfileOnServer(profileId: string, updates: UpdatePilgrimProfileDto): Promise<PilgrimProfile> {
  // Implement API call to update profile
  const currentProfile = pilgrimProfileStore.get().profiles[profileId];
  if (!currentProfile) throw new Error('Profile not found');
  
  return {
    ...currentProfile,
    ...updates,
    updatedAt: new Date(),
    version: currentProfile.version + 1,
  };
}

async function deletePilgrimProfileOnServer(profileId: string): Promise<void> {
  // Implement API call to delete profile
  console.log(`Deleting profile ${profileId} on server`);
}

async function loadPilgrimProfileFromServer(profileId: string): Promise<PilgrimProfile> {
  // Implement API call to load profile
  throw new Error('Not implemented');
}

async function createPilgrimageOnServer(data: any): Promise<any> {
  // Implement API call to create pilgrimage
  throw new Error('Not implemented');
}

async function initializeProgressTracking(pilgrimageId: string): Promise<any> {
  // Implement API call to initialize progress
  throw new Error('Not implemented');
}

async function updateProgressOnServer(pilgrimageId: string, progressData: any): Promise<any> {
  // Implement API call to update progress
  throw new Error('Not implemented');
}

async function completePilgrimageOnServer(pilgrimageId: string, completionData: any): Promise<void> {
  // Implement API call to complete pilgrimage
  throw new Error('Not implemented');
}