// HTTP client with error handling and request/response interceptors
export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultTimeout = 30000; // 30 seconds
    this.defaultRetries = 3;
    this.defaultRetryDelay = 1000; // 1 second
  }

  async request<T = any>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await this.fetchWithRetry<T>(
        url,
        {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        },
        retries,
        retryDelay
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseError(response);
        throw error;
      }

      const data = await this.parseResponse<T>(response);

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number,
    retryDelay: number
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Return successful response
        if (response.ok) {
          return response;
        }

        // Throw to trigger retry on server errors (5xx)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text() as Promise<T>;
    }

    return response.blob() as Promise<T>;
  }

  private async parseError(response: Response): Promise<ApiError> {
    try {
      const errorData = await response.json();
      return {
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        code: errorData.code,
        details: errorData.details,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      };
    }
  }

  private handleError(error: any): ApiError {
    if (error.name === 'AbortError') {
      return {
        message: 'Request timeout',
        code: 'TIMEOUT',
      };
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      details: error.details,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const { get, post, put, patch, delete: del } = apiClient;
