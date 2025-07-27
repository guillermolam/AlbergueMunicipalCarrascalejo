import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, LogOut, Home } from 'lucide-react';

export function LogoutPage() {
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    performLogout();
  }, []);

  const performLogout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');

      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Small delay for user experience
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleReturnHome = () => {
    setLocation('/');
  };

  const handleLoginAgain = () => {
    setLocation('/login');
  };

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LogOut className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
            <CardTitle>Cerrando Sesión</CardTitle>
            <CardDescription>
              Finalizando tu sesión de administrador...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">Sesión Finalizada</CardTitle>
          <CardDescription>
            Has cerrado sesión exitosamente del panel de administración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={handleReturnHome}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>

            <Button
              onClick={handleLoginAgain}
              variant="outline"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Iniciar Sesión Nuevamente
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 text-center">
              <p>Gracias por utilizar el panel de administración</p>
              <p className="text-xs mt-2">Albergue Del Carrascalejo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}