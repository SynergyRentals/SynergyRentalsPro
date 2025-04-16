import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  Plus, 
  Loader2, 
  BedDouble, 
  Bath, 
  Calendar
} from "lucide-react";
import { queryClient, apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PropertyList() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    data: properties, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/properties'],
    retry: 1,
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/properties/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property deleted",
        description: "The property has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });
  
  // Filter properties based on search query
  const filteredProperties = properties 
    ? properties.filter((property: any) => {
        const query = searchQuery.toLowerCase();
        return (
          property.name.toLowerCase().includes(query) ||
          property.address.toLowerCase().includes(query)
        );
      })
    : [];
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleViewProperty = (id: number) => {
    navigate(`/properties/${id}`);
  };
  
  const handleEditProperty = (id: number) => {
    navigate(`/properties/${id}/edit`);
  };
  
  const handleDeleteProperty = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleCreateNew = () => {
    navigate('/properties/new');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading properties</h3>
        <p className="text-red-600">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/properties'] })}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Properties</h2>
          <p className="text-gray-500">Manage your rental properties</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Property
          </Button>
        </div>
      </div>
      
      {filteredProperties.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No properties found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? "No properties match your search criteria" 
              : "You haven't added any properties yet"}
          </p>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead className="hidden md:table-cell">Calendar</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property: any) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{property.address}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-3">
                      <span className="flex items-center text-sm">
                        <BedDouble className="h-4 w-4 mr-1 text-gray-400" /> 
                        {property.bedrooms}
                      </span>
                      <span className="flex items-center text-sm">
                        <Bath className="h-4 w-4 mr-1 text-gray-400" /> 
                        {property.bathrooms}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {property.icalUrl ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Calendar className="h-3 w-3 mr-1" /> 
                        Calendar Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                        No Calendar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewProperty(property.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditProperty(property.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteProperty(property.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}