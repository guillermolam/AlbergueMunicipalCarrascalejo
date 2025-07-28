<<<<<<< HEAD:frontend/packages/services/auth/src/index.ts
import React, { createContext, useContext, useState, useEffect } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/hooks/useAuth0.ts

interface Auth0User {
  email?: string;
  name?: string;
  sub?: string;
  [key: string]: any;
}

<<<<<<< HEAD:frontend/packages/services/auth/src/index.ts
interface AuthContextType {
=======
interface UseAuth0Return {
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/hooks/useAuth0.ts
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

<<<<<<< HEAD:frontend/packages/services/auth/src/index.ts
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
=======
export function useAuth0(): UseAuth0Return {
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/hooks/useAuth0.ts
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Auth0User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
<<<<<<< HEAD:frontend/packages/services/auth/src/index.ts
=======
    // Check for stored token on mount
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/hooks/useAuth0.ts
    const storedToken = localStorage.getItem('auth0_token');
    if (storedToken) {
      validateAndSetToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateAndSetToken = async (token: string) => {
    try {
<<<<<<< HEAD:frontend/packages/services/auth/src/index.ts
      // In a real app, you would validate the token with your backend
      // For now, we'll just accept it
      setToken(token);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Get user info from token (in a real app, you'd decode the JWT)
      const userInfo = {
        email: 'user@example.com',
        name: 'Test User',
        sub: 'auth0|123456'
      };
      setUser(userInfo);
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
    }
  };

  const login = (token: string) => {
    localStorage.setItem('auth0_token', token);
    validateAndSetToken(token);
  };

  const logout = () => {
    localStorage.removeItem('auth0_token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
=======
      // Decode the JWT payload to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('Token expired');
      }

      setToken(token);
      setUser({
        email: payload.email,
        name: payload.name,
        sub: payload.sub,
        ...payload
      });
      setIsAuthenticated(true);
      localStorage.setItem('auth0_token', token);
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string) => {
    validateAndSetToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    localStorage.removeItem('auth0_token');
  };

  // Add Authorization header to all admin requests
  useEffect(() => {
    if (token) {
      // You can use this to set up axios interceptors or similar
      // For now, we'll rely on manual header setting in requests
    }
  }, [token]);

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout
  };
}
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/hooks/useAuth0.ts
