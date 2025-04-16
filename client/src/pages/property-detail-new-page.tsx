import React from "react";
import { useParams } from "wouter";
import { useAuth } from "../hooks/use-auth";
import PropertyDetail from "../components/properties/PropertyDetail";
import { Loader2 } from "lucide-react";

export default function PropertyDetailNewPage() {
  const { id } = useParams();
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect or show login prompt if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Authentication Required</h2>
          <p className="text-amber-700">
            Please log in to view property details.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <PropertyDetail />
    </div>
  );
}