// Astro API route for user logout
// Clears authentication and session data

import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
  try {
    // Clear auth cookie
    const clearCookie = [
      'auth_token=',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=0' // Expire immediately
    ].join('; ')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookie
        }
      }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}