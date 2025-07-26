import { useState, useEffect } from 'react';

interface Auth0User {
  email?: string;
  name?: string;
  sub?: string;
  [key: string]: any;
}

interface UseAuth0Return {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export function useAuth0(): UseAuth0Return {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Auth0User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth0_token');
    if (storedToken) {
      validateAndSetToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateAndSetToken = async (token: string) => {
    try {
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