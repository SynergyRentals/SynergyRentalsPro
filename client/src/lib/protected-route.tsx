import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';

interface ProtectedRouteProps {
  children?: ReactNode;
  component?: React.ComponentType<any>;
  path?: string;
  requiredRole?: string;
}

export function ProtectedRoute({ 
  children, 
  component: Component,
  requiredRole 
}: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) {
      // Wait for authentication status to be determined
      return;
    }

    if (!user) {
      // Redirect to auth if not authenticated
      navigate('/auth');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to dashboard if user doesn't have required role
      navigate('/');
      return;
    }
  }, [user, isLoading, navigate, requiredRole]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated and has required role, render children or component
  if (
    user && 
    (!requiredRole || user?.role === requiredRole)
  ) {
    if (Component) {
      return <Component />;
    }
    return <>{children}</>;
  }

  // Otherwise return null (redirects are handled in useEffect)
  return null;
}