import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'loading',
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isLoading) {
      setStatus('loading');
    } else if (isError || !data) {
      setUser(null);
      setStatus('unauthenticated');
    } else {
      setUser(data);
      setStatus('authenticated');
    }
  }, [data, isLoading, isError]);

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
      setStatus('unauthenticated');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}