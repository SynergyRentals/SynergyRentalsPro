import React, { useState } from "react";
import { format, parseISO, addDays, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";

// Interface for calendar events from the API
interface CalendarEvent {
  start: string | Date;
  end: string | Date;
  title: string;
  uid: string;
  status?: string;
}

interface PropertyCalendarProps {
  events: CalendarEvent[];
  isLoading: boolean;
}

export default function PropertyCalendar({ events, isLoading }: PropertyCalendarProps) {
  // Calculate the date range for the calendar display
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfCalendar = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Show current month + next month
  
  // Convert string dates to Date objects
  const processedEvents = events.map(event => ({
    ...event,
    start: event.start instanceof Date ? event.start : parseISO(event.start as string),
    end: event.end instanceof Date ? event.end : parseISO(event.end as string),
  }));

  // Generate all days to display in the calendar
  const calendarDays = eachDayOfInterval({
    start: startOfMonth,
    end: endOfCalendar
  });

  // Find events for a specific day
  const getEventsForDay = (day: Date) => {
    return processedEvents.filter(event => {
      // Check if this day falls within the event's range
      // Note: iCal end date is the day after checkout (represents checkout morning)
      return isWithinInterval(day, {
        start: event.start as Date,
        end: addDays(event.end as Date, -1) // Adjusting end date to represent last night of stay
      }) || isSameDay(day, event.start as Date) || isSameDay(day, event.end as Date);
    });
  };

  // Find check-in events for a day (events that start on this day)
  const getCheckInsForDay = (day: Date) => {
    return processedEvents.filter(event => 
      isSameDay(day, event.start as Date)
    );
  };

  // Find check-out events for a day (events that end on this day)
  // Note: In iCal standard, the end date is the day AFTER the checkout day
  // So we need to subtract one day to get the actual checkout date
  const getCheckOutsForDay = (day: Date) => {
    return processedEvents.filter(event => 
      isSameDay(day, addDays(event.end as Date, -1))
    );
  };

  // Check if a day has a same-day transition (checkout from one reservation, checkin to another)
  const hasSameDayTransition = (day: Date) => {
    const checkouts = getCheckOutsForDay(day);
    const checkins = getCheckInsForDay(day);
    return checkouts.length > 0 && checkins.length > 0;
  };

  // Generate calendar month and year headings
  const monthHeadings = Array.from(
    new Set(calendarDays.map(day => `${format(day, 'MMMM yyyy')}`))
  );

  // Group days by week for display
  const calendarWeeks = calendarDays.reduce((weeks: Date[][], day, i) => {
    const weekIndex = Math.floor(i / 7);
    if (!weeks[weekIndex]) {
      weeks[weekIndex] = [];
    }
    weeks[weekIndex].push(day);
    return weeks;
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="calendar-container">
      {monthHeadings.map((monthHeading, monthIndex) => (
        <div key={monthHeading} className="mb-6">
          <h3 className="text-lg font-medium mb-4">{monthHeading}</h3>
          
          {/* Calendar grid */}
          <div className="calendar-grid">
            {/* Day headings */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-sm text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="border rounded-md overflow-hidden">
              {calendarWeeks
                .filter((_, weekIndex) => {
                  // Only display weeks that belong to the current month
                  const firstDayInWeek = calendarWeeks[weekIndex][0];
                  const monthOfFirstDay = format(firstDayInWeek, 'MMMM yyyy');
                  return monthOfFirstDay === monthHeading;
                })
                .map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
                    {week.map((day, dayIndex) => {
                      const dayEvents = getEventsForDay(day);
                      const hasEvents = dayEvents.length > 0;
                      const isCheckInDay = getCheckInsForDay(day).length > 0;
                      const isCheckOutDay = getCheckOutsForDay(day).length > 0;
                      
                      return (
                        <div 
                          key={dayIndex}
                          className={`
                            relative min-h-[80px] p-1 border-r last:border-r-0
                            ${format(day, 'MMM') !== format(new Date(monthHeading), 'MMM') ? 'bg-muted/20' : ''}
                          `}
                        >
                          {/* Day number */}
                          <div className="text-sm font-medium">{format(day, 'd')}</div>
                          
                          {/* Reservation indicators */}
                          <div className="mt-2">
                            {hasEvents && (
                              <div className="relative">
                                {/* First render connecting bars */}
                                {dayEvents.map((event, eventIndex) => {
                                  const isFirstDay = isSameDay(day, event.start as Date);
                                  const actualCheckoutDay = addDays(event.end as Date, -1);
                                  const isLastDay = isSameDay(day, actualCheckoutDay);
                                  const isWithinEvent = !isFirstDay && !isLastDay;
                                  
                                  // Bar color is always yellow
                                  const barColorClass = "bg-yellow-400";
                                  
                                  // Calculate positioning based on number of events
                                  const eventHeight = 20; // pixels
                                  const topPosition = eventIndex * (eventHeight + 2); // Add small gap between events
                                  
                                  if ((isWithinEvent || isFirstDay || isLastDay)) {
                                    // Determine width and position of connecting bar
                                    const leftPosition = isFirstDay ? '50%' : '0%';
                                    const rightPosition = isLastDay ? '50%' : '0%';
                                    
                                    return (
                                      <div 
                                        key={`bar-${event.uid}-${eventIndex}`}
                                        className={`${barColorClass} absolute opacity-60 z-10`} 
                                        style={{
                                          top: `${topPosition}px`,
                                          left: leftPosition,
                                          right: rightPosition,
                                          height: `${eventHeight}px`,
                                          width: isFirstDay && isLastDay ? 
                                            '0' : // No connecting bar needed for 1-day stays
                                            isFirstDay ? 'calc(50% + 1px)' : // From middle to end
                                              isLastDay ? 'calc(50% + 1px)' : // From start to middle
                                                '100%' // Full width for middle days
                                        }}
                                      />
                                    );
                                  }
                                  return null;
                                })}
                                
                                {/* Then render dots on top of bars */}
                                {dayEvents.map((event, eventIndex) => {
                                  const isFirstDay = isSameDay(day, event.start as Date);
                                  const actualCheckoutDay = addDays(event.end as Date, -1);
                                  const isLastDay = isSameDay(day, actualCheckoutDay);
                                  
                                  // For dots, we use blue
                                  const dotColorClass = "bg-blue-500";
                                  
                                  // Calculate same positioning as bars
                                  const eventHeight = 20;
                                  const topPosition = eventIndex * (eventHeight + 2);
                                  
                                  // Calculate side positioning for same-day transitions
                                  const dotLeftPos = isCheckInDay && isCheckOutDay ? 
                                    (eventIndex % 2 === 0 ? '35%' : '65%') : // Offset for clarity
                                    '50%';
                                  
                                  return (
                                    <TooltipProvider key={`event-${event.uid}-${eventIndex}`}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="reservation-indicator">
                                            {/* Check-in dot */}
                                            {isFirstDay && (
                                              <div 
                                                className={`${dotColorClass} w-5 h-5 rounded-full opacity-80 absolute z-20`}
                                                style={{
                                                  top: `${topPosition}px`,
                                                  left: dotLeftPos,
                                                  transform: 'translate(-50%, 0)',
                                                  marginTop: `${(eventHeight - 5) / 2}px`, // Center the dot
                                                }}
                                              />
                                            )}
                                            
                                            {/* Check-out dot */}
                                            {isLastDay && !isFirstDay && (
                                              <div 
                                                className={`${dotColorClass} w-5 h-5 rounded-full opacity-80 absolute z-20`}
                                                style={{
                                                  top: `${topPosition}px`,
                                                  left: dotLeftPos,
                                                  transform: 'translate(-50%, 0)',
                                                  marginTop: `${(eventHeight - 5) / 2}px`, // Center the dot
                                                }}
                                              />
                                            )}
                                            
                                            {/* For same-day check-in/check-out on the same reservation */}
                                            {isFirstDay && isLastDay && (
                                              <div className="w-full h-full absolute" 
                                                style={{
                                                  top: `${topPosition}px`,
                                                  height: `${eventHeight}px`,
                                                }} 
                                              />
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center" className="p-2 max-w-[250px]">
                                          <div>
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-xs">
                                              {format(event.start as Date, 'MMM d, yyyy')} - {format(addDays(event.end as Date, -1), 'MMM d, yyyy')}
                                            </p>
                                            <p className="text-xs">ID: {event.uid.substring(0, 8)}...</p>
                                            {event.status && (
                                              <p className="text-xs capitalize">Status: {event.status}</p>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}