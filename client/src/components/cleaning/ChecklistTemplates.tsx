import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { SafeSelectItem } from "@/components/ui/safe-select-item";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Add,
  Delete,
  Edit,
  MoreVert,
  Assignment,
  DragIndicator,
  Camera,
  CheckCircle,
  Home,
  Kitchen,
  Search,
  FilterList,
  Visibility
} from "@mui/icons-material";
import HotelIcon from '@mui/icons-material/Hotel';
import WeekendIcon from '@mui/icons-material/Weekend';
import DiningIcon from '@mui/icons-material/Dining';
import BalconyIcon from '@mui/icons-material/Balcony';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import { Loader2 } from "lucide-react";

// Types for checklist data
interface ChecklistItem {
  id: number;
  checklistId: number;
  description: string;
  room: string;
  order: number;
  requiresPhoto: boolean;
  isRequired: boolean;
  notes?: string;
}

interface Checklist {
  id: number;
  name: string;
  description: string;
  propertyType: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
}

export default function ChecklistTemplates() {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isItemDeleteDialogOpen, setIsItemDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  
  // Form state for new template
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    propertyType: "apartment",
    isDefault: false
  });
  
  // Form state for new item
  const [newItem, setNewItem] = useState({
    description: "",
    room: "living_room",
    requiresPhoto: false,
    isRequired: true,
    notes: ""
  });
  
  const queryClient = useQueryClient();
  
  // Fetch all checklist templates
  const {
    data: checklists,
    isLoading: isLoadingChecklists,
    error: checklistsError
  } = useQuery({
    queryKey: ["/api/cleaning-checklists"],
    queryFn: async () => {
      const response = await fetch("/api/cleaning-checklists");
      if (!response.ok) {
        throw new Error("Failed to fetch checklist templates");
      }
      return response.json();
    }
  });
  
  // Fetch checklist items for selected checklist
  const {
    data: checklistItems,
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useQuery({
    queryKey: ["/api/cleaning-checklist-items", selectedChecklist?.id],
    queryFn: async () => {
      if (!selectedChecklist) return [];
      
      const response = await fetch(`/api/cleaning-checklist-items?checklistId=${selectedChecklist.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist items");
      }
      return response.json();
    },
    enabled: !!selectedChecklist
  });
  
  // Mutation to create new checklist template
  const createChecklistMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/cleaning-checklists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create checklist template");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      setIsNewTemplateDialogOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        propertyType: "apartment",
        isDefault: false
      });
      toast({
        title: "Checklist template created",
        description: "The checklist template has been created successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to update existing checklist template
  const updateChecklistMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/cleaning-checklists/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data.updates)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update checklist template");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      toast({
        title: "Checklist template updated",
        description: "The checklist template has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to delete checklist template
  const deleteChecklistMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cleaning-checklists/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete checklist template");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      setIsDeleteDialogOpen(false);
      setSelectedChecklist(null);
      toast({
        title: "Checklist template deleted",
        description: "The checklist template has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to create new checklist item
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/cleaning-checklist-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create checklist item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-items", selectedChecklist?.id] 
      });
      setIsEditItemDialogOpen(false);
      setNewItem({
        description: "",
        room: "living_room",
        requiresPhoto: false,
        isRequired: true,
        notes: ""
      });
      toast({
        title: "Checklist item created",
        description: "The checklist item has been created successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create item",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to update existing checklist item
  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/cleaning-checklist-items/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data.updates)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update checklist item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-items", selectedChecklist?.id] 
      });
      setIsEditItemDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Checklist item updated",
        description: "The checklist item has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to delete checklist item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cleaning-checklist-items/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete checklist item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-items", selectedChecklist?.id] 
      });
      setIsItemDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Checklist item deleted",
        description: "The checklist item has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to reorder checklist items
  const reorderItemsMutation = useMutation({
    mutationFn: async (data: { items: { id: number, order: number }[] }) => {
      const response = await fetch(`/api/cleaning-checklist-items/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to reorder checklist items");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-items", selectedChecklist?.id] 
      });
      toast({
        title: "Items reordered",
        description: "Checklist items have been reordered successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to reorder items",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle creating a new template
  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.propertyType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    createChecklistMutation.mutate({
      name: newTemplate.name,
      description: newTemplate.description,
      propertyType: newTemplate.propertyType,
      isDefault: newTemplate.isDefault,
      active: true
    });
  };
  
  // Handle creating/updating a checklist item
  const handleSaveItem = () => {
    if (!newItem.description || !newItem.room) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedItem) {
      // Update existing item
      updateItemMutation.mutate({
        id: selectedItem.id,
        updates: {
          description: newItem.description,
          room: newItem.room,
          requiresPhoto: newItem.requiresPhoto,
          isRequired: newItem.isRequired,
          notes: newItem.notes
        }
      });
    } else {
      // Create new item
      createItemMutation.mutate({
        checklistId: selectedChecklist?.id,
        description: newItem.description,
        room: newItem.room,
        order: checklistItems ? checklistItems.length + 1 : 1,
        requiresPhoto: newItem.requiresPhoto,
        isRequired: newItem.isRequired,
        notes: newItem.notes
      });
    }
  };
  
  // Handle deleting a template
  const handleDeleteTemplate = () => {
    if (selectedChecklist) {
      deleteChecklistMutation.mutate(selectedChecklist.id);
    }
  };
  
  // Handle deleting an item
  const handleDeleteItem = () => {
    if (selectedItem) {
      deleteItemMutation.mutate(selectedItem.id);
    }
  };
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination || !checklistItems) return;
    
    const items = Array.from(checklistItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update the order property of each item
    const updatedItems = items.map((item, index) => ({
      id: item.id,
      order: index + 1
    }));
    
    // Call the mutation to update orders
    reorderItemsMutation.mutate({ items: updatedItems });
  };
  
  // Filter checklists based on active tab and search term
  const filteredChecklists = checklists ? checklists.filter((checklist: Checklist) => {
    const matchesTab = activeTab === "all" || 
      (activeTab === "active" && checklist.active) ||
      (activeTab === "inactive" && !checklist.active);
      
    const matchesSearch = checklist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checklist.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesTab && matchesSearch;
  }) : [];
  
  // Get icon for room
  const getRoomIcon = (room: string) => {
    switch (room) {
      case "living_room":
        return <WeekendIcon className="h-5 w-5 mr-2" />;
      case "kitchen":
        return <Kitchen className="h-5 w-5 mr-2" />;
      case "bathroom":
        return <Home className="h-5 w-5 mr-2" />;
      case "bedroom":
        return <HotelIcon className="h-5 w-5 mr-2" />;
      case "dining_room":
        return <DiningIcon className="h-5 w-5 mr-2" />;
      case "balcony":
        return <BalconyIcon className="h-5 w-5 mr-2" />;
      case "laundry":
        return <LocalLaundryServiceIcon className="h-5 w-5 mr-2" />;
      default:
        return <Home className="h-5 w-5 mr-2" />;
    }
  };
  
  // Get room display name
  const getRoomDisplayName = (room: string) => {
    switch (room) {
      case "living_room":
        return "Living Room";
      case "kitchen":
        return "Kitchen";
      case "bathroom":
        return "Bathroom";
      case "bedroom":
        return "Bedroom";
      case "dining_room":
        return "Dining Room";
      case "balcony":
        return "Balcony";
      case "laundry":
        return "Laundry";
      default:
        return "General";
    }
  };
  
  // Display loading state
  if (isLoadingChecklists) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading checklist templates...</span>
      </div>
    );
  }
  
  // Display error state
  if (checklistsError) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <span>Failed to load checklist templates. Please try again.</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Checklist Templates List */}
        <div className="lg:w-1/3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Assignment className="h-5 w-5 mr-2 text-blue-500" />
                  Checklist Templates
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search templates..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Add className="h-4 w-4 mr-1" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Checklist Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter template name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the template's purpose"
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="propertyType">Property Type</Label>
                        <Select
                          value={newTemplate.propertyType}
                          onValueChange={(value) => setNewTemplate({...newTemplate, propertyType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a property type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SafeSelectItem value="apartment">Apartment</SafeSelectItem>
                            <SafeSelectItem value="house">House</SafeSelectItem>
                            <SafeSelectItem value="condo">Condo</SafeSelectItem>
                            <SafeSelectItem value="villa">Villa</SafeSelectItem>
                            <SafeSelectItem value="cabin">Cabin</SafeSelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isDefault"
                          checked={newTemplate.isDefault}
                          onCheckedChange={(checked) => setNewTemplate({...newTemplate, isDefault: checked})}
                        />
                        <Label htmlFor="isDefault">Set as default template</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTemplate} disabled={createChecklistMutation.isPending}>
                        {createChecklistMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Tabs 
                defaultValue="all" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="mt-2"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredChecklists.length > 0 ? (
                    filteredChecklists.map((checklist: Checklist) => (
                      <div
                        key={checklist.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          selectedChecklist?.id === checklist.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedChecklist(checklist)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 flex items-center">
                              <Assignment className="h-4 w-4 mr-1 text-blue-500" />
                              {checklist.name}
                              {checklist.isDefault && (
                                <Badge className="ml-2 bg-green-100 text-green-800 border-0">
                                  Default
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {checklist.description || "No description provided"}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <span>{checklist.propertyType}</span>
                              <span className="mx-2">•</span>
                              <span>
                                {checklist.active ? (
                                  <Badge className="bg-green-100 text-green-800 border-0">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 border-0">
                                    Inactive
                                  </Badge>
                                )}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVert className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateChecklistMutation.mutate({
                                    id: checklist.id,
                                    updates: { active: !checklist.active }
                                  });
                                }}
                              >
                                {checklist.active ? (
                                  <>
                                    <Visibility className="h-4 w-4 mr-2" />
                                    Mark as Inactive
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Active
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChecklist(checklist);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Delete className="h-4 w-4 mr-2" />
                                Delete Template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                      <Assignment className="h-12 w-12 mb-2 opacity-20" />
                      <p>No checklist templates found</p>
                      <p className="text-sm">
                        {searchTerm ? "Try a different search term" : "Create a new template to get started"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Checklist Items */}
        <div className="lg:w-2/3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Assignment className="h-5 w-5 mr-2 text-blue-500" />
                  {selectedChecklist ? (
                    <>
                      {selectedChecklist.name} - Checklist Items
                    </>
                  ) : (
                    <>Checklist Items</>
                  )}
                </CardTitle>
                {selectedChecklist && (
                  <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setSelectedItem(null);
                        setNewItem({
                          description: "",
                          room: "living_room",
                          requiresPhoto: false,
                          isRequired: true,
                          notes: ""
                        });
                      }}>
                        <Add className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {selectedItem ? "Edit Checklist Item" : "Add Checklist Item"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="room">Room</Label>
                          <Select
                            value={newItem.room}
                            onValueChange={(value) => setNewItem({...newItem, room: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                            <SelectContent>
                              <SafeSelectItem value="living_room">Living Room</SafeSelectItem>
                              <SafeSelectItem value="kitchen">Kitchen</SafeSelectItem>
                              <SafeSelectItem value="bathroom">Bathroom</SafeSelectItem>
                              <SafeSelectItem value="bedroom">Bedroom</SafeSelectItem>
                              <SafeSelectItem value="dining_room">Dining Room</SafeSelectItem>
                              <SafeSelectItem value="balcony">Balcony</SafeSelectItem>
                              <SafeSelectItem value="laundry">Laundry</SafeSelectItem>
                              <SafeSelectItem value="general">General</SafeSelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Task Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe the cleaning task"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes or Instructions</Label>
                          <Textarea
                            id="notes"
                            placeholder="Additional notes for cleaners"
                            value={newItem.notes || ""}
                            onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="requiresPhoto"
                            checked={newItem.requiresPhoto}
                            onCheckedChange={(checked) => setNewItem({...newItem, requiresPhoto: checked})}
                          />
                          <Label htmlFor="requiresPhoto">Requires photo verification</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isRequired"
                            checked={newItem.isRequired}
                            onCheckedChange={(checked) => setNewItem({...newItem, isRequired: checked})}
                          />
                          <Label htmlFor="isRequired">Required task</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSaveItem} 
                          disabled={createItemMutation.isPending || updateItemMutation.isPending}
                        >
                          {(createItemMutation.isPending || updateItemMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {selectedItem ? "Update Item" : "Add Item"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedChecklist ? (
                isLoadingItems ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2">Loading checklist items...</span>
                  </div>
                ) : itemsError ? (
                  <div className="flex justify-center items-center h-64 text-red-500">
                    <span>Failed to load checklist items. Please try again.</span>
                  </div>
                ) : checklistItems && checklistItems.length > 0 ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="checklist-items">
                      {(provided) => (
                        <div 
                          className="space-y-2" 
                          {...provided.droppableProps} 
                          ref={provided.innerRef}
                        >
                          {/* Group items by room */}
                          {Object.entries(
                            checklistItems.reduce((groups: any, item: ChecklistItem) => {
                              if (!groups[item.room]) {
                                groups[item.room] = [];
                              }
                              groups[item.room].push(item);
                              return groups;
                            }, {})
                          ).map(([room, items], groupIndex) => (
                            <div key={room} className="mb-6">
                              <h3 className="text-md font-semibold flex items-center mb-2">
                                {getRoomIcon(room)}
                                {getRoomDisplayName(room)}
                              </h3>
                              <div className="space-y-2">
                                {(items as ChecklistItem[]).sort((a, b) => a.order - b.order).map((item, index) => (
                                  <Draggable 
                                    key={item.id} 
                                    draggableId={item.id.toString()}
                                    index={index + (groupIndex * 100)} // Ensure unique index across groups
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="p-3 border rounded bg-white"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-start flex-1">
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="px-1 mr-2 cursor-grab"
                                            >
                                              <DragIndicator className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center">
                                                <span className="font-medium">{item.description}</span>
                                                <div className="ml-2 flex space-x-1">
                                                  {item.requiresPhoto && (
                                                    <Badge className="bg-purple-100 text-purple-800 border-0">
                                                      <Camera className="h-3 w-3 mr-1" />
                                                      Photo
                                                    </Badge>
                                                  )}
                                                  {item.isRequired ? (
                                                    <Badge className="bg-red-100 text-red-800 border-0">
                                                      Required
                                                    </Badge>
                                                  ) : (
                                                    <Badge className="bg-gray-100 text-gray-800 border-0">
                                                      Optional
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                              {item.notes && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                  {item.notes}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex space-x-1">
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => {
                                                setSelectedItem(item);
                                                setNewItem({
                                                  description: item.description,
                                                  room: item.room,
                                                  requiresPhoto: item.requiresPhoto,
                                                  isRequired: item.isRequired,
                                                  notes: item.notes || ""
                                                });
                                                setIsEditItemDialogOpen(true);
                                              }}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => {
                                                setSelectedItem(item);
                                                setIsItemDeleteDialogOpen(true);
                                              }}
                                            >
                                              <Delete className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                            </div>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Assignment className="h-12 w-12 mb-2 opacity-20" />
                    <p>No checklist items found</p>
                    <p className="text-sm">
                      Add items to this checklist template
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        setSelectedItem(null);
                        setNewItem({
                          description: "",
                          room: "living_room",
                          requiresPhoto: false,
                          isRequired: true,
                          notes: ""
                        });
                        setIsEditItemDialogOpen(true);
                      }}
                    >
                      <Add className="h-4 w-4 mr-1" />
                      Add First Item
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Assignment className="h-12 w-12 mb-2 opacity-20" />
                  <p>Select a checklist template</p>
                  <p className="text-sm">
                    Choose a template from the left to view and edit its items
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Checklist Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-500">
              Are you sure you want to delete this checklist template?
            </p>
            <p className="mt-2 text-gray-600">
              This will permanently delete the template and all associated checklist items. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTemplate}
              disabled={deleteChecklistMutation.isPending}
            >
              {deleteChecklistMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Item Dialog */}
      <Dialog open={isItemDeleteDialogOpen} onOpenChange={setIsItemDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-500">
              Are you sure you want to delete this checklist item?
            </p>
            <p className="mt-2 text-gray-600">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteItem}
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}