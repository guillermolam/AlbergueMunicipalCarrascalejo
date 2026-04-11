import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const profile = {
  update: defineAction({
    input: z.object({
      name: z.string().min(1).max(100).optional(),
      phone: z.string().max(30).optional(),
      country: z.string().max(10).optional(),
      city: z.string().max(100).optional(),
      bio: z.string().max(500).optional(),
      lockerNumber: z.string().max(10).optional(),
    }),
    handler: async (input, context) => {
      const token = context.locals?.sessionToken as string | undefined;
      if (!token) throw new Error('Not authenticated');
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Profile update failed: HTTP ${res.status}`);
      return (await res.json()) as { success: boolean; profile: unknown };
    },
  }),

  updateEmergency: defineAction({
    input: z.object({
      name: z.string().min(1).max(100),
      relation: z.string().max(50),
      phone: z.string().min(7).max(30),
      email: z.string().email().optional(),
    }),
    handler: async (input, context) => {
      const token = context.locals?.sessionToken as string | undefined;
      if (!token) throw new Error('Not authenticated');
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/users/profile/emergency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Emergency contact update failed: HTTP ${res.status}`);
      return { success: true };
    },
  }),

  updateCamino: defineAction({
    input: z.object({
      route: z.string().max(50).optional(),
      startDate: z.string().optional(),
      origin: z.string().max(100).optional(),
      completedStageIds: z.array(z.string()).optional(),
    }),
    handler: async (input, context) => {
      const token = context.locals?.sessionToken as string | undefined;
      if (!token) throw new Error('Not authenticated');
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/camino/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          route: input.route,
          start_date: input.startDate,
          origin: input.origin,
          completed_stage_ids: input.completedStageIds,
        }),
      });
      if (!res.ok) throw new Error(`Camino update failed: HTTP ${res.status}`);
      return { success: true };
    },
  }),

  addVehicle: defineAction({
    input: z.object({
      type: z.string().min(1).max(50),
      plate: z.string().min(1).max(20),
      model: z.string().max(100).optional(),
      color: z.string().max(50).optional(),
      notes: z.string().max(200).optional(),
    }),
    handler: async (input, context) => {
      const token = context.locals?.sessionToken as string | undefined;
      if (!token) throw new Error('Not authenticated');
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/users/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Vehicle add failed: HTTP ${res.status}`);
      return (await res.json()) as { id: string };
    },
  }),

  removeVehicle: defineAction({
    input: z.object({ vehicleId: z.string().min(1) }),
    handler: async ({ vehicleId }, context) => {
      const token = context.locals?.sessionToken as string | undefined;
      if (!token) throw new Error('Not authenticated');
      const apiBase = import.meta.env.PUBLIC_API_URL ?? '/api';
      const res = await fetch(`${apiBase}/users/vehicles/${encodeURIComponent(vehicleId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Vehicle remove failed: HTTP ${res.status}`);
      return { success: true };
    },
  }),
};
