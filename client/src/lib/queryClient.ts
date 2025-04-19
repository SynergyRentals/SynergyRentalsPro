import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Check if data is FormData, if so, don't set Content-Type 
  // (browser will set it with the boundary) and don't stringify
  const isFormData = data instanceof FormData;
  
  try {
    const res = await fetch(url, {
      method,
      headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
      body: data 
        ? isFormData 
          ? data 
          : JSON.stringify(data) 
        : undefined,
      credentials: "include",
    });
  
    await throwIfResNotOk(res);
    
    // Check if the response has content
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const jsonData = await res.json();
        
        // Additional validation to ensure we have a proper object
        if (jsonData === null || jsonData === undefined) {
          console.error('API request returned null or undefined JSON', { url, method });
          throw new Error('Invalid response: Empty JSON data');
        }
        
        return jsonData;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
    } else {
      // For non-JSON responses, return the Response object
      return { 
        success: true, 
        status: res.status,
        statusText: res.statusText,
        nonJsonResponse: true
      };
    }
  } catch (error) {
    console.error(`API request failed (${method} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
