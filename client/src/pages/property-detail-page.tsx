import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute, Link } from "wouter";
import { 
  Loader2, ChevronLeft, Building2, MapPin, Wifi, FileText, Tag, User, Calendar, ClipboardCheck,
  Wrench, Package, ReceiptText, MessageSquare, Upload, Download, ArrowUpDown, Clipboard, Users,
  CalendarDays, Clock, AlertCircle, ExternalLink, CalendarClock, Check, RefreshCw, AlertTriangle,
  Plus, Link as LinkIcon
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
import { Unit, Guest, Maintenance, Inventory, Task, Document } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function PropertyDetailPage() {
  const { toast } = useToast();
  const [_, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params ? parseInt(params.id) : null;
  const [showIcalInput, setShowIcalInput] = useState(false);
  const [newIcalUrl, setNewIcalUrl] = useState("");
  
  // Get property details
  const { 
    data: property, 
    isLoading: isLoadingProperty, 
    error: propertyError 
  } = useQuery<Unit>({
    queryKey: ['/api/units', propertyId],
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
  
  // Get calendar events for this property
  const {
    data: calendarEvents,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar
  } = useQuery({
    queryKey: ['/api/units', propertyId, 'calendar'],
    queryFn: async () => {
      console.log('Attempting to fetch calendar events for property:', propertyId);
      
      if (!propertyId) {
        throw new Error('Property ID is required to fetch calendar events');
      }
      
      console.log('Fetching calendar data from API endpoint...');
      try {
        const response = await fetch(`/api/units/${propertyId}/calendar`);
        console.log('Calendar API response status:', response.status);
        
        if (response.status === 404) {
          // This might be a normal case if the property exists but doesn't have an iCal URL
          let errorMessage = 'Calendar not found';
          try {
            const errorData = await response.json();
            console.log('Calendar 404 response:', errorData);
            errorMessage = errorData.message || errorMessage;
            
            if (errorData.message === "No iCal URL found for this unit") {
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
        return data;
      } catch (error) {
        console.error('Error in calendar fetch:', error);
        throw error;
      }
    },
    // Always enable the query if we have a property ID, even if iCalUrl is not set yet
    // This lets us properly handle the case where a user adds an iCal URL for the first time
    enabled: !!propertyId && !!property,
    // Add a reasonable retry policy for transient network errors
    retry: 2,
    retryDelay: 1000,
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
  
  // Mutation for updating property
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<Unit>) => {
      return apiRequest('PATCH', `/api/units/${propertyId}`, data);
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Property updated",
        description: "The property details have been updated successfully.",
      });
      
      // Invalidate and refetch queries
      await queryClient.invalidateQueries({ queryKey: ['/api/units'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/units', propertyId] });
      
      // If we've updated the iCal URL, let's make sure the calendar data is refreshed
      // and switch to the calendar tab
      if ('icalUrl' in variables) {
        // Set calendar tab as active
        const tabsElement = document.querySelector('button[value="calendar"]') as HTMLButtonElement;
        if (tabsElement) {
          tabsElement.click();
        }
        
        await queryClient.invalidateQueries({ queryKey: ['/api/units', propertyId, 'calendar'] });
        // Force a refetch of the property to ensure it has the latest icalUrl
        await queryClient.refetchQueries({ queryKey: ['/api/units', propertyId] });
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
                <CardTitle className="text-2xl">{property.name}</CardTitle>
                <CardDescription className="flex items-center text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </CardDescription>
              </div>
              <div>
                {!property.active && (
                  <Badge variant="outline" className="text-gray-500">
                    Inactive
                  </Badge>
                )}
                {property.tags && property.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-end">
                    {property.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {property.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-gray-700">{property.notes}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {property.wifiInfo && (
                <div className="border p-3 rounded-md flex items-start">
                  <Wifi className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">WiFi Information</h3>
                    <p className="text-sm text-gray-600">{property.wifiInfo}</p>
                  </div>
                </div>
              )}
              
              {property.leaseUrl && (
                <div className="border p-3 rounded-md flex items-start">
                  <FileText className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Lease Document</h3>
                    <a 
                      href={property.leaseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center mt-1"
                    >
                      <Download className="h-3 w-3 mr-1" /> View or Download Lease
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
      
      <Tabs defaultValue="guests" className="mt-4">
        <TabsList>
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
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-2" /> Calendar
          </TabsTrigger>
        </TabsList>
        
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
                    There was an error loading calendar data. This may be due to an invalid iCal URL or temporary connectivity issues.
                  </p>
                  <div className="text-xs bg-amber-50 p-3 rounded-md text-amber-700 max-w-md mb-4 overflow-auto max-h-24">
                    {String(calendarError)}
                  </div>
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
                      <RefreshCw className="h-4 w-4 mr-2" /> Retry
                    </Button>
                  </div>
                </div>
              ) : calendarEvents && calendarEvents.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {calendarEvents.map((event: any, index: number) => (
                      <div key={index} className="flex border rounded-md p-4 hover:bg-gray-50">
                        <div className="mr-4 flex-shrink-0">
                          <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-900">
                            <CalendarDays className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium">{event.title || 'Reservation'}</h4>
                          <div className="flex items-center text-sm text-gray-500 mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(new Date(event.start))} - {formatDate(new Date(event.end))}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700"
                          >
                            Reservation
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md flex flex-col items-center justify-center p-6">
                  <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold mb-2">No Calendar Events</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    There are no calendar events available for this property.
                  </p>
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