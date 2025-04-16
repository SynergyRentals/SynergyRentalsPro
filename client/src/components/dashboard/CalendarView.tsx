import { useState, useEffect } from "react";
import { format, isSameDay, addDays, isWithinInterval, isBefore, isAfter } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Define the event types
export type CalendarEventType = "cleaning" | "maintenance" | "inventory" | "urgent" | "checkin" | "checkout";

// Define the reservation status
export type ReservationStatus = "checkin" | "checkout" | "occupied";

// Define the calendar event interface
export interface CalendarEvent {
  date: Date;
  type: CalendarEventType;
  label: string;
  // For reservations
  reservationId?: string;
  startDate?: Date; // Check-in date
  endDate?: Date;   // Check-out date
  status?: ReservationStatus;
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [calendarDates, setCalendarDates] = useState<{ 
    date: Date; 
    hasEvents: boolean; 
    eventTypes: CalendarEventType[];
    events: CalendarEvent[];
    isCheckIn: boolean;
    isCheckOut: boolean;
    isOccupied: boolean;
    reservationId: string | null;
  }[]>([]);
  
  useEffect(() => {
    // Process events and prepare calendar data
    console.log("Processing events for calendar:", events.length);
    
    // Create a map of dates to events
    const dateMap = new Map<string, { 
      hasEvents: boolean; 
      eventTypes: CalendarEventType[]; 
      events: CalendarEvent[];
      // Reservation specific data
      isCheckIn: boolean;
      isCheckOut: boolean;
      isOccupied: boolean;
      reservationId: string | null;
    }>();
    
    // Initialize calendar with all dates in the current month
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateKey = format(date, 'yyyy-MM-dd');
      dateMap.set(dateKey, { 
        hasEvents: false, 
        eventTypes: [], 
        events: [],
        isCheckIn: false,
        isCheckOut: false,
        isOccupied: false,
        reservationId: null
      });
    }
    
    // Add events to the map
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      const dateData = dateMap.get(dateKey) || { 
        hasEvents: false, 
        eventTypes: [], 
        events: [],
        isCheckIn: false,
        isCheckOut: false,
        isOccupied: false,
        reservationId: null
      };
      
      dateData.hasEvents = true;
      if (!dateData.eventTypes.includes(event.type)) {
        dateData.eventTypes.push(event.type);
      }
      dateData.events.push(event);
      
      // We'll process reservation indicators separately later
      dateMap.set(dateKey, dateData);
    });
    
    // Process reservations to mark occupied dates with correct check-out logic
    events.forEach(event => {
      // Process only events with reservation data
      if (event.startDate && event.endDate && event.reservationId) {
        // Get start date (check-in)
        const startDate = new Date(event.startDate);
        
        // End date is the actual check-out date in the data
        const actualEndDate = new Date(event.endDate);
        
        // For display purposes, check-out dot should appear the day AFTER the actual check-out
        // since guests typically check out at 11 AM but the unit is occupied until then
        const displayCheckOutDate = addDays(actualEndDate, 1);
        
        // Get all dates between start and actual end (occupied period)
        let currentDate = new Date(startDate);
        
        // Loop through all dates in the reservation period
        while (currentDate <= actualEndDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          const dateData = dateMap.get(dateKey);
          
          if (dateData) {
            // Mark this date as part of a reservation
            dateData.isOccupied = true;
            dateData.reservationId = event.reservationId;
            
            // Special markings for check-in day (actual start date)
            if (isSameDay(currentDate, startDate)) {
              dateData.isCheckIn = true;
            }
            
            dateMap.set(dateKey, dateData);
          }
          
          // Move to next day
          currentDate = addDays(currentDate, 1);
        }
        
        // Now handle the check-out indicator which appears on the day AFTER the actual end date
        const checkOutDateKey = format(displayCheckOutDate, 'yyyy-MM-dd');
        const checkOutDateData = dateMap.get(checkOutDateKey);
        
        if (checkOutDateData) {
          checkOutDateData.isCheckOut = true;
          checkOutDateData.reservationId = event.reservationId;
          
          // Add the event to this date if it's not already there
          if (!checkOutDateData.events.some(e => e.reservationId === event.reservationId)) {
            checkOutDateData.events.push({
              ...event,
              date: displayCheckOutDate,
              type: "maintenance", // Using maintenance type for check-out events
              label: `Check-out: ${event.label}`
            });
            checkOutDateData.hasEvents = true;
            if (!checkOutDateData.eventTypes.includes("maintenance")) {
              checkOutDateData.eventTypes.push("maintenance");
            }
          }
          
          dateMap.set(checkOutDateKey, checkOutDateData);
        }
      }
    });
    
    // Convert map to array for rendering
    const dates = Array.from(dateMap.entries()).map(([dateString, data]) => ({
      date: new Date(dateString),
      hasEvents: data.hasEvents,
      eventTypes: data.eventTypes,
      events: data.events,
      isCheckIn: data.isCheckIn,
      isCheckOut: data.isCheckOut,
      isOccupied: data.isOccupied,
      reservationId: data.reservationId
    }));
    
    setCalendarDates(dates);
  }, [events, month]);

  // Function to get color for event type
  const getEventColor = (type: CalendarEventType) => {
    switch (type) {
      case "cleaning":
        return "bg-blue-500";
      case "maintenance":
        return "bg-orange-500";
      case "inventory":
        return "bg-green-500";
      case "urgent":
        return "bg-red-500";
      case "checkin":
        return "bg-gray-500"; // Gray for check-in events
      case "checkout":
        return "bg-black";    // Black for check-out events
      default:
        return "bg-gray-500";
    }
  };
  
  // Get all events for a particular day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Event type indicators */}
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Cleaning</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span>Maintenance</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Inventory</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Urgent</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-500" />
            <span>Check-in</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-black" />
            <span>Check-out</span>
          </Badge>
        </div>
      </div>
      
      {/* Reservation status indicators legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-500" />
          <span>Check-in</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-black" />
          <span>Check-out</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-8 bg-yellow-300" />
          <span>Occupied</span>
        </div>
      </div>
      
      <div className="border rounded-md p-2">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          modifiers={{
            // Highlight days with events
            hasEvent: events.map(event => new Date(event.date))
          }}
          modifiersStyles={{
            hasEvent: { fontWeight: 'bold', backgroundColor: 'var(--primary-50)' }
          }}
          components={{
            DayContent: (props) => {
              if (!props.date) return null;
              
              // Find current date in our processed calendar dates
              const dateStr = format(props.date, 'yyyy-MM-dd');
              const currentDateData = calendarDates.find(d => format(d.date, 'yyyy-MM-dd') === dateStr);
              
              // Get events for this day
              const dayEvents = getEventsForDay(props.date);
              const hasEvents = dayEvents.length > 0;
              
              // Reservation indicators
              const isCheckIn = currentDateData?.isCheckIn || false;
              const isCheckOut = currentDateData?.isCheckOut || false;
              const isOccupied = currentDateData?.isOccupied || false;
              const reservationId = currentDateData?.reservationId || null;
              
              // Prepare tooltip content
              const tooltipEvents = dayEvents.map(event => ({
                type: event.type,
                label: event.label
              }));
              
              // Add reservation info to tooltip if this day is part of a reservation
              if (isCheckIn || isCheckOut || isOccupied) {
                const reservationEvent = dayEvents.find(e => e.reservationId === reservationId);
                if (reservationEvent) {
                  if (isCheckIn) {
                    tooltipEvents.push({
                      type: "checkin" as CalendarEventType,
                      label: `Check-in: ${reservationEvent.label}`
                    });
                  }
                  if (isCheckOut) {
                    tooltipEvents.push({
                      type: "checkout" as CalendarEventType,
                      label: `Check-out: ${reservationEvent.label}`
                    });
                  }
                  if (isOccupied && !isCheckIn && !isCheckOut) {
                    tooltipEvents.push({
                      type: "inventory" as CalendarEventType,
                      label: `Occupied: ${reservationEvent.label}`
                    });
                  }
                }
              }
              
              return (
                <div className="relative w-full h-full flex flex-col items-center">
                  <div>{format(props.date, 'd')}</div>
                  
                  {/* Reservation status indicators */}
                  <div className="w-full mt-1 flex justify-center">
                    {/* Check-in indicator (gray dot) */}
                    {isCheckIn && (
                      <div className="h-2 w-2 rounded-full bg-gray-500 mx-0.5" />
                    )}
                    
                    {/* Occupied indicator (yellow connecting line) */}
                    {isOccupied && !isCheckIn && !isCheckOut && (
                      <div className="h-2 w-full bg-yellow-300 mx-0.5" style={{ maxWidth: '80%' }} />
                    )}
                    
                    {/* Check-out indicator (black dot) */}
                    {isCheckOut && (
                      <div className="h-2 w-2 rounded-full bg-black mx-0.5" />
                    )}
                  </div>
                  
                  {/* Regular event indicators */}
                  {hasEvents && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute bottom-0 flex justify-center w-full gap-0.5 pb-1">
                            {dayEvents.slice(0, Math.min(3, dayEvents.length)).map((event, idx) => (
                              <div 
                                key={idx}
                                className={`h-1.5 w-1.5 rounded-full ${getEventColor(event.type)}`}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="p-1 space-y-1">
                            {tooltipEvents.map((event, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  event.type === "checkin"
                                    ? "bg-gray-500"
                                    : event.type === "checkout"
                                    ? "bg-black"
                                    : event.type === "inventory" && event.label.includes("Occupied")
                                    ? "bg-yellow-300"
                                    : getEventColor(event.type)
                                }`} />
                                <span className="text-xs">{event.label}</span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            }
          }}
        />
      </div>
      
      <div className="mt-4">
        <h3 className="font-medium text-sm mb-2">Upcoming Events</h3>
        <div className="space-y-2">
          {events
            .filter(event => event.date >= new Date())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5)
            .map((event, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                <div className={`h-3 w-3 rounded-full ${getEventColor(event.type)}`} />
                <div>
                  <div className="text-sm font-medium">{event.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(event.date, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          {events.filter(event => event.date >= new Date()).length === 0 && (
            <div className="text-sm text-muted-foreground">No upcoming events</div>
          )}
        </div>
      </div>
    </div>
  );
}