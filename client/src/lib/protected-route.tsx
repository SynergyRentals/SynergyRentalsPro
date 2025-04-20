import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (status === 'loading') {
      // Wait for authentication status to be determined
      return;
    }

    if (status === 'unauthenticated') {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to dashboard if user doesn't have required role
      navigate('/dashboard');
      return;
    }
  }, [user, status, navigate, requiredRole]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated and has required role, render children
  if (
    status === 'authenticated' && 
    (!requiredRole || user?.role === requiredRole)
  ) {
    return <>{children}</>;
  }

  // Otherwise return null (redirects are handled in useEffect)
  return null;
}