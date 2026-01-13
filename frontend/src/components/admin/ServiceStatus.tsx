import { createSignal, onMount, onCleanup } from 'solid-js';
import type { ServiceHealth } from '../../lib/healthchecks';

interface ServiceStatusProps {
  initialServices: ServiceHealth[];
}

export default function ServiceStatus({ initialServices }: ServiceStatusProps) {
  const [services, setServices] = createSignal<ServiceHealth[]>(initialServices);
  const [isConnected, setIsConnected] = createSignal(false);
  const [lastUpdate, setLastUpdate] = createSignal<Date>(new Date());

  onMount(() => {
    // Connect to WebSocket for real-time updates
    connectWebSocket();

    // Also poll API every 30 seconds as fallback
    const pollInterval = setInterval(pollServices, 30000);

    onCleanup(() => {
      clearInterval(pollInterval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  });

  let ws: WebSocket | null = null;

  const connectWebSocket = () => {
    // In a real implementation, this would connect to your WebSocket server
    // For now, we'll simulate WebSocket updates
    console.log('Connecting to WebSocket for real-time updates...');

    // Simulate WebSocket connection
    setTimeout(() => {
      setIsConnected(true);
      console.log('WebSocket connected');

      // Simulate receiving updates
      const simulateUpdates = () => {
        if (Math.random() > 0.7) {
          // Randomly update a service status
          setServices((prev) => {
            const updated = [...prev];
            const randomIndex = Math.floor(Math.random() * updated.length);
            const service = updated[randomIndex];

            // Random status change
            const statuses: ('healthy' | 'warning' | 'error')[] = ['healthy', 'warning', 'error'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

            updated[randomIndex] = {
              ...service,
              status: newStatus,
              lastCheck: 'just now',
              responseTime:
                newStatus === 'error' ? 'Timeout' : `${Math.floor(Math.random() * 200 + 10)}ms`,
            };

            return updated;
          });

          setLastUpdate(new Date());
        }
      };

      // Simulate updates every 10-30 seconds
      const updateInterval = setInterval(simulateUpdates, Math.random() * 20000 + 10000);

      onCleanup(() => {
        clearInterval(updateInterval);
      });
    }, 1000);
  };

  const pollServices = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        if (data.services) {
          setServices(
            data.services.map((service: any) => ({
              name: service.service,
              status: service.status,
              lastCheck: 'just now',
              responseTime: service.status === 'error' ? 'Timeout' : `${service.responseTime}ms`,
              uptime: `${service.uptime}%`,
              description: getServiceDescription(service.service),
              details: service.details,
            }))
          );
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to poll services:', error);
    }
  };

  const getServiceDescription = (serviceName: string): string => {
    const descriptions: Record<string, string> = {
      PostgreSQL: 'Primary database',
      Redis: 'Caching and session storage',
      Supabase: 'Backend services',
      'Fermyon Spin': 'WASM runtime platform',
      'MQTT Broker': 'Message broker for real-time updates',
      'WebSocket Gateway': 'Real-time communication',
      'API Gateway': 'API routing and load balancing',
      Sentry: 'Error tracking and monitoring',
    };
    return descriptions[serviceName] || 'Service monitoring';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-base-300';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      default:
        return 'text-base-content';
    }
  };

  const refreshServices = () => {
    pollServices();
  };

  return (
    <div class="space-y-6">
      {/* Connection Status */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class={`w-3 h-3 rounded-full ${isConnected() ? 'bg-success' : 'bg-error'}`}></div>
          <span class="text-sm text-base-content/70">
            {isConnected() ? 'Connected' : 'Disconnected'} • Last update:{' '}
            {lastUpdate().toLocaleTimeString()}
          </span>
        </div>
        <button class="btn btn-ghost btn-sm" onClick={refreshServices}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Service Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services().map((service) => (
          <div class="card bg-base-200 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                  <h3 class="card-title text-lg">{service.name}</h3>
                </div>
                <div class="dropdown dropdown-end">
                  <label tabindex="0" class="btn btn-ghost btn-xs btn-circle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </label>
                  <ul
                    tabindex="0"
                    class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32"
                  >
                    <li>
                      <a>View logs</a>
                    </li>
                    <li>
                      <a>Restart service</a>
                    </li>
                    <li>
                      <a>Configure alerts</a>
                    </li>
                  </ul>
                </div>
              </div>

              <p class="text-sm text-base-content/70 mb-4">{service.description}</p>

              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Status:</span>
                  <span class={`font-medium ${getStatusTextColor(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Response Time:</span>
                  <span class="font-mono">{service.responseTime}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Uptime:</span>
                  <span class="font-mono">{service.uptime}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Last Check:</span>
                  <span class="font-mono text-xs">{service.lastCheck}</span>
                </div>
              </div>

              <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost btn-xs">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Logs
                </button>
                <button class="btn btn-ghost btn-xs">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Monitor
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
