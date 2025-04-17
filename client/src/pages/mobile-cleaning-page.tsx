import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Person,
  Home,
  CheckCircle,
  Schedule,
  Assignment,
  Camera,
  Cancel,
  FilterList,
  CalendarMonth,
  Flag,
  LocationOn,
  Visibility,
  PhotoCamera,
} from "@mui/icons-material";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Import our enhanced photo documentation component
import PhotoDocumentation from "@/components/cleaning/PhotoDocumentation";

// Mobile-optimized cleaning page
export default function MobileCleaningPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showTaskCompletion, setShowTaskCompletion] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [flagDescription, setFlagDescription] = useState("");
  const [flagPriority, setFlagPriority] = useState("normal");
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  // Priority filter - default to showing all priorities
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "high" | "normal" | "low">("all");

  const queryClient = useQueryClient();

  // Fetch cleaning tasks
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/cleaning-tasks"],
  });

  // Fetch units for reference
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  // Fetch users for reference (cleaners)
  const { data: users, data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch checklist items for the selected task
  const { data: checklistItems, isLoading: isLoadingChecklist } = useQuery({
    queryKey: ["/api/cleaning-checklist-items", selectedTask?.checklistTemplateId],
    queryFn: async () => {
      if (!selectedTask?.checklistTemplateId) return [];
      
      const response = await fetch(`/api/cleaning-checklist-items?checklistId=${selectedTask.checklistTemplateId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist items");
      }
      return response.json();
    },
    enabled: !!selectedTask?.checklistTemplateId,
  });

  // Fetch checklist completions for the selected task
  const { 
    data: checklistCompletions,
    isLoading: isLoadingCompletions, 
  } = useQuery({
    queryKey: ["/api/cleaning-checklist-completions", selectedTask?.id],
    queryFn: async () => {
      if (!selectedTask?.id) return [];
      
      const response = await fetch(`/api/cleaning-checklist-completions?taskId=${selectedTask.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist completions");
      }
      return response.json();
    },
    enabled: !!selectedTask?.id,
  });

  // Mutation to update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/cleaning-tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-tasks"] });
      toast({
        title: "Task updated",
        description: "The cleaning task has been updated successfully.",
      });
      setShowTaskCompletion(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to create a flag
  const createFlagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/cleaning-flags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create flag");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-tasks"] });
      setShowFlagDialog(false);
      setFlagDescription("");
      setFlagPriority("normal");
      toast({
        title: "Issue flagged",
        description: "The cleaning issue has been flagged for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to flag issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to complete checklist items
  const completeChecklistItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/cleaning-checklist-completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to complete checklist item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-completions", selectedTask?.id] 
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter tasks based on active tab and current user
  const cleaningTasks = tasks || [];
  const currentUserId = currentUser?.id;
  
  const assignedTasks = Array.isArray(cleaningTasks)
    ? cleaningTasks.filter(
        (task) => 
          task.assignedTo === currentUserId && 
          task.status !== "completed"
      )
    : [];
    
  const completedTasks = Array.isArray(cleaningTasks)
    ? cleaningTasks.filter(
        (task) => 
          task.assignedTo === currentUserId && 
          task.status === "completed"
      )
    : [];

  // Helper function to get unit name
  const getUnitName = (unitId: number) => {
    if (!units || !Array.isArray(units)) return `Unit #${unitId}`;
    const unit = units.find((u: any) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not scheduled";
    return format(new Date(dateString), "MMM dd, yyyy - h:mm a");
  };

  // Get status badge
  const getStatusBadge = (task: any) => {
    if (task.status === "completed") {
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    
    if (task.status === "in-progress") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Schedule className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    
    if (!task.scheduledFor || new Date(task.scheduledFor) > new Date()) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Schedule className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-red-100 text-red-800 border-0">
        <Cancel className="h-3 w-3 mr-1" />
        Overdue
      </Badge>
    );
  };

  // Handle start cleaning action
  const handleStartCleaning = (task: any) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: "in-progress",
      },
    });
  };

  // Handle completing a task
  const handleCompleteTask = () => {
    if (!selectedTask) return;
    
    updateTaskMutation.mutate({
      id: selectedTask.id,
      updates: {
        status: "completed",
        completedAt: new Date().toISOString(),
        notes: completionNotes || selectedTask.notes,
        photos: photoUrls.length > 0 ? photoUrls : selectedTask.photos,
      },
    });
  };

  // Handle flag issue
  const handleFlagIssue = () => {
    if (!selectedTask || !flagDescription) return;
    
    createFlagMutation.mutate({
      cleaningTaskId: selectedTask.id,
      description: flagDescription,
      flagType: "cleaner-reported",
      priority: flagPriority,
      reportedBy: currentUserId,
      status: "open",
      photos: photoUrls,
    });
  };

  // This entire function can be removed since PhotoDocumentation component now handles photo uploads
  // We're keeping it just for backward compatibility with other parts of the code
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This is a mock implementation - in a real app, you would upload to a server
    if (e.target.files && e.target.files.length > 0) {
      // Mock successful upload with placeholder URLs
      const newUrls = Array.from(e.target.files).map(
        (_, index) => `https://placehold.co/400x300?text=Cleaning+Photo+${index + 1}`
      );
      setPhotoUrls([...photoUrls, ...newUrls]);
      
      toast({
        title: "Photos uploaded",
        description: `${e.target.files.length} photos have been uploaded.`,
      });
    }
  };

  // Handle checklist item completion
  const handleChecklistItemComplete = (itemId: number, completed: boolean) => {
    if (!selectedTask) return;
    
    completeChecklistItemMutation.mutate({
      cleaningTaskId: selectedTask.id,
      checklistItemId: itemId,
      completedBy: currentUserId,
      completed: completed,
      completedAt: completed ? new Date().toISOString() : null,
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-red-500">Error loading cleaning data</p>
        </div>
      </Layout>
    );
  }

  // Helper function to get priority badge
  const getPriorityBadge = (priority: string | null | undefined) => {
    if (!priority) return null;
    
    switch (priority.toLowerCase()) {
      case "urgent":
        return <span className="h-2 w-2 rounded-full bg-red-600 inline-block mr-1"></span>;
      case "high":
        return <span className="h-2 w-2 rounded-full bg-orange-500 inline-block mr-1"></span>;
      case "normal":
        return <span className="h-2 w-2 rounded-full bg-blue-500 inline-block mr-1"></span>;
      case "low":
        return <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-1"></span>;
      default:
        return null;
    }
  };

  // Apply priority filter to tasks
  const filterTasksByPriority = (tasks: any[]) => {
    if (priorityFilter === "all") return tasks;
    
    return tasks.filter((task) => {
      // Convert task priority to lowercase and handle null/undefined
      const taskPriority = task.priority?.toLowerCase() || "normal";
      return taskPriority === priorityFilter;
    });
  };

  // Apply search term filtering
  const filterTasksBySearchTerm = (tasks: any[]) => {
    if (!searchTerm) return tasks;
    
    const term = searchTerm.toLowerCase();
    return tasks.filter((task) => {
      // Search in unit name if available
      const unit = units?.find((u: any) => u.id === task.unitId);
      const unitName = unit ? unit.name.toLowerCase() : "";
      
      // Search in task fields
      return (
        unitName.includes(term) ||
        (task.notes && task.notes.toLowerCase().includes(term)) ||
        (task.cleaningType && task.cleaningType.toLowerCase().includes(term))
      );
    });
  };
  
  // Determine what tasks to display based on active tab and apply filters
  const filteredAssignedTasks = filterTasksByPriority(filterTasksBySearchTerm(assignedTasks));
  const filteredCompletedTasks = filterTasksByPriority(filterTasksBySearchTerm(completedTasks));
  const displayedTasks = activeTab === "assigned" ? filteredAssignedTasks : filteredCompletedTasks;

  return (
    <Layout>
      <div className="space-y-4 pb-6">
        {/* Mobile Header */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-[#2C2E3E]">Cleaning Tasks</h1>
          <p className="text-[#9EA2B1] text-sm">
            {activeTab === "assigned" ? "Tasks assigned to you" : "Your completed tasks"}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tasks..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <FilterList className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setPriorityFilter("all")}>
                All Priorities
                {priorityFilter === "all" && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriorityFilter("urgent")}>
                <span className="h-2 w-2 rounded-full bg-red-600 mr-1.5 inline-block"></span>
                Urgent Only
                {priorityFilter === "urgent" && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriorityFilter("high")}>
                <span className="h-2 w-2 rounded-full bg-orange-500 mr-1.5 inline-block"></span>
                High Priority
                {priorityFilter === "high" && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriorityFilter("normal")}>
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5 inline-block"></span>
                Normal Priority
                {priorityFilter === "normal" && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriorityFilter("low")}>
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 inline-block"></span>
                Low Priority
                {priorityFilter === "low" && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {/* Assigned Tasks Tab */}
          <TabsContent value="assigned" className="mt-2">
            {displayedTasks.length > 0 ? (
              <div className="space-y-3">
                {displayedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium flex items-center">
                            <Home className="h-4 w-4 mr-1.5 text-[#9EA2B1]" />
                            {getUnitName(task.unitId)}
                          </h3>
                          <p className="text-sm text-[#9EA2B1] mt-1 flex items-center">
                            <CalendarMonth className="h-3.5 w-3.5 mr-1" />
                            {formatDate(task.scheduledFor)}
                          </p>
                        </div>
                        <div>{getStatusBadge(task)}</div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center">
                          {getPriorityBadge(task.priority)}
                          {task.cleaningType || "Standard"}
                        </span>
                        <span className="text-xs text-[#9EA2B1]">
                          Est. time: {task.estimatedDuration || "N/A"} mins
                        </span>
                      </div>

                      {task.hasFlaggedIssues && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            <Flag className="h-3 w-3 mr-1" />
                            Has flagged issues
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#9EA2B1]">
                <Assignment className="h-12 w-12 mx-auto mb-2 text-[#C5C9D6]" />
                <p>No assigned cleaning tasks</p>
                <p className="text-sm mt-1">
                  You don't have any cleaning tasks assigned to you
                </p>
              </div>
            )}
          </TabsContent>

          {/* Completed Tasks Tab */}
          <TabsContent value="completed" className="mt-2">
            {displayedTasks.length > 0 ? (
              <div className="space-y-3">
                {displayedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium flex items-center">
                            <Home className="h-4 w-4 mr-1.5 text-[#9EA2B1]" />
                            {getUnitName(task.unitId)}
                          </h3>
                          <p className="text-sm text-[#9EA2B1] mt-1 flex items-center">
                            <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-600" />
                            {formatDate(task.completedAt)}
                          </p>
                        </div>
                        <div>
                          {task.score ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              {task.score}% Score
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0">
                              Pending QC
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center">
                          {getPriorityBadge(task.priority)}
                          {task.cleaningType || "Standard"}
                        </span>
                        <span className="text-xs text-[#9EA2B1]">
                          {task.actualDuration ? `${task.actualDuration} mins` : "Duration N/A"}
                        </span>
                      </div>

                      {task.photos && (
                        <div className="mt-2 flex space-x-1">
                          <Camera className="h-4 w-4 text-[#9EA2B1]" />
                          <span className="text-xs text-[#9EA2B1]">
                            {Array.isArray(task.photos) ? task.photos.length : 0} photos
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#9EA2B1]">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-[#C5C9D6]" />
                <p>No completed tasks</p>
                <p className="text-sm mt-1">
                  You haven't completed any cleaning tasks yet
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium flex items-center">
                    <Home className="h-4 w-4 mr-1.5 text-[#9EA2B1]" />
                    {getUnitName(selectedTask.unitId)}
                  </h3>
                  <p className="text-sm text-[#9EA2B1] mt-1">
                    {selectedTask.status === "completed"
                      ? `Completed: ${formatDate(selectedTask.completedAt)}`
                      : `Scheduled: ${formatDate(selectedTask.scheduledFor)}`}
                  </p>
                </div>
                <div>{getStatusBadge(selectedTask)}</div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-[#9EA2B1]">Cleaning Type:</span>
                  <span>{selectedTask.cleaningType || "Standard"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9EA2B1]">Duration:</span>
                  <span>
                    {selectedTask.actualDuration
                      ? `${selectedTask.actualDuration} mins (actual)`
                      : `${selectedTask.estimatedDuration || "N/A"} mins (est.)`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9EA2B1]">Priority:</span>
                  <span className="capitalize flex items-center">
                    {getPriorityBadge(selectedTask.priority)}
                    {selectedTask.priority || "Normal"}
                  </span>
                </div>
                {selectedTask.notes && (
                  <div className="pt-2">
                    <span className="text-[#9EA2B1] block mb-1">Notes:</span>
                    <p className="text-sm border p-2 rounded-md bg-gray-50">
                      {selectedTask.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Task Actions */}
              <div className="pt-2 space-y-3">
                {selectedTask.status !== "completed" && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowTaskDetails(false);
                        handleStartCleaning(selectedTask);
                      }}
                      disabled={selectedTask.status === "in-progress"}
                    >
                      {selectedTask.status === "in-progress" ? (
                        <>
                          <Schedule className="h-4 w-4 mr-2" />
                          In Progress
                        </>
                      ) : (
                        <>
                          <Assignment className="h-4 w-4 mr-2" />
                          Start Cleaning
                        </>
                      )}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTaskDetails(false);
                          setShowFlagDialog(true);
                        }}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Flag Issue
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          setShowTaskDetails(false);
                          setShowTaskCompletion(true);
                        }}
                        disabled={selectedTask.status !== "in-progress"}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  </>
                )}

                {selectedTask.status === "completed" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline">
                        <Visibility className="h-4 w-4 mr-2" />
                        View Checklist
                      </Button>
                      <Button variant="outline">
                        <PhotoCamera className="h-4 w-4 mr-2" />
                        View Photos
                      </Button>
                    </div>
                    {selectedTask.hasFlaggedIssues && (
                      <Button
                        variant="destructive"
                        className="w-full"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        View Flagged Issues
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Completion Dialog */}
      <Dialog open={showTaskCompletion} onOpenChange={setShowTaskCompletion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Cleaning Task</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="font-medium">{getUnitName(selectedTask.unitId)}</h3>
                <p className="text-sm text-[#9EA2B1]">
                  {selectedTask.cleaningType || "Standard"} Cleaning
                </p>
              </div>

              {/* Checklist Section */}
              {selectedTask.checklistTemplateId && checklistItems && (
                <div className="border rounded-md p-3 space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Assignment className="h-4 w-4 mr-1.5" />
                    Checklist
                  </h4>
                  
                  {isLoadingChecklist ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#9EA2B1]" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.isArray(checklistItems) && checklistItems.map((item: any) => {
                        const completion = Array.isArray(checklistCompletions) && 
                          checklistCompletions.find((c: any) => c.checklistItemId === item.id);
                        
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-start border-b pb-2"
                          >
                            <Checkbox 
                              id={`item-${item.id}`}
                              checked={completion?.completed || false}
                              onCheckedChange={(checked) => 
                                handleChecklistItemComplete(item.id, !!checked)
                              }
                              className="mt-1"
                            />
                            <div className="ml-2">
                              <Label 
                                htmlFor={`item-${item.id}`}
                                className={`text-sm ${completion?.completed ? 'line-through text-[#9EA2B1]' : ''}`}
                              >
                                {item.description}
                              </Label>
                              <p className="text-xs text-[#9EA2B1]">
                                {item.room}
                                {item.requiresPhoto && ' • Photo required'}
                                {item.isRequired && ' • Required'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Completion Notes */}
              <div>
                <Label htmlFor="completion-notes" className="block mb-1">
                  Completion Notes
                </Label>
                <Textarea
                  id="completion-notes"
                  placeholder="Add any notes about this cleaning task..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Enhanced Photo Documentation */}
              <PhotoDocumentation
                photos={photoUrls}
                onPhotosChange={setPhotoUrls}
                requiredCount={3}
                requiredRooms={["Bathroom", "Kitchen", "Bedroom"]}
                roomOptions={["Bathroom", "Bedroom", "Kitchen", "Living Room", "Outdoor", "Other"]}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setShowTaskCompletion(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCompleteTask}
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Completed
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Issue Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flag Cleaning Issue</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="font-medium">{getUnitName(selectedTask.unitId)}</h3>
                <p className="text-sm text-[#9EA2B1]">
                  Report an issue with this cleaning task
                </p>
              </div>

              {/* Issue Description */}
              <div>
                <Label htmlFor="flag-description" className="block mb-1">
                  Issue Description
                </Label>
                <Textarea
                  id="flag-description"
                  placeholder="Describe the issue you encountered..."
                  value={flagDescription}
                  onChange={(e) => setFlagDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Priority Selection */}
              <div>
                <Label htmlFor="flag-priority" className="block mb-1">
                  Priority
                </Label>
                <select
                  id="flag-priority"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={flagPriority}
                  onChange={(e) => setFlagPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Enhanced Photo Documentation for Issues */}
              <PhotoDocumentation
                photos={photoUrls}
                onPhotosChange={setPhotoUrls}
                requiredCount={1}
                roomOptions={["Bathroom", "Bedroom", "Kitchen", "Living Room", "Outdoor", "Other"]}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleFlagIssue}
                  disabled={!flagDescription || createFlagMutation.isPending}
                >
                  {createFlagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4 mr-2" />
                  )}
                  Flag Issue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}