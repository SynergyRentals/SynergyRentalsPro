import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, MapPin, Flag, ClipboardCheck, X } from 'lucide-react';

type Action = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
};

interface FloatingActionButtonProps {
  onTakePhoto?: () => void;
  onCheckIn?: () => void;
  onReportIssue?: () => void;
  onCompleteTask?: () => void;
}

export default function FloatingActionButton({
  onTakePhoto,
  onCheckIn,
  onReportIssue,
  onCompleteTask,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);
  
  const actions: Action[] = [
    {
      icon: <Camera className="h-5 w-5" />,
      label: 'Take Photo',
      onClick: () => {
        if (onTakePhoto) onTakePhoto();
        setIsOpen(false);
      },
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: 'Check In',
      onClick: () => {
        if (onCheckIn) onCheckIn();
        setIsOpen(false);
      },
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: <Flag className="h-5 w-5" />,
      label: 'Report Issue',
      onClick: () => {
        if (onReportIssue) onReportIssue();
        setIsOpen(false);
      },
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      icon: <ClipboardCheck className="h-5 w-5" />,
      label: 'Complete',
      onClick: () => {
        if (onCompleteTask) onCompleteTask();
        setIsOpen(false);
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col-reverse items-end space-y-2 space-y-reverse">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="flex flex-col-reverse gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                className={`flex items-center rounded-full ${action.color} text-white px-3 py-2 shadow-lg`}
                onClick={action.onClick}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">{action.label}</span>
                {action.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button
        className={`rounded-full ${isOpen ? 'bg-gray-700' : 'bg-primary'} text-white p-3 shadow-lg`}
        onClick={toggleOpen}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}