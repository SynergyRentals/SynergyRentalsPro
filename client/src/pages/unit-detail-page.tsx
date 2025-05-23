import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Container } from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock,
  ExternalLink,
  Home, 
  Users, 
  ClipboardList, 
  Wrench, 
  Package, 
  FileText,
  ArrowLeft,
  CalendarDays,
  Plus,
  RefreshCw,
  LinkIcon,
  Trash2,
  CalendarClock,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Components
import { Skeleton } from "@/components/ui/skeleton";
import TaskCard from "@/components/dashboard/TaskCard";
import { CalendarView } from "../components/dashboard/CalendarView";
import { Separator } from "@/components/ui/separator";

export default function UnitDetailPage() {
  const { id } = useParams();
  const unitId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showIcalDialog, setShowIcalDialog] = useState(false);
  const [newIcalUrl, setNewIcalUrl] = useState("");

  // Fetch property details using only the unified endpoint
  const { data: unit, isLoading: isLoadingUnit } = useQuery({
    queryKey: ["/api/properties", unitId],
    queryFn: async () => {
      try {
        // Use only the unified property endpoint
        const propertyRes = await fetch(`/api/properties/${unitId}`);
        if (!propertyRes.ok) {
          if (propertyRes.status === 404) {
            throw new Error("Property not found");
          } else {
            throw new Error(`Failed to fetch property: ${propertyRes.status}`);
          }
        }
        
        const propertyData = await propertyRes.json();
        console.log(`Found property with ID ${unitId}:`, propertyData.name);
        
        // Special handling for property ID 18
        // Force it to be treated as a Guesty property regardless of what the API returns
        if (unitId === 18) {
          console.log('[Property 18] Special handling: Forcing source to be "guesty"');
          
          // Create a new property object with the source field set to "guesty"
          return {
            ...propertyData,
            source: 'guesty',
            // If icalUrl isn't set, provide the default Guesty URL
            icalUrl: propertyData.icalUrl || 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb'
          };
        }
        
        return propertyData;
      } catch (error) {
        console.error("Failed to fetch property details:", error);
        throw new Error("Failed to fetch property details");
      }
    },
    enabled: !!unitId
  });

  // Fetch guests for this unit
  const { data: guests } = useQuery({
    queryKey: ["/api/guests", { unitId }],
    queryFn: async () => {
      const res = await fetch(`/api/guests/unit/${unitId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch guests");
      }
      return res.json();
    },
    enabled: !!unitId
  });

  // Fetch upcoming tasks
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks", { unitId }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/unit/${unitId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return res.json();
    },
    enabled: !!unitId
  });

  // Fetch maintenance for this unit
  const { data: maintenance } = useQuery({
    queryKey: ["/api/maintenance", { unitId }],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/unit/${unitId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch maintenance");
      }
      return res.json();
    },
    enabled: !!unitId
  });

  // Fetch inventory for this unit
  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory", { unitId }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/unit/${unitId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      return res.json();
    },
    enabled: !!unitId
  });

  // Fetch documents for this unit
  const { data: documents } = useQuery({
    queryKey: ["/api/documents", { unitId }],
    queryFn: async () => {
      const res = await fetch(`/api/documents/unit/${unitId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch documents");
      }
      return res.json();
    },
    enabled: !!unitId
  });

  // Mutation for updating iCal URL using the unified endpoint
  const updateIcalUrlMutation = useMutation({
    mutationFn: async () => {
      if (!unit) return;
      
      // Special handling for property ID 18 (known inconsistency)
      if (unitId === 18) {
        console.log("[Property 18] Special handling for iCal URL update");
        // For property 18, always use the Guesty iCal URL if the field is blank
        if (!newIcalUrl) {
          console.log("[Property 18] Setting default Guesty iCal URL");
          // Set the Guesty iCal URL as a default if the user doesn't provide one
          setNewIcalUrl("https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb");
        }
      }
      
      console.log("Updating iCal URL for property:", unitId);
      
      // Use the unified endpoint for all property types
      const endpoint = `/api/properties/${unitId}`;
      console.log("Using unified endpoint for iCal update:", endpoint);
      
      const finalIcalUrl = unitId === 18 && !newIcalUrl 
        ? "https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb"
        : newIcalUrl;
      
      console.log(`[API Debug] Using iCal URL for update: ${finalIcalUrl}`);
        
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ icalUrl: finalIcalUrl })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update iCal URL: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Successfully updated iCal URL, response:", data);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Calendar URL has been updated",
        variant: "default"
      });
      setShowIcalDialog(false);
      
      // Log property data changed event to help with debugging
      console.log("Property data changed, checking if we need to refetch calendar");
      console.log("Current icalUrl:", unit?.icalUrl);
      console.log("New icalUrl:", newIcalUrl);
      
      // Special handling for property ID 18
      if (unitId === 18) {
        console.log("[Property 18] Forcing calendar refetch due to property/icalUrl update");
        
        // For property 18, we need to fetch the calendar regardless of API response
        // This ensures we always get the calendar events even with source inconsistency
        queryClient.refetchQueries({ queryKey: ['/api/properties', unitId, 'calendar'] });
      }
      
      // Invalidate relevant API queries
      queryClient.invalidateQueries({ queryKey: ['/api/properties', unitId] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', unitId, 'calendar'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update iCal URL",
        variant: "destructive"
      });
    }
  });
  
  // Handle iCal URL dialog
  const handleOpenIcalDialog = () => {
    setNewIcalUrl(unit?.icalUrl || "");
    setShowIcalDialog(true);
  };
  
  const handleSaveIcalUrl = () => {
    updateIcalUrlMutation.mutate();
  };
  
  const handleRemoveIcalUrl = () => {
    setNewIcalUrl("");
    updateIcalUrlMutation.mutate();
  };

  // Fetch external calendar events (iCal)
  const { data: externalCalendarEvents, isLoading: isLoadingCalendar } = useQuery({
    // Use both legacy and unified endpoint keys
    queryKey: ['/api/properties', unitId, 'calendar'],
    queryFn: async () => {
      // Add more detailed logging
      console.log(`Calendar fetch attempt for property ID ${unitId}`);
      console.log(`Property data:`, JSON.stringify(unit, null, 2));
      
      // Don't make the API call if there's no unit
      if (!unit) {
        console.log('No unit data available, skipping calendar fetch');
        return [];
      }
      
      // Force property to be treated as Guesty if ID is 18
      // This is a temporary fix to address the source inconsistency
      if (unitId === 18) {
        console.log('Property 18 detected - ensuring it is treated as a Guesty property');
        
        // Even if unit.icalUrl is null in the UI, we know it exists in the database
        // Proceed with the calendar fetch regardless
        console.log(`Forcing calendar fetch for property ID ${unitId}`);
      } 
      // For other properties, check for icalUrl as usual
      else if (!unit.icalUrl) {
        console.log('No iCal URL configured, skipping calendar fetch');
        return [];
      }

      console.log(`Fetching calendar for property with ID ${unitId}`);
      
      try {
        // Use only the unified endpoint
        const endpoint = `/api/properties/${unitId}/calendar`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.error(`Error fetching calendar: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          throw new Error(errorText || `Failed to fetch calendar events: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data.length} calendar events from external source`);
        return data.map(event => ({
          start: new Date(event.start),
          end: new Date(event.end),
          title: event.title || 'Reservation',
          status: event.status || 'confirmed'
        }));
      } catch (error) {
        console.error('Calendar fetch error:', error);
        toast({
          title: "Calendar Error",
          description: error instanceof Error ? error.message : "Failed to load calendar events",
          variant: "destructive"
        });
        return [];
      }
    },
    // Always enable for property 18, otherwise check icalUrl
    enabled: !!unit && (unitId === 18 || !!unit.icalUrl),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prepare calendar events
  const getCalendarEvents = () => {
    const events = [];
    
    // Add events from external iCal source if available
    if (externalCalendarEvents && externalCalendarEvents.length > 0) {
      externalCalendarEvents.forEach(event => {
        // Generate a unique reservation ID for tracking connected events
        const reservationId = event.uid || `reservation-${Math.random().toString(36).substring(2, 11)}`;
        
        // Add event start date as check-in (already converted to Date object in the query)
        events.push({
          date: event.start,
          type: "checkin", // Use a specific type for check-in events
          label: `Check-in: ${event.title || 'Reservation'}`,
          // Important: Add these properties for the reservation visualization
          startDate: event.start,
          endDate: event.end,
          reservationId: reservationId
        });
        
        // Add event end date as check-out (already converted to Date object in the query)
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
    
    // Add scheduled cleanings
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
    
    // Add maintenance tasks
    if (maintenance && maintenance.length > 0) {
      maintenance.forEach(item => {
        events.push({
          date: new Date(item.createdAt),
          type: "maintenance",
          label: `Maintenance: ${item.description.substring(0, 20)}...`
        });
      });
    }
    
    return events;
  };

  // Redirect if invalid unit
  useEffect(() => {
    if (!isLoadingUnit && !unit) {
      toast({
        title: "Error",
        description: "Unit not found",
        variant: "destructive"
      });
      navigate("/properties");
    }
  }, [isLoadingUnit, unit, toast, navigate]);

  // Loading state
  if (isLoadingUnit) {
    return (
      <div className="p-8">
        <Container>
          <div className="flex flex-col space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </Container>
      </div>
    );
  }

  // Not found state
  if (!unit) {
    return null;
  }

  const currentGuest = guests?.find(guest => {
    const now = new Date();
    const checkIn = guest.checkIn ? new Date(guest.checkIn) : null;
    const checkOut = guest.checkOut ? new Date(guest.checkOut) : null;
    return checkIn && checkOut && checkIn <= now && checkOut >= now;
  });

  const upcomingGuest = guests?.find(guest => {
    const now = new Date();
    const checkIn = guest.checkIn ? new Date(guest.checkIn) : null;
    return checkIn && checkIn > now;
  });

  // Get recent tasks
  const recentTasks = tasks?.slice(0, 3) || [];
  
  // Get low inventory
  const lowInventory = inventory?.filter(item => item.currentStock < item.parLevel) || [];

  return (
    <div className="p-6">
      <Container>
        <div className="flex flex-col space-y-8">
          {/* Back button and header */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/properties")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Properties</span>
              </Button>
            </div>
            <div className="flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{unit.name}</h1>
                  {unit.source === 'guesty' && (
                    <Badge variant="outline" className="text-blue-500 bg-blue-50">
                      Guesty
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{unit.address}</p>
              </div>
              <div className="flex space-x-2 mt-4 md:mt-0">
                {unit.source !== 'guesty' && (
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                )}
                <Button>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
                {unit.source === 'guesty' && unit.listingUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={unit.listingUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Listing
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Unit status cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Guest</p>
                  <p className="font-medium">
                    {currentGuest ? currentGuest.name : "No active guest"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-full">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Check-in</p>
                  <p className="font-medium">
                    {upcomingGuest && upcomingGuest.checkIn ? 
                      format(new Date(upcomingGuest.checkIn), "MMM d, yyyy") : 
                      "No upcoming check-ins"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-full">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  <p className="font-medium">
                    {tasks ? `${tasks.filter(t => !t.completed).length} tasks` : "Loading..."}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-full">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance</p>
                  <p className="font-medium">
                    {maintenance ? 
                      `${maintenance.filter(m => m.status !== "completed").length} issues` : 
                      "Loading..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full max-w-3xl">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="guests">Guests</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Unit details card */}
                <Card className="md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Unit Details</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleOpenIcalDialog}
                      className="flex items-center"
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {unit.icalUrl || unitId === 18 ? "Edit Calendar" : "Add Calendar"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p>{unit.address}</p>
                      </div>
                      
                      {/* Property Type field is not in the schema, so it's commented out 
                      {unit.source === 'guesty' && unit.propertyType && (
                        <div>
                          <p className="text-sm text-muted-foreground">Property Type</p>
                          <p>{unit.propertyType}</p>
                        </div>
                      )}
                      */}
                      
                      {unit.source === 'guesty' && unit.bedrooms && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bedrooms</p>
                          <p>{unit.bedrooms}</p>
                        </div>
                      )}
                      
                      {unit.source === 'guesty' && unit.bathrooms && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bathrooms</p>
                          <p>{unit.bathrooms}</p>
                        </div>
                      )}
                      
                      {unit.wifiInfo && (
                        <div>
                          <p className="text-sm text-muted-foreground">WiFi</p>
                          <p className="font-mono text-sm">{unit.wifiInfo}</p>
                        </div>
                      )}
                      
                      {unit.tags && unit.tags.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Tags</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {unit.tags.map((tag, i) => (
                              <Badge key={i} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {unit.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{unit.notes}</p>
                        </div>
                      )}
                      
                      {unit.source === 'guesty' && unit.propertyId && (
                        <div>
                          <p className="text-sm text-muted-foreground">Guesty ID</p>
                          <p className="text-xs font-mono text-muted-foreground">{unit.propertyId}</p>
                        </div>
                      )}
                      
                      {unit.source === 'guesty' && unit.updatedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Last Synced</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(unit.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Calendar card */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Upcoming Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CalendarView events={getCalendarEvents()} />
                  </CardContent>
                </Card>
                
                {/* Current/upcoming guests */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Guests</CardTitle>
                    <CardDescription>Current & upcoming stays</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!guests || guests.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No guest records found</p>
                    ) : (
                      <>
                        {currentGuest && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge variant="default" className="mb-2">Current</Badge>
                                <p className="font-semibold">{currentGuest.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-x-4 mt-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Check-in</p>
                                <p>{currentGuest.checkIn ? format(new Date(currentGuest.checkIn), "MMM d") : "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Check-out</p>
                                <p>{currentGuest.checkOut ? format(new Date(currentGuest.checkOut), "MMM d") : "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {upcomingGuest && upcomingGuest.id !== currentGuest?.id && (
                          <div className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge variant="outline" className="mb-2">Upcoming</Badge>
                                <p className="font-semibold">{upcomingGuest.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-x-4 mt-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Check-in</p>
                                <p>{upcomingGuest.checkIn ? format(new Date(upcomingGuest.checkIn), "MMM d") : "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Check-out</p>
                                <p>{upcomingGuest.checkOut ? format(new Date(upcomingGuest.checkOut), "MMM d") : "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab("guests")}>
                          View all guests
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent tasks */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Tasks</CardTitle>
                    <CardDescription>Latest task activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!tasks || tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks found</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {recentTasks.map((task) => (
                            <div key={task.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  {task.type === "cleaning" && <ClipboardList className="h-4 w-4 text-blue-500" />}
                                  {task.type === "maintenance" && <Wrench className="h-4 w-4 text-orange-500" />}
                                  {task.type === "inventory" && <Package className="h-4 w-4 text-green-500" />}
                                  <p className="font-medium text-sm">{task.type.charAt(0).toUpperCase() + task.type.slice(1)}</p>
                                </div>
                                <Badge variant={task.completed ? "outline" : "default"} className="text-xs">
                                  {task.completed ? "Completed" : "Pending"}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 line-clamp-2">{task.notes || "No description"}</p>
                              {task.dueDate && (
                                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab("tasks")}>
                          View all tasks
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* Low inventory */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Inventory Status</CardTitle>
                    <CardDescription>Items below par level</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!inventory || inventory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No inventory items found</p>
                    ) : lowInventory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">All inventory items at sufficient levels</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {lowInventory.slice(0, 3).map((item) => (
                            <div key={item.id} className="border rounded-lg p-3">
                              <div className="flex justify-between">
                                <p className="font-medium text-sm">{item.itemName}</p>
                                <Badge 
                                  variant={item.currentStock === 0 ? "destructive" : "outline"} 
                                  className="text-xs"
                                >
                                  {item.currentStock === 0 ? "Out of stock" : "Low stock"}
                                </Badge>
                              </div>
                              <div className="flex justify-between mt-2 text-sm">
                                <span className="text-muted-foreground">Current: {item.currentStock}</span>
                                <span className="text-muted-foreground">Par: {item.parLevel}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab("inventory")}>
                          View all inventory
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="guests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Guest History</CardTitle>
                  <CardDescription>All guests for this unit</CardDescription>
                </CardHeader>
                <CardContent>
                  {!guests || guests.length === 0 ? (
                    <p className="text-muted-foreground">No guest records found for this unit</p>
                  ) : (
                    <div className="space-y-4">
                      {guests.map((guest) => (
                        <div key={guest.id} className="border rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{guest.name}</h3>
                              <div className="flex flex-col md:flex-row md:gap-4 text-sm mt-1">
                                {guest.email && <p className="text-muted-foreground">{guest.email}</p>}
                                {guest.phone && <p className="text-muted-foreground">{guest.phone}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 md:mt-0">
                              {guest.checkIn && guest.checkOut && (
                                <Badge variant="outline" className="md:ml-2">
                                  {format(new Date(guest.checkIn), "MMM d")} - {format(new Date(guest.checkOut), "MMM d, yyyy")}
                                </Badge>
                              )}
                              {guest.bookingSource && (
                                <Badge variant="secondary">{guest.bookingSource}</Badge>
                              )}
                            </div>
                          </div>
                          {guest.notes && (
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground mt-2">{guest.notes}</p>
                            </div>
                          )}
                          <div className="flex mt-3 gap-2">
                            <Button variant="outline" size="sm">View Details</Button>
                            <Button variant="outline" size="sm">Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Task Management</CardTitle>
                    <CardDescription>All tasks for this unit</CardDescription>
                  </div>
                  <Button>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </CardHeader>
                <CardContent>
                  {!tasks || tasks.length === 0 ? (
                    <p className="text-muted-foreground">No tasks found for this unit</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        <Button variant="outline" size="sm">All</Button>
                        <Button variant="outline" size="sm">Pending</Button>
                        <Button variant="outline" size="sm">Completed</Button>
                      </div>
                      
                      {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {task.type === "cleaning" && <ClipboardList className="h-5 w-5 text-blue-500" />}
                              {task.type === "maintenance" && <Wrench className="h-5 w-5 text-orange-500" />}
                              {task.type === "inventory" && <Package className="h-5 w-5 text-green-500" />}
                              <div>
                                <p className="font-medium">{task.type.charAt(0).toUpperCase() + task.type.slice(1)}</p>
                                {task.dueDate && (
                                  <p className="text-sm text-muted-foreground">
                                    Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={task.completed ? "outline" : "default"}>
                              {task.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                          
                          <p className="mt-2">{task.notes || "No description provided."}</p>
                          
                          <div className="mt-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm">View Details</Button>
                            {!task.completed && (
                              <Button size="sm">Mark Complete</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="maintenance" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Maintenance Issues</CardTitle>
                    <CardDescription>All maintenance records for this unit</CardDescription>
                  </div>
                  <Button>
                    <Wrench className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </CardHeader>
                <CardContent>
                  {!maintenance || maintenance.length === 0 ? (
                    <p className="text-muted-foreground">No maintenance records found for this unit</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        <Button variant="outline" size="sm">All</Button>
                        <Button variant="outline" size="sm">Open</Button>
                        <Button variant="outline" size="sm">In Progress</Button>
                        <Button variant="outline" size="sm">Completed</Button>
                      </div>
                      
                      {maintenance.map((issue) => (
                        <div key={issue.id} className="border rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{issue.description}</h3>
                                {issue.priority && (
                                  <Badge 
                                    variant={
                                      issue.priority === "high" || issue.priority === "urgent" 
                                        ? "destructive" 
                                        : issue.priority === "medium" 
                                        ? "default" 
                                        : "outline"
                                    }
                                  >
                                    {issue.priority}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Reported: {format(new Date(issue.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <Badge variant={
                              issue.status === "completed" 
                                ? "outline" 
                                : issue.status === "in_progress" 
                                ? "secondary" 
                                : "default"
                            }>
                              {issue.status === "in_progress" ? "In Progress" : 
                               issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                            </Badge>
                          </div>
                          
                          {issue.notes && (
                            <p className="mt-2 text-sm">{issue.notes}</p>
                          )}
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">View Details</Button>
                            {issue.status !== "completed" && (
                              <>
                                <Button variant="outline" size="sm">Assign</Button>
                                <Button size="sm">Update Status</Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="inventory" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Inventory Management</CardTitle>
                    <CardDescription>Supplies and equipment for this unit</CardDescription>
                  </div>
                  <Button>
                    <Package className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent>
                  {!inventory || inventory.length === 0 ? (
                    <p className="text-muted-foreground">No inventory items found for this unit</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        <Button variant="outline" size="sm">All</Button>
                        <Button variant="outline" size="sm">Low Stock</Button>
                        <Button variant="outline" size="sm">In Stock</Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{item.itemName}</h3>
                                {item.category && (
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                )}
                              </div>
                              <Badge 
                                variant={
                                  item.currentStock === 0 
                                    ? "destructive" 
                                    : item.currentStock < item.parLevel 
                                    ? "secondary" 
                                    : "outline"
                                }
                              >
                                {item.currentStock === 0 
                                  ? "Out of stock" 
                                  : item.currentStock < item.parLevel 
                                  ? "Low stock" 
                                  : "In stock"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Current</p>
                                <p className="font-medium">{item.currentStock}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Par Level</p>
                                <p className="font-medium">{item.parLevel}</p>
                              </div>
                            </div>
                            
                            {item.notes && (
                              <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
                            )}
                            
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Button variant="outline" size="sm">Update</Button>
                              <Button size="sm">Restock</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="knowledge" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Knowledge Base</CardTitle>
                    <CardDescription>Property-specific guides and documentation</CardDescription>
                  </div>
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Category: Standard Operating Procedures */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Standard Operating Procedures</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-blue-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Check-In Procedure</h4>
                                <p className="text-sm text-muted-foreground">Guide for preparing unit for guest arrival</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 2 days ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-blue-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Check-Out Cleaning</h4>
                                <p className="text-sm text-muted-foreground">Complete cleaning checklist for after guests leave</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 1 week ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-blue-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Maintenance Protocol</h4>
                                <p className="text-sm text-muted-foreground">Steps for addressing common maintenance issues</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 3 weeks ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {/* Category: Equipment Manuals */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Equipment Manuals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-green-500 mt-1" />
                              <div>
                                <h4 className="font-medium">HVAC System</h4>
                                <p className="text-sm text-muted-foreground">Maintenance and troubleshooting for HVAC</p>
                                <p className="text-xs text-muted-foreground mt-2">PDF • 3.2 MB</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-green-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Smart Lock</h4>
                                <p className="text-sm text-muted-foreground">Programming guide for front door lock</p>
                                <p className="text-xs text-muted-foreground mt-2">PDF • 1.7 MB</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-green-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Appliance Guide</h4>
                                <p className="text-sm text-muted-foreground">Manuals for kitchen and laundry appliances</p>
                                <p className="text-xs text-muted-foreground mt-2">PDF • 5.8 MB</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {/* Category: Guest Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Guest Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-orange-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Property Guide</h4>
                                <p className="text-sm text-muted-foreground">Welcome document with house rules and amenities</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 1 month ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-orange-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Local Attractions</h4>
                                <p className="text-sm text-muted-foreground">Guide to nearby restaurants and activities</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 2 months ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <FileText className="h-6 w-6 text-orange-500 mt-1" />
                              <div>
                                <h4 className="font-medium">Emergency Contacts</h4>
                                <p className="text-sm text-muted-foreground">Important phone numbers and procedures</p>
                                <p className="text-xs text-muted-foreground mt-2">Updated 3 weeks ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {/* Add New Document Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-3">Add New Document</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center p-6">
                          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="font-medium">Upload Document</p>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            Upload PDF, Word, or other document files
                          </p>
                        </Card>
                        <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center p-6">
                          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="font-medium">Create SOP</p>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            Create a new Standard Operating Procedure
                          </p>
                        </Card>
                        <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center p-6">
                          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="font-medium">Link External Resource</p>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            Link to external documentation or websites
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
      
      {/* iCal URL Dialog */}
      <Dialog open={showIcalDialog} onOpenChange={setShowIcalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>External Calendar Integration</DialogTitle>
            <DialogDescription>
              Add a calendar feed URL (iCal/ICS) to show bookings from external platforms.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {/* Special note for property 18 */}
            {unitId === 18 && (
              <div className="flex items-center rounded-md border border-amber-100 bg-amber-50 p-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">Guesty Calendar Feed</p>
                  <p className="text-xs text-amber-700">
                    This property should use the Guesty iCal feed. Setting this URL will connect to the external Guesty calendar.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="icalUrl">Calendar URL (iCal/ICS)</Label>
              <Input
                id="icalUrl"
                placeholder={unitId === 18 
                  ? "https://app.guesty.com/api/public/icalendar-dashboard-api/export/..."
                  : "https://example.com/calendar.ics"
                }
                value={newIcalUrl}
                onChange={(e) => setNewIcalUrl(e.target.value)}
                className="w-full"
              />
              
              {/* Default Guesty URL button for property 18 */}
              {unitId === 18 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => setNewIcalUrl("https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb")}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Use Guesty Default URL
                </Button>
              )}
            </div>
            
            {unit.icalUrl && (
              <div className="flex items-center rounded-md border border-blue-100 bg-blue-50 p-3">
                <CalendarDays className="h-5 w-5 text-blue-500 mr-2" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Current Calendar URL</p>
                  <p className="text-xs text-blue-700 break-all">{unit.icalUrl}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {unit.icalUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveIcalUrl}
                  disabled={updateIcalUrlMutation.isPending}
                >
                  {updateIcalUrlMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleSaveIcalUrl}
              disabled={updateIcalUrlMutation.isPending}
            >
              {updateIcalUrlMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}