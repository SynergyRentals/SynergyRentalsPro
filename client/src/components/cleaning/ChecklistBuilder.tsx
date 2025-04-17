import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SafeSelectItem } from "@/components/ui/safe-select-item";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Add,
  Delete,
  Edit,
  Save,
  Assignment,
  DragIndicator,
  Camera,
  CheckCircle,
  Home,
  Kitchen,
  Search,
  FilterList,
  Visibility,
  Preview,
  ContentCopy,
  AddCircleOutline,
  ArrowBack,
  Help
} from "@mui/icons-material";
import HotelIcon from '@mui/icons-material/Hotel';
import WeekendIcon from '@mui/icons-material/Weekend';
import DiningIcon from '@mui/icons-material/Dining';
import BalconyIcon from '@mui/icons-material/Balcony';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';

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

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Section = ({ title, description, children }: SectionProps) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-gray-500 mb-4 text-sm">{description}</p>}
    {children}
  </div>
);

export default function ChecklistBuilder() {
  // State for UI
  const [activeTab, setActiveTab] = useState<string>("templates");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  
  // Dialogs state
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState<boolean>(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState<boolean>(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState<boolean>(false);
  const [isDeleteTemplateDialogOpen, setIsDeleteTemplateDialogOpen] = useState<boolean>(false);
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState<boolean>(false);
  const [isCopyTemplateDialogOpen, setIsCopyTemplateDialogOpen] = useState<boolean>(false);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  
  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    propertyType: "apartment",
    isDefault: false
  });
  
  // New/edit item form state
  const [itemForm, setItemForm] = useState({
    description: "",
    room: "living_room",
    requiresPhoto: false,
    isRequired: true,
    notes: ""
  });
  
  // Template copy form state
  const [copyTemplateName, setCopyTemplateName] = useState<string>("");
  
  const queryClient = useQueryClient();
  
  // Fetch all checklist templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError
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
  
  // Select the template based on the selected ID
  const selectedTemplate = templates?.find((t: Checklist) => t.id === selectedTemplateId) || null;
  
  // Fetch checklist items for selected template
  const {
    data: items,
    isLoading: isLoadingItems,
    error: itemsError
  } = useQuery({
    queryKey: ["/api/cleaning-checklist-items", selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return [];
      
      const response = await fetch(`/api/cleaning-checklist-items?checklistId=${selectedTemplateId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist items");
      }
      return response.json();
    },
    enabled: !!selectedTemplateId
  });
  
  // Mutation: Create template
  const createTemplateMutation = useMutation({
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      setIsNewTemplateDialogOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        propertyType: "apartment",
        isDefault: false
      });
      // Set the newly created template as selected
      setSelectedTemplateId(data.id);
      setActiveTab("editor");
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create template: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Copy template
  const copyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, newName }: { templateId: number, newName: string }) => {
      const response = await fetch(`/api/cleaning-checklists/${templateId}/copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (!response.ok) {
        throw new Error("Failed to copy template");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      setIsCopyTemplateDialogOpen(false);
      setCopyTemplateName("");
      // Set the newly created template as selected
      setSelectedTemplateId(data.id);
      setActiveTab("editor");
      toast({
        title: "Success",
        description: "Template copied successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to copy template: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cleaning-checklists/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete template");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      setIsDeleteTemplateDialogOpen(false);
      setSelectedTemplateId(null);
      setActiveTab("templates");
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/cleaning-checklists/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update template");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-checklists"] });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update template: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Create checklist item
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
        queryKey: ["/api/cleaning-checklist-items", selectedTemplateId] 
      });
      setIsNewItemDialogOpen(false);
      setItemForm({
        description: "",
        room: "living_room",
        requiresPhoto: false,
        isRequired: true,
        notes: ""
      });
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add item: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Update checklist item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/cleaning-checklist-items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update checklist item");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/cleaning-checklist-items", selectedTemplateId] 
      });
      setIsEditItemDialogOpen(false);
      setSelectedItem(null);
      setItemForm({
        description: "",
        room: "living_room",
        requiresPhoto: false,
        isRequired: true,
        notes: ""
      });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update item: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Delete checklist item
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
        queryKey: ["/api/cleaning-checklist-items", selectedTemplateId] 
      });
      setIsDeleteItemDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete item: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation: Reorder checklist items
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
        queryKey: ["/api/cleaning-checklist-items", selectedTemplateId] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reorder items: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Open edit item dialog with selected item data
  const handleEditItem = (item: ChecklistItem) => {
    setSelectedItem(item);
    setItemForm({
      description: item.description,
      room: item.room,
      requiresPhoto: item.requiresPhoto,
      isRequired: item.isRequired,
      notes: item.notes || ""
    });
    setIsEditItemDialogOpen(true);
  };
  
  // Open delete item confirmation dialog
  const handleDeleteItemClick = (item: ChecklistItem) => {
    setSelectedItem(item);
    setIsDeleteItemDialogOpen(true);
  };
  
  // Handle drag end for reordering items
  const handleDragEnd = (result: any) => {
    if (!result.destination || !items) return;
    
    const itemsList = Array.from(items) as ChecklistItem[];
    const [reorderedItem] = itemsList.splice(result.source.index, 1);
    itemsList.splice(result.destination.index, 0, reorderedItem);
    
    // Update the order property of each item
    const updatedItems = itemsList.map((item: ChecklistItem, index) => ({
      id: item.id,
      order: index + 1
    }));
    
    // Call the mutation to update orders
    reorderItemsMutation.mutate({ items: updatedItems });
  };
  
  // Create a new template
  const handleCreateTemplate = () => {
    if (!newTemplate.name) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }
    
    createTemplateMutation.mutate({
      name: newTemplate.name,
      description: newTemplate.description,
      propertyType: newTemplate.propertyType,
      isDefault: newTemplate.isDefault,
      active: true
    });
  };
  
  // Create a copy of the template
  const handleCopyTemplate = () => {
    if (!selectedTemplateId || !copyTemplateName) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }
    
    copyTemplateMutation.mutate({
      templateId: selectedTemplateId,
      newName: copyTemplateName
    });
  };
  
  // Delete a template
  const handleDeleteTemplate = () => {
    if (!selectedTemplateId) return;
    deleteTemplateMutation.mutate(selectedTemplateId);
  };
  
  // Create a new checklist item
  const handleCreateItem = () => {
    if (!itemForm.description || !selectedTemplateId) {
      toast({
        title: "Error",
        description: "Item description is required",
        variant: "destructive"
      });
      return;
    }
    
    createItemMutation.mutate({
      checklistId: selectedTemplateId,
      description: itemForm.description,
      room: itemForm.room,
      order: items ? items.length + 1 : 1,
      requiresPhoto: itemForm.requiresPhoto,
      isRequired: itemForm.isRequired,
      notes: itemForm.notes
    });
  };
  
  // Update an existing checklist item
  const handleUpdateItem = () => {
    if (!selectedItem || !itemForm.description) {
      toast({
        title: "Error",
        description: "Item description is required",
        variant: "destructive"
      });
      return;
    }
    
    updateItemMutation.mutate({
      id: selectedItem.id,
      data: {
        description: itemForm.description,
        room: itemForm.room,
        requiresPhoto: itemForm.requiresPhoto,
        isRequired: itemForm.isRequired,
        notes: itemForm.notes
      }
    });
  };
  
  // Delete a checklist item
  const handleDeleteItem = () => {
    if (!selectedItem) return;
    deleteItemMutation.mutate(selectedItem.id);
  };
  
  // Group items by room
  const itemsByRoom = items ? items.reduce((groups: any, item: ChecklistItem) => {
    if (!groups[item.room]) {
      groups[item.room] = [];
    }
    groups[item.room].push(item);
    return groups;
  }, {}) : {};
  
  // Get room display name
  const getRoomDisplayName = (room: string) => {
    switch (room) {
      case "living_room": return "Living Room";
      case "kitchen": return "Kitchen";
      case "bedroom": return "Bedroom";
      case "bathroom": return "Bathroom";
      case "dining_room": return "Dining Room";
      case "balcony": return "Balcony";
      case "laundry": return "Laundry";
      default: return "General";
    }
  };
  
  // Get room icon
  const getRoomIcon = (room: string) => {
    switch (room) {
      case "living_room": return <WeekendIcon className="h-5 w-5 mr-2" />;
      case "kitchen": return <Kitchen className="h-5 w-5 mr-2" />;
      case "bedroom": return <HotelIcon className="h-5 w-5 mr-2" />;
      case "bathroom": return <Home className="h-5 w-5 mr-2" />;
      case "dining_room": return <DiningIcon className="h-5 w-5 mr-2" />;
      case "balcony": return <BalconyIcon className="h-5 w-5 mr-2" />;
      case "laundry": return <LocalLaundryServiceIcon className="h-5 w-5 mr-2" />;
      default: return <Home className="h-5 w-5 mr-2" />;
    }
  };
  
  // Filter templates based on search term
  const filteredTemplates = templates ? templates.filter((template: Checklist) => {
    return template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];
  
  // Render loading state
  if (isLoadingTemplates) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading checklist templates...</span>
      </div>
    );
  }
  
  // Render error state
  if (templatesError) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <span>Failed to load checklist templates. Please try again.</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Checklist Builder</h2>
          <p className="text-muted-foreground">Create and manage cleaning checklist templates</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTemplateId && activeTab === "editor" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="gap-1"
              >
                {isPreviewMode ? <Edit className="h-4 w-4" /> : <Preview className="h-4 w-4" />}
                {isPreviewMode ? "Edit Mode" : "Preview Mode"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCopyTemplateDialogOpen(true)}
                className="gap-1"
              >
                <ContentCopy className="h-4 w-4" />
                Make a Copy
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="editor" disabled={!selectedTemplateId}>
            {selectedTemplate ? `Editing: ${selectedTemplate.name}` : "Checklist Editor"}
          </TabsTrigger>
        </TabsList>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsNewTemplateDialogOpen(true)}>
              <Add className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </div>
          
          {filteredTemplates.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg bg-muted/30">
              <Assignment className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No Templates Found</h3>
              <p className="text-muted-foreground mb-4">Create your first cleaning checklist template to get started.</p>
              <Button onClick={() => setIsNewTemplateDialogOpen(true)}>
                <Add className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template: Checklist) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge 
                        variant={template.isDefault ? "default" : "outline"}
                        className="mr-2"
                      >
                        {template.propertyType}
                      </Badge>
                      {template.isDefault && (
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || "No description available"}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setActiveTab("editor");
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setIsDeleteTemplateDialogOpen(true);
                      }}
                    >
                      <Delete className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-6 pt-4">
          {!selectedTemplate ? (
            <div className="text-center p-12">
              <p>Please select a template first</p>
            </div>
          ) : (
            <>
              <div className="flex gap-6 flex-col lg:flex-row">
                {/* Left sidebar - template details */}
                <div className="w-full lg:w-1/3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Template Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="template-name">Name</Label>
                        <Input 
                          id="template-name" 
                          value={selectedTemplate.name}
                          onChange={(e) => {
                            updateTemplateMutation.mutate({
                              id: selectedTemplateId!,
                              data: { name: e.target.value }
                            });
                          }}
                          disabled={isPreviewMode}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="template-type">Property Type</Label>
                        <Select
                          value={selectedTemplate.propertyType}
                          onValueChange={(value) => {
                            updateTemplateMutation.mutate({
                              id: selectedTemplateId!,
                              data: { propertyType: value }
                            });
                          }}
                          disabled={isPreviewMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SafeSelectItem value="apartment">Apartment</SafeSelectItem>
                            <SafeSelectItem value="house">House</SafeSelectItem>
                            <SafeSelectItem value="condo">Condo</SafeSelectItem>
                            <SafeSelectItem value="villa">Villa</SafeSelectItem>
                            <SafeSelectItem value="cottage">Cottage</SafeSelectItem>
                            <SafeSelectItem value="cabin">Cabin</SafeSelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea 
                          id="template-description" 
                          value={selectedTemplate.description}
                          onChange={(e) => {
                            updateTemplateMutation.mutate({
                              id: selectedTemplateId!,
                              data: { description: e.target.value }
                            });
                          }}
                          rows={3}
                          disabled={isPreviewMode}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is-default">Set as default template</Label>
                        <Switch 
                          id="is-default" 
                          checked={selectedTemplate.isDefault}
                          onCheckedChange={(checked) => {
                            updateTemplateMutation.mutate({
                              id: selectedTemplateId!,
                              data: { isDefault: checked }
                            });
                          }}
                          disabled={isPreviewMode}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is-active">Active</Label>
                        <Switch 
                          id="is-active" 
                          checked={selectedTemplate.active}
                          onCheckedChange={(checked) => {
                            updateTemplateMutation.mutate({
                              id: selectedTemplateId!,
                              data: { active: checked }
                            });
                          }}
                          disabled={isPreviewMode}
                        />
                      </div>
                      
                      {!isPreviewMode && (
                        <div className="pt-4">
                          <Button 
                            className="w-full" 
                            onClick={() => setIsNewItemDialogOpen(true)}
                          >
                            <AddCircleOutline className="h-4 w-4 mr-1" />
                            Add New Item
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplateId(null);
                          setActiveTab("templates");
                        }}
                      >
                        <ArrowBack className="h-4 w-4 mr-1" />
                        Back to Templates
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => setIsDeleteTemplateDialogOpen(true)}
                        disabled={isPreviewMode}
                      >
                        <Delete className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                {/* Right side - Checklist Items Editor */}
                <div className="w-full lg:w-2/3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Checklist Items</CardTitle>
                      
                      {!isPreviewMode && (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsNewItemDialogOpen(true)}
                        >
                          <Add className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {isLoadingItems ? (
                        <div className="flex justify-center items-center h-64">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2">Loading checklist items...</span>
                        </div>
                      ) : itemsError ? (
                        <div className="text-center p-8 text-red-500">
                          <p>Failed to load checklist items. Please try again.</p>
                        </div>
                      ) : !items || items.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg">
                          <p className="mb-4 text-muted-foreground">No checklist items yet</p>
                          {!isPreviewMode && (
                            <Button 
                              onClick={() => setIsNewItemDialogOpen(true)}
                            >
                              <Add className="h-4 w-4 mr-1" />
                              Add Your First Item
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {isPreviewMode ? (
                            // Preview Mode - Display items by room without drag capability
                            Object.entries(itemsByRoom).map(([room, roomItems]) => (
                              <div key={room} className="mb-6">
                                <h3 className="text-md font-semibold flex items-center mb-2">
                                  {getRoomIcon(room)}
                                  {getRoomDisplayName(room)}
                                </h3>
                                <div className="space-y-2">
                                  {(roomItems as ChecklistItem[])
                                    .sort((a, b) => a.order - b.order)
                                    .map((item) => (
                                      <div key={item.id} className="p-3 border rounded bg-white">
                                        <div className="flex items-start">
                                          <CheckCircle className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                                          <div className="flex-1">
                                            <div className="flex items-center flex-wrap">
                                              <span className="font-medium mr-2">{item.description}</span>
                                              <div className="flex space-x-1 mt-1">
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
                                              <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Edit Mode - Drag and drop enabled
                            <DragDropContext onDragEnd={handleDragEnd}>
                              <Droppable droppableId="checklist-items">
                                {(provided) => (
                                  <div 
                                    className="space-y-6" 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef}
                                  >
                                    {Object.entries(itemsByRoom).map(([room, roomItems], groupIndex) => (
                                      <div key={room} className="mb-6">
                                        <h3 className="text-md font-semibold flex items-center mb-2">
                                          {getRoomIcon(room)}
                                          {getRoomDisplayName(room)}
                                        </h3>
                                        <div className="space-y-2">
                                          {(roomItems as ChecklistItem[])
                                            .sort((a, b) => a.order - b.order)
                                            .map((item, index) => (
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
                                                          <div className="flex items-center flex-wrap">
                                                            <span className="font-medium mr-2">{item.description}</span>
                                                            <div className="flex space-x-1 mt-1">
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
                                                            <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex space-x-1">
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          onClick={() => handleEditItem(item)}
                                                        >
                                                          <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          onClick={() => handleDeleteItemClick(item)}
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
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* New Template Dialog */}
      <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input 
                id="template-name" 
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Standard Cleaning Checklist"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="property-type">Property Type *</Label>
              <Select
                value={newTemplate.propertyType}
                onValueChange={(value) => setNewTemplate({...newTemplate, propertyType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SafeSelectItem value="apartment">Apartment</SafeSelectItem>
                  <SafeSelectItem value="house">House</SafeSelectItem>
                  <SafeSelectItem value="condo">Condo</SafeSelectItem>
                  <SafeSelectItem value="villa">Villa</SafeSelectItem>
                  <SafeSelectItem value="cottage">Cottage</SafeSelectItem>
                  <SafeSelectItem value="cabin">Cabin</SafeSelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea 
                id="template-description" 
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Add a description for this template..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={newTemplate.isDefault}
                onCheckedChange={(checked) => setNewTemplate({...newTemplate, isDefault: Boolean(checked)})}
              />
              <Label htmlFor="is-default">Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Item Dialog */}
      <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-description">Item Description *</Label>
              <Input 
                id="item-description" 
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                placeholder="e.g., Wipe down all countertops"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-room">Room *</Label>
              <Select
                value={itemForm.room}
                onValueChange={(value) => setItemForm({...itemForm, room: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SafeSelectItem value="living_room">Living Room</SafeSelectItem>
                  <SafeSelectItem value="kitchen">Kitchen</SafeSelectItem>
                  <SafeSelectItem value="bedroom">Bedroom</SafeSelectItem>
                  <SafeSelectItem value="bathroom">Bathroom</SafeSelectItem>
                  <SafeSelectItem value="dining_room">Dining Room</SafeSelectItem>
                  <SafeSelectItem value="balcony">Balcony</SafeSelectItem>
                  <SafeSelectItem value="laundry">Laundry</SafeSelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-notes">Notes</Label>
              <Textarea 
                id="item-notes" 
                value={itemForm.notes}
                onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                placeholder="Add any special instructions or notes..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="requires-photo">Requires Photo Documentation</Label>
              <Switch 
                id="requires-photo" 
                checked={itemForm.requiresPhoto}
                onCheckedChange={(checked) => setItemForm({...itemForm, requiresPhoto: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="is-required">Required Item</Label>
              <Switch 
                id="is-required" 
                checked={itemForm.isRequired}
                onCheckedChange={(checked) => setItemForm({...itemForm, isRequired: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-item-description">Item Description *</Label>
              <Input 
                id="edit-item-description" 
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-item-room">Room *</Label>
              <Select
                value={itemForm.room}
                onValueChange={(value) => setItemForm({...itemForm, room: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SafeSelectItem value="living_room">Living Room</SafeSelectItem>
                  <SafeSelectItem value="kitchen">Kitchen</SafeSelectItem>
                  <SafeSelectItem value="bedroom">Bedroom</SafeSelectItem>
                  <SafeSelectItem value="bathroom">Bathroom</SafeSelectItem>
                  <SafeSelectItem value="dining_room">Dining Room</SafeSelectItem>
                  <SafeSelectItem value="balcony">Balcony</SafeSelectItem>
                  <SafeSelectItem value="laundry">Laundry</SafeSelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-item-notes">Notes</Label>
              <Textarea 
                id="edit-item-notes" 
                value={itemForm.notes}
                onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="edit-requires-photo">Requires Photo Documentation</Label>
              <Switch 
                id="edit-requires-photo" 
                checked={itemForm.requiresPhoto}
                onCheckedChange={(checked) => setItemForm({...itemForm, requiresPhoto: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="edit-is-required">Required Item</Label>
              <Switch 
                id="edit-is-required" 
                checked={itemForm.isRequired}
                onCheckedChange={(checked) => setItemForm({...itemForm, isRequired: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem}>
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Template Confirmation Dialog */}
      <Dialog open={isDeleteTemplateDialogOpen} onOpenChange={setIsDeleteTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this template? This action cannot be undone and will remove all associated checklist items.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Item Confirmation Dialog */}
      <Dialog open={isDeleteItemDialogOpen} onOpenChange={setIsDeleteItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this checklist item? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Copy Template Dialog */}
      <Dialog open={isCopyTemplateDialogOpen} onOpenChange={setIsCopyTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Copy of Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="copy-template-name">New Template Name *</Label>
              <Input 
                id="copy-template-name" 
                value={copyTemplateName}
                onChange={(e) => setCopyTemplateName(e.target.value)}
                placeholder="e.g., Deluxe Cleaning Checklist"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopyTemplate}>
              Create Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}