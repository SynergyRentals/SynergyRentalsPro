import React from 'react';
import { format, startOfWeek, addDays, isEqual, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Maintenance } from '@shared/schema';
import { Wrench, Check } from 'lucide-react';

interface CalendarViewProps {
  maintenance: Maintenance[];
  className?: string;
}

export function CalendarView({ maintenance, className }: CalendarViewProps) {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
  const daysOfWeek = Array.from({ length: 7 }, (_, index) => 
    addDays(startOfCurrentWeek, index)
  );

  // Get maintenance items for a specific day
  const getMaintenanceForDay = (date: Date) => {
    return maintenance.filter(item => {
      const createdAt = item.createdAt ? parseISO(item.createdAt.toString()) : null;
      return createdAt && isEqual(
        new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()),
        new Date(date.getFullYear(), date.getMonth(), date.getDate())
      );
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">7-Day Maintenance Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map((day, index) => (
            <div key={index} className="text-center">
              <div className={cn(
                "font-medium mb-1 text-xs rounded-md py-1",
                isEqual(
                  new Date(day.getFullYear(), day.getMonth(), day.getDate()),
                  new Date(today.getFullYear(), today.getMonth(), today.getDate())
                ) && "bg-blue-100 text-blue-800"
              )}>
                {format(day, 'EEE')}
                <div className="text-xs">{format(day, 'MMM d')}</div>
              </div>
              
              <div className="space-y-1">
                {getMaintenanceForDay(day).map((item, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "text-xs p-1 rounded truncate text-left",
                      item.status === "completed" ? "bg-green-50 border-l-2 border-green-500" :
                      item.status === "in-progress" ? "bg-blue-50 border-l-2 border-blue-500" :
                      item.priority === "urgent" ? "bg-red-50 border-l-2 border-red-500" :
                      item.priority === "high" ? "bg-orange-50 border-l-2 border-orange-500" :
                      "bg-gray-50 border-l-2 border-gray-500"
                    )}
                    title={item.description}
                  >
                    <div className="flex items-center">
                      {item.status === "completed" && <Check className="h-3 w-3 mr-1 text-green-600" />}
                      {item.status === "in-progress" && <Wrench className="h-3 w-3 mr-1 text-blue-600" />}
                      <span className="truncate">{item.description}</span>
                    </div>
                  </div>
                ))}
                
                {getMaintenanceForDay(day).length === 0 && (
                  <div className="text-xs text-gray-400 py-3">No events</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}