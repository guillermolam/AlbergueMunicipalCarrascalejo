export type ApiMode = 'local' | 'mock' | 'gateway'

export interface ApiConfig {
  mode: ApiMode
  baseUrl: string
  timeout: number
  retries: number
}

export interface HealthResponse {
  ok: boolean
  mode: ApiMode
  ts: number
}

export interface ProgressPayload {
  dailyGoalKm: number
  currentStageProgress: number
  ts: number
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private config: ApiConfig
  private abortControllers = new Map<string, AbortController>()

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      mode: (import.meta.env.VITE_API_MODE as ApiMode) || 'local',
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 5000,
      retries: 2,
      ...config
    }
  }

  private getController(key: string): AbortController {
    if (this.abortControllers.has(key)) {
      this.abortControllers.get(key)?.abort()
    }
    const controller = new AbortController()
    this.abortControllers.set(key, controller)
    return controller
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = this.config.timeout
  ): Promise<Response> {
    const controller = this.getController(url)
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    } finally {
      this.abortControllers.delete(url)
    }
  }

  private async retry<T>(
    fn: () => Promise<ApiResponse<T>>,
    retries = this.config.retries
  ): Promise<ApiResponse<T>> {
    let lastError: Error | null = null

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)))
        }
      }
    }

    return {
      error: lastError?.message || 'Max retries exceeded',
      status: 500
    }
  }

  async health(): Promise<ApiResponse<HealthResponse>> {
    return this.retry(async () => {
      try {
        const url = this.config.mode === 'local' 
          ? '/api/health'
          : `${this.config.baseUrl}/api/health`

        const response = await this.fetchWithTimeout(url)
        const data = await response.json() as HealthResponse

        return {
          data,
          status: response.status
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            error: 'Request timeout',
            status: 408
          }
        }
        throw error
      }
    })
  }

  async syncProgress(payload: ProgressPayload): Promise<ApiResponse<{ ok: boolean }>> {
    return this.retry(async () => {
      try {
        const url = this.config.mode === 'local'
          ? '/api/progress'
          : `${this.config.baseUrl}/api/progress`

        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const data = await response.json()

        return {
          data,
          status: response.status
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            error: 'Request timeout',
            status: 408
          }
        }
        throw error
      }
    })
  }

  abort(key?: string): void {
    if (key) {
      this.abortControllers.get(key)?.abort()
      this.abortControllers.delete(key)
    } else {
      this.abortControllers.forEach(controller => controller.abort())
      this.abortControllers.clear()
    }
  }
}

export const apiClient = new ApiClient()

// Non-blocking sync helper for nanostores
export async function scheduleSync(payload: ProgressPayload): Promise<void> {
  // Use requestIdleCallback with fallback
  const schedule = () => {
    const w = window as unknown as { requestIdleCallback?: (fn: () => void) => number }
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => {
        void apiClient.syncProgress(payload)
      })
    } else {
      setTimeout(() => {
        void apiClient.syncProgress(payload)
      }, 50)
    }
  }

  // Queue microtask to avoid blocking
  queueMicrotask(schedule)
}