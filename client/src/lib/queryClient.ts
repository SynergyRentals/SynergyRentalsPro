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
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      // Add default headers for JSON except when using FormData
      ...(!options.body || typeof options.body !== 'object' || !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  });

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