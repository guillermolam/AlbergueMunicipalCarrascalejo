import React from 'react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '@i18n';

const Navigation: React.FC = () => {
  const { t } = useI18n();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900">Albergue Municipal</h1>
            </Link>
          </div>
          
          <div className="flex space-x-8">
            <Link href="/">
              <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}>
                Home
              </span>
            </Link>
            
            <Link href="/auth">
              <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/auth') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}>
                Login
              </span>
            </Link>
            
            <Link href="/booking">
              <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/booking') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}>
                Bookings
              </span>
            </Link>
            
            <Link href="/dashboard">
              <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/dashboard') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}>
                Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;