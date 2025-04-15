import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Add,
  FilterList,
  Build,
  Check,
  PriorityHigh,
  Home,
  Person,
  CalendarMonth,
  AttachMoney,
  Description,
  Engineering,
  Business,
  AssignmentInd,
  Delete,
  Edit,
  PhotoLibrary,
} from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarView } from "@/components/ui/calendar-view";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import { insertMaintenanceSchema, aiPromptSchema, Maintenance, AiPromptFormValues } from "@shared/schema";

// Extended maintenance schema with validation rules for form
const createMaintenanceSchema = insertMaintenanceSchema.extend({
  description: z.string().min(5, "Description must be at least 5 characters"),
  unitId: z.number({
    required_error: "Please select a property",
    invalid_type_error: "Please select a property",
  }),
  priority: z.enum(["low", "normal", "high", "urgent"], {
    required_error: "Please select a priority level",
  }),
  cost: z.number().optional(),
});

// Type for the form values
type CreateMaintenanceFormValues = z.infer<typeof createMaintenanceSchema>;

// Using aiPromptSchema and AiPromptFormValues imported from shared schema

export default function MaintenancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tickets");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch maintenance items
  const {
    data: maintenance,
    isLoading,
    error,
    refetch: refetchMaintenance,
  } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenance"],
  });

  // Fetch units for reference
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  // Fetch vendors for reference
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Create maintenance mutation
  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: CreateMaintenanceFormValues) => {
      return apiRequest("POST", "/api/maintenance", data);
    },
    onSuccess: () => {
      toast({
        title: "Maintenance ticket created",
        description: "The maintenance ticket has been created successfully",
        variant: "default",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create maintenance ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // AI generated maintenance ticket mutation
  const generateTicketMutation = useMutation<
    { description: string; priority: string; notes?: string; cost?: number },
    Error,
    AiPromptFormValues
  >({
    mutationFn: async (data: AiPromptFormValues) => {
      const response = await apiRequest("POST", "/api/maintenance/generate", data);
      const responseData = await response.json();
      return responseData;
    },
    onSuccess: (data) => {
      toast({
        title: "Ticket generated",
        description: "AI has generated ticket details based on your prompt",
        variant: "default",
      });
      setIsAiPromptOpen(false);
      promptForm.reset();
      setIsGeneratingTicket(false);
      
      // Fill the create form with the generated data
      createForm.setValue("description", data.description);
      createForm.setValue("priority", data.priority);
      if (data.notes) createForm.setValue("notes", data.notes);
      if (data.cost) createForm.setValue("cost", data.cost / 100); // Convert cents to dollars
      
      // Open create dialog with pre-filled data
      setIsCreateDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate ticket",
        description: error.message,
        variant: "destructive",
      });
      setIsGeneratingTicket(false);
    },
  });

  // Update maintenance mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Maintenance> }) => {
      return apiRequest("PATCH", `/api/maintenance/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Maintenance ticket updated",
        description: "The maintenance ticket has been updated successfully",
        variant: "default",
      });
      setIsEditDialogOpen(false);
      setEditingMaintenance(null);
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update maintenance ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete maintenance mutation
  const completeMaintenanceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/maintenance/${id}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Maintenance completed",
        description: "The maintenance ticket has been marked as completed",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete maintenance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign vendor mutation
  const assignVendorMutation = useMutation({
    mutationFn: async ({ id, vendorId }: { id: number; vendorId: number }) => {
      return apiRequest("PATCH", `/api/maintenance/${id}`, {
        vendorId,
        status: "in-progress",
      });
    },
    onSuccess: () => {
      toast({
        title: "Vendor assigned",
        description: "The vendor has been assigned to the maintenance ticket",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI prompt form
  const promptForm = useForm<AiPromptFormValues>({
    resolver: zodResolver(aiPromptSchema),
    defaultValues: {
      prompt: "",
    },
  });
  
  // Handle submitting the AI prompt form
  const onSubmitPrompt = (data: AiPromptFormValues) => {
    setIsGeneratingTicket(true);
    generateTicketMutation.mutate(data);
  };
  
  // Create form
  const createForm = useForm<CreateMaintenanceFormValues>({
    resolver: zodResolver(createMaintenanceSchema),
    defaultValues: {
      description: "",
      unitId: undefined,
      priority: "normal",
      notes: "",
      vendorId: undefined,
      cost: undefined,
    },
  });

  // Edit form
  const editForm = useForm<Partial<Maintenance>>({
    resolver: zodResolver(createMaintenanceSchema.partial()),
  });

  // Helper function to get unit name
  const getUnitName = (unitId: number) => {
    if (!units) return `Unit #${unitId}`;
    const unit = units.find((u) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  // Helper function to get vendor name
  const getVendorName = (vendorId: number | null | undefined) => {
    if (!vendorId || !vendors) return "Unassigned";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : "Unknown";
  };

  // Format currency for cost display
  const formatCurrency = (cents: number | null | undefined) => {
    if (cents == null) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Get priority label and styling
  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return <Badge className="bg-green-100 text-green-800 border-0">Normal</Badge>;
    
    const styleMap: Record<string, { bg: string; text: string }> = {
      low: { bg: "bg-blue-100", text: "text-blue-800" },
      normal: { bg: "bg-green-100", text: "text-green-800" },
      high: { bg: "bg-yellow-100", text: "text-yellow-800" },
      urgent: { bg: "bg-red-100", text: "text-red-800" },
    };
    
    const style = styleMap[priority] || styleMap.normal;
    
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        {priority === "urgent" && <PriorityHigh className="h-3 w-3 mr-1" />}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 border-0">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-0">
            <Engineering className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-0">
            <PriorityHigh className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
    }
  };

  // Handle submitting the create form
  const onSubmitCreate = (data: CreateMaintenanceFormValues) => {
    // Convert dollar amount to cents for storage
    if (data.cost) {
      data.cost = Math.round(data.cost * 100);
    }
    createMaintenanceMutation.mutate(data);
  };

  // Handle submitting the edit form
  const onSubmitEdit = (data: Partial<Maintenance>) => {
    if (!editingMaintenance) return;
    
    // Convert dollar amount to cents for storage
    if (data.cost) {
      data.cost = Math.round(data.cost * 100);
    }
    
    updateMaintenanceMutation.mutate({
      id: editingMaintenance.id,
      data,
    });
  };

  // Handle clicking edit on a maintenance item
  const handleEditClick = (item: Maintenance) => {
    setEditingMaintenance(item);
    setIsEditDialogOpen(true);
    
    // Convert cents to dollars for display
    const costInDollars = item.cost ? item.cost / 100 : undefined;
    
    editForm.reset({
      description: item.description,
      unitId: item.unitId,
      priority: item.priority,
      notes: item.notes,
      vendorId: item.vendorId,
      cost: costInDollars,
    });
  };

  // Filter maintenance based on search, status, and priority
  const filteredMaintenance = maintenance
    ? maintenance.filter(
        (item) => {
          const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = filterStatus ? item.status === filterStatus : true;
          const matchesPriority = filterPriority ? item.priority === filterPriority : true;
          return matchesSearch && matchesStatus && matchesPriority;
        }
      )
    : [];
  
  // Open tickets and completed tickets for the tickets tab
  const openTickets = filteredMaintenance.filter(item => item.status !== "completed");
  const completedTickets = filteredMaintenance.filter(item => item.status === "completed");

  // Calculate stats for dashboard
  const totalTickets = maintenance ? maintenance.length : 0;
  const openTicketsCount = maintenance ? maintenance.filter(item => item.status !== "completed").length : 0;
  const urgentTicketsCount = maintenance ? maintenance.filter(item => item.priority === "urgent" && item.status !== "completed").length : 0;
  const percentComplete = totalTickets ? Math.round(((totalTickets - openTicketsCount) / totalTickets) * 100) : 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-red-500">Error loading maintenance data</p>
          <Button 
            onClick={() => refetchMaintenance()} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Page Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Maintenance</h1>
            <p className="text-[#9EA2B1]">Manage maintenance tickets and projects</p>
          </div>

          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search maintenance..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FilterList className="h-4 w-4 mr-2" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setFilterStatus(null);
                  setFilterPriority(null);
                }}>
                  All Tickets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("urgent")}>
                  Urgent Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("open")}>
                  Open Tickets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("in-progress")}>
                  In Progress Tickets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isAiPromptOpen} onOpenChange={setIsAiPromptOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mr-2">
                  <Engineering className="h-4 w-4 mr-2" />
                  <span>AI Generate</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate Maintenance Ticket with AI</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Describe the maintenance issue in plain language and let AI create a ticket for you.
                  </p>
                </DialogHeader>
                
                <Form {...promptForm}>
                  <form onSubmit={promptForm.handleSubmit(onSubmitPrompt)} className="space-y-6">
                    <FormField
                      control={promptForm.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Describe the issue</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="E.g. The kitchen faucet in unit 203 is leaking water at the base when turned on. It started yesterday and is getting worse."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="submit" 
                        disabled={isGeneratingTicket || !promptForm.formState.isValid}
                      >
                        {isGeneratingTicket && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Ticket
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Add className="h-4 w-4 mr-2" />
                  <span>New Ticket</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Maintenance Ticket</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
                    <FormField
                      control={createForm.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units?.map((unit) => (
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
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the maintenance issue"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
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
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Vendor (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "unassigned" ? null : Number(value))}
                            defaultValue={field.value?.toString() || "unassigned"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {vendors?.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Cost (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-6"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any additional notes or details"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createMaintenanceMutation.isPending}
                      >
                        {createMaintenanceMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Ticket
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Maintenance Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#9EA2B1] text-sm">Total Tickets</p>
                  <h3 className="text-2xl font-bold">{totalTickets}</h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-full">
                  <Build className="text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#9EA2B1] text-sm">Open Tickets</p>
                  <h3 className="text-2xl font-bold">{openTicketsCount}</h3>
                </div>
                <div className="bg-yellow-50 p-3 rounded-full">
                  <Engineering className="text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#9EA2B1] text-sm">Urgent Issues</p>
                  <h3 className="text-2xl font-bold">{urgentTicketsCount}</h3>
                </div>
                <div className="bg-red-50 p-3 rounded-full">
                  <PriorityHigh className="text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <p className="text-[#9EA2B1] text-sm">Completion Rate</p>
                <h3 className="text-2xl font-bold mb-2">{percentComplete}%</h3>
                <Progress value={percentComplete} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs
          defaultValue="tickets"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openTickets.length > 0 ? (
                      openTickets.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.description}</div>
                            <div className="text-xs text-[#9EA2B1]">
                              Created: {format(new Date(item.createdAt), "MMM dd, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                              <span>{getUnitName(item.unitId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Business className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                              <span>{getVendorName(item.vendorId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <AttachMoney className="h-4 w-4 text-[#9EA2B1]" />
                              <span>{formatCurrency(item.cost)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <AssignmentInd className="h-4 w-4 mr-1" />
                                    Assign
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {vendors?.map((vendor) => (
                                    <DropdownMenuItem
                                      key={vendor.id}
                                      onClick={() => assignVendorMutation.mutate({ id: item.id, vendorId: vendor.id })}
                                    >
                                      {vendor.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => completeMaintenanceMutation.mutate(item.id)}
                                disabled={completeMaintenanceMutation.isPending}
                              >
                                {completeMaintenanceMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1" />
                                )}
                                Complete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-[#9EA2B1]"
                        >
                          No open maintenance tickets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Completed Tickets */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-[#2C2E3E] mb-4">
                Recently Completed
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTickets.length > 0 ? (
                        completedTickets.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.description}</div>
                              <div className="text-xs text-[#9EA2B1]">
                                ID: #{item.id}
                              </div>
                            </TableCell>
                            <TableCell>{getUnitName(item.unitId)}</TableCell>
                            <TableCell>{getVendorName(item.vendorId)}</TableCell>
                            <TableCell>
                              {item.completedAt
                                ? format(new Date(item.completedAt), "MMM dd, yyyy")
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{formatCurrency(item.cost)}</div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditClick(item)}
                              >
                                <Description className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-[#9EA2B1]"
                          >
                            No completed maintenance tickets found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-0">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Active Projects</h3>
                  </div>
                  <div className="divide-y">
                    <div className="p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Beach House Bathroom Remodel</div>
                          <div className="text-sm text-[#9EA2B1] mt-1">
                            <span className="flex items-center">
                              <CalendarMonth className="h-3 w-3 mr-1" />
                              Aug 10 - Sep 15, 2023
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 border-0">In Progress</Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>38%</span>
                        </div>
                        <Progress value={38} className="h-1.5" />
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Downtown Loft HVAC Replacement</div>
                          <div className="text-sm text-[#9EA2B1] mt-1">
                            <span className="flex items-center">
                              <CalendarMonth className="h-3 w-3 mr-1" />
                              Jul 20 - Aug 30, 2023
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 border-0">In Progress</Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>72%</span>
                        </div>
                        <Progress value={72} className="h-1.5" />
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Lakeside Cabin Deck Extension</div>
                          <div className="text-sm text-[#9EA2B1] mt-1">
                            <span className="flex items-center">
                              <CalendarMonth className="h-3 w-3 mr-1" />
                              Aug 1 - Oct 30, 2023
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 border-0">In Progress</Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>15%</span>
                        </div>
                        <Progress value={15} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <Button variant="outline" className="w-full">View All Projects</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Project Details</h3>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">+ Add Task</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-semibold">Beach House Bathroom Remodel</h4>
                      <div className="text-[#9EA2B1] mt-1">Project #PRJ-2023-12</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-3">
                        <div className="text-sm text-[#9EA2B1]">Timeline</div>
                        <div className="font-medium mt-1">Aug 10 - Sep 15, 2023</div>
                      </div>
                      
                      <div className="border rounded-lg p-3">
                        <div className="text-sm text-[#9EA2B1]">Budget</div>
                        <div className="font-medium mt-1">$8,500.00</div>
                      </div>
                      
                      <div className="border rounded-lg p-3">
                        <div className="text-sm text-[#9EA2B1]">Current Spend</div>
                        <div className="font-medium mt-1">$3,240.00 (38%)</div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-3">Project Tasks</h5>
                      <div className="space-y-2">
                        <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                              <div>
                                <div className="font-medium">Demo existing bathroom</div>
                                <div className="text-sm text-[#9EA2B1]">Completed: Aug 12, 2023</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">$1,200.00</div>
                              <div className="text-xs text-[#9EA2B1]">Vendor: Demolition Pros</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                              <div>
                                <div className="font-medium">Rough-in plumbing</div>
                                <div className="text-sm text-[#9EA2B1]">Completed: Aug 18, 2023</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">$2,040.00</div>
                              <div className="text-xs text-[#9EA2B1]">Vendor: Smith Plumbing</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <Engineering className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                              <div>
                                <div className="font-medium">Tile installation</div>
                                <div className="text-sm text-[#9EA2B1]">In progress</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">$2,800.00</div>
                              <div className="text-xs text-[#9EA2B1]">Vendor: Luxury Tile Co.</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3 border-dashed">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2 mt-0.5"></div>
                              <div>
                                <div className="font-medium">Fixture installation</div>
                                <div className="text-sm text-[#9EA2B1]">Scheduled for Sep 1, 2023</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">$1,500.00</div>
                              <div className="text-xs text-[#9EA2B1]">Vendor: Smith Plumbing</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3 border-dashed">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2 mt-0.5"></div>
                              <div>
                                <div className="font-medium">Final inspection and cleanup</div>
                                <div className="text-sm text-[#9EA2B1]">Scheduled for Sep 12, 2023</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">$960.00</div>
                              <div className="text-xs text-[#9EA2B1]">Vendor: TBD</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-3">Notes</h5>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <p className="text-sm">Owner requested upgraded fixtures to Kohler brand (+$400). Guest bookings blocked until September 15th to account for any potential delays.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-0">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Vendor Directory</h3>
                    <Button size="sm">
                      <Add className="h-4 w-4 mr-1" />
                      Add Vendor
                    </Button>
                  </div>
                  <div className="p-4">
                    <Input
                      type="text"
                      placeholder="Search vendors..."
                      className="mb-4"
                    />
                    <div className="space-y-2">
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Smith Plumbing</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Plumbing, Fixtures</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Elite HVAC Services</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">HVAC, Maintenance</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Luxury Tile Co.</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Flooring, Tile, Stone</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Quick Electric</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Electrical, Lighting</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Reliable Roofing</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Roofing, Gutters</div>
                      </div>
                      
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium">Demolition Pros</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Demolition, Hauling</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Vendor Details</h3>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">Contact</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-semibold">Smith Plumbing</h4>
                      <div className="text-[#9EA2B1] mt-1">Licensed & Insured • 4.8 ★ (26 ratings)</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3">
                        <div className="text-sm text-[#9EA2B1]">Contact</div>
                        <div className="font-medium mt-1">John Smith</div>
                        <div className="text-sm mt-1">(555) 123-4567</div>
                        <div className="text-sm">john@smithplumbing.com</div>
                      </div>
                      
                      <div className="border rounded-lg p-3">
                        <div className="text-sm text-[#9EA2B1]">Service Areas</div>
                        <div className="font-medium mt-1">All Properties</div>
                        <div className="text-sm mt-1">Response Time: 24 hours</div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-3">Service History</h5>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Aug 18, 2023</TableCell>
                            <TableCell>Beach House</TableCell>
                            <TableCell>Bathroom Remodel Plumbing</TableCell>
                            <TableCell>$2,040.00</TableCell>
                            <TableCell>⭐⭐⭐⭐⭐</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Jul 12, 2023</TableCell>
                            <TableCell>Downtown Loft</TableCell>
                            <TableCell>Leaking Faucet Repair</TableCell>
                            <TableCell>$175.00</TableCell>
                            <TableCell>⭐⭐⭐⭐</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Jun 03, 2023</TableCell>
                            <TableCell>Lakeside Cabin</TableCell>
                            <TableCell>Water Heater Replacement</TableCell>
                            <TableCell>$1,250.00</TableCell>
                            <TableCell>⭐⭐⭐⭐⭐</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-3">Documents & Notes</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center">
                            <Description className="h-5 w-5 text-blue-500 mr-2" />
                            <div>
                              <div className="font-medium">Insurance Certificate</div>
                              <div className="text-xs text-[#9EA2B1]">Expires: Dec 31, 2023</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center">
                            <Description className="h-5 w-5 text-blue-500 mr-2" />
                            <div>
                              <div className="font-medium">Service Contract</div>
                              <div className="text-xs text-[#9EA2B1]">Signed: Jan 15, 2023</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-3 mt-4 bg-gray-50">
                        <p className="text-sm">John is very responsive and does quality work. Preferred vendor for all plumbing needs. Offers 24/7 emergency service with 20% markup.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Maintenance Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Ticket</DialogTitle>
          </DialogHeader>
          {editingMaintenance && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the maintenance issue"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || "normal"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editingMaintenance.status !== "completed" && (
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || editingMaintenance.status}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editForm.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Vendor</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "unassigned" ? null : Number(value))}
                        defaultValue={field.value?.toString() || "unassigned"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {vendors?.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-6"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes"
                          rows={2}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingMaintenance(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateMaintenanceMutation.isPending}
                  >
                    {updateMaintenanceMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
