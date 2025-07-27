import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, LogIn, LogOut, User } from "lucide-react";

interface Auth0LoginProps {
  onLogin: (token: string) => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  user?: any;
}

export function Auth0Login({
  onLogin,
  onLogout,
  isAuthenticated,
  user,
}: Auth0LoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Handle Auth0 callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      console.error("Auth0 error:", error);
      return;
    }

    if (code && !isAuthenticated) {
      handleCallback(code);
    }
  }, [isAuthenticated]);

  const handleCallback = async (code: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "/callback?" + new URLSearchParams({ code }),
      );
      const data = await response.json();

      if (response.ok && data.access_token) {
        onLogin(data.access_token);
        // Clean up URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } else {
        throw new Error(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Callback error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    const currentUrl = window.location.href.split("?")[0];
    window.location.href = `/login?redirect_uri=${encodeURIComponent(currentUrl + "/callback")}`;
  };

  const handleLogout = () => {
    onLogout();
    const currentUrl = window.location.href.split("?")[0].split("#")[0];
    window.location.href = `/logout?returnTo=${encodeURIComponent(currentUrl)}`;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
          <span className="ml-2">Autenticando...</span>
        </CardContent>
      </Card>
    );
  }

  if (isAuthenticated && user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bienvenido
          </CardTitle>
          <CardDescription>
            Acceso autorizado al panel de administración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              <strong>Usuario:</strong>{" "}
              {user.email || user.name || "Usuario autenticado"}
            </p>
            {user.name && (
              <p>
                <strong>Nombre:</strong> {user.name}
              </p>
            )}
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Acceso de Administrador
        </CardTitle>
        <CardDescription>
          Inicia sesión para acceder al panel de administración del albergue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleLogin}
          className="w-full bg-sage-600 hover:bg-sage-700"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Iniciar Sesión con Auth0
        </Button>
      </CardContent>
    </Card>
  );
}
