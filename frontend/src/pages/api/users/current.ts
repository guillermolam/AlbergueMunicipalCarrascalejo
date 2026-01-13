// Astro API route for current user profile
// Returns authenticated user data

import type { APIRoute } from 'astro';
import { getApiClient } from '@/lib/api-client';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authentication token provided',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get API client and fetch user profile
    const client = getApiClient();
    client.setToken(token);
    const response = await client.getUserProfile();

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authentication token provided',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get API client and update user profile
    const client = getApiClient();
    client.setToken(token);
    const response = await client.updateUserProfile(body);

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
