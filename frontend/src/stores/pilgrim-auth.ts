// Secure authentication and authorization for pilgrim system
// SSR-compatible authentication with JWT, 2FA, and role-based access control

import { atom, map } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';
import { jwtDecode } from 'jwt-decode';
import type {
  UserAuth,
  UserRole,
  Permission,
  Session,
  ApiResponse,
} from '@/types/pilgrim';
import type { IPilgrimService } from '@/types/pilgrim-operations';

// SSR-safe environment check
const isServer = typeof window === 'undefined';

/**
 * JWT Token Manager
 */
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens(): void {
    if (isServer) return;
    
    try {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
      
      if (this.accessToken) {
        const decoded = jwtDecode(this.accessToken);
        this.tokenExpiry = decoded.exp ? decoded.exp * 1000 : null;
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      this.clearTokens();
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    try {
      if (!isServer) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      
      const decoded = jwtDecode(accessToken);
      this.tokenExpiry = decoded.exp ? decoded.exp * 1000 : null;
    } catch (error) {
      console.error('Failed to set tokens:', error);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  isTokenValid(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    try {
      if (!isServer) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  decodeToken(): any {
    if (!this.accessToken) return null;
    
    try {
      return jwtDecode(this.accessToken);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }
}

/**
 * Authentication Store
 */
export const authStore = persistentMap<{
  userAuth: UserAuth | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  twoFactorRequired: boolean;
  loginAttempts: number;
  lockedUntil: string | null;
}>('pilgrim:auth:', {
  userAuth: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionToken: null,
  refreshToken: null,
  expiresAt: null,
  twoFactorRequired: false,
  loginAttempts: 0,
  lockedUntil: null,
}, {
  encode: (value) => {
    if (isServer) return JSON.stringify(value);
    // Simple encryption for sensitive data (use proper crypto in production)
    return btoa(JSON.stringify(value));
  },
  decode: (value) => {
    if (isServer) return JSON.parse(value);
    try {
      return JSON.parse(atob(value));
    } catch {
      return { 
        userAuth: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: null,
        sessionToken: null,
        refreshToken: null,
        expiresAt: null,
        twoFactorRequired: false,
        loginAttempts: 0,
        lockedUntil: null,
      };
    }
  }
});

/**
 * Permissions Store
 */
export const permissionsStore = atom<{
  permissions: Permission[];
  roles: UserRole[];
  isLoading: boolean;
  error: string | null;
}>({
  permissions: [],
  roles: [],
  isLoading: false,
  error: null,
});

/**
 * Session Store
 */
export const sessionStore = atom<{
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
}>({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,
});

// Token manager instance
const tokenManager = new TokenManager();

/**
 * Authentication Actions
 */
export const authActions = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<ApiResponse<UserAuth>> {
    authStore.setKey('isLoading', true);
    authStore.setKey('error', null);

    try {
      // Check if account is locked
      const lockedUntil = authStore.get().lockedUntil;
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        throw new Error(`Account is locked until ${lockedUntil}`);
      }

      // Simulate API call (replace with actual API)
      const response = await simulateLogin(email, password);

      if (response.success && response.data) {
        const userAuth = response.data;
        
        // Store authentication data
        authStore.setKey('userAuth', userAuth);
        authStore.setKey('isAuthenticated', true);
        authStore.setKey('loginAttempts', 0);
        authStore.setKey('lockedUntil', null);
        authStore.setKey('error', null);

        // Store tokens
        if (response.tokens) {
          tokenManager.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
          authStore.setKey('sessionToken', response.tokens.accessToken);
          authStore.setKey('refreshToken', response.tokens.refreshToken);
          authStore.setKey('expiresAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // 24 hours
        }

        // Load user permissions
        await this.loadUserPermissions(userAuth.id);

        // Create session
        await this.createSession(userAuth.id);

        return {
          success: true,
          data: userAuth,
        };
      } else {
        // Increment login attempts
        const attempts = authStore.get().loginAttempts + 1;
        authStore.setKey('loginAttempts', attempts);

        // Lock account after 5 failed attempts
        if (attempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          authStore.setKey('lockedUntil', lockUntil.toISOString());
        }

        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      authStore.setKey('error', errorMessage);
      
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: errorMessage,
        },
      };
    } finally {
      authStore.setKey('isLoading', false);
    }
  },

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }): Promise<ApiResponse<UserAuth>> {
    authStore.setKey('isLoading', true);
    authStore.setKey('error', null);

    try {
      // Validate input data
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        throw new Error('All required fields must be provided');
      }

      // Simulate API call (replace with actual API)
      const response = await simulateRegister(userData);

      if (response.success && response.data) {
        // Auto-login after successful registration
        return await this.login(userData.email, userData.password);
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      authStore.setKey('error', errorMessage);
      
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: errorMessage,
        },
      };
    } finally {
      authStore.setKey('isLoading', false);
    }
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Revoke session on server
      const currentSession = sessionStore.get().currentSession;
      if (currentSession) {
        await revokeSession(currentSession.id);
      }

      // Clear all authentication data
      authStore.setKey('userAuth', null);
      authStore.setKey('isAuthenticated', false);
      authStore.setKey('sessionToken', null);
      authStore.setKey('refreshToken', null);
      authStore.setKey('expiresAt', null);
      authStore.setKey('twoFactorRequired', false);
      authStore.setKey('error', null);

      // Clear tokens
      tokenManager.clearTokens();

      // Clear permissions
      permissionsStore.set({
        permissions: [],
        roles: [],
        isLoading: false,
        error: null,
      });

      // Clear sessions
      sessionStore.set({
        sessions: [],
        currentSession: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<ApiResponse<{ secret: string; qrCode: string }>> {
    try {
      const userAuth = authStore.get().userAuth;
      if (!userAuth) {
        throw new Error('User not authenticated');
      }

      // Simulate API call (replace with actual API)
      const response = await simulateEnableTwoFactor(userAuth.id);

      if (response.success && response.data) {
        // Update user auth to reflect 2FA enabled
        authStore.setKey('userAuth', {
          ...userAuth,
          twoFactorEnabled: true,
        });

        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.error?.message || 'Failed to enable 2FA');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable 2FA';
      return {
        success: false,
        error: {
          code: 'TWO_FACTOR_ENABLE_FAILED',
          message: errorMessage,
        },
      };
    }
  },

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(code: string): Promise<ApiResponse<boolean>> {
    try {
      const userAuth = authStore.get().userAuth;
      if (!userAuth) {
        throw new Error('User not authenticated');
      }

      // Simulate API call (replace with actual API)
      const response = await simulateVerifyTwoFactor(userAuth.id, code);

      if (response.success) {
        authStore.setKey('twoFactorRequired', false);
        return {
          success: true,
          data: true,
        };
      } else {
        throw new Error(response.error?.message || 'Invalid 2FA code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '2FA verification failed';
      return {
        success: false,
        error: {
          code: 'TWO_FACTOR_VERIFICATION_FAILED',
          message: errorMessage,
        },
      };
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<boolean>> {
    try {
      const refreshToken = authStore.get().refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Simulate API call (replace with actual API)
      const response = await simulateRefreshToken(refreshToken);

      if (response.success && response.tokens) {
        tokenManager.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        authStore.setKey('sessionToken', response.tokens.accessToken);
        authStore.setKey('refreshToken', response.tokens.refreshToken);
        authStore.setKey('expiresAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

        return {
          success: true,
          data: true,
        };
      } else {
        // If refresh fails, logout user
        await this.logout();
        throw new Error(response.error?.message || 'Token refresh failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: errorMessage,
        },
      };
    }
  },

  /**
   * Load user permissions
   */
  async loadUserPermissions(userId: string): Promise<void> {
    permissionsStore.setKey('isLoading', true);
    permissionsStore.setKey('error', null);

    try {
      // Simulate API call (replace with actual API)
      const response = await simulateLoadUserPermissions(userId);

      if (response.success && response.data) {
        permissionsStore.set({
          permissions: response.data.permissions || [],
          roles: response.data.roles || [],
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(response.error?.message || 'Failed to load permissions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load permissions';
      permissionsStore.set({
        permissions: [],
        roles: [],
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  /**
   * Create new session
   */
  async createSession(userId: string): Promise<void> {
    try {
      // Get client information
      const ipAddress = isServer ? null : await getClientIP();
      const userAgent = isServer ? null : navigator.userAgent;

      // Simulate API call (replace with actual API)
      const response = await simulateCreateSession(userId, ipAddress, userAgent);

      if (response.success && response.data) {
        sessionStore.setKey('currentSession', response.data);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const { permissions, isAuthenticated } = permissionsStore.get();
    if (!isAuthenticated) return false;
    
    return permissions.some(p => p.name === permission);
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const { roles, isAuthenticated } = permissionsStore.get();
    if (!isAuthenticated) return false;
    
    return roles.some(r => r.name === role);
  },

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const { permissions: userPermissions, isAuthenticated } = permissionsStore.get();
    if (!isAuthenticated) return false;
    
    return permissions.some(permission => 
      userPermissions.some(p => p.name === permission)
    );
  },

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const { permissions: userPermissions, isAuthenticated } = permissionsStore.get();
    if (!isAuthenticated) return false;
    
    return permissions.every(permission => 
      userPermissions.some(p => p.name === permission)
    );
  },

  /**
   * Get current user info
   */
  getCurrentUser(): UserAuth | null {
    return authStore.get().userAuth;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authStore.get().isAuthenticated && tokenManager.isTokenValid();
  },

  /**
   * Check if 2FA is required
   */
  isTwoFactorRequired(): boolean {
    return authStore.get().twoFactorRequired;
  },

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const token = tokenManager.getAccessToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },
};

/**
 * Helper functions (these would be implemented with actual API calls)
 */

async function simulateLogin(email: string, password: string): Promise<ApiResponse<UserAuth> & { tokens?: { accessToken: string; refreshToken: string } }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful login
  if (email === 'test@example.com' && password === 'password123') {
    return {
      success: true,
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        pilgrimId: 'pilgrim-123',
        email: email,
        emailVerified: true,
        phoneNumber: '+1234567890',
        phoneVerified: true,
        twoFactorEnabled: false,
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        roles: [
          {
            id: 'role-123',
            name: 'pilgrim',
            description: 'Pilgrim user',
            permissions: [],
            isActive: true,
          }
        ],
        permissions: [],
        sessions: [],
        apiKeys: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      }
    };
  }
  
  return {
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    },
  };
}

async function simulateRegister(userData: any): Promise<ApiResponse<UserAuth>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful registration
  return {
    success: true,
    data: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      pilgrimId: 'pilgrim-123',
      email: userData.email,
      emailVerified: false,
      phoneNumber: userData.phoneNumber,
      phoneVerified: false,
      twoFactorEnabled: false,
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null,
      roles: [],
      permissions: [],
      sessions: [],
      apiKeys: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
  };
}

async function simulateEnableTwoFactor(userId: string): Promise<ApiResponse<{ secret: string; qrCode: string }>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    data: {
      secret: 'JBSWY3DPEHPK3PXP',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
  };
}

async function simulateVerifyTwoFactor(userId: string, code: string): Promise<ApiResponse<boolean>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful verification
  if (code === '123456') {
    return {
      success: true,
      data: true,
    };
  }
  
  return {
    success: false,
    error: {
      code: 'INVALID_2FA_CODE',
      message: 'Invalid 2FA code',
    },
  };
}

async function simulateRefreshToken(refreshToken: string): Promise<ApiResponse<boolean> & { tokens?: { accessToken: string; refreshToken: string } }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    data: true,
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      refreshToken: refreshToken, // Same refresh token
    }
  };
}

async function simulateLoadUserPermissions(userId: string): Promise<ApiResponse<{ permissions: Permission[]; roles: UserRole[] }>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    data: {
      permissions: [
        {
          id: 'perm-123',
          name: 'profile.read',
          resource: 'pilgrim_profiles',
          action: 'read',
        },
        {
          id: 'perm-456',
          name: 'profile.write',
          resource: 'pilgrim_profiles',
          action: 'write',
        },
      ],
      roles: [
        {
          id: 'role-123',
          name: 'pilgrim',
          description: 'Pilgrim user',
          permissions: [],
          isActive: true,
        }
      ]
    }
  };
}

async function simulateCreateSession(userId: string, ipAddress: string | null, userAgent: string | null): Promise<ApiResponse<Session>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    data: {
      id: 'session-123',
      token: 'session-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: ipAddress,
      userAgent: userAgent,
      isActive: true,
      lastActivityAt: new Date(),
    }
  };
}

async function revokeSession(sessionId: string): Promise<ApiResponse<boolean>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    data: true,
  };
}

async function getClientIP(): Promise<string | null> {
  if (isServer) return null;
  
  try {
    // In a real implementation, you'd get this from the server
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}