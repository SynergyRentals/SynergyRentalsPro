import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QrCodeScanner, CheckCircle, Assignment, ArrowUpward, ArrowBack, LocationOn } from "@mui/icons-material";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";

// QR code scanner component
const QRScanner = ({ onScan }: { onScan: (result: string) => void }) => {
  const [isScanning, setIsScanning] = useState(false);

  const startScanner = async () => {
    setIsScanning(true);
    // In a real implementation, we would use a library like 'react-qr-reader'
    // For this demo, we'll simulate a successful scan after a short delay
    setTimeout(() => {
      const mockQrResult = "property-" + Math.floor(Math.random() * 10 + 1);
      onScan(mockQrResult);
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center py-4">
      {isScanning ? (
        <div className="relative w-full max-w-xs h-64 bg-black/10 rounded-lg mb-4 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Scanning...</div>
          <div className="absolute inset-0 border-2 border-blue-500 rounded-lg"></div>
        </div>
      ) : (
        <Button 
          className="w-full max-w-xs bg-blue-600 hover:bg-blue-700" 
          size="lg"
          onClick={startScanner}
        >
          <QrCodeScanner className="mr-2 h-5 w-5" />
          Scan QR Code
        </Button>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Scan the QR code posted at the property entrance
      </p>
    </div>
  );
};

export default function MobileCleaningPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activePropertyId, setActivePropertyId] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState<number[]>([]);

  // Fetch cleaning tasks assigned to the current user
  const { data: cleaningTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/cleaning/assigned'],
    queryFn: async () => {
      const res = await fetch('/api/cleaning/assigned');
      if (!res.ok) throw new Error('Failed to fetch assigned tasks');
      return res.json();
    },
  });

  // Fetch cleaning checklist if a property is selected
  const { data: cleaningChecklist, isLoading: checklistLoading } = useQuery({
    queryKey: ['/api/cleaning/checklist', activePropertyId],
    queryFn: async () => {
      if (!activePropertyId) return null;
      const res = await fetch(`/api/cleaning/checklist/${activePropertyId}`);
      if (!res.ok) throw new Error('Failed to fetch checklist');
      return res.json();
    },
    enabled: !!activePropertyId,
  });

  // Complete cleaning task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest('POST', `/api/cleaning/complete/${taskId}`, {
        completedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/assigned'] });
      toast({
        title: 'Task Completed',
        description: 'The cleaning task has been marked as complete.',
      });
      setActivePropertyId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to complete task: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete a checklist item mutation
  const completeChecklistItemMutation = useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: number; itemId: number }) => {
      return await apiRequest('POST', `/api/cleaning/checklist-item/complete`, {
        cleaningTaskId: taskId,
        checklistItemId: itemId,
        completed: true,
        completedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cleaning/checklist', activePropertyId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update checklist item: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle QR code scanning
  const handleQRScan = (result: string) => {
    setShowQRScanner(false);
    // Extract property ID from QR code result
    // Format: "property-{id}"
    const propertyId = parseInt(result.split('-')[1]);
    
    if (isNaN(propertyId)) {
      toast({
        title: 'Invalid QR Code',
        description: 'The scanned QR code is not a valid property code.',
        variant: 'destructive',
      });
      return;
    }
    
    // Find matching cleaning task
    const matchingTask = cleaningTasks?.find((task: any) => task.unitId === propertyId);
    
    if (!matchingTask) {
      toast({
        title: 'No Assignment Found',
        description: 'You don\'t have a cleaning task assigned for this property.',
        variant: 'destructive',
      });
      return;
    }
    
    // Set active property
    setActivePropertyId(propertyId);
    toast({
      title: 'Check-in Successful',
      description: `You've checked in at ${matchingTask.unitName || 'Property #' + propertyId}`,
    });
  };

  // Toggle checklist item expansion
  const toggleChecklistExpanded = (itemId: number) => {
    if (checklistExpanded.includes(itemId)) {
      setChecklistExpanded(checklistExpanded.filter(id => id !== itemId));
    } else {
      setChecklistExpanded([...checklistExpanded, itemId]);
    }
  };

  // Mark a checklist item as complete
  const markChecklistItemComplete = (taskId: number, itemId: number) => {
    completeChecklistItemMutation.mutate({ taskId, itemId });
  };

  // Complete the entire cleaning task
  const completeTask = () => {
    if (!activePropertyId) return;
    
    // Find the task ID for the active property
    const task = cleaningTasks?.find((t: any) => t.unitId === activePropertyId);
    if (!task) return;
    
    completeTaskMutation.mutate(task.id);
  };

  if (tasksLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-md">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // If no active property selected, show task list
  if (!activePropertyId) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Cleaning Assignments</h1>
          <p className="text-gray-500">Your assigned cleaning tasks for today</p>
        </div>

        {showQRScanner ? (
          <div>
            <Button 
              variant="outline" 
              className="mb-4"
              onClick={() => setShowQRScanner(false)}
            >
              <ArrowBack className="mr-2 h-4 w-4" />
              Back to Tasks
            </Button>
            <QRScanner onScan={handleQRScan} />
          </div>
        ) : (
          <>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 mb-6" 
              size="lg"
              onClick={() => setShowQRScanner(true)}
            >
              <QrCodeScanner className="mr-2 h-5 w-5" />
              Check In With QR Code
            </Button>

            <div className="space-y-4">
              {cleaningTasks && cleaningTasks.length > 0 ? (
                cleaningTasks.map((task: any) => (
                  <Card key={task.id} className={`overflow-hidden ${task.priority === 'urgent' ? 'border-red-400' : ''}`}>
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{task.unitName || `Property #${task.unitId}`}</h3>
                          <Badge className={
                            task.priority === 'urgent' 
                              ? 'bg-red-100 text-red-800 border-0' 
                              : 'bg-blue-100 text-blue-800 border-0'
                          }>
                            {task.priority === 'urgent' ? 'Urgent' : 'Standard'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <LocationOn className="h-4 w-4 mr-1" />
                          <span>{task.unitAddress || 'No address available'}</span>
                        </div>
                        
                        <div className="text-sm mb-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Scheduled for:</span>
                            <span className="font-medium">
                              {task.scheduledFor 
                                ? format(new Date(task.scheduledFor), 'MMM dd, h:mm a') 
                                : 'Not scheduled'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Checkout:</span>
                            <span className="font-medium">
                              {task.checkoutTime || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={() => setActivePropertyId(task.unitId)}
                        >
                          <Assignment className="mr-2 h-4 w-4" />
                          Start Cleaning
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No cleaning tasks assigned to you today</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // If active property is selected, show cleaning checklist
  return (
    <div className="container mx-auto py-6 px-4 max-w-md">
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={() => setActivePropertyId(null)}
      >
        <ArrowBack className="mr-2 h-4 w-4" />
        Back to Tasks
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {cleaningTasks?.find((t: any) => t.unitId === activePropertyId)?.unitName || `Property #${activePropertyId}`}
        </h1>
        <p className="text-gray-500">Cleaning checklist</p>
      </div>

      {checklistLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : cleaningChecklist && cleaningChecklist.items && cleaningChecklist.items.length > 0 ? (
        <div className="space-y-4 mb-6">
          {cleaningChecklist.items.map((item: any) => (
            <Card key={item.id} className={`${item.completed ? 'bg-gray-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className={`rounded-full p-1 mr-2 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}
                      onClick={() => {
                        const task = cleaningTasks?.find((t: any) => t.unitId === activePropertyId);
                        if (task) markChecklistItemComplete(task.id, item.id);
                      }}
                    >
                      <CheckCircle className="h-6 w-6" />
                    </Button>
                    <div>
                      <h3 className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                        {item.description}
                      </h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {item.room}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2 p-1" 
                    onClick={() => toggleChecklistExpanded(item.id)}
                  >
                    <ArrowUpward className={`h-4 w-4 transition-transform ${checklistExpanded.includes(item.id) ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                
                {checklistExpanded.includes(item.id) && (
                  <div className="mt-3 pl-8 text-sm text-gray-600">
                    {item.notes ? (
                      <p className="italic">{item.notes}</p>
                    ) : (
                      <p className="italic">No additional notes for this task.</p>
                    )}
                    
                    {item.requiresPhoto && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Take Photo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <p className="text-gray-500">No checklist items found for this property</p>
        </div>
      )}

      <Button 
        className="w-full bg-green-600 hover:bg-green-700" 
        size="lg"
        onClick={completeTask}
        disabled={completeTaskMutation.isPending}
      >
        {completeTaskMutation.isPending ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Mark Cleaning Complete
          </>
        )}
      </Button>
    </div>
  );
}