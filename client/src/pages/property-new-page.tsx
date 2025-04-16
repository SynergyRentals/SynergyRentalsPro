import React from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyForm from "../components/properties/PropertyForm";

export default function PropertyNewPage() {
  const [, navigate] = useLocation();
  
  // Handle success after property creation
  const handleSuccess = (data: any) => {
    navigate(`/properties/${data.id}`);
  };
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="mb-2" 
          onClick={() => navigate("/properties")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <p className="text-muted-foreground">
          Create a new property to manage in the system
        </p>
      </div>
      
      <PropertyForm onSuccess={handleSuccess} />
    </div>
  );
}