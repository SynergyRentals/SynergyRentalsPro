import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MoreVertical, 
  Mail, 
  ArrowUpRight,
  ArrowRight,
  Users,
  ClipboardList,
  Filter as FilterIcon,
  BarChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatDistance, format, isToday, isPast, isFuture, addDays } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Define a simple spinner component
const Spinner = ({ className = "" }: { className?: string }) => (
  <div className={`animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full ${className}`}></div>
);

// ZOD form validation
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define project schema for form validation
const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().optional(),
  status: z.string().default("active"),
  category: z.string().optional(),
  unitId: z.number().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  budgetEstimate: z.number().optional().nullable(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

// Utility functions for the dashboard
const priorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'normal':
      return 'bg-blue-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const priorityBgColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50';
    case 'high':
      return 'bg-orange-50';
    case 'normal':
      return 'bg-blue-50';
    case 'low':
      return 'bg-green-50';
    default:
      return 'bg-gray-50';
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'planning':
      return 'bg-purple-500';
    case 'in-progress':
      return 'bg-blue-500';
    case 'blocked':
      return 'bg-red-500';
    case 'complete':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export default function ProjectsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  
  // Advanced filtering
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null); // "today", "week", "overdue"

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch all project tasks
  const { data: allTasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["/api/project-tasks"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch recently completed tasks
  const { data: completedTasks } = useQuery({
    queryKey: ["/api/project-tasks/status/completed"],
    select: (data) => {
      return Array.isArray(data) 
        ? data.sort((a, b) => 
            new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
          ).slice(0, 5) 
        : [];
    }
  });

  // Fetch task by id if a task is selected
  const { data: selectedTask } = useQuery({
    queryKey: ["/api/project-tasks", selectedTaskId],
    enabled: selectedTaskId !== null,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/project-tasks/${selectedTaskId}`);
      return response.json();
    }
  });

  // Fetch units for dropdown
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch users for task assignment
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const response = await apiRequest("POST", "/api/projects", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "The project has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ProjectFormValues }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project updated",
        description: "The project has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });
  
  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PATCH", `/api/project-tasks/${taskId}`, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task completed",
        description: "The task has been marked as completed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-tasks"] });
      setTaskDetailsOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  // Form setup for create/edit
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: editingProject || {
      title: "",
      description: "",
      status: "active",
      category: "",
      unitId: null,
      dueDate: null,
      budgetEstimate: null,
    },
  });

  // Reset form when editing project changes
  useEffect(() => {
    if (editingProject) {
      form.reset(editingProject);
    } else {
      form.reset({
        title: "",
        description: "",
        status: "active",
        category: "",
        unitId: null,
        dueDate: null,
        budgetEstimate: null,
      });
    }
  }, [editingProject, form]);

  // Handle project creation/update
  const onSubmit = (values: ProjectFormValues) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, values });
    } else {
      createProjectMutation.mutate(values);
    }
  };

  // Calculate metrics for the dashboard
  const activeProjects = projects?.filter(
    (project: any) => project.status === "active" || project.status === "in-progress"
  ).length || 0;
  
  const openTasks = allTasks?.filter(
    (task: any) => task.status !== "completed"
  ).length || 0;
  
  const overdueTasks = allTasks?.filter(
    (task: any) => task.status !== "completed" && task.dueDate && isPast(new Date(task.dueDate))
  ).length || 0;
  
  const dueTodayTasks = allTasks?.filter(
    (task: any) => task.status !== "completed" && task.dueDate && isToday(new Date(task.dueDate))
  ).length || 0;
  
  const highPriorityTasks = allTasks?.filter(
    (task: any) => (task.priority === "high" || task.priority === "urgent") && task.status !== "completed"
  ).length || 0;

  // Filter tasks by priority for task board section
  const urgentTasks = allTasks?.filter(
    (task: any) => task.priority === "urgent" && task.status !== "completed"
  ) || [];
  
  const highPriorityTasksList = allTasks?.filter(
    (task: any) => task.priority === "high" && task.status !== "completed"
  ) || [];
  
  const normalPriorityTasks = allTasks?.filter(
    (task: any) => (task.priority === "normal" || !task.priority) && task.status !== "completed"
  ) || [];
  
  const lowPriorityTasks = allTasks?.filter(
    (task: any) => task.priority === "low" && task.status !== "completed"
  ) || [];

  // Get projects with their task stats for the project progress section
  const projectsWithStats = projects?.filter((project: any) => 
    project.status === "in-progress" || project.status === "planning"
  ).map((project: any) => {
    const projectTasks = allTasks?.filter((task: any) => task.projectId === project.id) || [];
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((task: any) => task.status === "completed").length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      ...project,
      totalTasks,
      completedTasks,
      progressPercentage
    };
  }).sort((a: any, b: any) => b.progressPercentage - a.progressPercentage) || [];

  // Get the overdue tasks for the stalled tasks section
  const stalledTasks = allTasks?.filter(
    (task: any) => task.status !== "completed" && 
                  task.dueDate && 
                  isPast(new Date(task.dueDate))
  ).sort((a: any, b: any) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  ) || [];

  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "planning":
        return <Badge className="bg-purple-500">Planning</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "blocked":
        return <Badge className="bg-red-500">Blocked</Badge>;
      case "completed":
      case "complete":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "on-hold":
        return <Badge className="bg-yellow-500">On Hold</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Function to render priority badge
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-500">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "normal":
        return <Badge className="bg-blue-500">Normal</Badge>;
      case "low":
        return <Badge className="bg-green-500">Low</Badge>;
      default:
        return <Badge className="bg-gray-500">Normal</Badge>;
    }
  };

  // Function to render task card for task boards
  const renderTaskCard = (task: any) => {
    const unit = units?.find((u: any) => u.id === task.unitId);
    const assignedUser = users?.find((u: any) => u.id === task.assignedTo);
    
    return (
      <Card key={task.id} className="mb-3 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="font-medium text-sm leading-tight">{task.description}</h4>
              {unit && (
                <p className="text-xs text-muted-foreground mt-1">
                  {unit.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {renderPriorityBadge(task.priority)}
              {task.dueDate && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(task.dueDate), "MMM d")}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            {assignedUser ? (
              <div className="flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs">{assignedUser.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{assignedUser.name}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => {
                setSelectedTaskId(task.id);
                setTaskDetailsOpen(true);
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects & Tasks</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.href = "/projects-tasks/hostai-inbox"}>
            <Mail className="mr-2 h-4 w-4" />
            HostAI Inbox
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center rounded-full w-12 h-12 bg-blue-100 mb-2">
                  <ClipboardList className="h-6 w-6 text-blue-700" />
                </div>
                <h3 className="text-3xl font-bold text-blue-700">{activeProjects}</h3>
                <p className="text-blue-700">Active Projects</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center rounded-full w-12 h-12 bg-green-100 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-700" />
                </div>
                <h3 className="text-3xl font-bold text-green-700">{openTasks}</h3>
                <p className="text-green-700">Open Tasks</p>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center rounded-full w-12 h-12 bg-red-100 mb-2">
                  <AlertTriangle className="h-6 w-6 text-red-700" />
                </div>
                <h3 className="text-3xl font-bold text-red-700">{overdueTasks}</h3>
                <p className="text-red-700">Overdue Tasks</p>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center rounded-full w-12 h-12 bg-amber-100 mb-2">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <h3 className="text-3xl font-bold text-amber-700">{dueTodayTasks}</h3>
                <p className="text-amber-700">Due Today</p>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center justify-center rounded-full w-12 h-12 bg-orange-100 mb-2">
                  <ArrowUpRight className="h-6 w-6 text-orange-700" />
                </div>
                <h3 className="text-3xl font-bold text-orange-700">{highPriorityTasks}</h3>
                <p className="text-orange-700">High Priority</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Project Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Progress Overview</CardTitle>
              <CardDescription>Current status of your active projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : projectsWithStats.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No active projects found. Create a new project to get started.
                </div>
              ) : (
                <div className="space-y-6">
                  {projectsWithStats.slice(0, 5).map((project: any) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">
                            <a href={`/projects/${project.id}`} className="hover:underline">
                              {project.title}
                            </a>
                          </h4>
                          <div className="flex items-center text-sm text-muted-foreground gap-3 mt-1">
                            {renderStatusBadge(project.status)}
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {project.assignedTeam || "Unassigned"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {project.completedTasks}/{project.totalTasks}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            tasks complete
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{project.progressPercentage}%</span>
                        </div>
                        <Progress value={project.progressPercentage} className="h-2" />
                      </div>
                    </div>
                  ))}
                  
                  {projectsWithStats.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("projects")}>
                        View All Projects
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Task Board Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Task Board</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* High Priority Column */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    Urgent & High Priority
                  </CardTitle>
                  <CardDescription>
                    {urgentTasks.length + highPriorityTasksList.length} task{urgentTasks.length + highPriorityTasksList.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Card key={i} className="mb-3">
                          <CardContent className="p-3">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-3 w-2/3 mb-3" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-1/3" />
                              <Skeleton className="h-3 w-1/4" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : urgentTasks.length === 0 && highPriorityTasksList.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No high priority tasks right now.
                    </div>
                  ) : (
                    <ScrollArea className="h-[340px] pr-3">
                      {urgentTasks.map(renderTaskCard)}
                      {highPriorityTasksList.map(renderTaskCard)}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
              
              {/* Medium Priority Column */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    Normal Priority
                  </CardTitle>
                  <CardDescription>
                    {normalPriorityTasks.length} task{normalPriorityTasks.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Card key={i} className="mb-3">
                          <CardContent className="p-3">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-3 w-2/3 mb-3" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-1/3" />
                              <Skeleton className="h-3 w-1/4" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : normalPriorityTasks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No medium priority tasks right now.
                    </div>
                  ) : (
                    <ScrollArea className="h-[340px] pr-3">
                      {normalPriorityTasks.map(renderTaskCard)}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
              
              {/* Low Priority Column */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    Low Priority
                  </CardTitle>
                  <CardDescription>
                    {lowPriorityTasks.length} task{lowPriorityTasks.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Card key={i} className="mb-3">
                          <CardContent className="p-3">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-3 w-2/3 mb-3" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-1/3" />
                              <Skeleton className="h-3 w-1/4" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : lowPriorityTasks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No low priority tasks right now.
                    </div>
                  ) : (
                    <ScrollArea className="h-[340px] pr-3">
                      {lowPriorityTasks.map(renderTaskCard)}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Bottom Section - Recently Completed and Overdue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recently Completed Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recently Completed Tasks</CardTitle>
                <CardDescription>Tasks that have been finished recently</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !completedTasks || completedTasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No tasks have been completed yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedTasks.map((task: any) => {
                      const unit = units?.find((u: any) => u.id === task.unitId);
                      const completedBy = users?.find((u: any) => u.id === task.assignedTo);
                      
                      return (
                        <div key={task.id} className="pb-3 border-b last:border-0 last:pb-0">
                          <h4 className="font-medium text-sm">{task.description}</h4>
                          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground mt-1 gap-y-1">
                            <div className="flex items-center gap-4">
                              {unit && <span>{unit.name}</span>}
                              {task.completedAt && (
                                <span className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                  {format(new Date(task.completedAt), "MMM d, h:mm a")}
                                </span>
                              )}
                            </div>
                            {completedBy && (
                              <div className="flex items-center">
                                <Avatar className="h-5 w-5 mr-1">
                                  <AvatarFallback className="text-[10px]">{completedBy.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <span>{completedBy.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("tasks")}>
                        View All Tasks
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Overdue Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overdue & Stalled Tasks</CardTitle>
                <CardDescription>Tasks that require immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stalledTasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No overdue tasks. Great job staying on top of things!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stalledTasks.slice(0, 5).map((task: any) => {
                      const unit = units?.find((u: any) => u.id === task.unitId);
                      const assignedTo = users?.find((u: any) => u.id === task.assignedTo);
                      const daysOverdue = task.dueDate ? 
                        Math.ceil((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 3600 * 24)) : 0;
                      
                      return (
                        <div key={task.id} className="pb-3 border-b last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">{task.description}</h4>
                            {renderPriorityBadge(task.priority)}
                          </div>
                          <div className="flex flex-wrap items-center justify-between text-xs mt-2 gap-y-1">
                            <div className="flex items-center gap-4">
                              {unit && <span>{unit.name}</span>}
                              {task.dueDate && (
                                <span className="flex items-center text-red-500">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                </span>
                              )}
                            </div>
                            {assignedTo && (
                              <div className="flex items-center text-muted-foreground">
                                <Avatar className="h-5 w-5 mr-1">
                                  <AvatarFallback className="text-[10px]">{assignedTo.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <span>{assignedTo.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {stalledTasks.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm" onClick={() => setActiveTab("tasks")}>
                          View All Overdue Tasks
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          <div className="flex justify-between items-center space-x-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-5">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter className="p-5 flex justify-between">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : projectsError ? (
            <div className="text-center py-10">
              <p className="text-destructive">Error loading projects. Please try again.</p>
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No projects found. Create your first project!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter((project: any) => {
                  return searchQuery === "" || 
                    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
                })
                .map((project: any) => {
                  const projectTasks = allTasks?.filter((task: any) => task.projectId === project.id) || [];
                  const totalTasks = projectTasks.length;
                  const completedTasks = projectTasks.filter((task: any) => task.status === "completed").length;
                  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                  return (
                    <Card key={project.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">
                            <a href={`/projects/${project.id}`} className="hover:underline">
                              {project.title}
                            </a>
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setEditingProject(project)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this project?")) {
                                    deleteProjectMutation.mutate(project.id);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          {project.category && <span>{project.category}</span>}
                          {renderStatusBadge(project.status)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {project.description || "No description provided."}
                        </p>
                        {project.unitId && units && (
                          <p className="text-sm mt-2">
                            <span className="font-medium">Unit:</span>{" "}
                            {units.find((u: any) => u.id === project.unitId)?.name || "Unknown"}
                          </p>
                        )}
                        {project.budgetEstimate && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Budget:</span> ${project.budgetEstimate.toLocaleString()}
                          </p>
                        )}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{completedTasks}/{totalTasks} tasks ({progressPercentage}%)</span>
                          </div>
                          <Progress value={progressPercentage} className="h-1.5 mt-1" />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center pt-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          {project.dueDate ? (
                            new Date(project.dueDate).toLocaleDateString()
                          ) : (
                            "No due date"
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={`/projects/${project.id}`}>
                            View Project
                          </a>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 space-x-0 md:space-x-4 mb-6">
            <div className="w-full md:w-auto flex-1">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto flex gap-3 flex-wrap justify-end">
              {/* Advanced Filtering */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1 min-w-[120px]">
                    <FilterIcon className="h-4 w-4 mr-1" />
                    Filter
                    {(statusFilter || priorityFilter || assigneeFilter || dueDateFilter) && (
                      <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {[statusFilter, priorityFilter, assigneeFilter, dueDateFilter].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter Tasks</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <h4 className="mb-2 text-sm font-medium">Status</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <Button 
                        variant={statusFilter === "in-progress" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatusFilter(statusFilter === "in-progress" ? null : "in-progress")}
                      >
                        In Progress
                      </Button>
                      <Button 
                        variant={statusFilter === "blocked" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatusFilter(statusFilter === "blocked" ? null : "blocked")}
                      >
                        Blocked
                      </Button>
                      <Button 
                        variant={statusFilter === "planning" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatusFilter(statusFilter === "planning" ? null : "planning")}
                      >
                        Planning
                      </Button>
                      <Button 
                        variant={statusFilter === "completed" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatusFilter(statusFilter === "completed" ? null : "completed")}
                      >
                        Completed
                      </Button>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <h4 className="mb-2 text-sm font-medium">Priority</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <Button 
                        variant={priorityFilter === "urgent" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPriorityFilter(priorityFilter === "urgent" ? null : "urgent")}
                      >
                        Urgent
                      </Button>
                      <Button 
                        variant={priorityFilter === "high" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPriorityFilter(priorityFilter === "high" ? null : "high")}
                      >
                        High
                      </Button>
                      <Button 
                        variant={priorityFilter === "normal" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPriorityFilter(priorityFilter === "normal" ? null : "normal")}
                      >
                        Normal
                      </Button>
                      <Button 
                        variant={priorityFilter === "low" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPriorityFilter(priorityFilter === "low" ? null : "low")}
                      >
                        Low
                      </Button>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <h4 className="mb-2 text-sm font-medium">Due Date</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <Button 
                        variant={dueDateFilter === "today" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDueDateFilter(dueDateFilter === "today" ? null : "today")}
                      >
                        Today
                      </Button>
                      <Button 
                        variant={dueDateFilter === "week" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDueDateFilter(dueDateFilter === "week" ? null : "week")}
                      >
                        This Week
                      </Button>
                      <Button 
                        variant={dueDateFilter === "overdue" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDueDateFilter(dueDateFilter === "overdue" ? null : "overdue")}
                      >
                        Overdue
                      </Button>
                      <Button 
                        variant={dueDateFilter === "none" ? "default" : "outline"} 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDueDateFilter(dueDateFilter === "none" ? null : "none")}
                      >
                        No Date
                      </Button>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <h4 className="mb-2 text-sm font-medium">Assigned To</h4>
                    <Select 
                      value={assigneeFilter?.toString() || ""}
                      onValueChange={(value) => setAssigneeFilter(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any Assignee</SelectItem>
                        {users?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="-1">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setStatusFilter(null);
                        setPriorityFilter(null);
                        setAssigneeFilter(null);
                        setDueDateFilter(null);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button onClick={() => window.location.href = "/projects/new-task"}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>
          
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasksError ? (
            <div className="text-center py-10">
              <p className="text-destructive">Error loading tasks. Please try again.</p>
            </div>
          ) : !allTasks || allTasks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No tasks found. Create your first task!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allTasks
                .filter((task: any) => {
                  // Text search filter
                  const matchesSearch = searchQuery === "" || 
                    task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (task.notes && task.notes.toLowerCase().includes(searchQuery.toLowerCase()));
                  
                  // Status filter
                  const matchesStatus = !statusFilter || task.status === statusFilter;
                  
                  // Priority filter
                  const matchesPriority = !priorityFilter || task.priority === priorityFilter;
                  
                  // Assignee filter
                  const matchesAssignee = !assigneeFilter ||
                    (assigneeFilter === -1 && !task.assignedTo) ||
                    task.assignedTo === assigneeFilter;
                  
                  // Due date filter
                  let matchesDueDate = true;
                  if (dueDateFilter) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    
                    switch (dueDateFilter) {
                      case "today":
                        matchesDueDate = task.dueDate && isToday(new Date(task.dueDate));
                        break;
                      case "week":
                        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                        matchesDueDate = dueDate && 
                          dueDate >= today && 
                          dueDate < nextWeek;
                        break;
                      case "overdue":
                        matchesDueDate = task.dueDate && 
                          isPast(new Date(task.dueDate)) && 
                          !isToday(new Date(task.dueDate));
                        break;
                      case "none":
                        matchesDueDate = !task.dueDate;
                        break;
                    }
                  }
                  
                  return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDueDate;
                })
                .sort((a: any, b: any) => {
                  // Sort by priority first, then by due date
                  const priorityOrder: Record<string, number> = { 
                    urgent: 0, high: 1, normal: 2, low: 3 
                  };
                  
                  // Handle missing priority values
                  const aVal = priorityOrder[a.priority || 'normal'] || 2;
                  const bVal = priorityOrder[b.priority || 'normal'] || 2;
                  
                  if (aVal !== bVal) return aVal - bVal;
                  
                  // If priority is same, sort by due date
                  if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }
                  
                  // Tasks with due dates come before those without
                  if (a.dueDate) return -1;
                  if (b.dueDate) return 1;
                  
                  // If neither has a due date, sort by created date
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((task: any) => {
                  const project = projects?.find((p: any) => p.id === task.projectId);
                  const unit = units?.find((u: any) => u.id === task.unitId);
                  const assignedUser = users?.find((u: any) => u.id === task.assignedTo);
                  
                  return (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{task.description}</h3>
                              {renderPriorityBadge(task.priority)}
                              {renderStatusBadge(task.status)}
                            </div>
                            
                            <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-x-3 gap-y-1">
                              {project && (
                                <a href={`/projects/${project.id}`} className="hover:underline">
                                  {project.title}
                                </a>
                              )}
                              {unit && <span>{unit.name}</span>}
                              {task.dueDate && (
                                <span className={`flex items-center ${
                                  isPast(new Date(task.dueDate)) && task.status !== "completed" 
                                    ? "text-red-500" 
                                    : ""
                                }`}>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  {isPast(new Date(task.dueDate)) && task.status !== "completed" && (
                                    <span className="ml-1">(Overdue)</span>
                                  )}
                                </span>
                              )}
                              {assignedUser && (
                                <span className="flex items-center">
                                  <Avatar className="h-4 w-4 mr-1">
                                    <AvatarFallback className="text-[8px]">{assignedUser.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  {assignedUser.name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 self-end md:self-auto">
                            {task.status !== "completed" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => completeTaskMutation.mutate(task.id)}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Complete
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setTaskDetailsOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Task Details Dialog */}
      <Dialog open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>Task Details</span>
                  {renderPriorityBadge(selectedTask.priority)}
                  {renderStatusBadge(selectedTask.status)}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask.taskType && (
                    <span className="capitalize">{selectedTask.taskType}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Description</h3>
                  <p>{selectedTask.description}</p>
                </div>
                
                {selectedTask.notes && (
                  <div>
                    <h3 className="font-medium mb-1">Notes</h3>
                    <p className="text-sm">{selectedTask.notes}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Project</h3>
                    <p className="text-sm">
                      {selectedTask.projectId && projects ? 
                        projects.find((p: any) => p.id === selectedTask.projectId)?.title || "Not assigned" 
                        : "Not assigned"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Unit</h3>
                    <p className="text-sm">
                      {selectedTask.unitId && units ? 
                        units.find((u: any) => u.id === selectedTask.unitId)?.name || "Not assigned" 
                        : "Not assigned"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Assigned To</h3>
                    <p className="text-sm">
                      {selectedTask.assignedTo && users ? 
                        users.find((u: any) => u.id === selectedTask.assignedTo)?.name || "Unassigned" 
                        : "Unassigned"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Due Date</h3>
                    <p className="text-sm">
                      {selectedTask.dueDate ? 
                        format(new Date(selectedTask.dueDate), "MMMM d, yyyy")
                        : "No due date"}
                    </p>
                  </div>
                </div>
                
                {selectedTask.images && selectedTask.images.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Images</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedTask.images.map((image: string, index: number) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                          <img src={image} alt={`Task image ${index+1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Created {selectedTask.createdAt ? format(new Date(selectedTask.createdAt), "MMM d, yyyy") : ""}
                    </p>
                    {selectedTask.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed {format(new Date(selectedTask.completedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setTaskDetailsOpen(false)}>
                      Close
                    </Button>
                    {selectedTask.status !== "completed" && (
                      <Button onClick={() => completeTaskMutation.mutate(selectedTask.id)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Spinner className="mx-auto mb-4" />
              <p>Loading task details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Project Dialog */}
      <Dialog 
        open={createDialogOpen || editingProject !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingProject(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject 
                ? "Update the details of your project" 
                : "Fill in the details to create a new project"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the project" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Renovation, Maintenance" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Unit</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value !== "none" ? parseInt(value) : null)}
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
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
                  control={form.control}
                  name="budgetEstimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Estimate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : Number(e.target.value);
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
                control={form.control}
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

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingProject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                >
                  {createProjectMutation.isPending || updateProjectMutation.isPending ? (
                    "Saving..."
                  ) : editingProject ? (
                    "Update Project"
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}