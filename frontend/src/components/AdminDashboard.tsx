import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { 
  Bed, 
  Euro, 
  TrendingUp, 
  Calendar, 
  MapPin,
  LogOut,
  Settings
} from "lucide-react";

interface AdminDashboardProps {
  onBackToHome: () => void;
}

export default function AdminDashboard({ onBackToHome }: AdminDashboardProps) {
  const { data: dashboardStats } = useQuery({
    queryKey: ['/booking/dashboard/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/booking/dashboard/stats');
      return response.json();
    }
  });

  const { data: pricing } = useQuery({
    queryKey: ['/booking/pricing'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/booking/pricing');
      return response.json();
    }
  });

  const stats = dashboardStats || {
    occupancy: { available: 24, occupied: 0, total: 24 },
    today_bookings: 0,
    revenue: 0
  };

  const bedPrice = pricing?.dormitory || 15;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Panel de Administración - Albergue Del Carrascalejo
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToHome}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Volver al Inicio</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Camas Disponibles</CardTitle>
              <Bed className="h-4 w-4 text-sage-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sage-700">
                {stats.occupancy.available}
              </div>
              <p className="text-xs text-muted-foreground">
                de {stats.occupancy.total} camas totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-sage-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sage-700">
                {stats.today_bookings}
              </div>
              <p className="text-xs text-muted-foreground">
                nuevas reservas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <Euro className="h-4 w-4 text-sage-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sage-700">
                €{stats.revenue}
              </div>
              <p className="text-xs text-muted-foreground">
                total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precio por Noche</CardTitle>
              <TrendingUp className="h-4 w-4 text-sage-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sage-700">
                €{bedPrice}
              </div>
              <p className="text-xs text-muted-foreground">
                cama en dormitorio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bed Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-sage-600" />
                <span>Configuración de Camas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-sage-50 rounded-lg">
                    <div className="text-2xl font-bold text-sage-700">8</div>
                    <div className="text-sm text-sage-600">Dormitorio 1</div>
                  </div>
                  <div className="text-center p-4 bg-sage-50 rounded-lg">
                    <div className="text-2xl font-bold text-sage-700">8</div>
                    <div className="text-sm text-sage-600">Dormitorio 2</div>
                  </div>
                  <div className="text-center p-4 bg-sage-50 rounded-lg">
                    <div className="text-2xl font-bold text-sage-700">8</div>
                    <div className="text-sm text-sage-600">Dormitorio 3</div>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Total: 24 camas mixtas a €15 por noche
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-sage-600" />
                <span>Gestión Rápida</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full" variant="outline">
                  Ver Todas las Reservas
                </Button>
                <Button className="w-full" variant="outline">
                  Registrar Pago en Efectivo
                </Button>
                <Button className="w-full" variant="outline">
                  Gestionar Disponibilidad
                </Button>
                <Button className="w-full" variant="outline">
                  Exportar Datos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}