import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// API request utility
export async function apiRequest(method: string, url: string, data?: any) {
  console.log(`API Request: ${method} ${url}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add basic auth for admin endpoints - gateway will validate
  if (url.includes('/dashboard/stats') || url.includes('/admin/')) {
    headers['Authorization'] = 'Basic ' + btoa('admin:admin');
  }
  
  const options: RequestInit = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  console.log(`API Success: ${response.status} for ${url}`);
  return response;
}