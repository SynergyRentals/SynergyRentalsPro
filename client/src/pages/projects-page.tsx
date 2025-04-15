import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Calendar, Check, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatDistance } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function ProjectsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  // Fetch projects
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
    select: (data) => {
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch units for dropdown
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
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
  useState(() => {
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
  });

  // Handle project creation/update
  const onSubmit = (values: ProjectFormValues) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, values });
    } else {
      createProjectMutation.mutate(values);
    }
  };

  // Filter projects based on search and tab
  const filteredProjects = projects?.filter((project: any) => {
    const matchesSearch = searchQuery === "" || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && project.status === activeTab;
  });

  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "on-hold":
        return <Badge className="bg-yellow-500">On Hold</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects & Tasks</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex justify-between items-center space-x-4">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="on-hold">On Hold</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
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
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-destructive">Error loading projects. Please try again.</p>
            </div>
          ) : filteredProjects?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No projects found. Create your first project!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects?.map((project: any) => (
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
                    <CardDescription>
                      {project.category && <span className="mr-2">{project.category}</span>}
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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