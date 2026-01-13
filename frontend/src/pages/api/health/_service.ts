import type { APIRoute } from 'astro';
import { healthCheckEndpoints } from '../../../lib/healthchecks';

export const GET: APIRoute = async ({ params }) => {
  try {
    const serviceName = params.service;

    if (!serviceName) {
      return new Response(
        JSON.stringify({
          error: 'Service name is required',
          availableServices: [
            'database',
            'redis',
            'supabase',
            'fermyon',
            'mqtt',
            'websocket',
            'gateway',
          ],
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let healthCheck;

    switch (serviceName.toLowerCase()) {
      case 'database':
      case 'postgresql':
        healthCheck = await healthCheckEndpoints.checkDatabase();
        break;
      case 'redis':
        healthCheck = await healthCheckEndpoints.checkRedis();
        break;
      case 'supabase':
        healthCheck = await healthCheckEndpoints.checkSupabase();
        break;
      case 'fermyon':
      case 'spin':
        healthCheck = await healthCheckEndpoints.checkFermyon();
        break;
      case 'mqtt':
      case 'broker':
        healthCheck = await healthCheckEndpoints.checkMQTT();
        break;
      case 'websocket':
      case 'ws':
        healthCheck = await healthCheckEndpoints.checkWebSocket();
        break;
      case 'gateway':
      case 'api-gateway':
        healthCheck = await healthCheckEndpoints.checkAPIGateway();
        break;
      default:
        return new Response(
          JSON.stringify({
            error: 'Unknown service',
            availableServices: [
              'database',
              'redis',
              'supabase',
              'fermyon',
              'mqtt',
              'websocket',
              'gateway',
            ],
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
    }

    const statusCode =
      healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'warning' ? 200 : 503;

    return new Response(JSON.stringify(healthCheck), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
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

export const ALL: APIRoute = async () => {
  try {
    const services = await Promise.all([
      healthCheckEndpoints.checkDatabase(),
      healthCheckEndpoints.checkRedis(),
      healthCheckEndpoints.checkSupabase(),
      healthCheckEndpoints.checkFermyon(),
      healthCheckEndpoints.checkMQTT(),
      healthCheckEndpoints.checkWebSocket(),
      healthCheckEndpoints.checkAPIGateway(),
    ]);

    const overallStatus = services.every((s) => s.status === 'healthy')
      ? 'healthy'
      : services.some((s) => s.status === 'error')
        ? 'error'
        : 'warning';

    return new Response(
      JSON.stringify({
        overall: overallStatus,
        services,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
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
