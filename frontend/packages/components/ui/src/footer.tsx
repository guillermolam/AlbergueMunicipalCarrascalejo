import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-base text-gray-400">
            &copy; {new Date().getFullYear()} Albergue Municipal Carrascalejo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
