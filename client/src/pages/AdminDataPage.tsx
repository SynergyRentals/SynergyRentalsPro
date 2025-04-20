import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import DataManagement from "@/components/admin/DataManagement";
import AuthLayout from "@/components/layout/AuthLayout";

export default function AdminDataPage() {
  const { user, status } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirect if not authorized
  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
    } else if (user && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, status, navigate]);
  
  // If loading, show loading indicator
  if (status === "loading") {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AuthLayout>
    );
  }
  
  // If user is not logged in or not loading, handled by the useEffect above
  if (!user) {
    return null;
  }
  
  // If user is not admin, show access denied
  if (user.role !== "admin") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-6">You need administrator privileges to access this page.</p>
        </div>
      </AuthLayout>
    );
  }
  
  // User is admin, show data management interface
  return (
    <AuthLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Data Management</h1>
        </div>
        
        <DataManagement />
      </div>
    </AuthLayout>
  );
}