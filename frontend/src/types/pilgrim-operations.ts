// Comprehensive interfaces for pilgrim data operations
// Type-safe operations with validation and error handling

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
  PaginatedResponse,
  PaginationInfo,
  SortingInfo,
  FilterInfo,
  SearchQuery,
  ExportConfig,
  ImportConfig,
  AuditLog,
} from './pilgrim';

/**
 * Pilgrim repository interface for data access
 */
export interface IPilgrimRepository {
  // Create operations
  createProfile(profile: CreatePilgrimProfileDto): Promise<ApiResponse<PilgrimProfile>>;
  createPilgrimage(pilgrimage: CreatePilgrimageDto): Promise<ApiResponse<Pilgrimage>>;
  createBooking(booking: CreateBookingDto): Promise<ApiResponse<Booking>>;

  // Read operations
  getProfileById(id: string): Promise<ApiResponse<PilgrimProfile>>;
  getProfileByEmail(email: string): Promise<ApiResponse<PilgrimProfile>>;
  getProfiles(
    filters?: FilterInfo[],
    pagination?: PaginationInfo
  ): Promise<PaginatedResponse<PilgrimProfile>>;
  getPilgrimageById(id: string): Promise<ApiResponse<Pilgrimage>>;
  getPilgrimagesByProfileId(profileId: string): Promise<ApiResponse<Pilgrimage[]>>;
  getActivePilgrimage(profileId: string): Promise<ApiResponse<Pilgrimage>>;

  // Update operations
  updateProfile(id: string, updates: UpdatePilgrimProfileDto): Promise<ApiResponse<PilgrimProfile>>;
  updatePilgrimage(id: string, updates: UpdatePilgrimageDto): Promise<ApiResponse<Pilgrimage>>;
  updateBooking(id: string, updates: UpdateBookingDto): Promise<ApiResponse<Booking>>;

  // Delete operations
  deleteProfile(id: string): Promise<ApiResponse<boolean>>;
  deletePilgrimage(id: string): Promise<ApiResponse<boolean>>;
  deleteBooking(id: string): Promise<ApiResponse<boolean>>;

  // Bulk operations
  bulkCreateProfiles(profiles: CreatePilgrimProfileDto[]): Promise<ApiResponse<PilgrimProfile[]>>;
  bulkUpdateProfiles(updates: UpdatePilgrimProfileDto[]): Promise<ApiResponse<PilgrimProfile[]>>;
  bulkDeleteProfiles(ids: string[]): Promise<ApiResponse<boolean[]>>;

  // Search and filtering
  searchProfiles(query: SearchQuery): Promise<PaginatedResponse<PilgrimProfile>>;
  filterProfiles(
    filters: FilterInfo[],
    sorting?: SortingInfo[]
  ): Promise<PaginatedResponse<PilgrimProfile>>;

  // Export/Import
  exportProfiles(config: ExportConfig): Promise<ApiResponse<Blob>>;
  importProfiles(config: ImportConfig, file: File): Promise<ApiResponse<ImportResult>>;
}

/**
 * Pilgrim service interface for business logic
 */
export interface IPilgrimService {
  // Profile management
  registerPilgrim(profile: CreatePilgrimProfileDto): Promise<ApiResponse<PilgrimProfile>>;
  updatePilgrimProfile(
    id: string,
    updates: UpdatePilgrimProfileDto
  ): Promise<ApiResponse<PilgrimProfile>>;
  deactivatePilgrim(id: string, reason: string): Promise<ApiResponse<boolean>>;
  reactivatePilgrim(id: string): Promise<ApiResponse<boolean>>;

  // Pilgrimage management
  startPilgrimage(
    profileId: string,
    pilgrimage: CreatePilgrimageDto
  ): Promise<ApiResponse<Pilgrimage>>;
  updatePilgrimageProgress(
    id: string,
    progress: UpdateProgressDto
  ): Promise<ApiResponse<Pilgrimage>>;
  completePilgrimage(
    id: string,
    completion: CompletePilgrimageDto
  ): Promise<ApiResponse<Pilgrimage>>;
  cancelPilgrimage(id: string, reason: string): Promise<ApiResponse<Pilgrimage>>;

  // Booking management
  createBooking(profileId: string, booking: CreateBookingDto): Promise<ApiResponse<Booking>>;
  confirmBooking(id: string): Promise<ApiResponse<Booking>>;
  cancelBooking(id: string, reason: string): Promise<ApiResponse<Booking>>;
  checkBookingAvailability(booking: CheckAvailabilityDto): Promise<ApiResponse<AvailabilityResult>>;

  // Progress tracking
  updateProgress(id: string, progress: UpdateProgressDto): Promise<ApiResponse<ProgressTracking>>;
  getProgressHistory(profileId: string): Promise<ApiResponse<ProgressTracking[]>>;
  getCurrentProgress(profileId: string): Promise<ApiResponse<ProgressTracking>>;

  // Health and safety
  recordHealthCheck(profileId: string, check: HealthCheckDto): Promise<ApiResponse<HealthSafety>>;
  reportIncident(incident: IncidentReportDto): Promise<ApiResponse<Incident>>;
  getHealthHistory(profileId: string): Promise<ApiResponse<HealthSafety>>;

  // Statistics and analytics
  getPilgrimStatistics(profileId: string): Promise<ApiResponse<PilgrimStatistics>>;
  getGlobalStatistics(filters?: FilterInfo[]): Promise<ApiResponse<GlobalStatistics>>;
  getPopularRoutes(): Promise<ApiResponse<RouteStatistics[]>>;
  getPeakSeasons(): Promise<ApiResponse<SeasonStatistics[]>>;

  // Social features
  createSocialProfile(profile: CreateSocialProfileDto): Promise<ApiResponse<SocialProfile>>;
  findCompanions(
    profileId: string,
    preferences: CompanionPreferencesDto
  ): Promise<ApiResponse<PilgrimProfile[]>>;
  sendFriendRequest(senderId: string, receiverId: string): Promise<ApiResponse<boolean>>;
  acceptFriendRequest(requestId: string): Promise<ApiResponse<boolean>>;

  // Validation and verification
  validatePilgrimProfile(profile: CreatePilgrimProfileDto): Promise<ValidationResult>;
  verifyEmail(email: string, token: string): Promise<ApiResponse<boolean>>;
  verifyPhoneNumber(phone: string, code: string): Promise<ApiResponse<boolean>>;

  // Export/Import
  exportPilgrimData(profileId: string, format: 'json' | 'csv' | 'pdf'): Promise<ApiResponse<Blob>>;
  importPilgrimData(file: File): Promise<ApiResponse<ImportResult>>;
}

/**
 * Data transfer objects for create operations
 */
export interface CreatePilgrimProfileDto {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    nationality: string;
    passportNumber?: string;
    idCardNumber?: string;
    emergencyContact: EmergencyContact;
    medicalInfo?: MedicalInfo;
  };
  languages: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredPace: 'slow' | 'moderate' | 'fast';
  motivation: string;
  previousCaminoExperience?: CaminoExperience[];
  socialLinks?: SocialLinks;
}

export interface CreatePilgrimageDto {
  route: CaminoRoute;
  startDate: Date;
  estimatedEndDate: Date;
  startingPoint: string;
  finalDestination: string;
  accommodationPreferences: AccommodationPreference[];
  budgetRange: BudgetRange;
  travelStyle: TravelStyle;
  companions?: Companion[];
  equipment?: Equipment[];
}

export interface CreateBookingDto {
  accommodationId: string;
  accommodationName: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomType: 'shared' | 'private' | 'family';
  numberOfBeds: number;
  specialRequests?: string;
}

/**
 * Data transfer objects for update operations
 */
export interface UpdatePilgrimProfileDto {
  personalInfo?: Partial<PersonalInfo>;
  languages?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredPace?: 'slow' | 'moderate' | 'fast';
  motivation?: string;
  bio?: string;
  profilePicture?: string;
}

export interface UpdatePilgrimageDto {
  currentStage?: string;
  currentLocation?: GeoLocation;
  completedDistance?: number;
  dailyDistance?: number;
  accommodationPreferences?: AccommodationPreference[];
  budgetRange?: BudgetRange;
  travelStyle?: TravelStyle;
}

export interface UpdateBookingDto {
  checkInDate?: Date;
  checkOutDate?: Date;
  roomType?: 'shared' | 'private' | 'family';
  numberOfBeds?: number;
  specialRequests?: string;
  status?: BookingStatus;
}

/**
 * Progress tracking DTOs
 */
export interface UpdateProgressDto {
  currentStage: number;
  currentLocation: GeoLocation;
  totalDistanceWalked: number;
  dailyDistances: DailyDistance[];
  achievements?: Achievement[];
  statistics?: PilgrimageStatistics;
}

export interface CompletePilgrimageDto {
  completionDate: Date;
  finalLocation: GeoLocation;
  totalDistanceWalked: number;
  totalDays: number;
  completionCertificate?: string;
  reflections?: string;
  rating?: number;
}

/**
 * Health and safety DTOs
 */
export interface HealthCheckDto {
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

export interface IncidentReportDto {
  date: Date;
  time: string;
  type: 'injury' | 'illness' | 'lost' | 'theft' | 'accident' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  location?: GeoLocation;
  photos?: string[];
}

/**
 * Social features DTOs
 */
export interface CreateSocialProfileDto {
  displayName: string;
  bio?: string;
  profilePicture?: string;
  privacyLevel: 'public' | 'friends' | 'private';
  languages: string[];
  interests: string[];
  isLookingForCompanions: boolean;
  companionPreferences: CompanionPreferences;
}

export interface CompanionPreferencesDto {
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
 * Availability checking DTOs
 */
export interface CheckAvailabilityDto {
  accommodationId: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomType: 'shared' | 'private' | 'family';
  numberOfBeds: number;
}

export interface AvailabilityResult {
  available: boolean;
  availableRooms: number;
  alternativeRooms: Array<{
    roomType: string;
    available: boolean;
    price: number;
  }>;
  totalPrice: number;
  currency: string;
}

/**
 * Statistics DTOs
 */
export interface PilgrimStatistics {
  totalPilgrimages: number;
  totalDistanceWalked: number;
  totalDaysOnCamino: number;
  averageDailyDistance: number;
  longestPilgrimage: number;
  shortestPilgrimage: number;
  mostWalkedRoute: CaminoRoute;
  completionRate: number;
  achievementsUnlocked: number;
  friendsMade: number;
}

export interface GlobalStatistics {
  totalPilgrims: number;
  totalActivePilgrimages: number;
  totalDistanceWalked: number;
  averagePilgrimageDuration: number;
  mostPopularRoute: CaminoRoute;
  peakSeasonMonths: string[];
  averageAge: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  nationalityDistribution: Record<string, number>;
}

export interface RouteStatistics {
  route: CaminoRoute;
  totalPilgrims: number;
  averageDuration: number;
  averageDistance: number;
  completionRate: number;
  averageAge: number;
  peakSeason: string;
  mostCommonStartingPoint: string;
  mostCommonEndPoint: string;
}

export interface SeasonStatistics {
  season: string;
  totalPilgrims: number;
  averageTemperature: number;
  averageRainfall: number;
  completionRate: number;
  averageGroupSize: number;
  mostPopularRoute: CaminoRoute;
}

/**
 * Import/Export result
 */
export interface ImportResult {
  totalRecords: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: unknown;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value: unknown;
  }>;
  summary: string;
}

/**
 * Repository implementation helper
 */
export interface RepositoryOptions {
  pagination?: PaginationInfo;
  sorting?: SortingInfo[];
  filters?: FilterInfo[];
  includeDeleted?: boolean;
  includeInactive?: boolean;
  cache?: boolean;
  cacheTtl?: number;
}

/**
 * Service implementation helper
 */
export interface ServiceOptions {
  validate?: boolean;
  sendNotifications?: boolean;
  createAuditLog?: boolean;
  checkPermissions?: boolean;
  useCache?: boolean;
  cacheTtl?: number;
  transaction?: boolean;
}

/**
 * Error types
 */
export class PilgrimError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PilgrimError';
  }
}

export class ValidationError extends PilgrimError {
  constructor(
    message: string,
    public validationErrors: ValidationError[],
    public details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends PilgrimError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends PilgrimError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends PilgrimError {
  constructor(
    message: string,
    public conflictingField?: string
  ) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
