// SSR-safe API client with gateway integration
// Supports fake routes, mocked gateway, and real gateway connections

import { gatewayRequest, getGatewayMode, getGatewayEndpoints } from './gateway-config'
import type { GatewayMode } from './gateway-config'

// SSR-safe environment check
const isServer = typeof window === 'undefined'

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp?: string
}

// Authentication types
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  token: string
  user: any
  expiresIn: number
}

// User types
export interface UserProfile {
  id: string
  name: string
  email: string
  country?: string
  phone?: string
  status?: string
  arrivalDate?: string
  departureDate?: string
  nights?: number
  roomType?: string
  createdAt: string
  updatedAt: string
}

// Booking types
export interface BookingRequest {
  arrivalDate: string
  departureDate: string
  roomType: 'shared' | 'private'
  guests: number
  specialRequests?: string
}

export interface BookingResponse {
  id: string
  reference: string
  confirmationCode: string
  arrivalDate: string
  departureDate: string
  nights: number
  roomType: string
  totalAmount: number
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

// Camino types
export interface CaminoStats {
  totalDistance: number
  completedDistance: number
  remainingDistance: number
  totalStages: number
  completedStages: number
  currentStage: string
  daysOnCamino: number
  averageDailyDistance: number
  caloriesBurned: number
  stepsTaken: number
}

export interface CaminoRecommendation {
  type: 'stage' | 'service' | 'food' | 'accommodation'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

/**
 * SSR-safe API client class
 */
export class ApiClient {
  private mode: GatewayMode = 'fake'
  private endpoints: any = {}
  private token: string | null = null

  constructor() {
    this.initialize()
  }

  private async initialize(): Promise<void> {
    this.mode = await getGatewayMode()
    this.endpoints = await getGatewayEndpoints()
    
    // Load token from localStorage (client-side only)
    if (!isServer) {
      this.token = localStorage.getItem('auth_token')
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token
    if (!isServer && token) {
      localStorage.setItem('auth_token', token)
    } else if (!isServer && !token) {
      localStorage.removeItem('auth_token')
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Make authenticated request
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add authentication header if token exists
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await gatewayRequest(endpoint, {
        ...options,
        headers
      })

      return {
        success: true,
        ...response,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Authentication API
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return await this.request(this.endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request(this.endpoints.auth.logout, {
      method: 'POST'
    })
    
    // Clear token on logout
    if (response.success) {
      this.setToken(null)
    }
    
    return response
  }

  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return await this.request(this.endpoints.auth.me)
  }

  // User API
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return await this.request(this.endpoints.users.profile)
  }

  async updateUserProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return await this.request(this.endpoints.users.update, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // Booking API
  async getAvailability(params: { startDate: string; endDate: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate
    })
    
    return await this.request(`${this.endpoints.bookings.availability}?${queryParams}`)
  }

  async createBooking(booking: BookingRequest): Promise<ApiResponse<BookingResponse>> {
    return await this.request(this.endpoints.bookings.create, {
      method: 'POST',
      body: JSON.stringify(booking)
    })
  }

  async getBookings(): Promise<ApiResponse<BookingResponse[]>> {
    return await this.request(this.endpoints.bookings.list)
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse> {
    return await this.request(this.endpoints.bookings.cancel.replace('{id}', bookingId), {
      method: 'DELETE'
    })
  }

  // Camino API
  async getCaminoStats(): Promise<ApiResponse<CaminoStats>> {
    return await this.request(this.endpoints.camino.stats)
  }

  async getCaminoRecommendations(): Promise<ApiResponse<CaminoRecommendation[]>> {
    return await this.request(this.endpoints.camino.recommendations)
  }

  async getCaminoProgress(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.camino.progress)
  }

  async getCaminoStages(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.camino.stages)
  }

  // Information API
  async getWeather(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.info.weather)
  }

  async getLocalEvents(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.info.events)
  }

  async getAttractions(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.info.attractions)
  }

  async getServices(): Promise<ApiResponse<any>> {
    return await this.request(this.endpoints.info.services)
  }

  /**
   * Check if API is in fake mode
   */
  isFakeMode(): boolean {
    return this.mode === 'fake'
  }

  /**
   * Check if API is in mock mode
   */
  isMockMode(): boolean {
    return this.mode === 'mock'
  }

  /**
   * Get current gateway mode
   */
  getMode(): GatewayMode {
    return this.mode
  }
}

// Singleton instance
let apiClient: ApiClient | null = null

/**
 * Get API client instance (SSR-safe)
 */
export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient()
  }
  return apiClient
}

/**
 * Initialize API client with configuration
 */
export async function initializeApiClient(): Promise<ApiClient> {
  const client = getApiClient()
  await client['initialize']() // Access private method
  return client
}

// Export types
// Types are already exported inline above