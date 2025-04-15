import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute, Link } from "wouter";
import { 
  Loader2, ChevronLeft, Building2, MapPin, Wifi, FileText, Tag, User, Calendar, ClipboardCheck,
  Wrench, Package, ReceiptText, MessageSquare, Upload, Download, ArrowUpDown, Clipboard, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";
import { Unit, Guest, Maintenance, Inventory, Task, Document } from "@shared/schema";

export default function PropertyDetailPage() {
  const { toast } = useToast();
  const [_, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params ? parseInt(params.id) : null;
  
  // Get property details
  const { 
    data: property, 
    isLoading: isLoadingProperty, 
    error: propertyError 
  } = useQuery<Unit>({
    queryKey: ['/api/units', propertyId],
    enabled: !!propertyId,
  });
  
  // Get guests for this property
  const { 
    data: guests, 
    isLoading: isLoadingGuests, 
    error: guestsError 
  } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    select: (data) => data.filter(guest => guest.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get maintenance items for this property
  const { 
    data: maintenanceItems, 
    isLoading: isLoadingMaintenance, 
    error: maintenanceError 
  } = useQuery<Maintenance[]>({
    queryKey: ['/api/maintenance'],
    select: (data) => data.filter(item => item.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get inventory items for this property
  const { 
    data: inventoryItems, 
    isLoading: isLoadingInventory, 
    error: inventoryError 
  } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
    select: (data) => data.filter(item => item.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get tasks for this property
  const { 
    data: tasks, 
    isLoading: isLoadingTasks, 
    error: tasksError 
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    select: (data) => data.filter(task => task.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Get documents for this property
  const { 
    data: documents, 
    isLoading: isLoadingDocuments, 
    error: documentsError 
  } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    select: (data) => data.filter(doc => doc.unitId === propertyId),
    enabled: !!propertyId,
  });
  
  // Handle navigation back to properties list
  const handleBackToList = () => {
    setLocation("/properties");
  };
  
  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (propertyError || !property) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={handleBackToList} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" /> Back to Properties
        </Button>
        <Card className="w-full">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Property Not Found
              </h2>
              <p className="text-gray-500 mb-6">
                The property you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={handleBackToList}>
                Back to Properties List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Button variant="outline" onClick={handleBackToList} className="mb-6">
        <ChevronLeft className="h-4 w-4 mr-2" /> Back to Properties
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{property.name}</CardTitle>
                <CardDescription className="flex items-center text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </CardDescription>
              </div>
              <div>
                {!property.active && (
                  <Badge variant="outline" className="text-gray-500">
                    Inactive
                  </Badge>
                )}
                {property.tags && property.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-end">
                    {property.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {property.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-gray-700">{property.notes}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {property.wifiInfo && (
                <div className="border p-3 rounded-md flex items-start">
                  <Wifi className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">WiFi Information</h3>
                    <p className="text-sm text-gray-600">{property.wifiInfo}</p>
                  </div>
                </div>
              )}
              
              {property.leaseUrl && (
                <div className="border p-3 rounded-md flex items-start">
                  <FileText className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Lease Document</h3>
                    <a 
                      href={property.leaseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center mt-1"
                    >
                      <Download className="h-3 w-3 mr-1" /> View or Download Lease
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Summary</CardTitle>
          </CardHeader>
          <CardContent className="pb-1">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Guests</span>
                </div>
                <Badge variant="outline">
                  {isLoadingGuests ? <Loader2 className="h-3 w-3 animate-spin" /> : guests?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Wrench className="h-4 w-4 mr-2" />
                  <span>Maintenance</span>
                </div>
                <Badge variant="outline">
                  {isLoadingMaintenance ? <Loader2 className="h-3 w-3 animate-spin" /> : maintenanceItems?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  <span>Tasks</span>
                </div>
                <Badge variant="outline">
                  {isLoadingTasks ? <Loader2 className="h-3 w-3 animate-spin" /> : tasks?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Package className="h-4 w-4 mr-2" />
                  <span>Inventory Items</span>
                </div>
                <Badge variant="outline">
                  {isLoadingInventory ? <Loader2 className="h-3 w-3 animate-spin" /> : inventoryItems?.length || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b">
                <div className="flex items-center text-gray-500">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Documents</span>
                </div>
                <Badge variant="outline">
                  {isLoadingDocuments ? <Loader2 className="h-3 w-3 animate-spin" /> : documents?.length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button className="w-full" variant="outline">
              <Clipboard className="h-4 w-4 mr-2" /> Generate Property Report
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Tabs defaultValue="guests" className="mt-4">
        <TabsList>
          <TabsTrigger value="guests">
            <User className="h-4 w-4 mr-2" /> Guests
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="h-4 w-4 mr-2" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>
        
        {/* Guests Tab */}
        <TabsContent value="guests">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest History</CardTitle>
              <CardDescription>Past and upcoming guest stays</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGuests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : guests && guests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Booking Source</TableHead>
                      <TableHead>Sentiment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-medium">{guest.name}</TableCell>
                        <TableCell>{formatDate(guest.checkIn)}</TableCell>
                        <TableCell>{formatDate(guest.checkOut)}</TableCell>
                        <TableCell>
                          {guest.email && <div className="text-sm">{guest.email}</div>}
                          {guest.phone && <div className="text-sm">{guest.phone}</div>}
                        </TableCell>
                        <TableCell>{guest.bookingSource || "Direct"}</TableCell>
                        <TableCell>
                          {guest.sentiment ? `${guest.sentiment}/5` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No guest records found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Maintenance History</CardTitle>
              <CardDescription>
                All maintenance requests and repairs for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMaintenance ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : maintenanceItems && maintenanceItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.priority === "urgent" 
                                ? "destructive" 
                                : item.priority === "high" 
                                  ? "default" 
                                  : "outline"
                            }
                            className="whitespace-nowrap"
                          >
                            {item.priority || "normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.status === "open" 
                                ? "default" 
                                : item.status === "in-progress" 
                                  ? "secondary"
                                  : "outline"
                            }
                            className={item.status === "completed" ? "bg-green-100 text-green-800" : ""}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>{formatDate(item.completedAt)}</TableCell>
                        <TableCell>
                          {item.cost ? `$${(item.cost / 100).toFixed(2)}` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No maintenance records found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks</CardTitle>
              <CardDescription>All tasks associated with this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.type}</TableCell>
                        <TableCell>{formatDate(task.dueDate)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              task.priority === "urgent" 
                                ? "destructive" 
                                : task.priority === "high" 
                                  ? "default" 
                                  : "outline"
                            }
                            className="whitespace-nowrap"
                          >
                            {task.priority || "normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={task.completed ? "outline" : "default"}
                            className={task.completed ? "bg-green-100 text-green-800" : ""}
                          >
                            {task.completed ? "Completed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {task.notes || "No notes"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tasks found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory</CardTitle>
              <CardDescription>Items and supplies at this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : inventoryItems && inventoryItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Par Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.category || "Uncategorized"}</TableCell>
                        <TableCell>{item.currentStock}</TableCell>
                        <TableCell>{item.parLevel}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.currentStock <= (item.reorderThreshold || item.parLevel * 0.3)
                                ? "destructive"
                                : item.currentStock <= item.parLevel * 0.7
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {item.currentStock <= (item.reorderThreshold || item.parLevel * 0.3)
                              ? "Low"
                              : item.currentStock <= item.parLevel * 0.7
                                ? "Moderate"
                                : "Good"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.lastUpdated)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No inventory items found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>Files and documents related to this property</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.category}</TableCell>
                        <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <Download className="h-3 w-3 mr-1" /> Download
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No documents found for this property.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}