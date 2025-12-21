import type { APIRoute } from 'astro'
import { getRedisKey } from '../../../stores/redis'

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get session ID from cookie
    const cookies = request.headers.get('cookie') || ''
    const sessionMatch = cookies.match(/sessionId=([^;]+)/)
    
    if (!sessionMatch) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    const sessionId = sessionMatch[1]
    const userData = await getRedisKey(`user:${sessionId}`)
    
    if (!userData) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    const user = JSON.parse(userData)
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error getting current user:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}