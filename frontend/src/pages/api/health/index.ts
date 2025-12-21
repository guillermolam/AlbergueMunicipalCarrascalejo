import type { APIRoute } from 'astro';
import { healthCheckEndpoints } from '../../../lib/healthchecks';

export const GET: APIRoute = async () => {
  try {
    const services = await Promise.all([
      healthCheckEndpoints.checkDatabase(),
      healthCheckEndpoints.checkRedis(),
      healthCheckEndpoints.checkSupabase(),
      healthCheckEndpoints.checkFermyon(),
      healthCheckEndpoints.checkMQTT(),
      healthCheckEndpoints.checkWebSocket(),
      healthCheckEndpoints.checkAPIGateway()
    ]);

    const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' :
                         services.some(s => s.status === 'error') ? 'error' : 'warning';

    return new Response(
      JSON.stringify({
        overall: overallStatus,
        services,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};