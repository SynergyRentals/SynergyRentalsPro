import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Loader2, Plus, Building2, MapPin, Wifi, AlertTriangle, Search, X, Check, FileText, Tag, Eye, Download, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Unit, Guest, Maintenance, Inventory, Task, Document } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUnitSchema } from "@shared/schema";
import GuestyPropertiesTab from "@/components/properties/GuestyPropertiesTab";

export default function PropertiesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form schema for creating/editing units
  const unitFormSchema = insertUnitSchema.extend({
    tags: z.array(z.string()).optional().default([]),
  });
  
  type UnitFormValues = z.infer<typeof unitFormSchema>;
  
  // Default form values
  const defaultValues: Partial<UnitFormValues> = {
    name: "",
    address: "",
    leaseUrl: "",
    wifiInfo: "",
    icalUrl: "",
    notes: "",
    tags: [],
  };
  
  // Get all properties
  const { data: units, isLoading, error } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
    retry: 1,
  });
  
  // Create a new unit
  const createUnitMutation = useMutation({
    mutationFn: async (unit: UnitFormValues) => {
      const res = await apiRequest('POST', '/api/units', unit);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/units'] });
      setShowUnitDialog(false);
      toast({
        title: "Property created",
        description: "The new property has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating property",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update a unit
  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, unit }: { id: number; unit: Partial<Unit> }) => {
      const res = await apiRequest('PATCH', `/api/units/${id}`, unit);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/units'] });
      setShowUnitDialog(false);
      toast({
        title: "Property updated",
        description: "The property has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating property",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete a unit
  const deleteUnitMutation = useMutation({
    mutationFn: async (id: number) => {
      // For soft delete, we're just updating the active status
      const res = await apiRequest('PATCH', `/api/units/${id}`, { active: false });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/units'] });
      setShowDeleteDialog(false);
      setCurrentUnit(null);
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting property",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form for creating/editing units
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues,
  });
  
  // Filter properties based on search query and active tab
  const filteredUnits = units?.filter((unit) => {
    // Filter by search query
    const matchesSearch = 
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tab
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && unit.active;
    if (activeTab === "inactive") return matchesSearch && !unit.active;
    
    // Filter by tag if activeTab is not one of the above
    return matchesSearch && unit.tags?.includes(activeTab);
  });
  
  // Get all tags from units
  const allTags = Array.from(
    new Set(
      units?.flatMap((unit) => unit.tags || []) || []
    )
  );
  
  // Handle form submission
  const onSubmit = (values: UnitFormValues) => {
    if (currentUnit) {
      // Update existing unit
      updateUnitMutation.mutate({ id: currentUnit.id, unit: values });
    } else {
      // Create new unit
      createUnitMutation.mutate(values);
    }
  };
  
  // Open dialog for creating a new unit
  const handleCreateNew = () => {
    setCurrentUnit(null);
    form.reset(defaultValues);
    setShowUnitDialog(true);
  };
  
  // Open dialog for editing an existing unit
  const handleEditUnit = (unit: Unit) => {
    setCurrentUnit(unit);
    form.reset({
      name: unit.name,
      address: unit.address,
      leaseUrl: unit.leaseUrl || "",
      wifiInfo: unit.wifiInfo || "",
      icalUrl: unit.icalUrl || "",
      notes: unit.notes || "",
      tags: unit.tags || [],
    });
    setShowUnitDialog(true);
  };
  
  // Open dialog for deleting a unit
  const handleDeleteUnit = (unit: Unit) => {
    setCurrentUnit(unit);
    setShowDeleteDialog(true);
  };
  
  // Handle tag input
  const [tagInput, setTagInput] = useState("");
  
  const addTag = () => {
    if (tagInput && !form.getValues().tags?.includes(tagInput)) {
      const currentTags = form.getValues().tags || [];
      form.setValue("tags", [...currentTags, tagInput]);
      setTagInput("");
    }
  };
  
  const removeTag = (tag: string) => {
    const currentTags = form.getValues().tags || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tag)
    );
  };
  
  // If error loading properties
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center p-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-2" />
          <p>Failed to load properties. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  // Add a state to track source tab (internal vs guesty)
  const [sourceTab, setSourceTab] = useState<string>("internal");

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Properties</h1>
          <p className="text-gray-500">Manage all your rental properties.</p>
        </div>
        <Button onClick={handleCreateNew} className="mt-4 md:mt-0">
          <Plus className="h-4 w-4 mr-2" /> Add New Property
        </Button>
      </div>
      
      {/* Source tabs - Internal vs Guesty */}
      <Tabs value={sourceTab} onValueChange={setSourceTab} className="mb-6">
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="internal" className="flex-1">Internal Properties</TabsTrigger>
          <TabsTrigger value="guesty" className="flex-1">Guesty Properties</TabsTrigger>
        </TabsList>
        
        {/* Internal Properties Tab */}
        <TabsContent value="internal">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search properties by name, address, or tags..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 overflow-x-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              {allTags.map((tag) => (
                <TabsTrigger key={tag} value={tag}>
                  {tag}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUnits && filteredUnits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUnits.map((unit) => (
                    <Card key={unit.id} className={unit.active ? "" : "opacity-60"}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="mr-2">{unit.name}</CardTitle>
                          {!unit.active && (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          {unit.address}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {unit.wifiInfo && (
                          <div className="flex items-center text-sm mb-2">
                            <Wifi className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="font-medium">WiFi Info:</span>
                            <span className="ml-1 text-gray-600">{unit.wifiInfo}</span>
                          </div>
                        )}
                        
                        {unit.leaseUrl && (
                          <div className="flex items-center text-sm mb-2">
                            <FileText className="h-4 w-4 mr-2 text-gray-500" />
                            <a 
                              href={unit.leaseUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Lease
                            </a>
                          </div>
                        )}
                        
                        {unit.tags && unit.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {unit.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {unit.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            {unit.notes.length > 100 
                              ? `${unit.notes.substring(0, 100)}...` 
                              : unit.notes}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="pt-2 flex flex-wrap gap-2">
                        <Link to={`/unit/${unit.id}`} className="flex-1">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Details
                          </Button>
                        </Link>
                        <div className="flex flex-1 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditUnit(unit)}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUnit(unit)}
                          >
                            <Trash className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed">
                  <Building2 className="h-12 w-12 text-gray-300 mb-2" />
                  <h3 className="text-xl font-medium text-gray-600">No properties found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery
                      ? "No properties match your search criteria."
                      : "You haven't added any properties yet."}
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" /> Add New Property
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Guesty Properties Tab */}
        <TabsContent value="guesty">
          <GuestyPropertiesTab />
        </TabsContent>
      </Tabs>
      
      {/* Create/Edit Unit Dialog */}
      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentUnit ? "Edit Property" : "Add New Property"}
            </DialogTitle>
            <DialogDescription>
              {currentUnit
                ? "Update the property information below."
                : "Fill in the details for the new property."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="name"
                  className="col-span-3"
                  {...form.register("name")}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address *
                </Label>
                <Input
                  id="address"
                  className="col-span-3"
                  {...form.register("address")}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaseUrl" className="text-right">
                  Lease URL
                </Label>
                <Input
                  id="leaseUrl"
                  className="col-span-3"
                  {...form.register("leaseUrl")}
                  placeholder="https://example.com/lease.pdf"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="wifiInfo" className="text-right">
                  WiFi Info
                </Label>
                <Input
                  id="wifiInfo"
                  className="col-span-3"
                  {...form.register("wifiInfo")}
                  placeholder="Network: MyWiFi, Password: 12345"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="icalUrl" className="text-right">
                  iCal URL
                </Label>
                <Input
                  id="icalUrl"
                  className="col-span-3"
                  {...form.register("icalUrl")}
                  placeholder="https://example.com/calendar.ics"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tags" className="text-right">
                  Tags
                </Label>
                <div className="col-span-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      id="tag-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={!tagInput}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.watch("tags")?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:bg-gray-200 rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  className="col-span-3"
                  {...form.register("notes")}
                  placeholder="Any additional information..."
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUnitDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
              >
                {(createUnitMutation.isPending || updateUnitMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {currentUnit ? "Update Property" : "Create Property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {currentUnit && (
            <div className="py-4">
              <p className="font-semibold">{currentUnit.name}</p>
              <p className="text-sm text-gray-500">{currentUnit.address}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => currentUnit && deleteUnitMutation.mutate(currentUnit.id)}
              disabled={deleteUnitMutation.isPending}
            >
              {deleteUnitMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}