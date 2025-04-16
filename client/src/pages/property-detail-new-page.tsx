import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyDetail from "../components/properties/PropertyDetail";

export default function PropertyDetailNewPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  
  // Get property ID as number
  const propertyId = id ? parseInt(id, 10) : undefined;
  
  // Handle navigation back to properties list
  const handleBack = () => {
    navigate("/properties");
  };
  
  // Toggle edit mode
  const handleEdit = () => {
    navigate(`/properties/${id}/edit`);
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
          <Button onClick={handleBack}>Return to Properties</Button>
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
        Back to Properties
      </Button>
      
      <PropertyDetail id={propertyId} onEdit={handleEdit} />
    </div>
  );
}