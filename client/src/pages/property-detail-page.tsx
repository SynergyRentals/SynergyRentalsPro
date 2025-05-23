import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute, Link } from "wouter";
import { 
  Loader2, ChevronLeft, Building2, MapPin, Wifi, FileText, Tag, User, Calendar, ClipboardCheck,
  Wrench, Package, ReceiptText, MessageSquare, Upload, Download, ArrowUpDown, Clipboard, Users,
  CalendarDays, Clock, AlertCircle, ExternalLink, CalendarClock, Check, RefreshCw, AlertTriangle,
  Plus, Link as LinkIcon, Trash2, Home, CalendarPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { Unit, Guest, Maintenance, Inventory, Task, Document, GuestyProperty } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import TaskCard from "@/components/dashboard/TaskCard";
import { CalendarView } from "../components/dashboard/CalendarView";
import { Separator } from "@/components/ui/separator";

export default function PropertyDetailPage() {
  const { toast } = useToast();
  const [_, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params ? parseInt(params.id) : null;
  const [showIcalInput, setShowIcalInput] = useState(false);
  const [newIcalUrl, setNewIcalUrl] = useState("");
  
  // Get property details from unified endpoint
  const { 
    data: property, 
    isLoading: isLoadingProperty, 
    error: propertyError 
  } = useQuery<GuestyProperty>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });
  
  // Get guests for this property
  const { 
    data: guests, 
    isLoading: isLoadingGuests, 
    error: guestsError 
  } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    select: (data) => data.filter(guest => guest.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get maintenance items for this property
  const { 
    data: maintenanceItems, 
    isLoading: isLoadingMaintenance, 
    error: maintenanceError 
  } = useQuery<Maintenance[]>({
    queryKey: ['/api/maintenance'],
    select: (data) => data.filter(item => item.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get inventory items for this property
  const { 
    data: inventoryItems, 
    isLoading: isLoadingInventory, 
    error: inventoryError 
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
    select: (data) => data.filter(item => item.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get tasks for this property
  const { 
    data: tasks, 
    isLoading: isLoadingTasks, 
    error: tasksError 
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    select: (data) => data.filter(task => task.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get documents for this property
  const { 
    data: documents, 
    isLoading: isLoadingDocuments, 
    error: documentsError 
  } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    select: (data) => data.filter(doc => doc.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get calendar events for this property using unified endpoint
  const {
    data: calendarEvents,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar
  } = useQuery({
    queryKey: ['/api/properties', propertyId, 'calendar'],
    queryFn: async () => {
      console.log('Attempting to fetch calendar events for property:', propertyId);
      
      if (!propertyId) {
        throw new Error('Property ID is required to fetch calendar events');
      }
      
      // Before making API call, check if the property has an iCalUrl
      console.log('Property object for calendar check:', property);
      if (property && !property.icalUrl) {
        console.log('Property has no iCal URL configured, returning empty array without API call');
        return [];
      }
      
      console.log('Fetching calendar data from API endpoint...');
      try {
        const response = await fetch(`/api/properties/${propertyId}/calendar`);
        console.log('Calendar API response status:', response.status);
        
        if (response.status === 404) {
          // Handle 404 cases
          let errorMessage = 'Calendar not found';
          try {
            const errorData = await response.json();
            console.log('Calendar 404 response:', errorData);
            errorMessage = errorData.message || errorMessage;
            
            if (errorData.message && errorData.message.includes("No iCal URL found")) {
              // This is an expected case, not a true error
              console.log('No iCal URL configured for this property, returning empty array');
              return [];
            }
          } catch (e) {
            console.error('Failed to parse 404 response:', e);
          }
          
          // For other 404 cases (e.g., unit not found)
          throw new Error(errorMessage);
        }
        
        if (!response.ok) {
          let errorMessage = `Failed to fetch calendar events: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If we can't parse the error as JSON, try to get it as text
            try {
              const errorText = await response.text();
              if (errorText) errorMessage += ` - ${errorText}`;
            } catch {} // Ignore if we can't get text either
          }
          
          console.error('Calendar fetch error:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Calendar events fetched successfully:', data.length, 'events');
        
        // Ensure all events have the required properties and valid dates
        const processedEvents = data.map((event: any) => ({
          start: new Date(event.start),
          end: new Date(event.end),
          title: event.title || 'Reservation',
          uid: event.uid || `event-${Math.random().toString(36).substring(2, 9)}`,
          status: event.status || 'confirmed'
        }));
        
        return processedEvents;
      } catch (error) {
        console.error('Error in calendar fetch:', error);
        throw error;
      }
    },
    // Always enable the query if we have a property ID
    enabled: !!propertyId && !!property,
    // Add a reasonable retry policy for transient network errors
    retry: 1,
    retryDelay: 1000,
    // Ensure the cache is fresh (don't use stale data for too long)
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // Auto-refresh calendar if we have an icalUrl but no events
  React.useEffect(() => {
    // If the property has changed or the iCal URL has been updated, refetch calendar data
    if (property && !isLoadingCalendar) {
      console.log('Property data changed, checking if we need to refetch calendar');
      console.log('Current icalUrl:', property.icalUrl);
      
      // Small delay to make sure other queries have settled
      const timer = setTimeout(() => {
        console.log('Forcing calendar refetch due to property/icalUrl update');
        refetchCalendar();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [property, isLoadingCalendar, refetchCalendar]);
  
  // Prepare calendar events for the CalendarView component
  const getCalendarEvents = () => {
    const events = [];
    
    // Add events from external iCal source if available
    if (calendarEvents && calendarEvents.length > 0) {
      calendarEvents.forEach(event => {
        // Generate a unique reservation ID for tracking connected events
        const reservationId = event.uid || `reservation-${Math.random().toString(36).substring(2, 11)}`;
        
        // Add event start date as check-in
        events.push({
          date: event.start,
          type: "checkin", // Use a specific type for check-in events
          label: `Check-in: ${event.title || 'Reservation'}`,
          // Important: Add these properties for the reservation visualization
          startDate: event.start,
          endDate: event.end,
          reservationId: reservationId
        });
        
        // Add event end date as check-out
        events.push({
          date: event.end,
          type: "checkout", // Use a specific type for check-out events
          label: `Check-out: ${event.title || 'Reservation'}`,
          // Important: Add these properties for the reservation visualization
          startDate: event.start,
          endDate: event.end, 
          reservationId: reservationId
        });
      });
    }
    
    // Add guest check-ins and check-outs
    if (guests && guests.length > 0) {
      guests.forEach(guest => {
        // Generate a unique ID for this guest stay
        const guestStayId = `guest-${guest.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        if (guest.checkIn) {
          const checkInDate = new Date(guest.checkIn);
          events.push({
            date: checkInDate,
            type: "checkin", // Use specific type for check-in
            label: `Check-in: ${guest.name}`,
            startDate: checkInDate,
            endDate: guest.checkOut ? new Date(guest.checkOut) : new Date(new Date(checkInDate).setDate(checkInDate.getDate() + 1)), // Next day if no checkout
            reservationId: guestStayId
          });
        }
        
        if (guest.checkOut) {
          const checkOutDate = new Date(guest.checkOut);
          events.push({
            date: checkOutDate,
            type: "checkout", // Use specific type for check-out
            label: `Check-out: ${guest.name}`,
            startDate: guest.checkIn ? new Date(guest.checkIn) : new Date(new Date(checkOutDate).setDate(checkOutDate.getDate() - 1)), // Previous day if no checkin
            endDate: checkOutDate,
            reservationId: guestStayId
          });
        }
      });
    }
    
    // Add maintenance tasks
    if (maintenanceItems && maintenanceItems.length > 0) {
      maintenanceItems.forEach(item => {
        if (item.createdAt) {
          events.push({
            date: new Date(item.createdAt),
            type: "maintenance",
            label: `Maintenance: ${item.description.substring(0, 20)}${item.description.length > 20 ? '...' : ''}`
          });
        }
      });
    }
    
    // Add tasks (like cleaning)
    if (tasks && tasks.length > 0) {
      tasks.filter(task => task.type === "cleaning").forEach(task => {
        if (task.dueDate) {
          events.push({
            date: new Date(task.dueDate),
            type: "cleaning",
            label: `Cleaning: ${task.type}`
          });
        }
      });
    }
    
    return events;
  };
  
  // Mutation for updating property using unified endpoint
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<GuestyProperty>) => {
      return apiRequest('PATCH', `/api/properties/${propertyId}`, data);
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Property updated",
        description: "The property details have been updated successfully.",
      });
      
      // Invalidate and refetch queries
      await queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId] });
      // Also invalidate legacy endpoints for backwards compatibility
      await queryClient.invalidateQueries({ queryKey: ['/api/guesty/properties'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/guesty/properties', propertyId] });
      
      // If we've updated the iCal URL, let's make sure the calendar data is refreshed
      // and switch to the calendar tab
      if ('icalUrl' in variables) {
        // Set calendar tab as active
        const tabsElement = document.querySelector('button[value="calendar"]') as HTMLButtonElement;
        if (tabsElement) {
          tabsElement.click();
        }
        
        // Invalidate calendar data in both unified and legacy endpoints
        await queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'calendar'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/guesty/properties', propertyId, 'calendar'] });
        // Force a refetch of the property to ensure it has the latest icalUrl
        await queryClient.refetchQueries({ queryKey: ['/api/properties', propertyId] });
        // Force a refetch of calendar events
        setTimeout(() => refetchCalendar(), 500);
      }
      
      setShowIcalInput(false);
      setNewIcalUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error updating property",
        description: `Failed to update property: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle navigation back to properties list
  const handleBackToList = () => {
    setLocation("/properties");
  };
  
  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (propertyError || !property) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={handleBackToList} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" /> Back to Properties
        </Button>
        <Card className="w-full">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Property Not Found
              </h2>
              <p className="text-gray-500 mb-6">
                The property you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={handleBackToList}>
                Back to Properties List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Button variant="outline" onClick={handleBackToList} className="mb-6">
        <ChevronLeft className="h-4 w-4 mr-2" /> Back to Properties
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <CardTitle className="text-2xl">{property.name}</CardTitle>
                  {/* Source badge */}
                  <Badge variant="outline" className={`ml-2 ${property.source === 'guesty' ? 'text-blue-500 bg-blue-50' : 'text-green-500 bg-green-50'}`}>
                    {property.source === 'guesty' ? 'Guesty' : 'Internal'}
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </CardDescription>
              </div>
              <div>
                {/* Display property amenities instead of tags */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-end">
                    {property.amenities.map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Property Details Box */}
              <div className="border p-3 rounded-md flex items-start">
                <Building2 className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Property Details</h3>
                  <p className="text-sm text-gray-600">
                    {property.bedrooms || 0} bedroom(s), {property.bathrooms || 0} bathroom(s)
                  </p>
                  {property.propertyId && (
                    <p className="text-xs text-gray-500 mt-1">ID: {property.propertyId}</p>
                  )}
                </div>
              </div>

              {/* Listing URL Box */}
              {property.listingUrl && (
                <div className="border p-3 rounded-md flex items-start">
                  <ExternalLink className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Listing URL</h3>
                    <a 
                      href={property.listingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center mt-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> View External Listing
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-1">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Guests</span>
                </div>
                <Badge variant="outline">
                  {isLoadingGuests ? <Loader2 className="h-3 w-3 animate-spin" /> : guests?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Wrench className="h-4 w-4 mr-2" />
                  <span>Maintenance</span>
                </div>
                <Badge variant="outline">
                  {isLoadingMaintenance ? <Loader2 className="h-3 w-3 animate-spin" /> : maintenanceItems?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  <span>Tasks</span>
                </div>
                <Badge variant="outline">
                  {isLoadingTasks ? <Loader2 className="h-3 w-3 animate-spin" /> : tasks?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Package className="h-4 w-4 mr-2" />
                  <span>Inventory Items</span>
                </div>
                <Badge variant="outline">
                  {isLoadingInventory ? <Loader2 className="h-3 w-3 animate-spin" /> : inventoryItems?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Documents</span>
                </div>
                <Badge variant="outline">
                  {isLoadingDocuments ? <Loader2 className="h-3 w-3 animate-spin" /> : documents?.length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button className="w-full" variant="outline">
              <Clipboard className="h-4 w-4 mr-2" /> Generate Property Report
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Home className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-2" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="guests">
            <User className="h-4 w-4 mr-2" /> Guests
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="h-4 w-4 mr-2" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>
        
        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Property Calendar</CardTitle>
                  <CardDescription>Manage and view property availability</CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  {property.icalUrl ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">iCal Sync Active</span>
                        <button 
                          type="button" 
                          onClick={() => setShowIcalInput(true)}
                          className="text-blue-500 hover:text-blue-700 ml-2 text-xs"
                        >
                          Update
                        </button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refetchCalendar()}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setShowIcalInput(true)}>
                      <CalendarPlus className="h-4 w-4 mr-1" /> Connect iCal
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showIcalInput && (
                <div className="mb-4 p-4 border rounded-md bg-muted/50">
                  <h3 className="text-sm font-medium mb-2">iCal URL</h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Enter iCal URL (e.g. from Airbnb, VRBO, etc.)" 
                      value={newIcalUrl}
                      onChange={(e) => setNewIcalUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => {
                        updatePropertyMutation.mutate({ icalUrl: newIcalUrl });
                      }}
                      disabled={updatePropertyMutation.isPending}
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 mr-1" /> Save
                        </div>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowIcalInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Paste the iCal URL from your booking platform to sync reservations
                  </p>
                </div>
              )}
              
              {isLoadingCalendar ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : calendarError ? (
                <div className="text-center py-8 space-y-4">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Calendar Error</h3>
                  <p className="text-muted-foreground mb-4">
                    We couldn't load the calendar data. Please try again later.
                  </p>
                  {calendarError.message && (
                    <p className="text-sm text-red-500 max-w-md mx-auto">{calendarError.message}</p>
                  )}
                  <Button onClick={() => refetchCalendar()}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Retry
                  </Button>
                </div>
              ) : (
                <>
                  <CalendarView events={getCalendarEvents()} />
                  
                  {!property.icalUrl && !showIcalInput && calendarEvents?.length === 0 && (
                    <div className="text-center py-6 mt-6 border rounded-md">
                      <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold">No Calendar Data</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        Connect an iCal feed from your booking platform to see reservations and availability
                      </p>
                      <Button onClick={() => setShowIcalInput(true)}>
                        <CalendarPlus className="h-4 w-4 mr-1" /> Connect iCal
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Guests Tab */}
        <TabsContent value="guests">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest History</CardTitle>
              <CardDescription>Past and upcoming guest stays</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGuests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : guests && guests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Booking Source</TableHead>
                      <TableHead>Sentiment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-medium">{guest.name}</TableCell>
                        <TableCell>{formatDate(guest.checkIn)}</TableCell>
                        <TableCell>{formatDate(guest.checkOut)}</TableCell>
                        <TableCell>
                          {guest.email && <div className="text-sm">{guest.email}</div>}
                          {guest.phone && <div className="text-sm">{guest.phone}</div>}
                        </TableCell>
                        <TableCell>{guest.bookingSource || "Direct"}</TableCell>
                        <TableCell>
                          {guest.sentiment ? `${guest.sentiment}/5` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No guest records found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Maintenance History</CardTitle>
              <CardDescription>
                All maintenance requests and repairs for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMaintenance ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : maintenanceItems && maintenanceItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.priority === "urgent" 
                                ? "destructive" 
                                : item.priority === "high" 
                                  ? "default" 
                                  : "outline"
                            }
                            className="whitespace-nowrap"
                          >
                            {item.priority || "normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.status === "open" 
                                ? "default" 
                                : item.status === "in-progress" 
                                  ? "secondary"
                                  : "outline"
                            }
                            className={item.status === "completed" ? "bg-green-100 text-green-800" : ""}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>{formatDate(item.completedAt)}</TableCell>
                        <TableCell>
                          {item.cost ? `$${(item.cost / 100).toFixed(2)}` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No maintenance records found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks</CardTitle>
              <CardDescription>All tasks associated with this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.type}</TableCell>
                        <TableCell>{formatDate(task.dueDate)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              task.priority === "urgent" 
                                ? "destructive" 
                                : task.priority === "high" 
                                  ? "default" 
                                  : "outline"
                            }
                            className="whitespace-nowrap"
                          >
                            {task.priority || "normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={task.completed ? "outline" : "default"}
                            className={task.completed ? "bg-green-100 text-green-800" : ""}
                          >
                            {task.completed ? "Completed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {task.notes || "No notes"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tasks found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory</CardTitle>
              <CardDescription>Items and supplies at this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : inventoryItems && inventoryItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Par Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.category || "Uncategorized"}</TableCell>
                        <TableCell>{item.currentStock}</TableCell>
                        <TableCell>{item.parLevel}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.currentStock <= (item.reorderThreshold || item.parLevel * 0.3)
                                ? "destructive"
                                : item.currentStock <= item.parLevel * 0.7
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {item.currentStock <= (item.reorderThreshold || item.parLevel * 0.3)
                              ? "Low"
                              : item.currentStock <= item.parLevel * 0.7
                                ? "Moderate"
                                : "Good"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.lastUpdated)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No inventory items found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>Files and documents related to this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.category}</TableCell>
                        <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <Download className="h-3 w-3 mr-1" /> Download
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No documents found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Calendar</CardTitle>
                  <CardDescription>Reservation and availability calendar</CardDescription>
                </div>
                {property.icalUrl ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Check className="h-3 w-3 mr-1" /> iCal Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    <AlertCircle className="h-3 w-3 mr-1" /> No iCal Source
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!property.icalUrl ? (
                <div className="text-center py-8 border rounded-md flex flex-col items-center justify-center p-6">
                  <CalendarClock className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold mb-2">No Calendar Source Connected</h3>
                  <p className="text-gray-500 text-sm mb-4 max-w-md">
                    This property doesn't have an iCal URL configured. Add an iCal URL to see reservations and availability from external booking platforms.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowIcalInput(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add iCal URL
                  </Button>
                </div>
              ) : isLoadingCalendar ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : calendarError ? (
                <div className="text-center py-8 border rounded-md flex flex-col items-center justify-center p-6">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
                  <h3 className="font-semibold mb-2">Error Loading Calendar</h3>
                  <p className="text-gray-500 text-sm mb-4 max-w-md">
                    There was an error loading calendar data. This may be due to an invalid iCal URL or temporary connectivity issues with the external calendar service.
                  </p>
                  <div className="text-xs bg-amber-50 p-3 rounded-md text-amber-700 max-w-md mb-4 overflow-auto max-h-24">
                    {calendarError instanceof Error ? calendarError.message : String(calendarError)}
                  </div>
                  <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowIcalInput(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" /> Edit iCal URL
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => refetchCalendar()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Retry
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // Clear iCal URL from property
                        updatePropertyMutation.mutate({ icalUrl: null });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Remove iCal URL
                    </Button>
                  </div>
                </div>
              ) : calendarEvents && calendarEvents.length > 0 ? (
                <div className="space-y-6">
                  {/* Use CalendarView component */}
                  <CalendarView events={getCalendarEvents()} />
                  
                  <div className="flex justify-between items-center pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchCalendar()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh Calendar
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowIcalInput(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" /> Update iCal URL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md flex flex-col items-center justify-center p-6">
                  <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold mb-2">No Calendar Events</h3>
                  <p className="text-gray-500 text-sm mb-4 max-w-md">
                    There are no calendar events available for this property. This could be because there are no bookings, or the calendar URL is not returning any data.
                  </p>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowIcalInput(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" /> Edit iCal URL
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => refetchCalendar()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                {property.icalUrl && (
                  <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    <span className="truncate max-w-md">{property.icalUrl}</span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  // First refetch the property to get the latest icalUrl
                  await queryClient.refetchQueries({ queryKey: ['/api/units', propertyId] });
                  // Then refetch the calendar data
                  refetchCalendar();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Calendar
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* iCal URL Dialog */}
      <Dialog open={showIcalInput} onOpenChange={setShowIcalInput}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add iCal URL</DialogTitle>
            <DialogDescription>
              Enter an iCal URL to sync calendar events from external sources like Google Calendar, Airbnb, or VRBO.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="icalUrl">iCal URL</Label>
              <Input
                id="icalUrl"
                placeholder="https://example.com/calendar.ics"
                value={newIcalUrl}
                onChange={(e) => setNewIcalUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIcalInput(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newIcalUrl) {
                  updatePropertyMutation.mutate({ icalUrl: newIcalUrl });
                }
              }}
              disabled={!newIcalUrl || updatePropertyMutation.isPending}
            >
              {updatePropertyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}