import React, { useState } from "react";
import { format, parseISO, addDays, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { toZonedTime, format as formatTZ } from "date-fns-tz";
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
  checkout?: string | Date; // Explicit checkout date, if provided by backend
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
  
  // Convert string dates to Date objects and normalize them
  const processedEvents = events.map(event => {
    // Ensure dates are properly parsed from strings or kept as Date objects
    const startDate = event.start instanceof Date ? event.start : parseISO(event.start as string);
    const endDate = event.end instanceof Date ? event.end : parseISO(event.end as string);
    
    // Parse checkout date if available, otherwise it will be calculated from end date
    const checkoutDate = event.checkout ? 
      (event.checkout instanceof Date ? event.checkout : parseISO(event.checkout as string)) :
      null;
    
    // Normalize dates to UTC midnight to ensure consistent timezone handling
    // Ensure we're working with valid dates
    let normalizedStart: Date;
    let normalizedEnd: Date;
    let normalizedCheckout: Date | null = null;

    try {
      // Normalize dates - create new dates with just the date part
      normalizedStart = new Date(Date.UTC(
        startDate.getFullYear(), 
        startDate.getMonth(), 
        startDate.getDate()
      ));
      
      normalizedEnd = new Date(Date.UTC(
        endDate.getFullYear(), 
        endDate.getMonth(), 
        endDate.getDate()
      ));
      
      // Normalize checkout date if available using the same approach
      if (checkoutDate) {
        normalizedCheckout = new Date(Date.UTC(
          checkoutDate.getFullYear(), 
          checkoutDate.getMonth(), 
          checkoutDate.getDate()
        ));
      }
    } catch (e) {
      console.error("Error normalizing dates:", e);
      // Fallback for any parsing errors using a standardized approach
      // Create consistent fallback dates that match the server's implementation
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Create normalized UTC midnight versions
      normalizedStart = new Date(Date.UTC(
        today.getFullYear(), 
        today.getMonth(), 
        today.getDate()
      ));
      
      normalizedEnd = new Date(Date.UTC(
        tomorrow.getFullYear(), 
        tomorrow.getMonth(), 
        tomorrow.getDate()
      ));
      
      // For fallback, checkout is same as start (one-day event)
      normalizedCheckout = normalizedStart;
    }
    
    return {
      ...event,
      start: normalizedStart,
      end: normalizedEnd,
      checkout: normalizedCheckout
    };
  });

  // Generate all days to display in the calendar
  const calendarDays = eachDayOfInterval({
    start: startOfMonth,
    end: endOfCalendar
  });

  // Find events for a specific day - improved handling of iCal date format
  const getEventsForDay = (day: Date) => {
    return processedEvents.filter(event => {
      const startDate = event.start as Date;
      
      // Use the checkout date provided by the backend when available
      // Otherwise fall back to calculating it from the end date (iCal standard - exclusive end date)
      const checkoutDate = event.checkout as Date || addDays(event.end as Date, -1);
      
      // Normalize the day to UTC midnight for consistent comparison with event dates
      const normalizedDay = new Date(`${day.toISOString().split('T')[0]}T00:00:00Z`);
      
      // Check if the day is within the reservation period (inclusive of start and checkout)
      return (
        isWithinInterval(normalizedDay, {
          start: startDate,
          end: checkoutDate
        }) || 
        isSameDay(normalizedDay, startDate) || 
        isSameDay(normalizedDay, checkoutDate)
      );
    });
  };

  // Find check-in events for a day (events that start on this day)
  const getCheckInsForDay = (day: Date) => {
    return processedEvents.filter(event => 
      isSameDay(day, event.start as Date)
    );
  };

  // Find check-out events for a day (events that end on this day)
  // Use the checkout date provided by the backend when available
  const getCheckOutsForDay = (day: Date) => {
    return processedEvents.filter(event => {
      // Use the checkout date from backend when available, otherwise calculate from end date
      const checkoutDate = event.checkout as Date || addDays(event.end as Date, -1);
      return isSameDay(day, checkoutDate);
    });
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
                                  // Ensure we're dealing with actual Date objects
                                  const startDate = event.start as Date;
                                  const endDate = event.end as Date;
                                  
                                  // Log dates for debugging
                                  if (process.env.NODE_ENV === 'development') {
                                    console.debug(`Event ${event.uid} - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}, Checkout: ${event.checkout ? (event.checkout as Date).toISOString() : 'Not provided'}`);
                                  }
                                  
                                  const isFirstDay = isSameDay(day, startDate);
                                  
                                  // Use checkout date from backend when available, otherwise calculate it
                                  const checkoutDate = (event.checkout as Date) || addDays(endDate, -1);
                                  const isLastDay = isSameDay(day, checkoutDate);
                                  const isWithinEvent = !isFirstDay && !isLastDay;
                                  
                                  // Bar color based on status
                                  let barColorClass = "bg-yellow-400"; // Default color
                                  
                                  // Status-based color coding
                                  if (event.status) {
                                    switch(event.status.toLowerCase()) {
                                      case 'confirmed':
                                        barColorClass = "bg-green-500";
                                        break;
                                      case 'tentative':
                                        barColorClass = "bg-amber-400";
                                        break;
                                      case 'cancelled':
                                      case 'canceled':
                                        barColorClass = "bg-red-500";
                                        break;
                                      case 'pending':
                                        barColorClass = "bg-blue-400";
                                        break;
                                      default:
                                        barColorClass = "bg-yellow-400";
                                    }
                                  }
                                  
                                  // Calculate positioning based on number of events
                                  const eventHeight = 20; // pixels
                                  const topPosition = eventIndex * (eventHeight + 2); // Add small gap between events
                                  
                                  if ((isWithinEvent || isFirstDay || isLastDay)) {
                                    // Handle one-day stays and regular stays differently
                                    if (isFirstDay && isLastDay) {
                                      // For one-day stays, we'll connect two dots side by side
                                      const leftDot = eventIndex % 2 === 0 ? '35%' : '65%';
                                      const rightDot = eventIndex % 2 === 0 ? '65%' : '35%';
                                      
                                      return (
                                        <div 
                                          key={`bar-${event.uid}-${eventIndex}`}
                                          className={`${barColorClass} absolute opacity-70 z-10 rounded-full shadow-sm`} 
                                          style={{
                                            top: `${topPosition + (eventHeight - 5) / 2}px`, // Center vertically with the dots
                                            left: leftDot,
                                            width: `calc(${rightDot} - ${leftDot} + 5px)`, // Connect the two dots (+5px for dot size)
                                            height: '6px', // Slightly thicker for better visibility
                                            transform: 'translateX(-50%)', // Adjust for dot center
                                          }}
                                        />
                                      );
                                    } else {
                                      // For multi-day stays
                                      const leftPosition = isFirstDay ? '50%' : '0%';
                                      const rightPosition = isLastDay ? '50%' : '0%';
                                      
                                      return (
                                        <div 
                                          key={`bar-${event.uid}-${eventIndex}`}
                                          className={`${barColorClass} absolute opacity-70 z-10 shadow-sm`} 
                                          style={{
                                            top: `${topPosition}px`,
                                            left: leftPosition,
                                            right: rightPosition,
                                            height: `${eventHeight}px`,
                                            borderRadius: isFirstDay ? '4px 0 0 4px' : // Round left corners for first day
                                                       isLastDay ? '0 4px 4px 0' : // Round right corners for last day
                                                       '0', // No rounding for middle days
                                            width: isFirstDay ? 'calc(50% + 1px)' : // From middle to end
                                                  isLastDay ? 'calc(50% + 1px)' : // From start to middle
                                                  '100%' // Full width for middle days
                                          }}
                                        />
                                      );
                                    }
                                  }
                                  return null;
                                })}
                                
                                {/* Then render dots on top of bars */}
                                {dayEvents.map((event, eventIndex) => {
                                  const isFirstDay = isSameDay(day, event.start as Date);
                                  // Use checkout date from backend when available, otherwise calculate it
                                  const checkoutDate = event.checkout as Date || addDays(event.end as Date, -1);
                                  const isLastDay = isSameDay(day, checkoutDate);
                                  
                                  // Color the dots based on status too
                                  let dotColorClass = "bg-blue-500"; // Default color
                                  
                                  // Status-based dot coloring to match the bar colors
                                  if (event.status) {
                                    switch(event.status.toLowerCase()) {
                                      case 'confirmed':
                                        dotColorClass = "bg-green-600";
                                        break;
                                      case 'tentative':
                                        dotColorClass = "bg-amber-500";
                                        break;
                                      case 'cancelled':
                                      case 'canceled':
                                        dotColorClass = "bg-red-600";
                                        break;
                                      case 'pending':
                                        dotColorClass = "bg-blue-500";
                                        break;
                                      default:
                                        dotColorClass = "bg-blue-500";
                                    }
                                  }
                                  
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
                                                className={`${dotColorClass} w-5 h-5 rounded-full opacity-85 absolute z-20 shadow-md border-2 border-white`}
                                                style={{
                                                  top: `${topPosition}px`,
                                                  left: isFirstDay && isLastDay ? 
                                                    (eventIndex % 2 === 0 ? '35%' : '65%') : // Offset for same-day check-in/out
                                                    '50%', // Regular check-in dot
                                                  transform: 'translate(-50%, 0)',
                                                  marginTop: `${(eventHeight - 5) / 2}px`, // Center the dot
                                                }}
                                              />
                                            )}
                                            
                                            {/* Check-out dot */}
                                            {isLastDay && !isFirstDay && (
                                              <div 
                                                className={`${dotColorClass} w-5 h-5 rounded-full opacity-85 absolute z-20 shadow-md border-2 border-white`}
                                                style={{
                                                  top: `${topPosition}px`,
                                                  left: '50%',
                                                  transform: 'translate(-50%, 0)',
                                                  marginTop: `${(eventHeight - 5) / 2}px`, // Center the dot
                                                }}
                                              />
                                            )}
                                            
                                            {/* For same-day check-in/check-out on the same reservation */}
                                            {isFirstDay && isLastDay && (
                                              <div 
                                                className={`${dotColorClass} w-5 h-5 rounded-full opacity-85 absolute z-20 shadow-md border-2 border-white`}
                                                style={{
                                                  top: `${topPosition}px`,
                                                  left: eventIndex % 2 === 0 ? '65%' : '35%', // Opposite dots for same-day stays
                                                  transform: 'translate(-50%, 0)',
                                                  marginTop: `${(eventHeight - 5) / 2}px`, // Center the dot
                                                }}
                                              />
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center" className="p-2 max-w-[250px]">
                                          <div>
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-xs">
                                              {format(event.start as Date, 'MMM d, yyyy')} - {format(
                                                event.checkout as Date || addDays(event.end as Date, -1), 
                                                'MMM d, yyyy'
                                              )}
                                            </p>
                                            
                                            {/* Duration calculation */}
                                            <p className="text-xs mt-1">
                                              Duration: {
                                                Math.ceil(
                                                  ((event.checkout as Date || addDays(event.end as Date, -1)).getTime() - (event.start as Date).getTime()) 
                                                  / (1000 * 60 * 60 * 24)
                                                ) + 1
                                              } {
                                                Math.ceil(
                                                  ((event.checkout as Date || addDays(event.end as Date, -1)).getTime() - (event.start as Date).getTime()) 
                                                  / (1000 * 60 * 60 * 24)
                                                ) + 1 === 1 ? 'day' : 'days'
                                              }
                                            </p>
                                            
                                            <p className="text-xs mt-1">ID: {event.uid.substring(0, 8)}...</p>
                                            
                                            {/* Enhanced status display */}
                                            {event.status && (
                                              <div className="mt-2 flex items-center">
                                                <div 
                                                  className={`w-3 h-3 rounded-full mr-1.5 ${
                                                    event.status.toLowerCase() === 'confirmed' ? 'bg-green-600' :
                                                    event.status.toLowerCase() === 'tentative' ? 'bg-amber-500' :
                                                    event.status.toLowerCase() === 'cancelled' || event.status.toLowerCase() === 'canceled' ? 'bg-red-600' :
                                                    event.status.toLowerCase() === 'pending' ? 'bg-blue-500' :
                                                    'bg-gray-400'
                                                  }`} 
                                                />
                                                <span className="text-xs font-medium capitalize">
                                                  {event.status}
                                                </span>
                                              </div>
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