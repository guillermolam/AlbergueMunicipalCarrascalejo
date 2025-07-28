import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './card';
import { Button } from './button';

export const BookingSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Reserva completada
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tu reserva ha sido procesada con éxito. Te enviaremos un correo electrónico con los detalles.
                  </p>
                </div>
                <div className="mt-5 sm:mt-6">
                  <Button
                    onClick={() => navigate('/booking')}
                    className="w-full flex justify-center"
                  >
                    Realizar otra reserva
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
