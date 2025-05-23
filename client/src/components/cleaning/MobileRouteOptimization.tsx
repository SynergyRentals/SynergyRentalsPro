import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { motion } from "framer-motion";
import SwipeableTaskCard from "./SwipeableTaskCard";
import {
  Map,
  MapPin,
  Navigation,
  CheckCircle,
  MoreVertical,
  Clock,
  ArrowRight,
  CheckSquare,
  Flag,
  RefreshCw,
  Send,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CleaningTask {
  id: number;
  unitId: number;
  status: string;
  scheduledFor: string;
  assignedTo: number | null;
  routeOrder: number | null;
  priority?: string | null;
}

interface Unit {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export default function MobileRouteOptimization() {
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<Record<number, boolean>>({});
  const [arrivalTimes, setArrivalTimes] = useState<Record<number, string>>({});
  
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  // Get cleaning tasks assigned to current user
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["/api/cleaning-tasks"],
  });

  // Get units for address information
  const {
    data: units,
    isLoading: unitsLoading,
    error: unitsError,
  } = useQuery({
    queryKey: ["/api/units"],
  });
  
  // Filter tasks for the current user and sort by route order
  const cleanerTasks = React.useMemo(() => {
    if (!tasks || !Array.isArray(tasks) || !user) return [];
    
    const userTasks = tasks.filter(
      (task: CleaningTask) => 
        task.assignedTo === user.id && 
        task.status !== "completed"
    );
    
    // Sort by route order or scheduled time
    return userTasks.sort((a: CleaningTask, b: CleaningTask) => {
      if (a.routeOrder !== null && b.routeOrder !== null) {
        return a.routeOrder - b.routeOrder;
      } else if (a.routeOrder !== null) {
        return -1;
      } else if (b.routeOrder !== null) {
        return 1;
      } else {
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }
    });
  }, [tasks, user]);

  // Mutation to update task status (e.g., check-in, start cleaning)
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/cleaning-tasks/${id}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-tasks"] });
      toast({
        title: "Task updated",
        description: "The cleaning task status has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Error updating task",
        description: "There was a problem updating the task status.",
        variant: "destructive",
      });
    },
  });

  // Get unit details by ID
  const getUnit = (unitId: number): Unit | undefined => {
    if (!units || !Array.isArray(units)) return undefined;
    return units.find((unit: Unit) => unit.id === unitId);
  };

  // Format scheduled time
  const formatScheduledTime = (dateString: string): string => {
    try {
      return format(new Date(dateString), "h:mm a");
    } catch (e) {
      return "Time N/A";
    }
  };

  // Get GPS location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your device doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position.coords);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location error",
          description: "Unable to get your current location.",
          variant: "destructive",
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Toggle location tracking
  const toggleLocationTracking = () => {
    if (isTrackingEnabled) {
      // Stop tracking
      setIsTrackingEnabled(false);
      toast({
        title: "Tracking disabled",
        description: "Location tracking has been turned off.",
      });
    } else {
      // Start tracking
      setIsTrackingEnabled(true);
      getCurrentLocation();
      toast({
        title: "Tracking enabled",
        description: "Your location will be tracked for route assistance.",
      });
    }
  };

  // Enable tracking effect
  useEffect(() => {
    let trackingInterval: number | null = null;
    
    if (isTrackingEnabled) {
      // Update location every 2 minutes
      trackingInterval = window.setInterval(getCurrentLocation, 120000);
    }
    
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [isTrackingEnabled, getCurrentLocation]);

  // Handle check-in at property
  const handleCheckIn = (taskId: number) => {
    // Record check-in time
    const now = new Date();
    setCheckInStatus({ ...checkInStatus, [taskId]: true });
    setArrivalTimes({ ...arrivalTimes, [taskId]: format(now, "h:mm a") });
    
    // Update task status to in-progress
    updateTaskStatusMutation.mutate({
      id: taskId,
      updates: {
        status: "in-progress",
      },
    });
    
    setActiveTaskId(taskId);
    
    toast({
      title: "Checked in",
      description: `You've checked in at ${format(now, "h:mm a")}. You can now start cleaning.`,
    });
  };

  // Handle task completion through swipe gesture
  const handleCompleteTask = (taskId: number) => {
    updateTaskStatusMutation.mutate({
      id: taskId,
      updates: {
        status: "completed",
        completedAt: new Date().toISOString(),
      },
    });
    
    toast({
      title: "Task completed",
      description: "The cleaning task has been marked as completed.",
    });
  };

  // Handle flagging issues through swipe gesture
  const handleFlagIssue = (taskId: number) => {
    setSelectedTask(tasks.find((task: CleaningTask) => task.id === taskId) || null);
    
    toast({
      title: "Report issue",
      description: "Please provide details about the issue.",
    });
  };

  // Handle task rescheduling
  const handleRescheduleTask = (taskId: number) => {
    const task = tasks.find((task: CleaningTask) => task.id === taskId);
    if (!task) return;
    
    setSelectedTask(task);
    
    toast({
      title: "Reschedule task",
      description: "Please select a new date and time for this task.",
    });
  };

  // Initialize turn-by-turn navigation
  const startNavigation = (address: string) => {
    if (!address) {
      toast({
        title: "Navigation error",
        description: "No address available for this property.",
        variant: "destructive",
      });
      return;
    }
    
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Try to open in Google Maps
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  // Calculate distance between two coordinates (in miles)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  // Get estimated travel time based on distance (simple calculation)
  const getEstimatedTravelTime = (distance: number): string => {
    // Assume average speed of 25 mph in urban areas
    const timeInHours = distance / 25;
    
    if (timeInHours < 0.017) {
      // Less than 1 minute
      return "< 1 min";
    } else if (timeInHours < 1) {
      // Less than 1 hour
      const minutes = Math.ceil(timeInHours * 60);
      return `${minutes} min`;
    } else {
      // Hours and minutes
      const hours = Math.floor(timeInHours);
      const minutes = Math.ceil((timeInHours - hours) * 60);
      return `${hours} hr ${minutes} min`;
    }
  };

  // Calculate distance to each property from current location
  const getDistanceToProperty = (unitId: number): string => {
    if (!currentLocation) return "Unknown";
    
    const unit = getUnit(unitId);
    
    if (!unit?.latitude || !unit?.longitude) {
      return "Unknown";
    }
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      unit.latitude,
      unit.longitude
    );
    
    return `${distance} mi`;
  };

  // Get priority badge color
  const getPriorityBadge = (priority: string | null | undefined) => {
    if (!priority) return null;
    
    switch (priority.toLowerCase()) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "normal":
        return <Badge variant="secondary">Normal</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };
  
  if (tasksLoading || unitsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
      </div>
    );
  }

  if (tasksError || unitsError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Error loading route data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Map className="h-5 w-5 mr-2 text-blue-500" />
            Today's Route
          </h3>
          <p className="text-sm text-gray-500">
            {cleanerTasks.length} properties to clean
          </p>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isTrackingEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleLocationTracking}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                {isTrackingEnabled ? "Tracking On" : "Start Tracking"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isTrackingEnabled
                ? "Your location is being tracked for route assistance"
                : "Enable location tracking for turn-by-turn directions"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Instructions banner */}
      {!currentLocation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                Enable location tracking to see distance to properties and get directions
                to your next cleaning location.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route list */}
      <div className="space-y-3">
        {cleanerTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <CheckSquare className="h-8 w-8 text-gray-400 mb-2" />
                <h3 className="font-medium text-lg">No tasks for today</h3>
                <p className="text-gray-500 text-sm">
                  You don't have any cleaning tasks assigned for today.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          cleanerTasks.map((task: CleaningTask, index: number) => {
            const unit = getUnit(task.unitId);
            const isActive = activeTaskId === task.id;
            const isCheckedIn = checkInStatus[task.id] || false;
            
            return (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                isActive={isActive}
                onViewDetails={() => setSelectedTask(task)}
                onComplete={() => handleCompleteTask(task.id)}
                onFlag={() => handleFlagIssue(task.id)}
                onReschedule={() => handleRescheduleTask(task.id)}
                getUnitName={(unitId) => getUnit(unitId)?.name || `Property #${unitId}`}
                formatDate={(dateString) => formatScheduledTime(dateString as string)}
                getPriorityBadge={getPriorityBadge}
              />
            );
          })
        )}
      </div>

      {/* Location status and actions */}
      {currentLocation && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 h-8 w-8 rounded-full flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Location tracking active</p>
                  <p className="text-xs text-gray-500">
                    Updated {format(new Date(), "h:mm a")}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={getCurrentLocation}
                disabled={isLocating}
              >
                <RefreshCw className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}