import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Building2, MapPin, AlertTriangle, Bed, Bath, Link, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GuestyProperty } from "@shared/schema";
import { Link as WouterLink } from "wouter";

interface GuestyPropertiesTabProps {
  searchQuery?: string;
}

export default function GuestyPropertiesTab({ searchQuery = "" }: GuestyPropertiesTabProps) {
  const { toast } = useToast();
  
  // Get all Guesty properties
  const { 
    data: properties, 
    isLoading, 
    error 
  } = useQuery<GuestyProperty[]>({
    queryKey: ['/api/guesty/properties'],
    retry: 1,
  });

  // Sync properties from Guesty API
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/guesty/sync-properties', {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/guesty/properties'] });
      toast({
        title: "Properties synced",
        description: `Successfully synced ${data.propertiesCount || 0} properties from Guesty.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error syncing properties",
        description: error.message || "Failed to sync properties from Guesty API.",
        variant: "destructive",
      });
    },
  });

  // If error loading properties
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-2" />
          <h3 className="text-xl font-medium text-red-800 mb-2">Failed to load Guesty properties</h3>
          <p className="text-red-600 mb-4 text-center">
            We couldn't retrieve properties from your Guesty account.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/guesty/properties'] })}
            >
              Try Again
            </Button>
            <Button onClick={() => syncMutation.mutate()}>
              Sync from Guesty
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Guesty Properties</h2>
          <p className="text-gray-500">Properties synchronized from your Guesty account.</p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()} 
          className="mt-4 md:mt-0"
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Sync Properties from Guesty
            </>
          )}
        </Button>
      </div>
      
      {isLoading || syncMutation.isPending ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties
            .filter((property) => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                property.name.toLowerCase().includes(query) ||
                property.address.toLowerCase().includes(query) ||
                (property.amenities && property.amenities.some(amenity => 
                  amenity.toLowerCase().includes(query)
                )) ||
                (property.city && property.city.toLowerCase().includes(query)) ||
                (property.state && property.state.toLowerCase().includes(query))
              );
            })
            .map((property) => (
            <Card key={property.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="mr-2">{property.name}</CardTitle>
                  <Badge variant="outline" className="text-blue-500 bg-blue-50">
                    Guesty
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-4 mb-2">
                  {property.bedrooms && (
                    <div className="flex items-center text-sm">
                      <Bed className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{property.bedrooms} {property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</span>
                    </div>
                  )}
                  
                  {property.bathrooms && (
                    <div className="flex items-center text-sm">
                      <Bath className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{property.bathrooms} {property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</span>
                    </div>
                  )}
                </div>
                
                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {property.amenities.slice(0, 5).map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {property.amenities.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{property.amenities.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-2 flex flex-wrap gap-2">
                <WouterLink to={`/properties/${property.id}`} className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => console.log("Navigating to Guesty property:", property.id, property.name)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View Details
                  </Button>
                </WouterLink>
                {property.listingUrl && (
                  <a 
                    href={property.listingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Listing
                  </a>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed">
          <Building2 className="h-12 w-12 text-gray-300 mb-2" />
          <h3 className="text-xl font-medium text-gray-600">No Guesty properties found</h3>
          <p className="text-gray-500 mb-4">
            Sync your properties from Guesty to get started.
          </p>
          <Button onClick={() => syncMutation.mutate()}>
            <Plus className="h-4 w-4 mr-2" /> Sync from Guesty
          </Button>
        </div>
      )}
    </div>
  );
}