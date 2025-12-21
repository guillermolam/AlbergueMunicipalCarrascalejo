// SSR-safe configuration management with Supabase integration
// Handles secrets, environment variables, and runtime configuration

import { createClient } from '@supabase/supabase-js'

// SSR-safe environment check
const isServer = typeof window === 'undefined'

// Configuration interface
export interface AppConfig {
  // Database & API
  supabase: {
    url: string
    anonKey: string
    serviceKey?: string
  }
  
  // Application settings
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
    baseUrl: string
    apiUrl: string
  }
  
  // Security settings
  security: {
    jwtSecret: string
    encryptionKey: string
    sessionTimeout: number
    maxLoginAttempts: number
  }
  
  // Feature flags
  features: {
    enable2FA: boolean
    enableNotifications: boolean
    enableAnalytics: boolean
    enableCache: boolean
  }
  
  // External services
  services: {
    redis: {
      url: string
      password?: string
    }
    email: {
      provider: string
      apiKey: string
      fromAddress: string
    }
    sms: {
      provider: string
      apiKey: string
      fromNumber: string
    }
  }
  
  // Camino-specific settings
  camino: {
    maxBookingDays: number
    minBookingDays: number
    checkInTime: string
    checkOutTime: string
    maxGuestsPerRoom: number
    emergencyContact: string
  }
}

// Default configuration (fallback values)
const DEFAULT_CONFIG: Partial<AppConfig> = {
  app: {
    name: 'Albergue Municipal Carrascalejo',
    version: '1.0.0',
    environment: 'development',
    baseUrl: 'https://alberguecarrascalejo.fermyon.app',
    apiUrl: '/api'
  },
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5
  },
  features: {
    enable2FA: true,
    enableNotifications: true,
    enableAnalytics: true,
    enableCache: true
  },
  camino: {
    maxBookingDays: 30,
    minBookingDays: 1,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    maxGuestsPerRoom: 8,
    emergencyContact: '+34-924-123-456'
  }
}

// Configuration cache
let configCache: AppConfig | null = null
let configLoaded = false

// Supabase client (initialized lazily)
let supabaseClient: ReturnType<typeof createClient> | null = null

/**
 * Initialize Supabase client (SSR-safe)
 */
function getSupabaseClient() {
  if (!supabaseClient && isServer) {
    const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    }
  }
  return supabaseClient
}

/**
 * Load configuration from Supabase (server-side only)
 */
async function loadConfigFromSupabase(): Promise<Partial<AppConfig>> {
  if (!isServer) {
    console.warn('Configuration loading from Supabase is server-side only')
    return {}
  }

  const client = getSupabaseClient()
  if (!client) {
    console.warn('Supabase client not available')
    return {}
  }

  try {
    const { data, error } = await client
      .from('app_config')
      .select('key, value, category')
      .eq('environment', getEnvironment())
      .eq('is_active', true)

    if (error) {
      console.error('Error loading configuration from Supabase:', error)
      return {}
    }

    // Transform database rows into config object
    const config: Partial<AppConfig> = {}
    data?.forEach(row => {
      const keys = row.key.split('.')
      let current: any = config
      
      // Navigate nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      // Set final value
      current[keys[keys.length - 1]] = row.value
    })

    return config
  } catch (error) {
    console.error('Exception loading configuration from Supabase:', error)
    return {}
  }
}

/**
 * Get current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  if (isServer) {
    return (process.env.NODE_ENV || process.env.ENVIRONMENT || 'development') as any
  }
  return (import.meta.env.MODE || 'development') as any
}

/**
 * Check if we're running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

/**
 * Check if we're running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}

/**
 * Load and merge configuration (SSR-safe)
 */
export async function loadConfiguration(): Promise<AppConfig> {
  if (configLoaded && configCache) {
    return configCache
  }

  // Start with default configuration
  let mergedConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    supabase: {
      url: process.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
      serviceKey: process.env.SUPABASE_SERVICE_KEY
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || import.meta.env.PUBLIC_JWT_SECRET || 'fallback-secret-key',
      encryptionKey: process.env.ENCRYPTION_KEY || import.meta.env.PUBLIC_ENCRYPTION_KEY || 'fallback-encryption-key',
      sessionTimeout: DEFAULT_CONFIG.security?.sessionTimeout || 24 * 60 * 60 * 1000,
      maxLoginAttempts: DEFAULT_CONFIG.security?.maxLoginAttempts || 5
    },
    services: {
      redis: {
        url: process.env.REDIS_URL || import.meta.env.PUBLIC_REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || import.meta.env.PUBLIC_REDIS_PASSWORD
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        apiKey: process.env.EMAIL_API_KEY || '',
        fromAddress: process.env.EMAIL_FROM || 'noreply@alberguecarrascalejo.es'
      },
      sms: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        apiKey: process.env.SMS_API_KEY || '',
        fromNumber: process.env.SMS_FROM || '+1234567890'
      }
    }
  } as AppConfig

  // Load from Supabase (server-side only)
  if (isServer) {
    const supabaseConfig = await loadConfigFromSupabase()
    mergedConfig = { ...mergedConfig, ...supabaseConfig }
  }

  // Cache the configuration
  configCache = mergedConfig
  configLoaded = true

  return mergedConfig
}

/**
 * Get configuration (with caching)
 */
export async function getConfig(): Promise<AppConfig> {
  return await loadConfiguration()
}

/**
 * Get specific configuration value (SSR-safe)
 */
export function getConfigValue<T = any>(path: string, defaultValue?: T): T {
  if (!configCache) {
    console.warn('Configuration not loaded yet, using default value')
    return defaultValue as T
  }

  const keys = path.split('.')
  let current: any = configCache

  for (const key of keys) {
    if (current[key] === undefined) {
      return defaultValue as T
    }
    current = current[key]
  }

  return current as T
}

/**
 * Update configuration at runtime (server-side only)
 */
export async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
  if (!isServer) {
    throw new Error('Configuration updates are server-side only')
  }

  const currentConfig = await getConfig()
  configCache = { ...currentConfig, ...updates }
}

/**
 * Clear configuration cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache = null
  configLoaded = false
  supabaseClient = null
}

/**
 * Validate configuration completeness
 */
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = []

  // Required fields
  if (!config.supabase?.url) errors.push('Supabase URL is required')
  if (!config.supabase?.anonKey) errors.push('Supabase anon key is required')
  if (!config.security?.jwtSecret || config.security.jwtSecret === 'fallback-secret-key') {
    errors.push('JWT secret must be properly configured')
  }
  if (!config.security?.encryptionKey || config.security.encryptionKey === 'fallback-encryption-key') {
    errors.push('Encryption key must be properly configured')
  }

  return errors
}