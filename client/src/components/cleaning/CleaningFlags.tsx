import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Flag,
  Warning,
  Info,
  ReportProblem,
  Person,
  CalendarMonth,
  PhotoCamera,
  Home,
  Assignment,
  FilterList,
  CheckCircle,
  Sort,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  Timeline,
} from "@mui/icons-material";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface CleaningFlagsProps {
  status?: string;
}

export default function CleaningFlags({ status }: CleaningFlagsProps = {}) {
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // State for dialogs
  const [showFlagDetails, setShowFlagDetails] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // State for selected flag and form inputs
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [assignToUserId, setAssignToUserId] = useState<string>("");
  const [newFlagData, setNewFlagData] = useState({
    cleaningTaskId: "",
    description: "",
    flagType: "quality-issue",
    priority: "normal",
    reportedBy: null,
    photos: [] as string[],
  });
  
  const queryClient = useQueryClient();
  
  // Fetch flags from the API
  const {
    data: flags,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/cleaning-flags"],
    queryFn: async () => {
      const response = await fetch("/api/cleaning-flags");
      if (!response.ok) {
        throw new Error("Failed to fetch cleaning flags");
      }
      return response.json();
    },
  });
  
  // Fetch units for reference
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });
  
  // Fetch users for reference (cleaners and managers)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Fetch cleaning tasks for reference
  const { data: cleaningTasks } = useQuery({
    queryKey: ["/api/cleaning-tasks"],
  });
  
  // Mutation for resolving flags
  const resolveFlagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/cleaning-flags/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          resolution: data.resolution,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to resolve flag");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-flags"] });
      toast({
        title: "Flag resolved",
        description: "The issue has been successfully resolved.",
      });
      setShowResolveDialog(false);
      setResolutionNotes("");
    },
    onError: (error) => {
      toast({
        title: "Failed to resolve flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for assigning flags
  const assignFlagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/cleaning-flags/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedTo: data.assignedTo,
          status: "assigned",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to assign flag");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-flags"] });
      toast({
        title: "Flag assigned",
        description: "The issue has been successfully assigned.",
      });
      setShowAssignDialog(false);
      setAssignToUserId("");
    },
    onError: (error) => {
      toast({
        title: "Failed to assign flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating new flags
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
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-flags"] });
      toast({
        title: "Flag created",
        description: "A new issue has been successfully flagged.",
      });
      setShowCreateDialog(false);
      setNewFlagData({
        cleaningTaskId: "",
        description: "",
        flagType: "quality-issue",
        priority: "normal",
        reportedBy: null,
        photos: [],
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Helper functions
  const getUnitName = (unitId: number) => {
    if (!units || !Array.isArray(units)) return `Unit #${unitId}`;
    const unit = units.find((u: any) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };
  
  const getUserName = (userId: number | null) => {
    if (!userId || !users || !Array.isArray(users)) return "Unassigned";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : "Unknown";
  };
  
  const getUserInitials = (userId: number | null) => {
    if (!userId || !users || !Array.isArray(users)) return "??";
    const user = users.find((u: any) => u.id === userId);
    if (!user) return "??";
    
    return user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy - h:mm a");
  };
  
  const getCleaningTaskFromFlag = (flag: any) => {
    if (!cleaningTasks || !Array.isArray(cleaningTasks)) return null;
    return cleaningTasks.find((task: any) => task.id === flag.cleaningTaskId);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-0">
            <Info className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "assigned":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-0">
            <Person className="h-3 w-3 mr-1" />
            Assigned
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-0">
            <Timeline className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case "escalated":
        return (
          <Badge className="bg-red-100 text-red-800 border-0">
            <ReportProblem className="h-3 w-3 mr-1" />
            Escalated
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Flag className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return (
          <Badge className="bg-green-50 text-green-600 border-0">
            Low
          </Badge>
        );
      case "normal":
        return (
          <Badge className="bg-blue-50 text-blue-600 border-0">
            Normal
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-yellow-50 text-yellow-600 border-0">
            High
          </Badge>
        );
      case "urgent":
        return (
          <Badge className="bg-red-50 text-red-600 border-0">
            Urgent
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {priority}
          </Badge>
        );
    }
  };
  
  // Handle form changes for new flag creation
  const handleNewFlagChange = (field: string, value: any) => {
    setNewFlagData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Handle photo uploads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This is a mock implementation - in a real app, you would upload to a server
    if (e.target.files && e.target.files.length > 0) {
      // Mock successful upload with placeholder URLs
      const newUrls = Array.from(e.target.files).map(
        (_, index) => `https://placehold.co/400x300?text=Issue+Photo+${index + 1}`
      );
      setNewFlagData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...newUrls],
      }));
      
      toast({
        title: "Photos uploaded",
        description: `${e.target.files.length} photos have been uploaded.`,
      });
    }
  };
  
  // Sort and filter flags
  const filteredAndSortedFlags = flags 
    ? [...flags]
        .filter((flag) => {
          // Status filter
          if (statusFilter !== "all" && flag.status !== statusFilter) {
            return false;
          }
          
          // Priority filter
          if (priorityFilter !== "all" && flag.priority !== priorityFilter) {
            return false;
          }
          
          // Search term filter (case insensitive)
          if (searchTerm) {
            const task = getCleaningTaskFromFlag(flag);
            const unitName = task ? getUnitName(task.unitId) : "";
            const reporterName = getUserName(flag.reportedBy);
            const assigneeName = getUserName(flag.assignedTo);
            
            const searchFields = [
              flag.description,
              flag.flagType,
              flag.priority,
              flag.status,
              unitName,
              reporterName,
              assigneeName,
            ].map((field) => String(field).toLowerCase());
            
            return searchFields.some((field) => field.includes(searchTerm.toLowerCase()));
          }
          
          return true;
        })
        .sort((a, b) => {
          // Handle different sort fields
          switch (sortBy) {
            case "createdAt":
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
              
            case "priority":
              const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
              const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
              const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
              return sortDirection === "asc" ? priorityA - priorityB : priorityB - priorityA;
              
            case "status":
              const statusOrder = { open: 0, assigned: 1, "in-progress": 2, escalated: 3, resolved: 4 };
              const statusA = statusOrder[a.status as keyof typeof statusOrder] || 0;
              const statusB = statusOrder[b.status as keyof typeof statusOrder] || 0;
              return sortDirection === "asc" ? statusA - statusB : statusB - statusA;
              
            default:
              return 0;
          }
        })
    : [];
  
  // Flag type display
  const getFlagTypeDisplay = (flagType: string) => {
    switch (flagType) {
      case "quality-issue":
        return "Quality Issue";
      case "cleaner-reported":
        return "Cleaner Reported";
      case "guest-complaint":
        return "Guest Complaint";
      case "maintenance-needed":
        return "Maintenance Needed";
      case "supply-issue":
        return "Supply Issue";
      default:
        return flagType;
    }
  };
  
  // Handle sort toggle
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc"); // Default to descending when changing sort field
    }
  };
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        <span className="ml-2">Loading cleaning flags...</span>
      </div>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading cleaning flags</p>
        <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Controls - Search, Filter, and Create */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search flags..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <FilterList className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <div className="p-2">
                <p className="text-xs font-medium mb-1 text-gray-500">Status</p>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-2 pt-0">
                <p className="text-xs font-medium mb-1 text-gray-500">Priority</p>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sort className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort("createdAt")}>
                <div className="flex items-center">
                  <CalendarMonth className="h-4 w-4 mr-2" />
                  Sort by Date
                  {sortBy === "createdAt" && (
                    sortDirection === "asc"
                      ? <ArrowUpward className="h-4 w-4 ml-2" />
                      : <ArrowDownward className="h-4 w-4 ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("priority")}>
                <div className="flex items-center">
                  <Warning className="h-4 w-4 mr-2" />
                  Sort by Priority
                  {sortBy === "priority" && (
                    sortDirection === "asc"
                      ? <ArrowUpward className="h-4 w-4 ml-2" />
                      : <ArrowDownward className="h-4 w-4 ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("status")}>
                <div className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Sort by Status
                  {sortBy === "status" && (
                    sortDirection === "asc"
                      ? <ArrowUpward className="h-4 w-4 ml-2" />
                      : <ArrowDownward className="h-4 w-4 ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Flag className="h-4 w-4 mr-2" />
          Flag New Issue
        </Button>
      </div>
      
      {/* Flags Table */}
      <Card>
        <CardHeader className="bg-[#f9fafb] border-b pb-3">
          <CardTitle className="text-lg">Cleaning Issues</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedFlags.length > 0 ? (
                filteredAndSortedFlags.map((flag) => {
                  const task = getCleaningTaskFromFlag(flag);
                  return (
                    <TableRow 
                      key={flag.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedFlag(flag);
                        setShowFlagDetails(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                          <span>
                            {task ? getUnitName(task.unitId) : `Task #${flag.cleaningTaskId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1 max-w-[150px]">
                          {flag.description}
                        </span>
                      </TableCell>
                      <TableCell>{getFlagTypeDisplay(flag.flagType)}</TableCell>
                      <TableCell>{getStatusBadge(flag.status)}</TableCell>
                      <TableCell>{getPriorityBadge(flag.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback>{getUserInitials(flag.reportedBy)}</AvatarFallback>
                          </Avatar>
                          <span className="line-clamp-1 max-w-[100px]">
                            {getUserName(flag.reportedBy)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarMonth className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                          <span className="text-sm">
                            {formatDate(flag.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag.assignedTo ? (
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback>{getUserInitials(flag.assignedTo)}</AvatarFallback>
                            </Avatar>
                            <span className="line-clamp-1 max-w-[100px]">
                              {getUserName(flag.assignedTo)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFlag(flag);
                              setShowFlagDetails(true);
                            }}
                          >
                            <Visibility className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {flag.status !== "resolved" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFlag(flag);
                                setShowResolveDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-[#9EA2B1]">
                    {flags && flags.length > 0
                      ? "No flags match your filter criteria"
                      : "No cleaning issues have been flagged"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Flag Details Dialog */}
      <Dialog open={showFlagDetails} onOpenChange={setShowFlagDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {getFlagTypeDisplay(selectedFlag.flagType)}
                  </h3>
                  <p className="text-sm text-[#9EA2B1]">
                    {formatDate(selectedFlag.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedFlag.status)}
                  {getPriorityBadge(selectedFlag.priority)}
                </div>
              </div>
              
              <div className="border rounded-md p-3 bg-gray-50">
                <p className="text-sm">{selectedFlag.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-[#9EA2B1] mb-1">Reported By</h4>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback>{getUserInitials(selectedFlag.reportedBy)}</AvatarFallback>
                    </Avatar>
                    <span>{getUserName(selectedFlag.reportedBy)}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#9EA2B1] mb-1">Assigned To</h4>
                  {selectedFlag.assignedTo ? (
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>{getUserInitials(selectedFlag.assignedTo)}</AvatarFallback>
                      </Avatar>
                      <span>{getUserName(selectedFlag.assignedTo)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">Unassigned</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowFlagDetails(false);
                          setShowAssignDialog(true);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedFlag.resolvedAt && (
                <div>
                  <h4 className="text-sm font-medium text-[#9EA2B1] mb-1">Resolution</h4>
                  <div className="border rounded-md p-3 bg-gray-50">
                    <p className="text-sm">{selectedFlag.resolution || "Marked as resolved"}</p>
                    <p className="text-xs text-[#9EA2B1] mt-1">
                      Resolved at {formatDate(selectedFlag.resolvedAt)} by {getUserName(selectedFlag.resolvedBy)}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedFlag.photos && selectedFlag.photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#9EA2B1] mb-1">Photos</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFlag.photos.map((photo: string, index: number) => (
                      <a
                        key={index}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-16 h-16 rounded bg-gray-100 relative"
                      >
                        <img
                          src={photo}
                          className="w-full h-full object-cover rounded"
                          alt={`Issue photo ${index + 1}`}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-2">
                {selectedFlag.status !== "resolved" && (
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowFlagDetails(false);
                      setShowResolveDialog(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Issue
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Resolve Flag Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Issue</DialogTitle>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="py-4 space-y-4">
              <div className="border rounded-md p-3 bg-gray-50">
                <h3 className="font-medium">{getFlagTypeDisplay(selectedFlag.flagType)}</h3>
                <p className="text-sm mt-1">{selectedFlag.description}</p>
              </div>
              
              <div>
                <Label htmlFor="resolution" className="block mb-1">
                  Resolution Notes
                </Label>
                <Textarea
                  id="resolution"
                  placeholder="Explain how this issue was resolved..."
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolveDialog(false);
                    setResolutionNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    resolveFlagMutation.mutate({
                      id: selectedFlag.id,
                      resolution: resolutionNotes,
                    });
                  }}
                  disabled={resolveFlagMutation.isPending}
                >
                  {resolveFlagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Resolved
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Assign Flag Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Issue</DialogTitle>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="assign-to" className="block mb-1">
                  Assign To
                </Label>
                <Select value={assignToUserId} onValueChange={setAssignToUserId}>
                  <SelectTrigger id="assign-to">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users && Array.isArray(users) ? (
                      users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="">No users available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!assignToUserId) return;
                    
                    assignFlagMutation.mutate({
                      id: selectedFlag.id,
                      assignedTo: parseInt(assignToUserId),
                    });
                  }}
                  disabled={!assignToUserId || assignFlagMutation.isPending}
                >
                  {assignFlagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Person className="h-4 w-4 mr-2" />
                  )}
                  Assign Issue
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create Flag Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Flag New Issue</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="task-id" className="block mb-1">
                Cleaning Task
              </Label>
              <Select
                value={newFlagData.cleaningTaskId}
                onValueChange={(value) => handleNewFlagChange("cleaningTaskId", value)}
              >
                <SelectTrigger id="task-id">
                  <SelectValue placeholder="Select a cleaning task" />
                </SelectTrigger>
                <SelectContent>
                  {cleaningTasks && Array.isArray(cleaningTasks) ? (
                    cleaningTasks.map((task: any) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        {getUnitName(task.unitId)} - {task.cleaningType || "Standard"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="">No cleaning tasks available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="flag-type" className="block mb-1">
                Issue Type
              </Label>
              <Select
                value={newFlagData.flagType}
                onValueChange={(value) => handleNewFlagChange("flagType", value)}
              >
                <SelectTrigger id="flag-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality-issue">Quality Issue</SelectItem>
                  <SelectItem value="cleaner-reported">Cleaner Reported</SelectItem>
                  <SelectItem value="guest-complaint">Guest Complaint</SelectItem>
                  <SelectItem value="maintenance-needed">Maintenance Needed</SelectItem>
                  <SelectItem value="supply-issue">Supply Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority" className="block mb-1">
                Priority
              </Label>
              <Select
                value={newFlagData.priority}
                onValueChange={(value) => handleNewFlagChange("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="description" className="block mb-1">
                Issue Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                rows={4}
                value={newFlagData.description}
                onChange={(e) => handleNewFlagChange("description", e.target.value)}
              />
            </div>
            
            <div>
              <Label className="block mb-1">
                Photos
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newFlagData.photos.map((url, index) => (
                  <div key={index} className="w-16 h-16 rounded bg-gray-100 relative">
                    <img
                      src={url}
                      className="w-full h-full object-cover rounded"
                      alt={`Uploaded ${index + 1}`}
                    />
                  </div>
                ))}
                
                <label htmlFor="photo-upload" className="w-16 h-16 flex items-center justify-center rounded border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                  <PhotoCamera className="h-6 w-6 text-gray-400" />
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-[#9EA2B1]">
                Upload photos of the issue
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Simple validation
                  if (!newFlagData.cleaningTaskId || !newFlagData.description) {
                    toast({
                      title: "Missing information",
                      description: "Please select a cleaning task and provide a description.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  createFlagMutation.mutate({
                    ...newFlagData,
                    cleaningTaskId: parseInt(newFlagData.cleaningTaskId),
                    reportedBy: users?.[0]?.id || null, // Use first user as reporter for demo
                    status: "open",
                  });
                }}
                disabled={
                  !newFlagData.cleaningTaskId || 
                  !newFlagData.description ||
                  createFlagMutation.isPending
                }
              >
                {createFlagMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4 mr-2" />
                )}
                Flag Issue
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}