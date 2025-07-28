import React from 'react';
import { StatsCard } from './stats-card';
import { BookingsTable } from './bookings-table';
import { AdminDashboardProps } from '../types';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { ChevronRight } from 'lucide-react';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  recentBookings,
  pendingApprovals
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline">
          <ChevronRight className="mr-2 h-4 w-4" />
          View All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={<span className="text-2xl">📊</span>}
        />
        <StatsCard
          title="Total Revenue"
          value={`€${stats.totalRevenue.toFixed(2)}`}
          icon={<span className="text-2xl">💰</span>}
        />
        <StatsCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={<span className="text-2xl">👥</span>}
        />
        <StatsCard
          title="Upcoming Bookings"
          value={stats.upcomingBookings}
          icon={<span className="text-2xl">📅</span>}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Bookings</h2>
          <Button variant="outline">
            <ChevronRight className="mr-2 h-4 w-4" />
            View All
          </Button>
        </div>
        <BookingsTable bookings={recentBookings} />
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pending Approvals</h2>
          <span className="text-2xl font-bold text-red-500">
            {pendingApprovals}
          </span>
        </div>
        <Button className="w-full">
          <span className="mr-2">Approve All</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};
