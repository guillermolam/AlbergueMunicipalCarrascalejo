import React, { createContext, useContext, useState, useEffect } from 'react';

interface Auth0User {
  email?: string;
  name?: string;
  sub?: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Auth0User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth0_token');
    if (storedToken) {
      validateAndSetToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateAndSetToken = async (token: string) => {
    try {
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
