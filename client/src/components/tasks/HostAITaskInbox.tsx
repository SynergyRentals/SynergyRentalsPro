import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import the SchedulingCard component
import { SchedulingCard } from "@/components/tasks/SchedulingCard";

type HostAITask = {
  id: number;
  hostAiAction: string;
  description: string;
  status: string;
  guestName: string;
  listingName: string;
  guestEmail?: string;
  guestPhone?: string;
  hostAiCreatedAt?: Date;
  createdAt: Date;
  // Additional properties may exist
};

type TaskSelection = {
  urgency: string | null;
  team: string | null;
};

type HostAITaskInboxProps = {
  autopilotEnabled?: boolean;
};

export function HostAITaskInbox({ autopilotEnabled = false }: HostAITaskInboxProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Store the selection state for each task
  const [taskSelections, setTaskSelections] = useState<Record<number, TaskSelection>>({});
  
  // Track which tasks are flipped to the scheduling view
  const [flippedTasks, setFlippedTasks] = useState<Record<number, boolean>>({});
  
  // Fetch HostAI tasks that are unprocessed (status === "new")
  const {
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/hostai/tasks"],
    select: (data) => {
      // Filter to only show unprocessed tasks
      return Array.isArray(data) 
        ? data.filter((task: HostAITask) => task.status === "new")
        : [];
    }
  });

  // Create a task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (values: any) => {
      const response = await apiRequest("POST", "/api/project-tasks", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "The task has been routed successfully",
      });
      // Invalidate tasks query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/hostai/tasks"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Mark HostAI task as processed mutation
  const updateHostAiTaskMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/hostai/tasks/${id}`, { status, notes });
      return response.json();
    },
    onSuccess: () => {
      // Refresh the tasks list
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Handle urgency selection for a task
  const handleUrgencySelect = (taskId: number, urgency: string) => {
    setTaskSelections(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        urgency
      }
    }));
  };

  // Handle team selection for a task
  const handleTeamSelect = (taskId: number, team: string) => {
    setTaskSelections(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        team
      }
    }));
  };

  // Watch a task for future recurring issues
  const handleWatchTask = async (task: HostAITask) => {
    if (!user) return;
    
    try {
      await updateHostAiTaskMutation.mutateAsync({
        id: task.id,
        status: "watched",
        notes: `Task watched by ${user.name} (${user.username}) for potential recurring issues at listing: ${task.listingName}`
      });
      
      toast({
        title: "Task watched",
        description: "This task is now being watched. If similar issues occur at this listing, they'll be bundled together.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark task as watched",
        variant: "destructive",
      });
    }
  };
  
  // Close a task without further action
  const handleCloseTask = async (task: HostAITask) => {
    if (!user) return;
    
    try {
      await updateHostAiTaskMutation.mutateAsync({
        id: task.id,
        status: "closed",
        notes: `Task closed by ${user.name} (${user.username}) - No action needed`
      });
      
      toast({
        title: "Task closed",
        description: "The task has been marked as closed.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to close task",
        variant: "destructive",
      });
    }
  };

  // Submit the task: create a project task and mark the HostAI task as processed
  const handleSubmitTask = async (task: HostAITask) => {
    if (!user) return;
    
    const selection = taskSelections[task.id];
    
    if (!selection || !selection.urgency || !selection.team) {
      toast({
        title: "Incomplete selection",
        description: "Please select both urgency and team before submitting",
        variant: "destructive",
      });
      return;
    }

    // Map team selection to task type
    const taskTypeMap: Record<string, string> = {
      "cleaning": "Cleaning",
      "maintenance": "Maintenance",
      "internal": "Admin",
      "vendor": "Vendor",
    };

    // Map urgency to priority
    const priorityMap: Record<string, string> = {
      "high": "urgent",
      "medium": "high",
      "low": "normal",
    };

    try {
      // Create a new project task with the data from HostAI task
      await createTaskMutation.mutateAsync({
        description: task.description,
        taskType: taskTypeMap[selection.team] || "General",
        priority: priorityMap[selection.urgency] || "normal",
        // Use unit ID if we have a mapping from listingName to unitId
        // unitId: null, // This would need to be implemented based on property/listing mapping
        status: "pending",
        createdBy: user.id,
        notes: `Task from HostAI for guest: ${task.guestName}. Original listing: ${task.listingName}`,
      });

      // Mark the HostAI task as processed
      await updateHostAiTaskMutation.mutateAsync({
        id: task.id,
        status: "processed",
        notes: `Task processed by ${user.name} and assigned to ${selection.team} team with ${selection.urgency} urgency`
      });

      // Clear the selection for this task
      setTaskSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[task.id];
        return newSelections;
      });

      toast({
        title: "Task processed",
        description: "The task has been routed to the appropriate team",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to process task",
        variant: "destructive",
      });
    }
  };

  // Check if both urgency and team are selected for a task
  const isTaskSelectionComplete = (taskId: number) => {
    const selection = taskSelections[taskId];
    return selection && selection.urgency && selection.team;
  };
  
  // Handle the "Continue to Schedule" action which flips the card
  const handleContinueToSchedule = (taskId: number) => {
    if (isTaskSelectionComplete(taskId)) {
      setFlippedTasks(prev => ({
        ...prev,
        [taskId]: true
      }));
    } else {
      toast({
        title: "Incomplete selection",
        description: "Please select both urgency and team before continuing",
        variant: "destructive",
      });
    }
  };
  
  // Handle canceling the scheduling and flipping back to task selection
  const handleCancelScheduling = (taskId: number) => {
    setFlippedTasks(prev => ({
      ...prev,
      [taskId]: false
    }));
  };
  
  // Handle completion of scheduling
  const handleTaskScheduled = (taskId: number) => {
    // This will be called by the SchedulingCard component when a task is successfully scheduled
    // Refresh the tasks to remove the processed one
    refetch();
  };

  // Get AI suggestion for a task
  // In Phase 2, this would use actual AI-based suggestions
  const getAiSuggestion = (task: HostAITask) => {
    // For demonstration, return some mock suggestions based on simple rules
    // In a real implementation, this would call an API or use a more sophisticated algorithm
    
    // Very simplified logic for demonstration purposes:
    let urgency = "medium";
    let team = "maintenance";
    
    if (task.description.toLowerCase().includes("water") || 
        task.description.toLowerCase().includes("leak") ||
        task.description.toLowerCase().includes("electricity") ||
        task.description.toLowerCase().includes("power") ||
        task.description.toLowerCase().includes("wifi")) {
      urgency = "high";
      team = "maintenance";
    } else if (task.description.toLowerCase().includes("clean") ||
               task.description.toLowerCase().includes("towel") ||
               task.description.toLowerCase().includes("linen") ||
               task.description.toLowerCase().includes("garbage") ||
               task.description.toLowerCase().includes("trash")) {
      urgency = "medium";
      team = "cleaning";
    } else if (task.description.toLowerCase().includes("owner") ||
               task.description.toLowerCase().includes("manager") ||
               task.description.toLowerCase().includes("landlord")) {
      team = "vendor";
    }
    
    return { urgency, team };
  };

  // Check if there are any unprocessed tasks
  const hasUnprocessedTasks = tasks && tasks.length > 0;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full rounded-md" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-16 rounded-md" />
                  <Skeleton className="h-10 w-16 rounded-md" />
                  <Skeleton className="h-10 w-16 rounded-md" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-24 rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-32 rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 border border-red-300 rounded-md bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h4 className="text-red-600 font-medium mt-2">Error</h4>
          <p className="text-red-600 text-sm mt-1">
            There was an error loading the HostAI tasks. Please try again.
          </p>
        </div>
      ) : !hasUnprocessedTasks ? (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <h3 className="text-lg font-medium">No unprocessed tasks</h3>
            <p className="text-muted-foreground mt-2">
              {autopilotEnabled 
                ? "Autopilot Mode is active. Tasks with high confidence scores are being processed automatically. Check the logs in Settings to review automated decisions."
                : "There are no new HostAI tasks that need processing at this time. Check back later or refresh to see new tasks."}
            </p>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              className="mt-4"
            >
              Refresh
            </Button>
            {autopilotEnabled && (
              <Button 
                onClick={() => window.location.href = "/projects-tasks/hostai-inbox/settings"}
                variant="link" 
                className="mt-4 ml-2"
              >
                View Autopilot Logs
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((task: HostAITask) => {
            // Get the AI suggestion for this task
            const aiSuggestion = getAiSuggestion(task);
            
            // Is this task flipped to show the scheduling view?
            const isFlipped = flippedTasks[task.id];
            const selection = taskSelections[task.id] || { urgency: null, team: null };
            
            // If the task is flipped and we have complete selection, show scheduling card
            if (isFlipped && isTaskSelectionComplete(task.id)) {
              return (
                <motion.div
                  key={task.id}
                  initial={{ rotateY: -90 }}
                  animate={{ rotateY: 0 }}
                  exit={{ rotateY: 90 }}
                  transition={{ duration: 0.4 }}
                >
                  <SchedulingCard
                    task={task}
                    selection={selection as { urgency: string, team: string }}
                    onCancel={() => handleCancelScheduling(task.id)}
                    onScheduled={handleTaskScheduled}
                  />
                </motion.div>
              );
            }
            
            // Otherwise show the default task card for selection
            return (
              <motion.div
                key={task.id}
                initial={isFlipped === false ? { rotateY: 90 } : false}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="overflow-hidden border-l-4 border-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{task.listingName}</CardTitle>
                        <CardDescription className="flex items-center space-x-2">
                          <span>{task.guestName}</span>
                          {task.hostAiCreatedAt && (
                            <span>• {format(new Date(task.hostAiCreatedAt), "MMM d–d")}</span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50">
                        New Task
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{task.description.split('.')[0]}</h4>
                      <p className="text-muted-foreground mt-1">{task.description}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Urgency Level:</p>
                        <ToggleGroup type="single" variant="outline" className="justify-start" 
                          value={taskSelections[task.id]?.urgency || ""}
                          onValueChange={(value) => value && handleUrgencySelect(task.id, value)}
                        >
                          <ToggleGroupItem value="high" className="text-red-700 data-[state=on]:bg-red-100">
                            High
                          </ToggleGroupItem>
                          <ToggleGroupItem value="medium" className="text-amber-700 data-[state=on]:bg-amber-100">
                            Medium
                          </ToggleGroupItem>
                          <ToggleGroupItem value="low" className="text-green-700 data-[state=on]:bg-green-100">
                            Low
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Route To:</p>
                        <ToggleGroup type="single" variant="outline" className="justify-start" 
                          value={taskSelections[task.id]?.team || ""}
                          onValueChange={(value) => value && handleTeamSelect(task.id, value)}
                        >
                          <ToggleGroupItem value="cleaning" className="data-[state=on]:bg-blue-100">
                            Cleaning Team
                          </ToggleGroupItem>
                          <ToggleGroupItem value="maintenance" className="data-[state=on]:bg-blue-100">
                            Maintenance Team
                          </ToggleGroupItem>
                          <ToggleGroupItem value="internal" className="data-[state=on]:bg-blue-100">
                            Internal Team
                          </ToggleGroupItem>
                          <ToggleGroupItem value="vendor" className="data-[state=on]:bg-blue-100">
                            Vendor / Landlord
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <p className="text-sm text-muted-foreground italic">
                        Suggested: {aiSuggestion.urgency.charAt(0).toUpperCase() + aiSuggestion.urgency.slice(1)} • {
                          aiSuggestion.team === "cleaning" ? "Cleaning Team" :
                          aiSuggestion.team === "maintenance" ? "Maintenance Team" :
                          aiSuggestion.team === "internal" ? "Internal Team" :
                          aiSuggestion.team === "vendor" ? "Vendor / Landlord" : ""
                        }
                      </p>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col space-y-3">
                    {isTaskSelectionComplete(task.id) ? (
                      <Button 
                        onClick={() => handleContinueToSchedule(task.id)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Continue to Schedule
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleSubmitTask(task)}
                        disabled={!isTaskSelectionComplete(task.id) || createTaskMutation.isPending || updateHostAiTaskMutation.isPending}
                        className="w-full"
                      >
                        {createTaskMutation.isPending ? "Processing..." : "Submit Task"}
                      </Button>
                    )}
                    
                    <div className="flex w-full space-x-2">
                      <Button 
                        onClick={() => handleWatchTask(task)}
                        variant="outline"
                        disabled={updateHostAiTaskMutation.isPending}
                        className="w-1/2 border-yellow-400 hover:bg-yellow-50"
                      >
                        Watch
                      </Button>
                      <Button 
                        onClick={() => handleCloseTask(task)}
                        variant="outline"
                        disabled={updateHostAiTaskMutation.isPending}
                        className="w-1/2 border-gray-400 hover:bg-gray-50"
                      >
                        Close
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}