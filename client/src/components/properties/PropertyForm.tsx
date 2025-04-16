import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Loader2, 
  Building2, 
  Save, 
  Tag, 
  Plus, 
  X,
  Trash2
} from "lucide-react";
import { queryClient, apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a schema for property validation
const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be 0 or greater"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be 0 or greater"),
  description: z.string().optional(),
  notes: z.string().optional(),
  icalUrl: z.string().optional()
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  propertyId?: string;
  isEditMode: boolean;
}

export default function PropertyForm({ propertyId, isEditMode }: PropertyFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  
  // Create form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      address: "",
      bedrooms: 1,
      bathrooms: 1,
      description: "",
      notes: "",
      icalUrl: ""
    }
  });
  
  // Fetch property data if in edit mode
  const {
    data: property,
    isLoading: isLoadingProperty,
    error: propertyError
  } = useQuery({
    queryKey: [`/api/properties/${propertyId}`],
    enabled: isEditMode && !!propertyId,
  });
  
  // Update form values when property data is loaded
  useEffect(() => {
    if (property && isEditMode) {
      form.reset({
        name: property.name,
        address: property.address,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        description: property.description || "",
        notes: property.notes || "",
        icalUrl: property.icalUrl || ""
      });
      
      setAmenities(property.amenities || []);
    }
  }, [property, isEditMode, form]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PropertyFormValues & { amenities: string[] }) => {
      const res = await apiRequest('POST', '/api/properties', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property created",
        description: "The property has been successfully created.",
      });
      navigate('/properties');
    },
    onError: (error: any) => {
      toast({
        title: "Error creating property",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    }
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PropertyFormValues & { amenities: string[] }) => {
      const res = await apiRequest('PATCH', `/api/properties/${propertyId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property updated",
        description: "The property has been successfully updated.",
      });
      navigate(`/properties/${propertyId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating property",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (data: PropertyFormValues) => {
    const propertyData = {
      ...data,
      amenities
    };
    
    if (isEditMode) {
      updateMutation.mutate(propertyData);
    } else {
      createMutation.mutate(propertyData);
    }
  };
  
  // Handle adding a new amenity
  const handleAddAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity("");
    }
  };
  
  // Handle removing an amenity
  const handleRemoveAmenity = (index: number) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };
  
  // Handle back button click
  const handleBack = () => {
    if (isEditMode && propertyId) {
      navigate(`/properties/${propertyId}`);
    } else {
      navigate('/properties');
    }
  };
  
  // Loading state
  if (isEditMode && isLoadingProperty) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (isEditMode && propertyError) {
    return (
      <div>
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="w-full">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Property Not Found
              </h2>
              <p className="text-gray-500 mb-6">
                The property you're trying to edit doesn't exist or you don't have permission to edit it.
              </p>
              <Button onClick={() => navigate('/properties')}>
                Back to Properties List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div>
      <Button variant="outline" onClick={handleBack} className="mb-6">
        <ChevronLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Property' : 'Create New Property'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bedrooms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseFloat(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bathrooms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a description of the property" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Amenities</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {amenities.map((amenity, index) => (
                    <div 
                      key={index}
                      className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(index)}
                        className="text-secondary-foreground/70 hover:text-secondary-foreground ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {amenities.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No amenities added</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add amenity (e.g. WiFi, Pool, etc.)"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleAddAmenity}
                    disabled={!newAmenity.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="icalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>iCal URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/calendar.ics" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter an iCal URL to sync bookings from external calendars (e.g. Airbnb, VRBO, Google)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional notes about the property" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Cancel
                </Button>
                
                <div className="flex gap-2">
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
                          // Implementation of delete functionality
                          apiRequest('DELETE', `/api/properties/${propertyId}`)
                            .then(() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
                              toast({
                                title: "Property deleted",
                                description: "The property has been successfully deleted.",
                              });
                              navigate('/properties');
                            })
                            .catch(err => {
                              toast({
                                title: "Error deleting property",
                                description: err.message || "Failed to delete property",
                                variant: "destructive",
                              });
                            });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                  
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditMode ? 'Update Property' : 'Create Property'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}