import { z } from 'zod';

export type AdminDashboardProps = {
  stats: {
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
    upcomingBookings: number;
  };
  recentBookings: Array<{
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
  pendingApprovals: number;
};

export const adminDashboardSchema = z.object({
  stats: z.object({
    totalBookings: z.number(),
    totalRevenue: z.number(),
    activeBookings: z.number(),
    upcomingBookings: z.number()
  }),
  recentBookings: z.array(z.object({
    id: z.string(),
    guestName: z.string(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    status: z.enum(['confirmed', 'pending', 'cancelled'])
  })),
  pendingApprovals: z.number()
});
