import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { Card } from './card';
import { useAuth } from '@contexts/auth';

export const Booking = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    navigate('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900">Nueva Reserva</h1>
              <div className="mt-6">
                <Button onClick={() => navigate('/booking-success')}>
                  Continuar con la reserva
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
