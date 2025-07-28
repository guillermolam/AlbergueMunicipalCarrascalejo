import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bed, Users, Euro, Calendar, Settings, LogOut } from 'lucide-react';

interface AdminStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  totalRevenue: number;
  todayCheckIns: number;
  pendingPayments: number;
}

interface Booking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bedNumber: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  amount: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalBeds: 24,
    occupiedBeds: 8,
    availableBeds: 16,
    totalRevenue: 450,
    todayCheckIns: 3,
    pendingPayments: 2
  });

  const [recentBookings, setRecentBookings] = useState<Booking[]>([
    {
      id: '1',
      guestName: 'María González',
      checkIn: '2025-07-26',
      checkOut: '2025-07-27',
      bedNumber: 'D1-03',
      status: 'confirmed',
      amount: 15
    },
    {
      id: '2',
      guestName: 'John Smith',
      checkIn: '2025-07-26',
      checkOut: '2025-07-28',
      bedNumber: 'D2-05',
      status: 'pending',
      amount: 30
    },
    {
      id: '3',
      guestName: 'Pierre Dubois',
      checkIn: '2025-07-25',
      checkOut: '2025-07-26',
      bedNumber: 'D3-01',
      status: 'checked-in',
      amount: 15
    }
  ]);

  useEffect(() => {
    // Fetch admin stats from API
    fetch('/api/booking/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.log('Using fallback admin stats'));

    // Fetch recent bookings
    fetch('/api/booking/admin/bookings')
      .then(res => res.json())
      .then(data => setRecentBookings(data))
      .catch(err => console.log('Using fallback booking data'));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'checked-in': return 'bg-blue-100 text-blue-800';
      case 'checked-out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600">Albergue Del Carrascalejo</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Camas Disponibles</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.availableBeds}</div>
              <p className="text-xs text-muted-foreground">de {stats.totalBeds} camas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupiedBeds}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.occupiedBeds / stats.totalBeds) * 100)}% ocupado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">+12% vs ayer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-ins Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
              <p className="text-xs text-muted-foreground">{stats.pendingPayments} pagos pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas Recientes</CardTitle>
            <CardDescription>
              Últimas reservas y su estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{booking.guestName}</p>
                      <p className="text-sm text-gray-600">
                        {booking.checkIn} - {booking.checkOut} | Cama {booking.bedNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status === 'confirmed' && 'Confirmado'}
                      {booking.status === 'pending' && 'Pendiente'}
                      {booking.status === 'checked-in' && 'Registrado'}
                      {booking.status === 'checked-out' && 'Finalizado'}
                    </Badge>
                    <span className="font-medium">€{booking.amount}</span>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bed Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Gestión de Camas</CardTitle>
            <CardDescription>
              Estado actual de los dormitorios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((dorm) => (
                <div key={dorm} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dormitorio {dorm}</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                          Math.random() > 0.6
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    8 camas • {Math.floor(Math.random() * 4) + 2} ocupadas
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}