import { useState } from 'react';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  date: number;
  type: 'cleaning' | 'maintenance' | 'inventory' | 'urgent';
  count?: number;
  label: string;
}

interface CalendarProps {
  month: string;
  year: number;
  events: CalendarEvent[];
  currentDay?: number;
}

export default function Calendar({ month, year, events, currentDay }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);
  
  // In a real app, these would change the actual displayed month
  const previousMonth = () => {
    // Implementation would go here
    console.log("Previous month");
  };
  
  const nextMonth = () => {
    // Implementation would go here
    console.log("Next month");
  };
  
  // Generate a simplified calendar for demo purposes
  // In a real app, this would be dynamically generated based on the month and year
  const weeks = [
    [
      { day: 30, isCurrentMonth: false },
      { day: 31, isCurrentMonth: false },
      { day: 1, isCurrentMonth: true },
      { day: 2, isCurrentMonth: true },
      { day: 3, isCurrentMonth: true },
      { day: 4, isCurrentMonth: true },
      { day: 5, isCurrentMonth: true },
    ],
    [
      { day: 6, isCurrentMonth: true },
      { day: 7, isCurrentMonth: true },
      { day: 8, isCurrentMonth: true },
      { day: 9, isCurrentMonth: true },
      { day: 10, isCurrentMonth: true },
      { day: 11, isCurrentMonth: true },
      { day: 12, isCurrentMonth: true },
    ],
    [
      { day: 13, isCurrentMonth: true },
      { day: 14, isCurrentMonth: true },
      { day: 15, isCurrentMonth: true },
      { day: 16, isCurrentMonth: true },
      { day: 17, isCurrentMonth: true },
      { day: 18, isCurrentMonth: true },
      { day: 19, isCurrentMonth: true },
    ],
  ];

  // Helper to get events for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter(event => event.date === day);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Schedule Calendar</h2>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={previousMonth}
            className="p-1.5 bg-[#F5F5F7] rounded text-[#2C2E3E]"
          >
            <ChevronLeft />
          </Button>
          <Button 
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="p-1.5 bg-[#F5F5F7] rounded text-[#2C2E3E]"
          >
            <ChevronRight />
          </Button>
          <div className="px-3 py-1.5 bg-[#F5F5F7] rounded text-[#2C2E3E] text-sm font-medium">
            {currentMonth} {currentYear}
          </div>
        </div>
      </div>
      
      {/* Calendar display */}
      <div className="border rounded-lg overflow-hidden">
        {/* Calendar header */}
        <div className="grid grid-cols-7 bg-[#F5F5F7] text-center py-2 border-b">
          <div className="text-xs font-medium text-[#2C2E3E]">Sun</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Mon</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Tue</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Wed</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Thu</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Fri</div>
          <div className="text-xs font-medium text-[#2C2E3E]">Sat</div>
        </div>
        
        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 text-sm">
            {week.map((day, dayIndex) => {
              const isToday = day.isCurrentMonth && day.day === currentDay;
              const dayEvents = getEventsForDay(day.day);
              
              return (
                <div 
                  key={dayIndex} 
                  className={`min-h-[80px] p-1 ${dayIndex < 6 ? 'border-r' : ''} border-b ${
                    isToday ? 'bg-[#FFCF45] bg-opacity-20 font-semibold' : ''
                  } ${day.isCurrentMonth ? 'text-[#2C2E3E]' : 'text-gray-400'}`}
                >
                  {day.day}
                  
                  {/* Events for this day */}
                  {dayEvents.map((event, eventIndex) => {
                    const eventColorMap = {
                      cleaning: 'bg-blue-500 bg-opacity-20 text-blue-500',
                      maintenance: 'bg-yellow-500 bg-opacity-20 text-yellow-500',
                      inventory: 'bg-green-500 bg-opacity-20 text-green-500',
                      urgent: 'bg-red-500 bg-opacity-20 text-red-500'
                    };
                    
                    return (
                      <div key={eventIndex} className={`mt-1 ${eventColorMap[event.type]} text-xs p-1 rounded`}>
                        {event.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
