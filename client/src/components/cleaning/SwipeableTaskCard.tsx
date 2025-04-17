import React, { useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, MapPin, Clock, CheckCircle2, AlertTriangle, Repeat } from 'lucide-react';
import './swipe-hints.css';

interface SwipeableTaskCardProps {
  task: any;
  onViewDetails: () => void;
  onComplete: () => void;
  onFlag: () => void;
  onReschedule: () => void;
  getUnitName: (unitId: number) => string;
  formatDate: (dateString: string | null | undefined) => string;
  getPriorityBadge: (priority: string | null | undefined) => React.ReactNode;
  isActive?: boolean;
}

export default function SwipeableTaskCard({
  task,
  onViewDetails,
  onComplete,
  onFlag,
  onReschedule,
  getUnitName,
  formatDate,
  getPriorityBadge,
  isActive = true,
}: SwipeableTaskCardProps) {
  const controls = useAnimation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const DRAG_THRESHOLD = 100; // Minimum drag distance to trigger action
  
  const resetPosition = () => {
    controls.start({ x: 0 });
    setSwipeDirection(null);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > DRAG_THRESHOLD) {
      setSwipeDirection("right");
      // Swiped right to complete task
      controls.start({ x: "100%", opacity: 0 }).then(() => {
        resetPosition();
        onComplete();
      });
    } else if (info.offset.x < -DRAG_THRESHOLD) {
      setSwipeDirection("left");
      // Swiped left to flag issue
      controls.start({ x: "-100%", opacity: 0 }).then(() => {
        resetPosition();
        onFlag();
      });
    } else {
      // Not enough to trigger action, reset position
      resetPosition();
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Update visual feedback based on drag distance
    if (info.offset.x > 50) {
      setSwipeDirection("right");
    } else if (info.offset.x < -50) {
      setSwipeDirection("left");
    } else {
      setSwipeDirection(null);
    }
  };

  return (
    <div className="swipe-container mb-3 relative">
      {/* Left action indicator (Flag Issue) */}
      <div 
        className={`swipe-action-indicator swipe-action-left ${swipeDirection === "left" ? "opacity-70" : "opacity-0"}`}
      >
        <div className="flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Flag Issue
        </div>
      </div>
      
      {/* Right action indicator (Complete Task) */}
      <div 
        className={`swipe-action-indicator swipe-action-right ${swipeDirection === "right" ? "opacity-70" : "opacity-0"}`}
      >
        <div className="flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Complete
        </div>
      </div>
      
      {/* Swipe hints */}
      <div className="swipe-hint-left"></div>
      <div className="swipe-hint-right"></div>
      
      {/* The actual card */}
      <motion.div
        ref={cardRef}
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ scale: 0.98 }}
        className={task.priority === "urgent" ? "pulse-urgent" : ""}
      >
        <Card 
          className={`relative border-l-4 ${
            task.status === "in-progress" 
              ? "border-l-blue-500" 
              : task.priority === "urgent" 
                ? "border-l-red-500" 
                : task.priority === "high" 
                  ? "border-l-orange-500" 
                  : "border-l-gray-300"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  {getPriorityBadge(task.priority)}
                  <h3 className="text-base font-medium">{getUnitName(task.unitId)}</h3>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                  <span className="truncate max-w-[200px]">
                    {task.notes || "No additional details"}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <Clock className="h-3 w-3 mr-1 text-gray-400" />
                  <span>{formatDate(task.scheduledFor)}</span>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {task.cleaningType || "Standard"}
                  </Badge>
                  
                  {task.hasFlaggedIssues && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Issues
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails();
                  }}
                  className="text-gray-500"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                
                {task.status !== "completed" && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onReschedule();
                    }}
                    className="text-gray-500"
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};