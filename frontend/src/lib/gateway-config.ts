// SSR-safe gateway configuration system
// Supports fake routes, mocked gateway, and real gateway integration

import { getConfig, type AppConfig } from './config-ssr'

// SSR-safe environment check
const isServer = typeof window === 'undefined'

// Gateway configuration modes
export type GatewayMode = 'fake' | 'mock' | 'real' | 'spin'

// Gateway endpoints interface
export interface GatewayEndpoints {
  // Authentication
  auth: {
    login: string
    logout: string
    refresh: string
    verify: string
    me: string
  }
  
  // User management
  users: {
    profile: string
    update: string
    delete: string
    list: string
  }
  
  // Booking system
  bookings: {
    create: string
    get: string
    update: string
    cancel: string
    list: string
    availability: string
  }
  
  // Camino/pilgrimage data
  camino: {
    stages: string
    progress: string
    recommendations: string
    stats: string
  }
  
  // Accommodation
  accommodation: {
    rooms: string
    services: string
    pricing: string
    facilities: string
  }
  
  // Notifications
  notifications: {
    send: string
    preferences: string
    history: string
  }
  
  // Information services
  info: {
    weather: string
    events: string
    attractions: string
    services: string
  }
}

// Mock data generators
const mockData = {
  // Mock user data
  user: {
    id: 'user-123',
    name: 'Peregrino Test',
    email: 'test@peregrino.com',
    country: 'España',
    phone: '+34-600-123-456',
    status: 'confirmed',
    arrivalDate: new Date().toISOString(),
    departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    nights: 3,
    roomType: 'shared',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Mock booking data
  booking: {
    id: 'booking-456',
    reference: 'BK7A9F2C',
    pilgrimId: 'user-123',
    arrivalDate: new Date().toISOString(),
    departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    nights: 3,
    roomType: 'shared',
    totalAmount: 45,
    status: 'confirmed',
    confirmationCode: 'CONF-ABC123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Mock camino stats
  caminoStats: {
    totalDistance: 127,
    completedDistance: 19,
    remainingDistance: 108,
    totalStages: 38,
    completedStages: 3,
    currentStage: 'Almadén → Real de la Jara',
    daysOnCamino: 7,
    averageDailyDistance: 18.1,
    caloriesBurned: 18932,
    stepsTaken: 15420
  },
  
  // Mock availability data
  availability: [
    { date: '2024-01-15', available: true, price: 15 },
    { date: '2024-01-16', available: true, price: 15 },
    { date: '2024-01-17', available: false, price: 0 },
    { date: '2024-01-18', available: true, price: 15 },
    { date: '2024-01-19', available: true, price: 15 }
  ],
  
  // Mock weather data
  weather: {
    location: 'Carrascalejo',
    temperature: 18,
    condition: 'Soleado',
    humidity: 65,
    windSpeed: 12,
    forecast: [
      { day: 'Hoy', temp: 18, condition: 'Soleado' },
      { day: 'Mañana', temp: 20, condition: 'Parcialmente nublado' },
      { day: 'Pasado mañana', temp: 16, condition: 'Lluvia ligera' }
    ]
  },
  
  // Mock events data
  events: [
    {
      id: 'event-1',
      title: 'Misa del Peregrino',
      date: new Date().toISOString(),
      time: '19:00',
      location: 'Iglesia de Carrascalejo',
      description: 'Misa especial para peregrinos'
    },
    {
      id: 'event-2',
      title: 'Feria Local',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      time: '10:00',
      location: 'Plaza Mayor',
      description: 'Feria de productos locales'
    }
  ]
}

// Fake API responses
const fakeResponses = {
  // Authentication endpoints
  '/api/auth/login': async (data: any) => {
    await delay(500) // Simulate network delay
    if (data.email === 'test@peregrino.com' && data.password === 'test123') {
      return {
        success: true,
        token: 'fake-jwt-token-' + Date.now(),
        user: mockData.user,
        expiresIn: 3600
      }
    }
    throw new Error('Credenciales inválidas')
  },
  
  '/api/auth/me': async () => {
    await delay(200)
    return { success: true, user: mockData.user }
  },
  
  '/api/auth/logout': async () => {
    await delay(100)
    return { success: true, message: 'Sesión cerrada correctamente' }
  },
  
  // User endpoints
  '/api/users/profile': async () => {
    await delay(200)
    return { success: true, data: mockData.user }
  },
  
  // Booking endpoints
  '/api/bookings/availability': async (params: any) => {
    await delay(300)
    return { 
      success: true, 
      data: mockData.availability,
      message: 'Disponibilidad obtenida correctamente'
    }
  },
  
  '/api/bookings/create': async (data: any) => {
    await delay(600)
    return {
      success: true,
      data: {
        ...mockData.booking,
        ...data,
        id: 'booking-' + Date.now(),
        reference: 'BK' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        confirmationCode: 'CONF-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      },
      message: 'Reserva creada correctamente'
    }
  },
  
  '/api/bookings/list': async () => {
    await delay(250)
    return {
      success: true,
      data: [mockData.booking],
      total: 1
    }
  },
  
  // Camino endpoints
  '/api/camino/stats': async () => {
    await delay(150)
    return {
      success: true,
      data: mockData.caminoStats,
      message: 'Estadísticas del camino obtenidas'
    }
  },
  
  '/api/camino/recommendations': async () => {
    await delay(400)
    return {
      success: true,
      data: [
        { type: 'stage', title: 'Próxima etapa: Real de la Jara', description: '19.3 km - Dificultad media' },
        { type: 'service', title: 'Farmacia cercana', description: 'Abierta hasta las 20:00' },
        { type: 'food', title: 'Restaurante recomendado', description: 'Menú del peregrino: €12' }
      ],
      message: 'Recomendaciones generadas'
    }
  },
  
  // Information endpoints
  '/api/info/weather': async () => {
    await delay(200)
    return {
      success: true,
      data: mockData.weather,
      message: 'Información meteorológica actualizada'
    }
  },
  
  '/api/info/events': async () => {
    await delay(180)
    return {
      success: true,
      data: mockData.events,
      message: 'Eventos locales obtenidos'
    }
  }
}

// Utility function to simulate network delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get gateway configuration mode
 */
export async function getGatewayMode(): Promise<GatewayMode> {
  const config = await getConfig()
  
  // Check environment variables first
  if (process.env.GATEWAY_MODE) {
    return process.env.GATEWAY_MODE as GatewayMode
  }
  
  // Check configuration
  return (config as any).gateway?.mode || 'fake'
}

/**
 * Get gateway base URL based on mode
 */
export async function getGatewayBaseUrl(): Promise<string> {
  const mode = await getGatewayMode()
  
  switch (mode) {
    case 'fake':
      return '/api' // Use Astro API routes
    case 'mock':
      return '/api' // Use mock API routes
    case 'real':
      return process.env.GATEWAY_URL || 'http://localhost:8080'
    case 'spin':
      return process.env.SPIN_GATEWAY_URL || 'http://localhost:3000'
    default:
      return '/api'
  }
}

/**
 * Get full gateway endpoints configuration
 */
export async function getGatewayEndpoints(): Promise<GatewayEndpoints> {
  const baseUrl = await getGatewayBaseUrl()
  
  return {
    auth: {
      login: `${baseUrl}/auth/login`,
      logout: `${baseUrl}/auth/logout`,
      refresh: `${baseUrl}/auth/refresh`,
      verify: `${baseUrl}/auth/verify`,
      me: `${baseUrl}/auth/me`
    },
    users: {
      profile: `${baseUrl}/users/profile`,
      update: `${baseUrl}/users/update`,
      delete: `${baseUrl}/users/delete`,
      list: `${baseUrl}/users/list`
    },
    bookings: {
      create: `${baseUrl}/bookings/create`,
      get: `${baseUrl}/bookings/{id}`,
      update: `${baseUrl}/bookings/{id}`,
      cancel: `${baseUrl}/bookings/{id}/cancel`,
      list: `${baseUrl}/bookings/list`,
      availability: `${baseUrl}/bookings/availability`
    },
    camino: {
      stages: `${baseUrl}/camino/stages`,
      progress: `${baseUrl}/camino/progress`,
      recommendations: `${baseUrl}/camino/recommendations`,
      stats: `${baseUrl}/camino/stats`
    },
    accommodation: {
      rooms: `${baseUrl}/accommodation/rooms`,
      services: `${baseUrl}/accommodation/services`,
      pricing: `${baseUrl}/accommodation/pricing`,
      facilities: `${baseUrl}/accommodation/facilities`
    },
    notifications: {
      send: `${baseUrl}/notifications/send`,
      preferences: `${baseUrl}/notifications/preferences`,
      history: `${baseUrl}/notifications/history`
    },
    info: {
      weather: `${baseUrl}/info/weather`,
      events: `${baseUrl}/info/events`,
      attractions: `${baseUrl}/info/attractions`,
      services: `${baseUrl}/info/services`
    }
  }
}

/**
 * Make a gateway request (SSR-safe)
 */
export async function gatewayRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const mode = await getGatewayMode()
  
  // Handle fake mode with local responses
  if (mode === 'fake') {
    const fakeHandler = fakeResponses[endpoint as keyof typeof fakeResponses]
    if (fakeHandler) {
      try {
        const data = options.body ? JSON.parse(options.body as string) : undefined
        return await fakeHandler(data)
      } catch (error) {
        throw new Error(`Fake API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    throw new Error(`Fake endpoint not implemented: ${endpoint}`)
  }
  
  // Handle mock mode (similar to fake but with more realistic delays)
  if (mode === 'mock') {
    await delay(100 + Math.random() * 400) // Random delay 100-500ms
    const fakeHandler = fakeResponses[endpoint as keyof typeof fakeResponses]
    if (fakeHandler) {
      try {
        const data = options.body ? JSON.parse(options.body as string) : undefined
        return await fakeHandler(data)
      } catch (error) {
        throw new Error(`Mock API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    throw new Error(`Mock endpoint not implemented: ${endpoint}`)
  }
  
  // Handle real gateway requests
  if (mode === 'real' || mode === 'spin') {
    if (!isServer) {
      throw new Error('Real gateway requests must be made server-side')
    }
    
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`Gateway request failed: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(`Gateway connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  throw new Error(`Unknown gateway mode: ${mode}`)
}

/**
 * Initialize gateway configuration
 */
export async function initializeGateway(): Promise<void> {
  const mode = await getGatewayMode()
  const endpoints = await getGatewayEndpoints()
  
  console.log(`🚀 Gateway initialized in ${mode} mode`)
  console.log(`🔗 Base URL: ${await getGatewayBaseUrl()}`)
  console.log(`📡 Available endpoints:`, Object.keys(endpoints).length)
  
  if (mode === 'fake' || mode === 'mock') {
    console.log('🎭 Using fake/mock data responses')
  } else {
    console.log('🌐 Using real gateway connection')
  }
}