import { useState } from "react";
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

  // Helper function to check if a date has events
  const hasEvent = (date: Date) => {
    // Check date without time component
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return events.some(event => {
      const eventDate = event.date;
      return eventDate >= targetDate && eventDate < nextDate;
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Check date without time component
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return events.filter(event => {
      const eventDate = event.date;
      return eventDate >= targetDate && eventDate < nextDate;
    });
  };

  // Function to render custom day contents
  const renderDay = (day: Date | undefined) => {
    if (!day) return null;
    
    const dateEvents = getEventsForDate(day);
    if (dateEvents.length === 0) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-full flex items-center justify-center relative">
              <div className="absolute bottom-1 flex gap-0.5">
                {dateEvents.slice(0, 3).map((event, index) => (
                  <div 
                    key={index} 
                    className={`h-1.5 w-1.5 rounded-full ${getEventColor(event.type)}`}
                  />
                ))}
                {dateEvents.length > 3 && (
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 max-w-[200px]">
              {dateEvents.map((event, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getEventColor(event.type)}`} />
                  <span className="text-xs">{event.label}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
      
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        className="rounded-md border"
        components={{
          DayContent: ({ day }) => (
            <>
              <div>{day?.getDate()}</div>
              {renderDay(day)}
            </>
          ),
        }}
      />
      
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
                    {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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