import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  MoreVertical,
  Flag,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  User,
  Home,
  Calendar
} from "lucide-react";

// Cleaning Flag component displays all cleaning flags with filtering capabilities
interface CleaningFlagsProps {
  status?: string;
}

export default function CleaningFlags({ status }: CleaningFlagsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(status || null);
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch all cleaning flags
  const { 
    data: flags, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/cleaning-flags", statusFilter],
    queryFn: async () => {
      const url = statusFilter ? 
        `/api/cleaning-flags?status=${statusFilter}` : 
        `/api/cleaning-flags`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch cleaning flags");
      }
      return response.json();
    }
  });

  // Mutation to update a flag (resolve, escalate, etc.)
  const updateFlagMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/cleaning-flags/${updates.id}`, {
        method: "PATCH",
        data: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-flags"] });
      toast({
        title: "Flag updated",
        description: "The cleaning flag has been updated successfully.",
      });
      setIsResolveDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update flag",
        description: "There was an error updating the cleaning flag.",
        variant: "destructive",
      });
    },
  });

  // Filter flags based on search term
  const filteredFlags = flags ? flags.filter((flag: any) => 
    flag.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Handle resolving a flag
  const handleResolveFlag = () => {
    if (!selectedFlag || !resolution) return;
    
    updateFlagMutation.mutate({
      id: selectedFlag.id,
      status: "resolved",
      resolution: resolution,
      resolvedAt: new Date(),
    });
  };

  // Helper to render flag status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 border-0">In Progress</Badge>;
      case "escalated":
        return <Badge className="bg-orange-100 text-orange-800 border-0">Escalated</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 border-0">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Helper to render flag priority with appropriate color
  const renderPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 border-0">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-800 border-0">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading cleaning flags...</span>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mr-2" />
        <span>Failed to load cleaning flags. Please try again.</span>
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Flag className="h-5 w-5 mr-2 text-red-500" />
            Cleaning Flags
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search flags..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter || ""} onValueChange={(val) => setStatusFilter(val || null)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {filteredFlags.length > 0 ? (
            <div className="space-y-3">
              {filteredFlags.map((flag: any) => (
                <div 
                  key={flag.id} 
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setSelectedFlag(flag);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flag.flagType}</span>
                        {renderStatusBadge(flag.status)}
                        {renderPriorityBadge(flag.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{flag.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <Home className="h-3 w-3 mr-1" />
                        <span>Unit #{flag.cleaningTask?.unitId || "Unknown"}</span>
                        <span className="mx-2">•</span>
                        <User className="h-3 w-3 mr-1" />
                        <span>Reported by {flag.reportedByUser?.name || "Unknown"}</span>
                        <span className="mx-2">•</span>
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{new Date(flag.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFlag(flag);
                          setIsResolveDialogOpen(true);
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateFlagMutation.mutate({
                            id: flag.id,
                            status: "in-progress",
                          });
                        }}>
                          <Clock className="h-4 w-4 mr-2" />
                          Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          updateFlagMutation.mutate({
                            id: flag.id,
                            status: "escalated",
                          });
                        }}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Escalate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Flag className="h-12 w-12 mb-3 opacity-20" />
              <p>No cleaning flags found</p>
              <p className="text-sm">
                {statusFilter ? "Try changing your status filter" : "All cleans are looking good!"}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Flag Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          {selectedFlag && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Flag className="h-5 w-5 mr-2 text-red-500" />
                  Flag Details
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <h3 className="font-semibold mb-1">Flag Type</h3>
                  <p>{selectedFlag.flagType}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Status</h3>
                  <p>{renderStatusBadge(selectedFlag.status)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Priority</h3>
                  <p>{renderPriorityBadge(selectedFlag.priority)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Reported on</h3>
                  <p>{new Date(selectedFlag.createdAt).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="font-semibold mb-1">Description</h3>
                  <p className="text-gray-700">{selectedFlag.description}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="font-semibold mb-1">Photos</h3>
                  {selectedFlag.photos && selectedFlag.photos.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {selectedFlag.photos.map((photo: string, index: number) => (
                        <img 
                          key={index}
                          src={photo} 
                          alt={`Flag photo ${index + 1}`}
                          className="h-20 w-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No photos available</p>
                  )}
                </div>
                {selectedFlag.resolution && (
                  <div className="col-span-2">
                    <h3 className="font-semibold mb-1">Resolution</h3>
                    <p className="text-gray-700">{selectedFlag.resolution}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                {selectedFlag.status !== "resolved" && (
                  <Button 
                    onClick={() => {
                      setIsResolveDialogOpen(true);
                      setIsDetailOpen(false);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Flag
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Flag Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Flag</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Please provide details on how this issue was resolved:</p>
            <Textarea 
              placeholder="Enter resolution details..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveFlag}
              disabled={!resolution || updateFlagMutation.isPending}
            >
              {updateFlagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}