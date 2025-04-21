import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  CalendarDays, 
  Edit, 
  Trash2, 
  Loader2, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Home, 
  BedDouble, 
  Bath, 
  Clipboard, 
  Eye, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import PropertyCalendar from "./PropertyCalendar";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface CalendarEvent {
  start: Date;
  end: Date;
  title: string;
  uid: string;
  status?: string;
}

interface PropertyDetailProps {
  id: number;
  onEdit: () => void;
}

export default function PropertyDetail({ id, onEdit }: PropertyDetailProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  
  // Fetch property details
  const { data: property, isLoading, error } = useQuery({
    queryKey: [`/api/properties/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Error fetching property: ${response.status}`);
      }
      return response.json();
    },
  });
  
  // Check if property exists and has icalUrl
  const hasIcalUrl = property && typeof property === 'object' && 'icalUrl' in property && !!property.icalUrl;
  
  // Handle null or undefined values for bedrooms and bathrooms with proper defaults
  const bedrooms = property?.bedrooms || 1;
  const bathrooms = property?.bathrooms || 1;
  // Set default amenities as empty array if undefined or null
  const amenities = Array.isArray(property?.amenities) ? property.amenities : [];
  
  // Fetch calendar events if property has icalUrl
  const { data: calendarEvents, isLoading: isLoadingCalendar, refetch: refetchCalendar } = useQuery({
    queryKey: [`/api/properties/${id}/calendar`],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}/calendar`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Error fetching calendar: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!id && hasIcalUrl,
  });
  
  // Set up delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Error deleting property: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property deleted",
        description: "The property has been successfully deleted",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      
      // Navigate back to properties list
      navigate('/properties');
    },
    onError: (error) => {
      toast({
        title: "Failed to delete property",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Refresh calendar data manually using dedicated refresh endpoint
  const handleRefreshCalendar = async () => {
    setRefreshingCalendar(true);
    try {
      // Call the dedicated refresh endpoint instead of just refetching
      const response = await fetch(`/api/properties/${id}/refresh-calendar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error refreshing calendar: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Refetch to get the latest data after cache is cleared
      await refetchCalendar();
      
      toast({
        title: "Calendar refreshed",
        description: `Successfully refreshed calendar with ${result.eventsCount} events`,
      });
    } catch (error) {
      toast({
        title: "Failed to refresh calendar",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setRefreshingCalendar(false);
    }
  };
  
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
        <h3 className="text-lg font-semibold text-red-800">Error Loading Property</h3>
        <p className="text-red-700">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted-foreground">
            <Home className="h-4 w-4 inline mr-1" />
            {property.address}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the property
                  "{property.name}" and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Property"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center">
          <BedDouble className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>
            {bedrooms} {bedrooms === 1 ? "Bedroom" : "Bedrooms"}
          </span>
        </div>
        
        <div className="flex items-center">
          <Bath className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>
            {bathrooms} {bathrooms === 1 ? "Bathroom" : "Bathrooms"}
          </span>
        </div>
        
        {property.icalUrl && (
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-green-600" />
            <span className="text-green-600">Calendar Connected</span>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="info">Information</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Property Description</CardTitle>
              </CardHeader>
              <CardContent>
                {property.description ? (
                  <p className="whitespace-pre-line">{property.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                {amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: string) => (
                      <Badge key={amenity} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No amenities listed</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reservations Calendar</CardTitle>
                <CardDescription>
                  External calendar synced from {property.icalUrl ? "iCal feed" : "not connected"}
                </CardDescription>
              </div>
              
              {property.icalUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCalendar}
                  disabled={refreshingCalendar}
                >
                  {refreshingCalendar ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!property.icalUrl ? (
                <div className="text-center py-6">
                  <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Calendar Connected</h3>
                  <p className="text-muted-foreground mt-2">
                    This property doesn't have an iCal URL configured.
                  </p>
                  <Button className="mt-4" onClick={onEdit}>
                    <Calendar className="mr-2 h-4 w-4" /> Add Calendar URL
                  </Button>
                </div>
              ) : isLoadingCalendar ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (calendarEvents && Array.isArray(calendarEvents) && calendarEvents.length > 0) ? (
                <PropertyCalendar 
                  events={calendarEvents} 
                  isLoading={isLoadingCalendar} 
                />
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Upcoming Bookings</h3>
                  <p className="text-muted-foreground mt-2">
                    There are no upcoming reservations in the connected calendar.
                  </p>
                </div>
              )}
            </CardContent>
            
            {property.icalUrl && (
              <CardFooter className="border-t bg-slate-50 gap-2 flex-col items-start">
                <div className="flex justify-between w-full">
                  <div className="text-sm font-medium">Calendar URL (iCal)</div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-2" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>iCal URL</DialogTitle>
                        <DialogDescription>
                          This URL is used to sync reservations from external calendar systems
                        </DialogDescription>
                      </DialogHeader>
                      <div className="bg-secondary p-3 rounded-md overflow-auto break-all">
                        <code className="text-sm">{property.icalUrl}</code>
                      </div>
                      <DialogFooter>
                        <a 
                          href={property.icalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open URL
                        </a>
                        <DialogClose asChild>
                          <Button variant="outline">Close</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last refreshed: {isLoadingCalendar ? "Loading..." : new Date().toLocaleString()}
                </p>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Property ID</h3>
                <p>{property.id}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
                {property.notes ? (
                  <p className="whitespace-pre-line">{property.notes}</p>
                ) : (
                  <p className="italic text-muted-foreground">No internal notes</p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                <p>{property.createdAt && format(new Date(property.createdAt), 'PPpp')}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                <p>{property.updatedAt && format(new Date(property.updatedAt), 'PPpp')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}