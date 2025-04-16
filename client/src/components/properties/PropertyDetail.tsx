import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ChevronLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  BedDouble, 
  Bath, 
  ClipboardCheck, 
  Edit,
  RefreshCw
} from "lucide-react";
import { queryClient, apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PropertyDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isUpdatingIcal, setIsUpdatingIcal] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [showIcalInput, setShowIcalInput] = useState(false);
  
  // Fetch property details
  const {
    data: property,
    isLoading: isLoadingProperty,
    error: propertyError,
  } = useQuery({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });
  
  // Fetch calendar data
  const {
    data: calendarEvents = [],
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar
  } = useQuery({
    queryKey: [`/api/properties/${id}/calendar`],
    enabled: !!id,
  });
  
  // Mutation for updating iCal URL
  const updateIcalMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest('PATCH', `/api/properties/${id}`, { 
        icalUrl: url
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}/calendar`] });
      toast({
        title: "iCal URL updated",
        description: "Calendar will now sync with the new URL",
      });
      setShowIcalInput(false);
      setIsUpdatingIcal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating iCal URL",
        description: error.message || "Failed to update iCal URL",
        variant: "destructive",
      });
      setIsUpdatingIcal(false);
    },
  });
  
  // Handle back button click
  const handleBackToList = () => {
    navigate('/properties');
  };
  
  // Handle edit button click
  const handleEdit = () => {
    navigate(`/properties/${id}/edit`);
  };
  
  // Handle iCal URL update
  const handleUpdateIcal = async () => {
    if (!icalUrl) {
      toast({
        title: "Error",
        description: "Please enter a valid iCal URL",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingIcal(true);
    
    try {
      // Validate the iCal URL first
      const res = await apiRequest('POST', '/api/properties/validate-ical', { url: icalUrl });
      const validation = await res.json();
      
      if (validation.valid) {
        // If valid, update the property
        updateIcalMutation.mutate(icalUrl);
      } else {
        toast({
          title: "Invalid iCal URL",
          description: validation.message || "The URL does not contain valid iCal data",
          variant: "destructive",
        });
        setIsUpdatingIcal(false);
      }
    } catch (error) {
      toast({
        title: "Error validating iCal URL",
        description: error instanceof Error ? error.message : "Failed to validate iCal URL",
        variant: "destructive",
      });
      setIsUpdatingIcal(false);
    }
  };
  
  // Format a date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (propertyError || !property) {
    return (
      <div>
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
    <div>
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
                </div>
                <CardDescription className="flex items-center text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center">
                <BedDouble className="h-5 w-5 text-gray-400 mr-1" />
                <span className="font-medium">{property.bedrooms}</span>
                <span className="text-gray-500 ml-1">Bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-5 w-5 text-gray-400 mr-1" />
                <span className="font-medium">{property.bathrooms}</span>
                <span className="text-gray-500 ml-1">Bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
              </div>
              {property.icalUrl && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-green-500 mr-1" />
                  <span className="text-green-600">Calendar Connected</span>
                </div>
              )}
            </div>
            
            {property.description && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-600">{property.description}</p>
              </div>
            )}
            
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      <ClipboardCheck className="h-3 w-3 mr-1" />
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Property ID</dt>
                <dd className="mt-1 text-sm">{property.id}</dd>
              </div>
              {property.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm">{property.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm">{formatDate(property.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm">{formatDate(property.updatedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" /> Calendar
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Property Calendar</CardTitle>
                  <CardDescription>
                    {property.icalUrl 
                      ? "Calendar events from external iCal feed" 
                      : "Connect an external calendar to see bookings"}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  {property.icalUrl ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">iCal Sync Active</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIcalUrl(property.icalUrl || "");
                            setShowIcalInput(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 ml-2 text-xs"
                        >
                          Update
                        </button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refetchCalendar()}
                        disabled={isLoadingCalendar}
                      >
                        {isLoadingCalendar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )} Refresh
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowIcalInput(true)}
                    >
                      <Calendar className="h-4 w-4 mr-1" /> Connect Calendar
                    </Button>
                  )}
                </div>
              </div>
              
              {showIcalInput && (
                <div className="mt-2 p-4 border rounded-md bg-gray-50">
                  <h4 className="text-sm font-medium mb-2">
                    {property.icalUrl ? "Update iCal URL" : "Connect iCal Calendar"}
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter iCal URL (https://...)"
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      className="flex-1"
                      disabled={isUpdatingIcal}
                    />
                    <Button 
                      onClick={handleUpdateIcal}
                      disabled={isUpdatingIcal}
                    >
                      {isUpdatingIcal ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-1" />
                      )} Save
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setShowIcalInput(false)}
                      disabled={isUpdatingIcal}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter a valid iCal URL to sync bookings from external calendars (e.g. Airbnb, VRBO, Google)
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingCalendar ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : calendarError ? (
                <div className="bg-red-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">Error loading calendar</h3>
                  <p className="text-sm text-red-600">
                    {calendarError instanceof Error ? calendarError.message : "An unknown error occurred"}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetchCalendar()}
                    className="mt-2"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              ) : !property.icalUrl ? (
                <div className="text-center py-12 border-2 border-dashed rounded-md">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Calendar Connected</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-4">
                    Connect an external calendar to track bookings for this property.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowIcalInput(true)}
                  >
                    Connect Calendar
                  </Button>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-md">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Events Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-4">
                    There are no upcoming bookings or events in the connected calendar.
                  </p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {calendarEvents.map((event: any, index: number) => (
                    <div key={index} className="flex flex-col md:flex-row justify-between p-4 gap-2">
                      <div>
                        <h4 className="font-medium text-gray-800">{event.title}</h4>
                        <div className="text-sm text-gray-500">
                          {formatDate(event.start)} - {formatDate(event.end)}
                        </div>
                      </div>
                      <div>
                        <Badge 
                          variant={event.status === 'confirmed' ? 'default' : 'outline'}
                          className={event.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        >
                          {event.status === 'confirmed' ? 'Confirmed' : event.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}