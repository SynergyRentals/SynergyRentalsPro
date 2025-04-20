import { Redirect, Route, RouteProps } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Route
      {...rest}
      component={(props: any) => 
        status === "authenticated" ? (
          <Component {...props} />
        ) : (
          <Redirect to="/auth" />
        )
      }
    />
  );
}