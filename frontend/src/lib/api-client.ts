// SSR-safe API client with gateway integration.
// Supports fake routes, mocked gateway, and real gateway connections.
//
// Design constraints:
//   - Zero module-level side effects that break SSR (no window access at top level)
//   - No `any` types — every endpoint is fully typed
//   - initialize() is idempotent and safe to call concurrently
//   - AbortSignal support on every request for SolidJS onCleanup hooks
//   - bookingId is validated before URL interpolation (path-traversal guard)
//   - Token stored in sessionStorage (XSS risk lower than localStorage)

import { gatewayRequest, getGatewayEndpoints, getGatewayMode } from './gateway-config';
import type { GatewayEndpoints, GatewayMode } from './gateway-config';

// ── SSR detection ─────────────────────────────────────────────────────────────

const isServer: boolean =
  typeof globalThis.window === 'undefined' ||
  (typeof globalThis.process === 'object' && globalThis.process.versions?.node != null);

// ── Domain types ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
  expiresIn: number;
}

// --- User ---

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  country?: string;
  phone?: string;
  status?: string;
  arrivalDate?: string;
  departureDate?: string;
  nights?: number;
  roomType?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Bookings ---

export interface AvailabilityParams {
  startDate: string;
  endDate: string;
}

export interface AvailabilitySlot {
  date: string;
  roomType: 'shared' | 'private';
  available: boolean;
  price: number;
}

export interface BookingRequest {
  arrivalDate: string;
  departureDate: string;
  roomType: 'shared' | 'private';
  guests: number;
  specialRequests?: string;
}

export interface BookingResponse {
  id: string;
  reference: string;
  confirmationCode: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  roomType: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// --- Camino ---

export interface CaminoStats {
  totalDistance: number;
  completedDistance: number;
  remainingDistance: number;
  totalStages: number;
  completedStages: number;
  currentStage: string;
  daysOnCamino: number;
  averageDailyDistance: number;
  caloriesBurned: number;
  stepsTaken: number;
}

export interface CaminoProgress {
  currentKm: number;
  totalKm: number;
  percentComplete: number;
  lastCheckpoint: string;
  updatedAt: string;
}

export interface CaminoStage {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  difficultyLevel: 'easy' | 'moderate' | 'hard';
}

export interface CaminoRecommendation {
  type: 'stage' | 'service' | 'food' | 'accommodation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

// --- Information ---

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  condition: string;
  iconUrl: string;
  updatedAt: string;
}

export interface LocalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
}

export interface Attraction {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  category: string;
  openingHours?: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  openingHours?: string;
}

// ── Validation helpers ────────────────────────────────────────────────────────

/** Safe booking-ID pattern: alphanumeric, hyphens, underscores, max 64 chars. */
const BOOKING_ID_RE = /^[\w-]{1,64}$/;

function validateBookingId(id: string): void {
  if (!BOOKING_ID_RE.test(id)) {
    throw new Error(`Invalid booking ID format: "${id}"`);
  }
}

// ── ApiClient ─────────────────────────────────────────────────────────────────

export class ApiClient {
  private mode: GatewayMode = 'fake';
  private endpoints: GatewayEndpoints = {} as GatewayEndpoints;
  private token: string | null = null;

  /** Lazily created; concurrent callers await the same promise. */
  private _initPromise: Promise<void> | null = null;

  constructor() {
    // Load persisted token on the client only (sessionStorage: lower XSS risk).
    if (!isServer) {
      this.token = sessionStorage.getItem('auth_token');
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Initialize gateway config asynchronously.
   * Idempotent — safe to call multiple times concurrently.
   */
  async initialize(): Promise<void> {
    this._initPromise ??= this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    [this.mode, this.endpoints] = await Promise.all([getGatewayMode(), getGatewayEndpoints()]);
  }

  // ── Token management ──────────────────────────────────────────────────────

  setToken(token: string | null): void {
    this.token = token;
    if (!isServer) {
      if (token) {
        sessionStorage.setItem('auth_token', token);
      } else {
        sessionStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // ── Core request ──────────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await gatewayRequest(endpoint, {
        ...options,
        headers,
        signal,
      });

      return {
        success: true,
        ...(response as Omit<ApiResponse<T>, 'success'>),
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, error: 'Request cancelled', timestamp: new Date().toISOString() };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Auth API ──────────────────────────────────────────────────────────────

  async login(
    credentials: LoginRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>(
      this.endpoints.auth.login,
      { method: 'POST', body: JSON.stringify(credentials) },
      signal
    );
  }

  async logout(signal?: AbortSignal): Promise<ApiResponse> {
    const response = await this.request(this.endpoints.auth.logout, { method: 'POST' }, signal);
    if (response.success) this.setToken(null);
    return response;
  }

  async getCurrentUser(signal?: AbortSignal): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(this.endpoints.auth.me, {}, signal);
  }

  // ── User API ──────────────────────────────────────────────────────────────

  async getUserProfile(signal?: AbortSignal): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(this.endpoints.users.profile, {}, signal);
  }

  async updateUserProfile(
    data: Partial<UserProfile>,
    signal?: AbortSignal
  ): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(
      this.endpoints.users.update,
      { method: 'PUT', body: JSON.stringify(data) },
      signal
    );
  }

  // ── Booking API ───────────────────────────────────────────────────────────

  async getAvailability(
    params: AvailabilityParams,
    signal?: AbortSignal
  ): Promise<ApiResponse<AvailabilitySlot[]>> {
    const qs = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return this.request<AvailabilitySlot[]>(
      `${this.endpoints.bookings.availability}?${qs}`,
      {},
      signal
    );
  }

  async createBooking(
    booking: BookingRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<BookingResponse>> {
    return this.request<BookingResponse>(
      this.endpoints.bookings.create,
      { method: 'POST', body: JSON.stringify(booking) },
      signal
    );
  }

  async getBookings(signal?: AbortSignal): Promise<ApiResponse<BookingResponse[]>> {
    return this.request<BookingResponse[]>(this.endpoints.bookings.list, {}, signal);
  }

  async cancelBooking(bookingId: string, signal?: AbortSignal): Promise<ApiResponse> {
    validateBookingId(bookingId);
    return this.request(
      this.endpoints.bookings.cancel.replace('{id}', bookingId),
      { method: 'DELETE' },
      signal
    );
  }

  // ── Camino API ────────────────────────────────────────────────────────────

  async getCaminoStats(signal?: AbortSignal): Promise<ApiResponse<CaminoStats>> {
    return this.request<CaminoStats>(this.endpoints.camino.stats, {}, signal);
  }

  async getCaminoProgress(signal?: AbortSignal): Promise<ApiResponse<CaminoProgress>> {
    return this.request<CaminoProgress>(this.endpoints.camino.progress, {}, signal);
  }

  async getCaminoStages(signal?: AbortSignal): Promise<ApiResponse<CaminoStage[]>> {
    return this.request<CaminoStage[]>(this.endpoints.camino.stages, {}, signal);
  }

  async getCaminoRecommendations(
    signal?: AbortSignal
  ): Promise<ApiResponse<CaminoRecommendation[]>> {
    return this.request<CaminoRecommendation[]>(this.endpoints.camino.recommendations, {}, signal);
  }

  // ── Information API ───────────────────────────────────────────────────────

  async getWeather(signal?: AbortSignal): Promise<ApiResponse<WeatherData>> {
    return this.request<WeatherData>(this.endpoints.info.weather, {}, signal);
  }

  async getLocalEvents(signal?: AbortSignal): Promise<ApiResponse<LocalEvent[]>> {
    return this.request<LocalEvent[]>(this.endpoints.info.events, {}, signal);
  }

  async getAttractions(signal?: AbortSignal): Promise<ApiResponse<Attraction[]>> {
    return this.request<Attraction[]>(this.endpoints.info.attractions, {}, signal);
  }

  async getServices(signal?: AbortSignal): Promise<ApiResponse<ServiceInfo[]>> {
    return this.request<ServiceInfo[]>(this.endpoints.info.services, {}, signal);
  }

  // ── Mode helpers ──────────────────────────────────────────────────────────

  isFakeMode(): boolean {
    return this.mode === 'fake';
  }

  isMockMode(): boolean {
    return this.mode === 'mock';
  }

  getMode(): GatewayMode {
    return this.mode;
  }
}

// ── Module-level factory ──────────────────────────────────────────────────────
//
// NOTE: This singleton is intentionally scoped to the module (browser bundle).
// For SSR, wrap ApiClient in a SolidJS context so each request gets its own
// instance: createContext<ApiClient>() + <ApiClientProvider>.

let _client: ApiClient | null = null;

/** Returns the shared ApiClient instance (browser) or a new one (SSR). */
export function getApiClient(): ApiClient {
  if (isServer) return new ApiClient();
  _client ??= new ApiClient();
  return _client;
}

/** Resolves after gateway config is loaded. Safe to call multiple times. */
export async function initializeApiClient(): Promise<ApiClient> {
  const client = getApiClient();
  await client.initialize();
  return client;
}

// Auto-initialize on the client without blocking the module parse.
if (!isServer) {
  initializeApiClient().catch((err: unknown) => {
    console.error('[ApiClient] initialization failed:', err);
  });
}
