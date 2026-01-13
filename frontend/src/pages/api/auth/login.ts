// Astro API route for fake authentication endpoints
// Provides mocked responses for development and testing

import type { APIRoute } from 'astro';
import { getApiClient } from '@/lib/api-client';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Validate request
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email and password are required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get API client (will use fake mode based on configuration)
    const client = getApiClient();
    const response = await client.login({ email, password, rememberMe });

    if (response.success && response.data) {
      // Set auth cookie
      const cookieOptions = [
        'auth_token=' + response.data.token,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        'Path=/',
        'Max-Age=' + (rememberMe ? '2592000' : '86400'), // 30 days or 1 day
      ].join('; ');

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieOptions,
        },
      });
    }

    return new Response(JSON.stringify(response), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
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

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get current user (check auth cookie)
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

    // Get API client and fetch current user
    const client = getApiClient();
    client.setToken(token);
    const response = await client.getCurrentUser();

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
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
