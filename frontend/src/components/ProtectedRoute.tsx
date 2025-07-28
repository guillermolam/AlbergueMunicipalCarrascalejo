import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    error: null as string | null
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          error: null
        });
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          error: null
        });
      } else {
        localStorage.removeItem('auth_token');
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          error: 'Token inválido'
        });
      }
    } catch (error) {
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        error: 'Error de conexión'
      });
    }
  };

  const handleLogin = () => {
    setLocation('/login');
  };

  if (authState.isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-sage-600 animate-spin" />
            </div>
            <CardTitle>Verificando Acceso</CardTitle>
            <CardDescription>
              Comprobando permisos de administración...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">Acceso Restringido</CardTitle>
            <CardDescription>
              Se requiere autenticación para acceder al panel de administración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authState.error && (
              <div className="text-sm text-red-600 text-center">
                {authState.error}
              </div>
            )}
            
            <Button
              onClick={handleLogin}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            >
              <Shield className="h-4 w-4 mr-2" />
              Iniciar Sesión
            </Button>

            <div className="text-xs text-gray-500 text-center">
              Panel exclusivo para administradores del albergue
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}