import { QueryClient } from "@tanstack/react-query";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const apiRequest = async (
  url: string,
  options?: RequestInit
): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    credentials: "same-origin",
    ...options,
  });

  if (!response.ok) {
    // Try to parse error message from response
    try {
      const data = await response.json();
      throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
  }

  // Return null for 204 No Content
  if (response.status === 204) return null;

  // Try to parse as JSON, fallback to text
  try {
    return await response.json();
  } catch (e) {
    return await response.text();
  }
};