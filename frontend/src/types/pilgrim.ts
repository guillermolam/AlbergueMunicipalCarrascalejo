// Comprehensive TypeScript types for Pilgrim data management
// SSR-compatible types with strict validation and security

// ── Structured primitives ─────────────────────────────────────────────────────

/**
 * Structured phone number (matches Clerk metadata format)
 * Backward-compatible: legacy code may store a flat E.164 string instead.
 */
export interface PhoneNumber {
  /** Dialing code, e.g. "+34" */
  code: string;
  /** Local number without country code, e.g. "620235950" */
  number: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "ES" */
  country: string;
}

/**
 * Structured postal address (matches Clerk metadata format)
 * Backward-compatible: legacy code may store a flat string.
 */
export interface StructuredAddress {
  street?: {
    line1?: string;
    line2?: string;
  };
  city?: string;
  state?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 country code */
  country?: string;
}

/**
 * Single scanned image for a pilgrim document
 */
export interface DocumentImage {
  /** Human-readable label, e.g. "Front side", "Back side" */
  label?: string;
  /** Cloudflare R2 URL */
  r2Url?: string;
  /** Cloudflare Images ID (for transformations / delivery) */
  cloudflareImageId?: string;
}

/**
 * A single identity document belonging to a pilgrim
 */
export interface PilgrimDocument {
  /** Client-generated UUID */
  id: string;
  /** "dni" | "nie" | "passport" | "driving_license" | other free text */
  type: string;
  /** ISO 3166-1 alpha-2 issuing country */
  country?: string;
  /** ISO 8601 date string (YYYY-MM-DD) */
  expirationDate?: string;
  images?: DocumentImage[];
}

/**
 * Emergency contact entry (matches Clerk publicMetadata.emergencyContacts[] format)
 */
export interface EmergencyContactEntry {
  name?: string;
  /** English relation key: "father" | "mother" | "partner" | "child" | "sibling" | "friend" | "colleague" | "other" */
  relation?: string;
  phone?: PhoneNumber | string;
  email?: string;
}

/**
 * Pilgrim belonging / item stored at the hostel
 */
export interface PilgrimBelonging {
  /** Client-generated UUID */
  id: string;
  /**
   * Category key (matches bCategory select values):
   * mochila | bastones | tienda | saco de dormir | calzado | ropa | higiene |
   * medicacion | botiquin | electronica | cargadores | documentos | credencial |
   * llaves | efectivo | comida | accesorios | otros
   */
  category: string;
  name: string;
  count: number;
  notes?: string;
}

/**
 * Vehicle registered by the pilgrim
 */
export interface PilgrimVehicle {
  /** Client-generated UUID */
  id: string;
  /** "coche" | "bicicleta" | "moto" | "furgoneta" | ... */
  type: string;
  plate: string;
  model?: string;
  color?: string;
}

/**
 * Pet travelling with the pilgrim
 */
export interface PilgrimPet {
  /** Client-generated UUID */
  id: string;
  name: string;
  /** "perro" | "gato" | "ave" | "otro" */
  species: string;
  breed?: string;
  chip?: string;
}

/**
 * Clerk pilgrimProfile metadata shape (unsafeMetadata.pilgrimProfile)
 */
export interface PilgrimProfileMetadata {
  phone?: PhoneNumber | string;
  phoneCC?: string;
  dob?: string;
  nationality?: string;
  address?: StructuredAddress | string;
  bio?: string;
  /** Legacy flat document fields */
  docType?: string;
  docId?: string;
  docUrl?: string;
  country?: string;
  /** Structured documents array */
  documents?: PilgrimDocument[];
  camino?: CaminoMetadata;
  manualBadges?: string[];
}

/**
 * Clerk publicMetadata shape (server-writable profile data)
 */
export interface PilgrimPublicMetadata {
  /** Role assigned by staff */
  role?: 'pilgrim' | 'staff' | 'admin';
  /** Array of emergency contacts */
  emergencyContacts?: EmergencyContactEntry[];
  /** Legacy single emergency contact (backward compat) */
  emergency?: EmergencyContactEntry;
  vehicles?: PilgrimVehicle[];
  belongings?: PilgrimBelonging[];
  pets?: PilgrimPet[];
  lockerNum?: string;
}

/**
 * Camino journey metadata stored in unsafeMetadata.pilgrimProfile.camino
 */
export interface CaminoMetadata {
  stages?: string[];
  route?: string;
  start?: string;
  origin?: string;
  stageDetails?: Record<string, unknown>;
}

// ── Legacy / existing interfaces ──────────────────────────────────────────────

/**
 * Base entity with common fields for all pilgrim-related data
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number; // For optimistic locking
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Personal information for pilgrims
 * Phone and address support both structured objects (new) and flat strings (legacy).
 */
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  /** Structured phone (new) or flat E.164 string (legacy) */
  phone: PhoneNumber | string;
  dateOfBirth: Date;
  nationality: string;
  /** ISO 3166-1 alpha-2 nationality code */
  nationalityCode?: string;
  passportNumber?: string;
  idCardNumber?: string;
  /** Structured documents array (new) */
  documents?: PilgrimDocument[];
  /** Structured address (new) or flat string (legacy) */
  address?: StructuredAddress | string;
  /** Primary emergency contact (legacy — prefer emergencyContacts array) */
  emergencyContact?: EmergencyContactEntry;
  medicalInfo?: MedicalInfo;
}

/**
 * Emergency contact information (legacy flat interface — prefer EmergencyContactEntry)
 * @deprecated Use EmergencyContactEntry which supports structured phone
 */
export interface EmergencyContact {
  name: string;
  /** Relation label (may be English key or legacy Spanish) */
  relationship: string;
  /** Structured phone (new) or flat string (legacy) */
  phone: PhoneNumber | string;
  email?: string;
  country?: string;
}

/**
 * Medical information for safety
 */
export interface MedicalInfo {
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  medications?: string[];
  medicalConditions?: string[];
  specialRequirements?: string;
  isFitForHiking: boolean;
  lastMedicalCheck?: Date;
}

/**
 * Pilgrim profile with all personal data
 */
export interface PilgrimProfile extends BaseEntity {
  personalInfo: PersonalInfo;
  profilePicture?: string;
  bio?: string;
  languages: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredPace: 'slow' | 'moderate' | 'fast';
  motivation: string;
  previousCaminoExperience?: CaminoExperience[];
  socialLinks?: SocialLinks;
}

/**
 * Previous Camino experience
 */
export interface CaminoExperience {
  route: CaminoRoute;
  year: number;
  startDate: Date;
  endDate: Date;
  totalDistance: number;
  completed: boolean;
  notes?: string;
}

/**
 * Camino route types
 */
export type CaminoRoute =
  | 'frances'
  | 'portugues'
  | 'del-norte'
  | 'primitivo'
  | 'ingles'
  | 'via-plata'
  | 'finisterre'
  | 'muxia';

/**
 * Social media links
 */
export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  blog?: string;
}

/**
 * Current pilgrimage/journey data
 */
export interface Pilgrimage extends BaseEntity {
  pilgrimId: string;
  route: CaminoRoute;
  startDate: Date;
  estimatedEndDate: Date;
  startingPoint: string;
  finalDestination: string;
  currentStage?: string;
  currentLocation?: GeoLocation;
  totalDistance: number;
  completedDistance: number;
  dailyDistance: number;
  accommodationPreferences: AccommodationPreference[];
  budgetRange: BudgetRange;
  travelStyle: TravelStyle;
  companions: Companion[];
  equipment: Equipment[];
  itinerary: ItineraryStage[];
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: Date;
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Accommodation preferences
 */
export interface AccommodationPreference {
  type: 'albergue' | 'hostel' | 'hotel' | 'pension' | 'camping' | 'private';
  priority: 1 | 2 | 3 | 4 | 5;
  maxPricePerNight?: number;
  requiredAmenities: string[];
  preferredAmenities: string[];
}

/**
 * Budget range
 */
export interface BudgetRange {
  minPerDay: number;
  maxPerDay: number;
  currency: string;
  includesAccommodation: boolean;
  includesMeals: boolean;
}

/**
 * Travel style preferences
 */
export type TravelStyle =
  | 'backpacker'
  | 'budget'
  | 'comfort'
  | 'luxury'
  | 'minimalist'
  | 'photographer'
  | 'spiritual'
  | 'social';

/**
 * Companion information
 */
export interface Companion {
  id: string;
  name: string;
  relationship: string;
  contactInfo: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Equipment and gear
 */
export interface Equipment {
  id: string;
  name: string;
  category: string;
  weight: number;
  isEssential: boolean;
  isPacked: boolean;
  notes?: string;
}

/**
 * Itinerary stage
 */
export interface ItineraryStage {
  id: string;
  stageNumber: number;
  startLocation: string;
  endLocation: string;
  plannedDate: Date;
  distance: number;
  estimatedDuration: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  accommodation?: string;
  notes?: string;
  waypoints: GeoLocation[];
  completed: boolean;
  actualDate?: Date;
  actualDuration?: number;
}

/**
 * Booking/reservation data
 */
export interface Booking extends BaseEntity {
  pilgrimId: string;
  pilgrimageId: string;
  accommodationId: string;
  accommodationName: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  roomType: 'shared' | 'private' | 'family';
  numberOfBeds: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  specialRequests?: string;
  confirmationCode: string;
  cancellationPolicy: CancellationPolicy;
}

/**
 * Booking status
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked-in'
  | 'checked-out'
  | 'cancelled'
  | 'no-show';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';

/**
 * Cancellation policy
 */
export interface CancellationPolicy {
  freeCancellationUntil?: Date;
  cancellationFee: number;
  refundPercentage: number;
  terms: string;
}

/**
 * Progress tracking
 */
export interface ProgressTracking extends BaseEntity {
  pilgrimId: string;
  pilgrimageId: string;
  currentStage: number;
  currentLocation: GeoLocation;
  totalDistanceWalked: number;
  dailyDistances: DailyDistance[];
  achievements: Achievement[];
  statistics: PilgrimageStatistics;
  lastUpdate: Date;
}

/**
 * Daily distance tracking
 */
export interface DailyDistance {
  date: Date;
  distance: number;
  duration: number;
  averageSpeed: number;
  steps: number;
  caloriesBurned: number;
  elevationGain: number;
  weatherConditions?: WeatherConditions;
}

/**
 * Weather conditions
 */
export interface WeatherConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
}

/**
 * Achievement tracking
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'distance' | 'speed' | 'consistency' | 'social' | 'spiritual' | 'exploration';
  unlockedAt: Date;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
}

/**
 * Pilgrimage statistics
 */
export interface PilgrimageStatistics {
  totalDays: number;
  walkingDays: number;
  restDays: number;
  averageDailyDistance: number;
  maxDailyDistance: number;
  totalElevationGain: number;
  totalCaloriesBurned: number;
  totalSteps: number;
  averageSpeed: number;
  fastestSpeed: number;
  completionPercentage: number;
}

/**
 * Health and safety tracking
 */
export interface HealthSafety extends BaseEntity {
  pilgrimId: string;
  pilgrimageId: string;
  dailyHealthChecks: DailyHealthCheck[];
  incidents: Incident[];
  emergencyContactsUsed: EmergencyContactUsed[];
  medicalAttentionReceived: MedicalAttention[];
}

/**
 * Daily health check
 */
export interface DailyHealthCheck {
  date: Date;
  overallFeeling: 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
  energyLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  painLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  sleepQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hoursSlept: number;
  hydrationLevel: 'well-hydrated' | 'adequate' | 'dehydrated';
  nutritionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  symptoms?: string[];
  medicationsTaken?: string[];
}

/**
 * Incident reporting
 */
export interface Incident {
  id: string;
  date: Date;
  time: string;
  type: 'injury' | 'illness' | 'lost' | 'theft' | 'accident' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  location?: GeoLocation;
  treatment?: string;
  resolved: boolean;
  photos?: string[];
}

/**
 * Emergency contact usage
 */
export interface EmergencyContactUsed {
  contactId: string;
  date: Date;
  reason: string;
  method: 'phone' | 'text' | 'email' | 'app-notification';
  successful: boolean;
  notes?: string;
}

/**
 * Medical attention received
 */
export interface MedicalAttention {
  date: Date;
  provider: string;
  type: 'pharmacy' | 'clinic' | 'hospital' | 'first-aid' | 'paramedic';
  diagnosis?: string;
  treatment?: string;
  cost?: number;
  currency?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

/**
 * Social and community features
 */
export interface SocialProfile extends BaseEntity {
  pilgrimId: string;
  displayName: string;
  bio?: string;
  profilePicture?: string;
  privacyLevel: 'public' | 'friends' | 'private';
  languages: string[];
  interests: string[];
  isLookingForCompanions: boolean;
  companionPreferences: CompanionPreferences;
  friends: string[];
  blockedUsers: string[];
}

/**
 * Companion preferences
 */
export interface CompanionPreferences {
  preferredAgeRange: {
    min: number;
    max: number;
  };
  preferredExperienceLevel: ('beginner' | 'intermediate' | 'advanced')[];
  preferredTravelStyle: TravelStyle[];
  languages: string[];
  maxGroupSize: number;
  sameGenderPreference?: 'yes' | 'no' | 'no-preference';
  smokingPreference?: 'yes' | 'no' | 'no-preference';
  pacePreference?: 'slower' | 'same' | 'faster' | 'no-preference';
}

/**
 * User authentication and authorization
 */
export interface UserAuth extends BaseEntity {
  pilgrimId: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  roles: UserRole[];
  permissions: Permission[];
  sessions: Session[];
  apiKeys: ApiKey[];
}

/**
 * User role
 */
export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
}

/**
 * Permission
 */
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  conditions?: Record<string, unknown>;
}

/**
 * Session
 */
export interface Session {
  id: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivityAt: Date;
}

/**
 * API key
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  permissions: Permission[];
  isActive: boolean;
}

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: Date;
    version: string;
    requestId: string;
  };
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage?: number;
  previousPage?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

/**
 * Sorting information
 */
export interface SortingInfo {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter information
 */
export interface FilterInfo {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';
  value: unknown;
  values?: unknown[];
}

/**
 * Search query
 */
export interface SearchQuery {
  query: string;
  fields: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'csv' | 'json' | 'xml' | 'pdf';
  fields: string[];
  filters?: FilterInfo[];
  sorting?: SortingInfo[];
  includeMetadata?: boolean;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  format: 'csv' | 'json' | 'xml';
  mapping: Record<string, string>;
  validationRules?: Record<string, unknown>;
  skipErrors?: boolean;
  dryRun?: boolean;
}

/**
 * Audit log
 */
export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<
    string,
    {
      before: unknown;
      after: unknown;
    }
  >;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}
