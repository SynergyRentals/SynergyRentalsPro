import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyForm from "../components/properties/PropertyForm";
import { apiRequest } from "../lib/queryClient";

export default function PropertyEditNewPage() {
  // Use useRoute instead of useParams to match wouter's API
  const [match, params] = useRoute("/properties/:id/edit");
  const [, navigate] = useLocation();
  
  // Log routing info for debugging
  console.log("Property edit page match:", match, "params:", params);
  
  // Get property ID as number
  const propertyId = params?.id ? parseInt(params.id, 10) : undefined;
  
  // Fetch property data
  const { data: property, isLoading, error } = useQuery({
    queryKey: [`/api/properties/${propertyId}`],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Error fetching property: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!propertyId && !isNaN(propertyId),
  });
  
  // Handle navigation back to property detail
  const handleBack = () => {
    if (params?.id) {
      navigate(`/properties/${params.id}`);
    } else {
      navigate("/properties");
    }
  };
  
  // Handle success after property update
  const handleSuccess = (data: any) => {
    navigate(`/properties/${data.id}`);
  };
  
  // If no valid property ID, return error state
  if (!propertyId || isNaN(propertyId)) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-md p-8 text-center">
          <h1 className="text-xl font-bold text-red-800 mb-2">Invalid Property ID</h1>
          <p className="text-red-700 mb-4">
            The property ID provided is invalid or missing.
          </p>
          <Button onClick={() => navigate("/properties")}>Return to Properties</Button>
        </div>
      </div>
    );
  }
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading property...</span>
      </div>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-md p-8">
          <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Property</h1>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button onClick={() => navigate("/properties")}>Return to Properties</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={handleBack}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Property Details
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Property</h1>
        <p className="text-muted-foreground">
          Update information for {property?.name}
        </p>
      </div>
      
      <PropertyForm 
        initialData={property} 
        onSuccess={handleSuccess} 
        isEditing={true}
      />
    </div>
  );
}