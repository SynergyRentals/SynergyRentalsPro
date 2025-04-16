import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus, Calendar } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Define the schema for the property form
const propertySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be a positive number"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be a positive number"),
  description: z.string().optional(),
  notes: z.string().optional(),
  icalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amenities: z.array(z.string()).default([]),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  initialData?: any;
  onSuccess: (data: any) => void;
  isEditing?: boolean;
}

export default function PropertyForm({ 
  initialData, 
  onSuccess, 
  isEditing = false 
}: PropertyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up the form with react-hook-form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: initialData ? {
      name: initialData.name || "",
      address: initialData.address || "",
      bedrooms: initialData.bedrooms || 1,
      bathrooms: initialData.bathrooms || 1,
      description: initialData.description || "",
      notes: initialData.notes || "",
      icalUrl: initialData.icalUrl || "",
      amenities: initialData.amenities || [],
    } : {
      name: "",
      address: "",
      bedrooms: 1,
      bathrooms: 1,
      description: "",
      notes: "",
      icalUrl: "",
      amenities: [],
    },
  });
  
  // State for amenity input
  const [amenityInput, setAmenityInput] = React.useState("");
  
  // Add an amenity to the list
  const addAmenity = () => {
    if (!amenityInput.trim()) return;
    
    const currentAmenities = form.getValues("amenities") || [];
    if (!currentAmenities.includes(amenityInput.trim())) {
      form.setValue("amenities", [...currentAmenities, amenityInput.trim()]);
    }
    setAmenityInput("");
  };
  
  // Remove an amenity from the list
  const removeAmenity = (amenity: string) => {
    const currentAmenities = form.getValues("amenities") || [];
    form.setValue(
      "amenities",
      currentAmenities.filter((a) => a !== amenity)
    );
  };
  
  // Set up the mutation
  const mutation = useMutation({
    mutationFn: (data: PropertyFormValues) => {
      // If we're editing, use PATCH, otherwise POST
      return apiRequest(
        isEditing ? `/api/properties/${initialData.id}` : '/api/properties',
        isEditing ? 'PATCH' : 'POST',
        data
      );
    },
    onSuccess: (data) => {
      // Display success toast
      toast({
        title: isEditing ? "Property updated" : "Property created",
        description: isEditing 
          ? `Successfully updated ${data.name}`
          : `Successfully created ${data.name}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      
      // Call the onSuccess callback
      onSuccess(data);
    },
    onError: (error) => {
      toast({
        title: isEditing ? "Failed to update property" : "Failed to create property",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: PropertyFormValues) => {
    // Clean up the data before submitting
    const submissionData = {
      ...data,
      icalUrl: data.icalUrl && data.icalUrl.trim() ? data.icalUrl : null,
    };
    
    mutation.mutate(submissionData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
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
        
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input type="number" min="0" step="0.5" {...field} />
                </FormControl>
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
                  placeholder="Enter property description"
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes about the property"
                  {...field}
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="icalUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Calendar URL (iCal)</span>
                </div>
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/calendar.ics" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
              <p className="text-muted-foreground text-sm">
                Enter the iCal URL to sync reservations from external calendar systems (e.g., Guesty, Airbnb, VRBO)
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amenities"
          render={() => (
            <FormItem>
              <FormLabel>Amenities</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add an amenity"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAmenity();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" onClick={addAmenity} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2">
                {form.watch("amenities").length > 0 ? (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {form.watch("amenities").map((amenity) => (
                          <Badge key={amenity} variant="secondary" className="py-1">
                            {amenity}
                            <button
                              type="button"
                              onClick={() => removeAmenity(amenity)}
                              className="ml-1 rounded-full hover:bg-red-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No amenities added yet. Add amenities like "WiFi", "Pool", "Kitchen", etc.
                  </p>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-32"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}