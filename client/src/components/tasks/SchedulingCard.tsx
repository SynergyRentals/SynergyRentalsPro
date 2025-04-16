import { useState, useEffect } from "react";
import { format, addDays, isBefore, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, RotateCw } from "lucide-react";

type HostAITask = {
  id: number;
  hostAiAction: string;
  description: string;
  status: string;
  guestName: string;
  listingName: string;
  guestEmail?: string;
  guestPhone?: string;
  hostAiCreatedAt?: Date;
  createdAt: Date;
  // Additional properties may exist
};

type TimeSlot = {
  id: string;
  time: string;
  available: boolean;
  suggested?: boolean;
};

type TaskSelection = {
  urgency: string;
  team: string;
};

type UnitCalendar = {
  unitId: number;
  name: string;
  reservations: {
    id: number;
    startDate: string;
    endDate: string;
    guestName: string;
  }[];
};

type SchedulingCardProps = {
  task: HostAITask;
  selection: TaskSelection;
  onCancel: () => void;
  onScheduled: (taskId: number) => void;
};

export function SchedulingCard({ task, selection, onCancel, onScheduled }: SchedulingCardProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  // Time slots for the schedule (customizable)
  const morningSlots: TimeSlot[] = [
    { id: "0800", time: "8:00 AM", available: true },
    { id: "0900", time: "9:00 AM", available: true, suggested: selection.team === "cleaning" },
    { id: "1000", time: "10:00 AM", available: true },
    { id: "1100", time: "11:00 AM", available: true },
  ];
  
  const afternoonSlots: TimeSlot[] = [
    { id: "1200", time: "12:00 PM", available: true },
    { id: "1300", time: "1:00 PM", available: true },
    { id: "1400", time: "2:00 PM", available: true, suggested: selection.team === "maintenance" },
    { id: "1500", time: "3:00 PM", available: true },
    { id: "1600", time: "4:00 PM", available: true },
    { id: "1700", time: "5:00 PM", available: true },
  ];
  
  // Mock data for unit calendar and availability
  // In a real implementation, this would be fetched from the API based on the unit ID
  const unitCalendar: UnitCalendar = {
    unitId: 1,
    name: task.listingName,
    reservations: [
      {
        id: 101,
        startDate: new Date().toISOString(),
        endDate: addDays(new Date(), 5).toISOString(),
        guestName: "Current Guest"
      },
      {
        id: 102,
        startDate: addDays(new Date(), 6).toISOString(),
        endDate: addDays(new Date(), 10).toISOString(),
        guestName: "John Smith"
      }
    ]
  };

  // Get unit property information
  const {
    data: unitData,
    isLoading: isLoadingUnitData,
  } = useQuery({
    queryKey: ["/api/guesty/properties"],
    select: (data) => {
      if (Array.isArray(data)) {
        // Find the property with matching name
        return data.find((property) => property.name === task.listingName);
      }
      return undefined;
    }
  });

  // Get reservations for this unit to show on calendar
  const {
    data: reservations,
    isLoading: isLoadingReservations,
  } = useQuery({
    queryKey: ["/api/guesty/reservations"],
    select: (data) => {
      if (Array.isArray(data)) {
        // Filter to only reservations for this property
        return data.filter((reservation) => {
          const propertyMatches = unitData && reservation.propertyId === unitData.propertyId;
          return propertyMatches;
        });
      }
      return [];
    },
    enabled: !!unitData,
  });

  // Schedule task mutation
  const scheduleMutation = useMutation({
    mutationFn: async (values: any) => {
      const response = await apiRequest("POST", "/api/project-tasks", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task scheduled",
        description: "The task has been scheduled successfully",
      });
      // Call the onScheduled callback to notify parent component
      onScheduled(task.id);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/hostai/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to schedule task",
        variant: "destructive",
      });
    },
  });

  // Mark HostAI task as processed after scheduling
  const updateHostAiTaskMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/hostai/tasks/${id}`, { status, notes });
      return response.json();
    },
    onSuccess: () => {
      // Success is handled by parent component
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Check if a date is booked (has a reservation)
  const isDateBooked = (date: Date) => {
    if (!reservations) return false;
    
    return reservations.some(reservation => {
      const checkIn = new Date(reservation.checkIn);
      const checkOut = new Date(reservation.checkOut);
      return (
        date >= checkIn && date <= checkOut
      );
    });
  };

  // Handle scheduling the task
  const handleScheduleTask = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Incomplete selection",
        description: "Please select both a date and time slot",
        variant: "destructive",
      });
      return;
    }

    // Map team selection to task type
    const taskTypeMap: Record<string, string> = {
      "cleaning": "Cleaning",
      "maintenance": "Maintenance",
      "internal": "Admin",
      "vendor": "Vendor",
    };

    // Map urgency to priority
    const priorityMap: Record<string, string> = {
      "high": "urgent",
      "medium": "high",
      "low": "normal",
    };

    // Create time string from selectedDate and selectedTimeSlot
    const [hours, minutes] = [selectedTimeSlot.slice(0, 2), selectedTimeSlot.slice(2, 4)];
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      // Create a new task with scheduling information
      await scheduleMutation.mutateAsync({
        description: task.description,
        taskType: taskTypeMap[selection.team] || "General",
        priority: priorityMap[selection.urgency] || "normal",
        status: "scheduled",
        scheduledFor: scheduledDate.toISOString(),
        notes: `Task from HostAI for guest: ${task.guestName}. Original listing: ${task.listingName}. Scheduled for ${format(scheduledDate, "PPp")}`,
        // Find unit ID if possible
        unitId: unitData?.id || null,
      });

      // Mark the HostAI task as processed
      await updateHostAiTaskMutation.mutateAsync({
        id: task.id,
        status: "processed",
        notes: `Task processed and scheduled for ${format(scheduledDate, "PPp")} with ${selection.urgency} urgency for ${selection.team} team.`
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to schedule task",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden border-l-4 border-green-500">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{task.listingName}</CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <span>{task.guestName}</span>
              {task.hostAiCreatedAt && (
                <span>• {format(new Date(task.hostAiCreatedAt), "MMM d")}</span>
              )}
            </CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            Scheduling
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-lg">Schedule {selection.team} task</h4>
          <p className="text-muted-foreground mt-1 mb-4">{task.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Select Date
              </h5>
              <div className="border rounded-md overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    isBefore(date, new Date()) || // Can't schedule in the past
                    isDateBooked(date)          // Can't schedule when booked
                  }
                  className="rounded-md border"
                />
              </div>
            </div>
            
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Select Time
              </h5>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Morning</p>
                  <div className="grid grid-cols-2 gap-2">
                    {morningSlots.map(slot => (
                      <Button
                        key={slot.id}
                        variant={selectedTimeSlot === slot.id ? "default" : "outline"}
                        className={`${!slot.available ? 'opacity-50 cursor-not-allowed' : ''} 
                                  ${slot.suggested ? 'border-green-500 border-2' : ''}`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.id)}
                      >
                        {slot.time}
                        {slot.suggested && <span className="ml-1 text-xs text-green-600">•</span>}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Afternoon</p>
                  <div className="grid grid-cols-2 gap-2">
                    {afternoonSlots.map(slot => (
                      <Button
                        key={slot.id}
                        variant={selectedTimeSlot === slot.id ? "default" : "outline"}
                        className={`${!slot.available ? 'opacity-50 cursor-not-allowed' : ''} 
                                  ${slot.suggested ? 'border-green-500 border-2' : ''}`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.id)}
                      >
                        {slot.time}
                        {slot.suggested && <span className="ml-1 text-xs text-green-600">•</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              {isLoadingUnitData || isLoadingReservations ? (
                <div className="flex items-center justify-center h-20">
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading availability...</span>
                </div>
              ) : (
                <div className="mt-4 text-sm">
                  <p className="font-medium">Scheduling for: {selection.team} team</p>
                  <p className="text-muted-foreground">
                    Priority: {selection.urgency.charAt(0).toUpperCase() + selection.urgency.slice(1)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          onClick={handleScheduleTask}
          disabled={!selectedDate || !selectedTimeSlot || scheduleMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {scheduleMutation.isPending ? "Scheduling..." : "Schedule Task"}
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          disabled={scheduleMutation.isPending}
          className="w-full"
        >
          Back to Selection
        </Button>
      </CardFooter>
    </Card>
  );
}