import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrReader } from "@/components/ui/qr-scanner";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Home, CheckCircle, Clock, Camera, Wrench, ClipboardList, User, 
  AlertTriangle, Flag, UploadCloud, X, Loader2 
} from "lucide-react";
import { format } from "date-fns";

// Define types for our cleaning tasks and checklists
interface CleaningTask {
  id: number;
  unitId: number;
  status: string;
  scheduledFor: Date;
  assignedTo: number | null;
  assignedBy: number | null;
  completedAt: Date | null;
  verifiedAt: Date | null;
  verifiedBy: number | null;
  cleaningType: string;
  estimatedDuration: number;
  actualDuration: number | null;
  notes: string | null;
  photos: string[] | null;
  checklistTemplateId: number | null;
  score: number | null;
  isInspection: boolean;
  createdAt: Date;
}

interface ChecklistItem {
  id: number;
  checklistId: number;
  description: string;
  room: string;
  order: number;
  requiresPhoto: boolean | null;
  isRequired: boolean | null;
  notes: string | null;
  completed?: boolean;
}

interface ChecklistCompletion {
  id: number;
  cleaningTaskId: number;
  checklistItemId: number;
  completed: boolean;
  completedAt: Date | null;
  completedBy: number | null;
  notes: string | null;
  photoUrl: string | null;
}

interface CleaningFlag {
  id: number;
  cleaningTaskId: number;
  reportedBy: number;
  assignedTo: number | null;
  status: string;
  priority: string;
  flagType: string;
  description: string;
  photos: string[] | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: number | null;
  escalatedTo: string | null;
  resolution: string | null;
}

interface Unit {
  id: number;
  name: string;
  address: string;
  notes: string | null;
  leaseUrl: string | null;
  wifiInfo: string | null;
  tags: string[] | null;
  active: boolean;
}

interface CleaningFlag {
  id: number;
  cleaningTaskId: number;
  reportedBy: number;
  assignedTo: number | null;
  status: string;
  priority: string;
  flagType: string;
  description: string;
  photos: string[] | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: number | null;
  escalatedTo: string | null;
  resolution: string | null;
}

export default function MobileCleaningPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assigned");
  const [scanning, setScanning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagDescription, setFlagDescription] = useState("");
  const [flagType, setFlagType] = useState("cleanliness");
  const [flagPriority, setFlagPriority] = useState("medium");

  // Fetch assigned cleaning tasks
  const { 
    data: cleaningTasksData, 
    isLoading: isTasksLoading, 
    error: tasksError 
  } = useQuery({
    queryKey: ["/api/cleaning/assigned"],
    queryFn: async () => {
      const response = await fetch("/api/cleaning/assigned");
      if (!response.ok) {
        throw new Error("Failed to fetch assigned cleaning tasks");
      }
      return response.json();
    },
  });

  // Fetch checklist for a specific unit
  const { 
    data: checklistData, 
    isLoading: isChecklistLoading, 
    error: checklistError 
  } = useQuery({
    queryKey: ["/api/cleaning/checklist", selectedTaskId],
    queryFn: async () => {
      if (!selectedTaskId) return null;
      const response = await fetch(`/api/cleaning/checklist/${selectedTaskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cleaning checklist");
      }
      return response.json();
    },
    enabled: !!selectedTaskId, // Only run query if taskId is selected
  });

  // Mutation to mark a checklist item as complete
  const completeItemMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      itemId, 
      completed, 
      notes 
    }: { 
      taskId: number; 
      itemId: number; 
      completed: boolean; 
      notes: string; 
    }) => {
      const res = await apiRequest("POST", "/api/cleaning/checklist-item/complete", {
        taskId,
        itemId,
        completed,
        notes,
        completedBy: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch checklist data
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/checklist", selectedTaskId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing checklist item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to mark a task as complete
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: number }) => {
      const res = await apiRequest("POST", `/api/cleaning/complete/${taskId}`, {
        completedBy: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch tasks data
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/assigned"] });
      toast({
        title: "Success!",
        description: "Cleaning task marked as complete",
      });
      setSelectedTaskId(null); // Go back to task list
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to create a cleaning flag
  const createFlagMutation = useMutation({
    mutationFn: async (data: {
      cleaningTaskId: number;
      flagType: string;
      priority: string;
      description: string;
    }) => {
      const res = await apiRequest("POST", "/api/cleaning/flags", {
        ...data,
        reportedBy: user?.id,
        status: "open",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Flag Reported",
        description: "Cleaning issue has been reported successfully",
      });
      setFlagDialogOpen(false);
      setFlagDescription("");
      
      // Invalidate and refetch tasks data
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/assigned"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Reporting Flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle QR code scan result
  const handleScanResult = (result: string) => {
    try {
      // Expected format: "synergy-rentals:unit:123"
      const parts = result.split(":");
      if (parts[0] === "synergy-rentals" && parts[1] === "unit") {
        const unitId = parseInt(parts[2], 10);
        
        // Find the task for this unit
        const matchingTask = cleaningTasksData?.tasks.find(
          (task: CleaningTask) => task.unitId === unitId && task.status === "scheduled"
        );
        
        if (matchingTask) {
          setSelectedTaskId(matchingTask.id);
          toast({
            title: "Unit Identified",
            description: `Starting cleaning for unit #${unitId}`,
          });
        } else {
          toast({
            title: "No Task Found",
            description: "No scheduled cleaning task found for this unit",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not for a Synergy Rentals unit",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Scanning QR Code",
        description: "Could not process the scanned QR code",
        variant: "destructive",
      });
    }
    
    setScanning(false);
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    if (!checklistData?.items || checklistData.items.length === 0) return 0;
    
    const totalItems = checklistData.items.length;
    const completedCount = checklistData.items.filter(
      (item: ChecklistItem & { completion?: ChecklistCompletion }) => 
        item.completion?.completed || completedItems[item.id]
    ).length;
    
    return Math.round((completedCount / totalItems) * 100);
  };

  // Handle checklist item completion toggle
  const handleItemToggle = (itemId: number, checked: boolean) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
    
    // Submit the completion immediately
    if (selectedTaskId) {
      completeItemMutation.mutate({
        taskId: selectedTaskId,
        itemId,
        completed: checked,
        notes: notes[itemId] || ""
      });
    }
  };

  // Handle notes change for an item
  const handleNotesChange = (itemId: number, text: string) => {
    setNotes(prev => ({
      ...prev,
      [itemId]: text
    }));
  };

  // Handle task completion button
  const handleCompleteTask = () => {
    if (selectedTaskId) {
      // Check if all required items are completed
      const requiredItems = checklistData?.items.filter(
        (item: ChecklistItem) => item.isRequired
      );
      
      const allRequiredCompleted = requiredItems?.every(
        (item: ChecklistItem & { completion?: ChecklistCompletion }) => 
          item.completion?.completed || completedItems[item.id]
      );
      
      if (!allRequiredCompleted) {
        toast({
          title: "Cannot Complete Task",
          description: "All required checklist items must be completed first",
          variant: "destructive",
        });
        return;
      }
      
      completeTaskMutation.mutate({ taskId: selectedTaskId });
    }
  };

  // Console debug helper
  useEffect(() => {
    console.log("Cleaning Tasks Response:", cleaningTasksData);
  }, [cleaningTasksData]);

  // Reset states when changing task
  useEffect(() => {
    if (selectedTaskId) {
      setCompletedItems({});
      setNotes({});
    }
  }, [selectedTaskId]);

  // Main render
  if (isTasksLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Loading your cleaning tasks...</p>
        </div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Error loading tasks</AlertTitle>
          <AlertDescription>
            {tasksError instanceof Error ? tasksError.message : "An unknown error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const tasks = cleaningTasksData?.tasks || [];

  // If a task is selected, show the checklist
  if (selectedTaskId) {
    const selectedTask = tasks.find((task: CleaningTask) => task.id === selectedTaskId);
    
    return (
      <div className="container max-w-md mx-auto py-4 px-4">
        <div className="flex items-center mb-4 gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedTaskId(null)}>
            <Home className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            Cleaning Task #{selectedTaskId}
          </h1>
        </div>
        
        {selectedTask && (
          <Card className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{`Unit #${selectedTask.unitId}`}</CardTitle>
                  <CardDescription>
                    Scheduled: {format(new Date(selectedTask.scheduledFor), "MMM d, yyyy h:mm a")}
                  </CardDescription>
                </div>
                <Badge variant={selectedTask.cleaningType === "deep-clean" ? "destructive" : "default"}>
                  {selectedTask.cleaningType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm">Completion:</p>
                <p className="text-sm font-bold">{calculateCompletion()}%</p>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: `${calculateCompletion()}%` }}
                ></div>
              </div>
              {selectedTask.notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm">{selectedTask.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {isChecklistLoading ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2">Loading checklist...</p>
          </div>
        ) : checklistError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error loading checklist</AlertTitle>
            <AlertDescription>
              {checklistError instanceof Error ? checklistError.message : "An unknown error occurred"}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-230px)]">
              {checklistData?.items?.length > 0 ? (
                checklistData.items
                  .sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
                  .reduce((acc: Record<string, ChecklistItem[]>, item: ChecklistItem) => {
                    if (!acc[item.room]) {
                      acc[item.room] = [];
                    }
                    acc[item.room].push(item);
                    return acc;
                  }, {})
                  .map((roomGroup: Record<string, ChecklistItem[]>) => {
                    const roomName = Object.keys(roomGroup)[0];
                    const items = roomGroup[roomName];
                    
                    return (
                      <div key={roomName} className="mb-6">
                        <h3 className="font-medium text-lg mb-2">{roomName}</h3>
                        {items.map((item: ChecklistItem & { completion?: ChecklistCompletion }) => {
                          const isCompleted = item.completion?.completed || completedItems[item.id] || false;
                          
                          return (
                            <Card key={item.id} className={`mb-3 ${isCompleted ? "border-primary" : ""}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-2">
                                  <Checkbox 
                                    id={`item-${item.id}`}
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => handleItemToggle(item.id, checked === true)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={`item-${item.id}`}
                                      className={`${isCompleted ? "line-through text-muted-foreground" : ""} ${item.isRequired ? "font-medium" : ""}`}
                                    >
                                      {item.description}
                                      {item.isRequired && <span className="text-destructive ml-1">*</span>}
                                    </Label>
                                    
                                    {(isCompleted || notes[item.id]) && (
                                      <Textarea
                                        placeholder="Add notes (optional)"
                                        className="mt-2 min-h-[70px]"
                                        value={notes[item.id] || item.completion?.notes || ""}
                                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                      />
                                    )}
                                    
                                    {item.requiresPhoto && (
                                      <div className="mt-2 flex justify-end">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="flex items-center gap-1 text-xs"
                                          disabled={!isCompleted}
                                        >
                                          <Camera className="h-3 w-3" />
                                          Add Photo
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No checklist items found for this unit</p>
                </div>
              )}
            </ScrollArea>
            
            <div className="mt-4 sticky bottom-0 bg-background pb-4 pt-2 border-t">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCompleteTask}
                disabled={completeTaskMutation.isPending || calculateCompletion() < 100}
              >
                {completeTaskMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Cleaning Complete
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // QR Code Scanner view
  if (scanning) {
    return (
      <div className="container max-w-md mx-auto py-4 px-4">
        <Button 
          variant="outline" 
          className="mb-4" 
          onClick={() => setScanning(false)}
        >
          Cancel Scanning
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Scan Unit QR Code</CardTitle>
            <CardDescription>
              Scan the QR code posted at the unit entrance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QrReader
              onResult={handleScanResult}
              constraints={{ facingMode: "environment" }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default view: list of tasks
  return (
    <div className="container max-w-md mx-auto py-4 px-4">
      <h1 className="text-2xl font-bold mb-6">Cleaning Tasks</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assigned">
          {tasks.filter((task: CleaningTask) => task.status === "scheduled").length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No assigned cleaning tasks</p>
              </CardContent>
            </Card>
          ) : (
            tasks
              .filter((task: CleaningTask) => task.status === "scheduled")
              .map((task: CleaningTask) => (
                <Card key={task.id} className="mb-4">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{`Unit #${task.unitId}`}</CardTitle>
                      <Badge variant={task.cleaningType === "deep-clean" ? "destructive" : "default"}>
                        {task.cleaningType}
                      </Badge>
                    </div>
                    <CardDescription>
                      Scheduled for: {format(new Date(task.scheduledFor), "MMM d, yyyy h:mm a")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {task.notes && <p className="text-sm mb-2">{task.notes}</p>}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Estimated time: {task.estimatedDuration} mins</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setScanning(true)}
                    >
                      Scan QR
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      Start Cleaning
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="text-amber-500 hover:text-amber-600"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setFlagDialogOpen(true);
                      }}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {tasks.filter((task: CleaningTask) => task.status === "completed").length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No completed cleaning tasks</p>
              </CardContent>
            </Card>
          ) : (
            tasks
              .filter((task: CleaningTask) => task.status === "completed")
              .sort((a: CleaningTask, b: CleaningTask) => 
                new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
              )
              .map((task: CleaningTask) => (
                <Card key={task.id} className="mb-4">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{`Unit #${task.unitId}`}</CardTitle>
                      <Badge variant="success">Completed</Badge>
                    </div>
                    <CardDescription>
                      Completed: {task.completedAt ? format(new Date(task.completedAt), "MMM d, yyyy h:mm a") : "N/A"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Duration: {task.actualDuration || task.estimatedDuration} mins
                      </span>
                    </div>
                    {task.score && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Score: {task.score}/100</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-amber-500 hover:text-amber-600 flex items-center gap-1"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setFlagDialogOpen(true);
                      }}
                    >
                      <Flag className="h-4 w-4" />
                      Report Issue
                    </Button>
                  </CardFooter>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Cleaning Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="flag-type">Issue Type</Label>
              <select
                id="flag-type"
                className="w-full p-2 border rounded-md"
                value={flagType}
                onChange={e => setFlagType(e.target.value)}
              >
                <option value="cleanliness">Cleanliness Issue</option>
                <option value="damage">Damage or Breakage</option>
                <option value="missing">Missing Item</option>
                <option value="maintenance">Maintenance Needed</option>
                <option value="other">Other Issue</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="flag-priority">Priority</Label>
              <select
                id="flag-priority"
                className="w-full p-2 border rounded-md"
                value={flagPriority}
                onChange={e => setFlagPriority(e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="flag-description">Description</Label>
              <Textarea
                id="flag-description"
                placeholder="Describe the issue in detail"
                className="min-h-[100px]"
                value={flagDescription}
                onChange={e => setFlagDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFlagDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!selectedTaskId) {
                  toast({
                    title: "Error",
                    description: "No task selected",
                    variant: "destructive",
                  });
                  return;
                }
                if (!flagDescription.trim()) {
                  toast({
                    title: "Error",
                    description: "Please describe the issue",
                    variant: "destructive",
                  });
                  return;
                }
                createFlagMutation.mutate({
                  cleaningTaskId: selectedTaskId,
                  flagType,
                  priority: flagPriority,
                  description: flagDescription,
                });
              }}
              disabled={createFlagMutation.isPending}
            >
              {createFlagMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}