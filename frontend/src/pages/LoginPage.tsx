import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, User, Mail } from 'lucide-react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: {
    name?: string;
    email?: string;
    picture?: string;
  } | null;
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null
  });

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    }

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setAuthState(prev => ({ ...prev, error: 'Authentication failed' }));
    } else if (code) {
      exchangeCodeForToken(code);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user
        });
        setLocation('/admin');
      } else {
        localStorage.removeItem('auth_token');
        setAuthState(prev => ({ ...prev, isAuthenticated: false }));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const { access_token, user } = await response.json();
        localStorage.setItem('auth_token', access_token);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user
        });
        setLocation('/admin');
      } else {
        const errorData = await response.json();
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorData.error || 'Authentication failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error during authentication'
      }));
    }
  };

  const handleLogin = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login');
      const { login_url } = await response.json();
      window.location.href = login_url;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initiate login'
      }));
    }
  };

  if (authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Acceso Autorizado</CardTitle>
            <CardDescription>Redirigiendo al panel de administración...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <User className="h-5 w-5" />
              <span>{authState.user?.name || authState.user?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-sage-600" />
          </div>
          <CardTitle>Acceso Administrativo</CardTitle>
          <CardDescription>
            Panel de gestión del Albergue Del Carrascalejo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authState.error && (
            <Alert variant="destructive">
              <AlertDescription>{authState.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleLogin}
              disabled={authState.isLoading}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            >
              {authState.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Iniciar Sesión con Auth0
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              Utiliza tu cuenta de Google, GitHub o email para acceder
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span>Estado del servicio:</span>
                <span className="text-green-600">Operativo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Última actualización:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}