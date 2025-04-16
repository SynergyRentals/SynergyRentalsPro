import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, isBefore, isAfter, parseISO, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    // Default to today for high urgency, guest checkout day for medium (will be updated)
    selection.urgency === 'high' ? new Date() : addDays(new Date(), 1)
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showManualSelection, setShowManualSelection] = useState(false);
  
  // Mock function to find a unit ID from the listing name
  // In a real implementation, this would be a lookup to your database
  const getUnitIdFromListingName = (listingName: string): number => {
    // This is a placeholder - in a real app, you'd lookup the unit ID
    return 1; // Default to first unit for this example
  };
  
  const unitId = getUnitIdFromListingName(task.listingName);
  
  // Fetch unit calendar data
  const {
    data: unitCalendar,
    isLoading: isLoadingCalendar,
    error: calendarError,
  } = useQuery({
    queryKey: [`/api/units/${unitId}/calendar`],
    // In a real implementation, this would fetch from your API
    // We're mocking the data for this demo
    queryFn: async () => {
      // For demo, we'll create mock data
      // In production, this would be: return (await fetch(`/api/units/${unitId}/calendar`)).json();
      
      const today = new Date();
      const mockReservations = [
        {
          id: 101,
          startDate: format(addDays(today, -5), 'yyyy-MM-dd'),
          endDate: format(addDays(today, -1), 'yyyy-MM-dd'),
          guestName: "Previous Guest"
        },
        {
          id: 102,
          startDate: format(addDays(today, 3), 'yyyy-MM-dd'),
          endDate: format(addDays(today, 7), 'yyyy-MM-dd'),
          guestName: "Upcoming Guest"
        },
        {
          id: 103,
          startDate: format(addDays(today, 10), 'yyyy-MM-dd'),
          endDate: format(addDays(today, 14), 'yyyy-MM-dd'),
          guestName: "Future Guest"
        }
      ];
      
      return {
        unitId,
        name: task.listingName,
        reservations: mockReservations
      } as UnitCalendar;
    },
    enabled: !!unitId
  });
  
  // Scheduled task mutation
  const scheduleTaskMutation = useMutation({
    mutationFn: async (values: any) => {
      // Create the task with scheduling details
      const response = await apiRequest("POST", "/api/tasks/schedule", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task scheduled",
        description: "The task has been scheduled successfully",
      });
      
      // Mark the HostAI task as processed
      updateHostAiTaskMutation.mutate({
        id: task.id,
        status: "processed",
        notes: `Task processed by ${user?.name} and scheduled for ${format(selectedDate!, 'MMM dd, yyyy')} at ${selectedTime}`
      });
      
      // Notify parent component that task was scheduled
      onScheduled(task.id);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to schedule task",
        variant: "destructive",
      });
    },
  });
  
  // Mark HostAI task as processed mutation
  const updateHostAiTaskMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/hostai/tasks/${id}`, { status, notes });
      return response.json();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });
  
  // Generate available time slots based on urgency and team
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    // Business hours: 8 AM to 5 PM
    for (let hour = 8; hour <= 17; hour++) {
      const time = hour <= 12 
        ? `${hour}:00 AM` 
        : `${hour - 12}:00 PM`;
      
      const slotId = `slot-${hour}`;
      const available = true; // In a real app, check team availability
      
      slots.push({
        id: slotId,
        time,
        available
      });
    }
    
    return slots;
  };
  
  const timeSlots = generateTimeSlots();
  
  // Generate suggested time slots based on urgency and team
  const getSuggestedTimeSlots = (): TimeSlot[] => {
    const slots = [...timeSlots];
    const now = new Date();
    const currentHour = now.getHours();
    
    // For high urgency: suggest slots today or tomorrow
    if (selection.urgency === 'high') {
      // If it's before 3 PM, suggest later today, otherwise tomorrow morning
      if (currentHour < 15) {
        // Suggest 2 hours from now
        const suggestedHour = Math.min(17, currentHour + 2);
        const suggestedIndex = slots.findIndex(
          slot => parseInt(slot.time.split(':')[0]) === (suggestedHour > 12 ? suggestedHour - 12 : suggestedHour)
        );
        
        if (suggestedIndex >= 0) {
          slots[suggestedIndex].suggested = true;
        }
      } else {
        // Suggest tomorrow at 9 AM
        slots[1].suggested = true; // 9 AM
      }
    } 
    // For medium urgency: suggest on checkout day
    else if (selection.urgency === 'medium') {
      // Find the nearest checkout date from reservations
      if (unitCalendar?.reservations && unitCalendar.reservations.length > 0) {
        // In this mock, we'll use the checkout of the first reservation
        // In a real app, you'd find the most relevant checkout
        slots[2].suggested = true; // 10 AM - typical checkout time
      } else {
        // No reservations, suggest middle of day
        slots[4].suggested = true; // 12 PM
      }
    }
    // For low urgency: suggest based on team availability in next 5-7 days
    else {
      // Suggest a mid-day slot on a day with no reservations
      slots[3].suggested = true; // 11 AM
    }
    
    return slots;
  };
  
  const suggestedTimeSlots = getSuggestedTimeSlots();
  
  // Get the suggested dates based on urgency
  useEffect(() => {
    if (!unitCalendar) return;
    
    // Default date selection based on urgency
    let suggestedDate = new Date();
    
    switch (selection.urgency) {
      case 'high':
        // For high urgency, suggest today or tomorrow
        const now = new Date();
        const currentHour = now.getHours();
        suggestedDate = currentHour < 15 ? now : addDays(now, 1);
        break;
        
      case 'medium':
        // For medium urgency, suggest on checkout day (the endDate of a reservation)
        if (unitCalendar.reservations && unitCalendar.reservations.length > 0) {
          // Find next checkout date
          const checkouts = unitCalendar.reservations
            .map(res => parseISO(res.endDate))
            .filter(date => isAfter(date, new Date()))
            .sort((a, b) => a.getTime() - b.getTime());
          
          if (checkouts.length > 0) {
            suggestedDate = checkouts[0];
          } else {
            // No upcoming checkouts, suggest tomorrow
            suggestedDate = addDays(new Date(), 1);
          }
        }
        break;
        
      case 'low':
        // For low urgency, suggest an optimal day in next 5-7 days
        // For demo, we'll pick day 5
        suggestedDate = addDays(new Date(), 5);
        
        // In a real app, you would analyze team workload and unit vacancy
        break;
    }
    
    setSelectedDate(startOfDay(suggestedDate));
    
    // Also select a default time based on suggestion
    const defaultTimeSlot = suggestedTimeSlots.find(slot => slot.suggested);
    if (defaultTimeSlot) {
      setSelectedTime(defaultTimeSlot.time);
    }
  }, [unitCalendar, selection.urgency]);
  
  // Function to check if a date has reservations
  const isDateBooked = (date: Date) => {
    if (!unitCalendar?.reservations) return false;
    
    const dateString = format(date, 'yyyy-MM-dd');
    return unitCalendar.reservations.some(res => {
      const start = res.startDate;
      const end = res.endDate;
      return dateString >= start && dateString <= end;
    });
  };
  
  // Function to handle scheduling the task
  const handleScheduleTask = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({
        title: "Incomplete selection",
        description: "Please select a date and time before scheduling",
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
    
    try {
      // In a real implementation, you'd send all the scheduling details
      await scheduleTaskMutation.mutateAsync({
        taskId: task.id,
        description: task.description,
        taskType: taskTypeMap[selection.team] || "General",
        priority: priorityMap[selection.urgency] || "normal",
        unitId: unitId,
        scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduledTime: selectedTime,
        status: "scheduled",
        createdBy: user.id,
        assignedTeam: selection.team,
        notes: `Task from HostAI for guest: ${task.guestName}. Original listing: ${task.listingName}. Scheduled for ${format(selectedDate, 'MMM dd, yyyy')} at ${selectedTime}.`,
      });
    } catch (err) {
      console.error("Error scheduling task:", err);
    }
  };
  
  return (
    <Card className="overflow-hidden border-l-4 border-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Schedule Task</CardTitle>
            <p className="text-sm text-muted-foreground">
              {task.listingName} • {selection.urgency.charAt(0).toUpperCase() + selection.urgency.slice(1)} Priority
            </p>
          </div>
          <Badge className={
            selection.urgency === 'high' ? "bg-red-100 text-red-800" :
            selection.urgency === 'medium' ? "bg-amber-100 text-amber-800" :
            "bg-green-100 text-green-800"
          }>
            {selection.team.charAt(0).toUpperCase() + selection.team.slice(1)} Team
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoadingCalendar ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : calendarError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load unit calendar. Please try again.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" /> Unit Calendar
              </h4>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    // Can't schedule in the past
                    isBefore(date, startOfDay(new Date())) ||
                    // For high urgency, only allow today or tomorrow
                    (selection.urgency === 'high' && 
                     isBefore(addDays(startOfDay(new Date()), 2), date))
                  }
                  modifiers={{
                    booked: (date) => isDateBooked(date),
                  }}
                  modifiersStyles={{
                    booked: { backgroundColor: 'rgba(244, 63, 94, 0.1)' },
                  }}
                  className="rounded-md border"
                />
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-red-100"></div>
                    <span>Booked (Guest Stay)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Clock className="mr-2 h-4 w-4" /> Time Slot
              </h4>
              
              {!showManualSelection ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Suggested times based on {selection.urgency} urgency for {selection.team} team:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {suggestedTimeSlots
                      .filter(slot => slot.suggested)
                      .map(slot => (
                        <Button
                          key={slot.id}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          onClick={() => setSelectedTime(slot.time)}
                          className="justify-start"
                        >
                          {slot.time}
                        </Button>
                      ))
                    }
                  </div>
                  
                  <Button 
                    variant="link" 
                    onClick={() => setShowManualSelection(true)}
                    className="px-0"
                  >
                    Choose different time
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={selectedTime || undefined} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedTimeSlots.map(slot => (
                        <SelectItem 
                          key={slot.id} 
                          value={slot.time} 
                          disabled={!slot.available}
                        >
                          {slot.time} {slot.suggested ? " (Recommended)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="link" 
                    onClick={() => setShowManualSelection(false)}
                    className="px-0"
                  >
                    Use suggested times
                  </Button>
                </div>
              )}
              
              {selectedDate && selectedTime && (
                <p className="mt-4 text-sm font-medium">
                  Task will be scheduled for {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-3">
        <div className="flex w-full space-x-2">
          <Button 
            onClick={handleScheduleTask}
            disabled={!selectedDate || !selectedTime || scheduleTaskMutation.isPending}
            className="w-2/3"
          >
            {scheduleTaskMutation.isPending ? "Scheduling..." : "Confirm & Schedule Task"}
          </Button>
          <Button 
            onClick={onCancel}
            variant="outline"
            disabled={scheduleTaskMutation.isPending}
            className="w-1/3"
          >
            Back
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}