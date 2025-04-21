import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

// Helper function for API requests
export async function apiRequest(url: string, method: string = 'GET', data?: any, options: RequestInit = {}) {
  const requestOptions: RequestInit = {
    method,
    ...options,
    // This is crucial for session cookies!
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      // Add default headers for JSON except when using FormData
      ...(!data || typeof data !== 'object' || !(data instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  };

  // Add body if there's data and it's not a GET request
  if (data && method !== 'GET') {
    requestOptions.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    // Handle API error responses
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || `HTTP error ${response.status}`;
    } catch (e) {
      errorMessage = `HTTP error ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  // Parse JSON response if Content-Type is application/json
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return response;
}

// Get query function for React Query
interface QueryFnOptions {
  on401?: 'redirect' | 'returnNull';
}

export function getQueryFn(options: QueryFnOptions = {}) {
  return async ({ queryKey }: { queryKey: (string | object)[] }) => {
    try {
      const url = queryKey[0] as string;
      // The apiRequest function will now include credentials
      const data = await apiRequest(url, 'GET');
      return data;
    } catch (error: any) {
      if (error.message === 'HTTP error 401' && options.on401 === 'returnNull') {
        return null;
      }
      throw error;
    }
  };
}