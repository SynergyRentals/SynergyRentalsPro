import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "../../lib/queryClient";
import { Loader2, Home, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: number;
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  icalUrl: string | null;
}

const PropertyList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch properties
  const { data: properties, isLoading, error } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: () => apiRequest('/api/properties'),
    staleTime: 60000, // 1 minute cache
  });
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-lg font-semibold text-red-800">Error Loading Properties</h3>
        <p className="text-red-700">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }
  
  // Filter properties based on search query
  const filteredProperties = properties 
    ? properties.filter((property: Property) => 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Link>
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <Home className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No properties found</h3>
          <p className="text-muted-foreground mt-2">
            {searchQuery ? "Try a different search term" : "Get started by adding your first property"}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-4">
              <Link href="/properties/new">
                <Plus className="mr-2 h-4 w-4" /> Add Property
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property: Property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle>{property.name}</CardTitle>
                  <CardDescription className="truncate">{property.address}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <span>{property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
                    </div>
                    <div className="flex items-center">
                      <span>{property.bathrooms} {property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-wrap gap-2">
                    {property.icalUrl && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Calendar Sync
                      </Badge>
                    )}
                    {property.amenities && property.amenities.length > 0 && (
                      <Badge variant="outline">
                        {property.amenities.length} {property.amenities.length === 1 ? 'amenity' : 'amenities'}
                      </Badge>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;