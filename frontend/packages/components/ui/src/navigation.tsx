import { Link } from 'react-router-dom';
import { Button } from './button';
import { useAuth } from '@contexts/auth';

export const Navigation = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary">Albergue Municipal</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/booking" className="inline-flex items-center px-1 pt-1 text-gray-900">
                Reserva
              </Link>
              <Link to="/reviews" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-900">
                Opiniones
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <Button onClick={logout} variant="text" className="ml-4">
                Cerrar sesión
              </Button>
            ) : (
              <Link to="/auth/login" className="ml-4">
                <Button variant="text">Iniciar sesión</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
