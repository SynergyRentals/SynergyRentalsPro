import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Define the event types
export type CalendarEventType = "cleaning" | "maintenance" | "inventory" | "urgent";

// Define the calendar event interface
export interface CalendarEvent {
  date: Date;
  type: CalendarEventType;
  label: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [calendarDates, setCalendarDates] = useState<{ date: Date; hasEvents: boolean; eventTypes: CalendarEventType[] }[]>([]);
  
  useEffect(() => {
    // Process events and prepare calendar data
    console.log("Processing events for calendar:", events.length);
    
    // Create a map of dates to events
    const dateMap = new Map<string, { hasEvents: boolean; eventTypes: CalendarEventType[]; events: CalendarEvent[] }>();
    
    // Initialize calendar with all dates in the current month
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateKey = format(date, 'yyyy-MM-dd');
      dateMap.set(dateKey, { hasEvents: false, eventTypes: [], events: [] });
    }
    
    // Add events to the map
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      const dateData = dateMap.get(dateKey) || { hasEvents: false, eventTypes: [], events: [] };
      dateData.hasEvents = true;
      if (!dateData.eventTypes.includes(event.type)) {
        dateData.eventTypes.push(event.type);
      }
      dateData.events.push(event);
      dateMap.set(dateKey, dateData);
    });
    
    // Convert map to array for rendering
    const dates = Array.from(dateMap.entries()).map(([dateString, data]) => ({
      date: new Date(dateString),
      hasEvents: data.hasEvents,
      eventTypes: data.eventTypes,
      events: data.events
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
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
              
              const dayEvents = getEventsForDay(props.date);
              const hasEvents = dayEvents.length > 0;
              
              return (
                <div className="relative w-full h-full flex flex-col items-center">
                  <div>{format(props.date, 'd')}</div>
                  
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
                            {dayEvents.map((event, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${getEventColor(event.type)}`} />
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