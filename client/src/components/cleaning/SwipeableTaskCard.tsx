import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ChevronRight } from "lucide-react";
import "./swipe-hints.css";

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  isActive?: boolean;
}

export function SwipeableTaskCard({
  children,
  className = "",
  onSwipeLeft,
  onSwipeRight,
  isActive = false,
}: SwipeableTaskCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="task-card-container"
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x > 100 && onSwipeRight) {
            // Swiped right
            onSwipeRight();
          } else if (info.offset.x < -100 && onSwipeLeft) {
            // Swiped left
            onSwipeLeft();
          }
        }}
        className="task-card-wrapper"
      >
        {/* Swipe hint indicators */}
        <div className="swipe-hint-left">
          <div className="flex flex-col items-center">
            <CheckCircle className="h-6 w-6" />
            <span className="swipe-hint-text">Check In</span>
          </div>
        </div>
        
        <div className="swipe-hint-right">
          <div className="flex flex-col items-center">
            <ChevronRight className="h-6 w-6" />
            <span className="swipe-hint-text">Details</span>
          </div>
        </div>
        
        {/* The actual card */}
        <Card className={`task-card ${isActive ? 'border-blue-500 bg-blue-50' : ''} ${className}`}>
          <CardContent className="p-4">
            {children}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}