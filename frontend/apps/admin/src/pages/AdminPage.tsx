import React from 'react';
import { AdminDashboard } from '@albergue/components/admin/admin-dashboard';
import { Card } from '@albergue/components/ui/card';
import { Button } from '@albergue/components/ui/button';
import { ChevronRight } from 'lucide-react';

const mockStats = {
  totalBookings: 123,
  totalRevenue: 4567.89,
  activeBookings: 25,
  upcomingBookings: 15
};

const mockRecentBookings = [
  {
    id: '1',
    guestName: 'John Doe',
    checkInDate: '2024-07-28',
    checkOutDate: '2024-07-30',
    status: 'confirmed'
  },
  {
    id: '2',
    guestName: 'Jane Smith',
    checkInDate: '2024-07-29',
    checkOutDate: '2024-07-31',
    status: 'pending'
  }
];

export const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-7xl mx-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <Button variant="outline">
              <ChevronRight className="mr-2 h-4 w-4" />
              View All
            </Button>
          </div>
          <AdminDashboard
            stats={mockStats}
            recentBookings={mockRecentBookings}
            pendingApprovals={5}
          />
        </div>
      </Card>
    </div>
  );
};
