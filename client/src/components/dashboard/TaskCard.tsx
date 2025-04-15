import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type TaskCardType = "cleaning" | "maintenance" | "inventory" | "urgent";

export interface TaskCardProps {
  type: TaskCardType;
  title: string;
  description?: string;
  date?: Date | string;
  time?: string;
  assignee?: {
    name: string;
    initials: string;
  };
  status?: string;
  priority?: string;
  onMarkComplete?: () => void;
  onViewDetails?: () => void;
}

export function TaskCard({
  type,
  title,
  description,
  date,
  time,
  assignee,
  status = "pending",
  priority,
  onMarkComplete,
  onViewDetails
}: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(status === "completed");
  
  const handleMarkComplete = () => {
    if (onMarkComplete) {
      onMarkComplete();
    }
    setIsCompleted(true);
  };
  
  // Get colors based on task type
  const getTypeStyles = () => {
    switch (type) {
      case "cleaning":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-700",
          badge: "bg-blue-100 text-blue-800"
        };
      case "maintenance":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-700",
          badge: "bg-orange-100 text-orange-800"
        };
      case "inventory":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-700",
          badge: "bg-green-100 text-green-800"
        };
      case "urgent":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          badge: "bg-red-100 text-red-800"
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-700",
          badge: "bg-gray-100 text-gray-800"
        };
    }
  };
  
  const typeStyles = getTypeStyles();
  
  return (
    <Card 
      className={cn(
        "border overflow-hidden transition-all", 
        typeStyles.border,
        isCompleted ? "opacity-60" : ""
      )}
    >
      <CardContent className={cn("p-0", typeStyles.bg)}>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Badge 
              variant="outline" 
              className={cn("capitalize font-medium", typeStyles.badge)}
            >
              {type}
            </Badge>
            {priority && (
              <Badge 
                variant={
                  priority === "high" || priority === "urgent" 
                    ? "destructive" 
                    : priority === "low" 
                      ? "outline" 
                      : "secondary"
                }
                className="ml-auto"
              >
                {priority}
              </Badge>
            )}
          </div>
          
          <h3 className={cn("font-semibold mb-1", typeStyles.text, 
            isCompleted ? "line-through" : "")}
          >
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-muted-foreground mb-3">
              {description}
            </p>
          )}
          
          <div className="flex flex-col space-y-2 text-sm">
            {date && (
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 mr-2" />
                <span>
                  {typeof date === 'string' 
                    ? date 
                    : format(date, 'MMM d, yyyy')}
                </span>
              </div>
            )}
            
            {time && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3.5 w-3.5 mr-2" />
                <span>{time}</span>
              </div>
            )}
            
            {assignee && (
              <div className="flex items-center text-muted-foreground">
                <User className="h-3.5 w-3.5 mr-2" />
                <span>{assignee.name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex border-t border-gray-100 divide-x divide-gray-100">
          {!isCompleted && onMarkComplete && (
            <Button 
              variant="ghost"
              className="flex-1 py-1.5 h-auto rounded-none text-xs font-medium"
              onClick={handleMarkComplete}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Mark Complete
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              variant="ghost"
              className="flex-1 py-1.5 h-auto rounded-none text-xs font-medium"
              onClick={onViewDetails}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskCard;