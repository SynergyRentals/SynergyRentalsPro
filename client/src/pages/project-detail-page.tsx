import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Check, Calendar, Clock, Briefcase, ChevronDown, ChevronUp, 
  FileText, Trash2, Edit, MoreVertical, ArrowLeft, CheckCircle2,
  AlertCircle, User, PenSquare, Clipboard, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistance, isAfter } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// ZOD form validation
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

// Define milestone schema for form validation
const milestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required"),
  projectId: z.number(),
  dueDate: z.date().optional().nullable(),
});

// Define task schema for form validation
const taskSchema = z.object({
  description: z.string().min(1, "Task description is required"),
  projectId: z.number(),
  unitId: z.number().optional().nullable(),
  assignedTo: z.number().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  priority: z.string().default("medium"),
  taskType: z.string().default("general"),
  notes: z.string().optional().nullable(),
});

// Define comment schema
const commentSchema = z.object({
  message: z.string().min(1, "Comment is required"),
  taskId: z.number(),
  userId: z.number(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;
type TaskFormValues = z.infer<typeof taskSchema>;
type CommentFormValues = z.infer<typeof commentSchema>;

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Fetch project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: projectId !== null,
  });

  // Fetch project milestones
  const { 
    data: milestones, 
    isLoading: milestonesLoading, 
    error: milestonesError 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: projectId !== null,
    select: (data) => {
      return Array.isArray(data) 
        ? data.sort((a, b) => 
            a.dueDate && b.dueDate 
              ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() 
              : 0)
        : [];
    }
  });

  // Fetch project tasks
  const { 
    data: tasks, 
    isLoading: tasksLoading, 
    error: tasksError 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: projectId !== null,
    select: (data) => {
      return Array.isArray(data) 
        ? data.sort((a, b) => 
            a.dueDate && b.dueDate 
              ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() 
              : 0)
        : [];
    }
  });

  // Fetch users for task assignment
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch units for task association
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch task comments
  const { data: taskComments, refetch: refetchComments } = useQuery({
    queryKey: [`/api/project-tasks/${selectedTask?.id}/comments`],
    enabled: selectedTask !== null,
    select: (data) => {
      return Array.isArray(data) 
        ? data.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        : [];
    }
  });

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (values: MilestoneFormValues) => {
      const response = await apiRequest("POST", "/api/project-milestones", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Milestone created",
        description: "The milestone has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      setMilestoneDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create milestone",
        variant: "destructive",
      });
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Partial<MilestoneFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/project-milestones/${id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Milestone updated",
        description: "The milestone has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      setEditingMilestone(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update milestone",
        variant: "destructive",
      });
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/project-milestones/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Milestone deleted",
        description: "The milestone has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete milestone",
        variant: "destructive",
      });
    },
  });

  // Toggle milestone completion mutation
  const toggleMilestoneCompletionMutation = useMutation({
    mutationFn: async ({ id, complete }: { id: number; complete: boolean }) => {
      const response = await apiRequest("PATCH", `/api/project-milestones/${id}`, { complete });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update milestone",
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const response = await apiRequest("POST", "/api/project-tasks", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "The task has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      setTaskDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Partial<TaskFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/project-tasks/${id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/project-tasks/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (values: CommentFormValues) => {
      const response = await apiRequest("POST", "/api/task-comments", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
      refetchComments();
      setCommentDialogOpen(false);
      commentForm.reset({ message: "", taskId: selectedTask?.id, userId: user?.id });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/project-tasks/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Form setups
  const milestoneForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: "",
      projectId: projectId || 0,
      dueDate: null,
    },
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      description: "",
      projectId: projectId || 0,
      unitId: project?.unitId || null,
      assignedTo: null,
      dueDate: null,
      priority: "medium",
      taskType: "general",
      notes: null,
    },
  });

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      message: "",
      taskId: selectedTask?.id || 0,
      userId: user?.id || 0,
    },
  });

  // Reset forms when editing states change
  useEffect(() => {
    if (editingMilestone) {
      milestoneForm.reset({
        title: editingMilestone.title,
        projectId: projectId || 0,
        dueDate: editingMilestone.dueDate ? new Date(editingMilestone.dueDate) : null,
      });
    } else {
      milestoneForm.reset({
        title: "",
        projectId: projectId || 0,
        dueDate: null,
      });
    }
  }, [editingMilestone, projectId, milestoneForm]);

  useEffect(() => {
    if (editingTask) {
      taskForm.reset({
        description: editingTask.description,
        projectId: projectId || 0,
        unitId: editingTask.unitId,
        assignedTo: editingTask.assignedTo,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : null,
        priority: editingTask.priority || "medium",
        taskType: editingTask.taskType || "general",
        notes: editingTask.notes,
      });
    } else {
      taskForm.reset({
        description: "",
        projectId: projectId || 0,
        unitId: project?.unitId || null,
        assignedTo: null,
        dueDate: null,
        priority: "medium",
        taskType: "general",
        notes: null,
      });
    }
  }, [editingTask, projectId, project, taskForm]);

  useEffect(() => {
    if (selectedTask) {
      commentForm.reset({
        message: "",
        taskId: selectedTask.id,
        userId: user?.id || 0,
      });
    }
  }, [selectedTask, user, commentForm]);

  // Calculate project progress
  const calculateProgress = () => {
    if (!milestones || milestones.length === 0) return 0;
    const completedMilestones = milestones.filter((m: any) => m.complete).length;
    return Math.round((completedMilestones / milestones.length) * 100);
  };

  // Handle form submissions
  const onSubmitMilestone = (values: MilestoneFormValues) => {
    if (editingMilestone) {
      updateMilestoneMutation.mutate({ id: editingMilestone.id, values });
    } else {
      createMilestoneMutation.mutate(values);
    }
  };

  const onSubmitTask = (values: TaskFormValues) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, values });
    } else {
      createTaskMutation.mutate(values);
    }
  };

  const onSubmitComment = (values: CommentFormValues) => {
    addCommentMutation.mutate(values);
  };

  // Function to render priority badge
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Low</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Medium</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">High</Badge>;
      case "urgent":
        return <Badge variant="outline" className="bg-red-200 text-red-900 border-red-400 font-bold">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Function to render task status badge
  const renderTaskStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "review":
        return <Badge className="bg-purple-500">Review</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Function to check if a date is overdue
  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return isAfter(new Date(), new Date(date));
  };

  if (projectLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <a href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </a>
        </Button>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold">Error Loading Project</h2>
          <p className="text-muted-foreground mt-2">Unable to load project details. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <a href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </a>
          </Button>
          <h1 className="text-2xl font-bold">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setTaskDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button 
            onClick={() => setMilestoneDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <p>{project.status && (
                      <Badge className="mt-1">
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                    )}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                    <p>{project.category || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                    <p>{project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                    <p>{project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "Not specified"}</p>
                  </div>
                  {project.unitId && units && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Associated Unit</h3>
                      <p>{units.find((u: any) => u.id === project.unitId)?.name || "Unknown unit"}</p>
                    </div>
                  )}
                  {project.budgetEstimate && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Budget Estimate</h3>
                      <p>${project.budgetEstimate.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                {project.description && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                    <p className="mt-1 whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Milestones</span>
                    <span>
                      {milestones?.filter((m: any) => m.complete).length || 0} of {milestones?.length || 0} completed
                    </span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasks</span>
                    <span>
                      {tasks?.filter((t: any) => t.status === "completed").length || 0} of {tasks?.length || 0} completed
                    </span>
                  </div>
                  <Progress 
                    value={tasks && tasks.length > 0 
                      ? Math.round((tasks.filter((t: any) => t.status === "completed").length / tasks.length) * 100)
                      : 0} 
                    className="h-2" 
                  />
                </div>

                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Task Status Breakdown</h3>
                  <div className="space-y-3">
                    {["pending", "in-progress", "review", "completed"].map(status => {
                      const count = tasks?.filter((t: any) => t.status === status).length || 0;
                      const statusLabel = status.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{statusLabel}</span>
                            <span>{count}</span>
                          </div>
                          <Progress 
                            value={tasks && tasks.length > 0 ? (count / tasks.length) * 100 : 0} 
                            className="h-1.5" 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {milestonesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !milestones || milestones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No milestones created yet</p>
                ) : (
                  <ul className="space-y-3">
                    {milestones
                      .filter((m: any) => !m.complete)
                      .slice(0, 5)
                      .map((milestone: any) => (
                        <li key={milestone.id} className="flex items-center justify-between border rounded-md p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleMilestoneCompletionMutation.mutate({ 
                                id: milestone.id, 
                                complete: !milestone.complete 
                              })}
                            >
                              <div className="h-4 w-4 rounded-sm border border-primary" />
                            </Button>
                            <span>{milestone.title}</span>
                          </div>
                          {milestone.dueDate && (
                            <Badge variant={isOverdue(milestone.dueDate) ? "destructive" : "outline"}>
                              {format(new Date(milestone.dueDate), "MMM d")}
                            </Badge>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !tasks || tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No tasks created yet</p>
                ) : (
                  <ul className="space-y-3">
                    {tasks.slice(0, 5).map((task: any) => (
                      <li 
                        key={task.id} 
                        className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-center gap-2">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="line-clamp-1">{task.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderPriorityBadge(task.priority)}
                          {task.assignedTo && users && (
                            <span className="text-xs border rounded-full w-6 h-6 flex items-center justify-center" title={users.find((u: any) => u.id === task.assignedTo)?.name}>
                              {users.find((u: any) => u.id === task.assignedTo)?.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Milestones</CardTitle>
              <CardDescription>Track and manage project milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {milestonesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !milestones || milestones.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No milestones yet</h3>
                  <p className="text-muted-foreground mt-1">Create your first milestone to track project progress</p>
                  <Button onClick={() => setMilestoneDialogOpen(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Milestone
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((milestone: any) => (
                      <TableRow key={milestone.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleMilestoneCompletionMutation.mutate({ 
                              id: milestone.id, 
                              complete: !milestone.complete 
                            })}
                          >
                            <div className={`h-5 w-5 rounded-md border border-primary flex items-center justify-center ${milestone.complete ? "bg-primary" : ""}`}>
                              {milestone.complete && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                          </Button>
                        </TableCell>
                        <TableCell className={milestone.complete ? "line-through text-muted-foreground" : ""}>
                          {milestone.title}
                        </TableCell>
                        <TableCell>
                          {milestone.dueDate ? (
                            <span className={isOverdue(milestone.dueDate) && !milestone.complete ? "text-destructive" : ""}>
                              {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                              {isOverdue(milestone.dueDate) && !milestone.complete && (
                                <span className="ml-2 text-xs text-destructive">(Overdue)</span>
                              )}
                            </span>
                          ) : (
                            "No due date"
                          )}
                        </TableCell>
                        <TableCell>
                          {milestone.complete ? (
                            <Badge className="bg-green-500">
                              Completed {milestone.completedAt && formatDistance(new Date(milestone.completedAt), new Date(), { addSuffix: true })}
                            </Badge>
                          ) : (
                            <Badge variant="outline">In Progress</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingMilestone(milestone)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this milestone?")) {
                                    deleteMilestoneMutation.mutate(milestone.id);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Tasks</CardTitle>
              <CardDescription>Manage and track all tasks related to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : !tasks || tasks.length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No tasks yet</h3>
                  <p className="text-muted-foreground mt-1">Create your first task to get started</p>
                  <Button onClick={() => setTaskDialogOpen(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Task
                  </Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {["pending", "in-progress", "review", "completed"].map(status => {
                    const tasksWithStatus = tasks.filter((t: any) => t.status === status);
                    if (tasksWithStatus.length === 0) return null;
                    
                    const statusLabel = status.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
                    
                    return (
                      <AccordionItem value={status} key={status}>
                        <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                          <div className="flex items-center">
                            <span className="font-semibold">{statusLabel} Tasks</span>
                            <Badge variant="outline" className="ml-2">{tasksWithStatus.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2">
                          <div className="space-y-2 pt-2">
                            {tasksWithStatus.map((task: any) => (
                              <div 
                                key={task.id} 
                                className="border rounded-md p-4 hover:bg-muted/50 cursor-pointer"
                                onClick={() => setSelectedTask(task)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      {renderPriorityBadge(task.priority)}
                                      {renderTaskStatusBadge(task.status)}
                                      {task.taskType && (
                                        <Badge variant="outline">{task.taskType}</Badge>
                                      )}
                                    </div>
                                    <h4 className="font-medium">{task.description}</h4>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this task?")) {
                                            deleteTaskMutation.mutate(task.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                                  {task.assignedTo && users && (
                                    <div className="flex items-center">
                                      <User className="h-3.5 w-3.5 mr-1" />
                                      <span>{users.find((u: any) => u.id === task.assignedTo)?.name || "Unknown"}</span>
                                    </div>
                                  )}
                                  {task.dueDate && (
                                    <div className="flex items-center">
                                      <Calendar className="h-3.5 w-3.5 mr-1" />
                                      <span className={isOverdue(task.dueDate) && task.status !== "completed" ? "text-destructive" : ""}>
                                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                                        {isOverdue(task.dueDate) && task.status !== "completed" && " (Overdue)"}
                                      </span>
                                    </div>
                                  )}
                                  {task.unitId && units && (
                                    <div className="flex items-center">
                                      <Briefcase className="h-3.5 w-3.5 mr-1" />
                                      <span>{units.find((u: any) => u.id === task.unitId)?.name || "Unknown unit"}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Milestone Dialog */}
      <Dialog 
        open={milestoneDialogOpen || editingMilestone !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setMilestoneDialogOpen(false);
            setEditingMilestone(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? "Edit Milestone" : "Add New Milestone"}</DialogTitle>
            <DialogDescription>
              {editingMilestone
                ? "Update milestone details for your project"
                : "Create a new milestone to track project progress"}
            </DialogDescription>
          </DialogHeader>

          <Form {...milestoneForm}>
            <form onSubmit={milestoneForm.handleSubmit(onSubmitMilestone)} className="space-y-4">
              <FormField
                control={milestoneForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Design phase completion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={milestoneForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                        onChange={(e) => {
                          const value = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input type="hidden" {...milestoneForm.register("projectId")} />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setMilestoneDialogOpen(false);
                    setEditingMilestone(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                >
                  {createMilestoneMutation.isPending || updateMilestoneMutation.isPending ? (
                    "Saving..."
                  ) : editingMilestone ? (
                    "Update Milestone"
                  ) : (
                    "Add Milestone"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog 
        open={taskDialogOpen || editingTask !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setTaskDialogOpen(false);
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update task details for your project"
                : "Create a new task to track project work"}
            </DialogDescription>
          </DialogHeader>

          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Task description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="research">Research</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="documentation">Documentation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign to someone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users?.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const value = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={taskForm.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Unit</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {units?.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional details about this task" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input type="hidden" {...taskForm.register("projectId")} />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setTaskDialogOpen(false);
                    setEditingTask(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                    "Saving..."
                  ) : editingTask ? (
                    "Update Task"
                  ) : (
                    "Add Task"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Detail/Comment Dialog */}
      <Dialog 
        open={selectedTask !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DialogTitle>Task Details</DialogTitle>
                    {renderTaskStatusBadge(selectedTask.status)}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingTask(selectedTask)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Status
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => updateTaskStatusMutation.mutate({ id: selectedTask.id, status: "pending" })}
                          className={selectedTask.status === "pending" ? "bg-muted" : ""}
                        >
                          <span className="h-2 w-2 rounded-full bg-gray-400 mr-2" />
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateTaskStatusMutation.mutate({ id: selectedTask.id, status: "in-progress" })}
                          className={selectedTask.status === "in-progress" ? "bg-muted" : ""}
                        >
                          <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateTaskStatusMutation.mutate({ id: selectedTask.id, status: "review" })}
                          className={selectedTask.status === "review" ? "bg-muted" : ""}
                        >
                          <span className="h-2 w-2 rounded-full bg-purple-500 mr-2" />
                          Review
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateTaskStatusMutation.mutate({ id: selectedTask.id, status: "completed" })}
                          className={selectedTask.status === "completed" ? "bg-muted" : ""}
                        >
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-medium">{selectedTask.description}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <p>{renderPriorityBadge(selectedTask.priority)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p>{selectedTask.taskType || "General"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Assigned To</p>
                      <p>{selectedTask.assignedTo && users 
                        ? users.find((u: any) => u.id === selectedTask.assignedTo)?.name 
                        : "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className={selectedTask.dueDate && isOverdue(selectedTask.dueDate) && selectedTask.status !== "completed" ? "text-destructive" : ""}>
                        {selectedTask.dueDate 
                          ? format(new Date(selectedTask.dueDate), "MMM d, yyyy") 
                          : "No due date"}
                        {selectedTask.dueDate && isOverdue(selectedTask.dueDate) && selectedTask.status !== "completed" && (
                          <span className="ml-1 text-xs text-destructive">(Overdue)</span>
                        )}
                      </p>
                    </div>
                    {selectedTask.createdAt && (
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{format(new Date(selectedTask.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {selectedTask.completedAt && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p>{format(new Date(selectedTask.completedAt), "MMM d, yyyy")}</p>
                      </div>
                    )}
                  </div>

                  {selectedTask.notes && (
                    <div>
                      <p className="text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap">{selectedTask.notes}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium">Comments</h3>
                      <Button size="sm" onClick={() => setCommentDialogOpen(true)}>
                        <PenSquare className="h-4 w-4 mr-1" />
                        Add Comment
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      {taskComments && taskComments.length > 0 ? (
                        taskComments.map((comment: any) => (
                          <div key={comment.id} className="border rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center">
                                  {users?.find((u: any) => u.id === comment.userId)?.name.charAt(0) || "?"}
                                </div>
                                <div>
                                  <p className="font-medium">{users?.find((u: any) => u.id === comment.userId)?.name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {comment.timestamp ? formatDistance(new Date(comment.timestamp), new Date(), { addSuffix: true }) : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="mt-2">{comment.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Clipboard className="mx-auto h-10 w-10 mb-2 opacity-30" />
                          <p>No comments yet</p>
                          <p className="text-sm">Be the first to add a comment to this task</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog 
        open={commentDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setCommentDialogOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment to this task to provide updates or information
            </DialogDescription>
          </DialogHeader>

          <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit(onSubmitComment)} className="space-y-4">
              <FormField
                control={commentForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your comment here..." 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input type="hidden" {...commentForm.register("taskId")} />
              <input type="hidden" {...commentForm.register("userId")} />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCommentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}