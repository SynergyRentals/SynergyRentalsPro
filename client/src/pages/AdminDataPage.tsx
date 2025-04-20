import { useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { Redirect } from "wouter";
import { DataManagement } from "@/components/admin/DataManagement";

export function AdminDataPage() {
  const { user, status } = useAuth();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Redirect if not authorized
  if (!isLoading && !isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isLoading && user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <DataManagement />
    </div>
  );
}