import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Add,
  FilterList,
  Inventory2,
  Home,
  Warning,
  ShoppingCart,
  Error,
  ArrowForward,
  TrendingDown,
  TrendingUp,
  CompareArrows,
  QrCode2,
  Notifications,
  ReceiptLong,
} from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Loader2, AlertTriangle, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Inventory, InsertInventory, insertInventorySchema } from "@shared/schema";
import { z } from "zod";
import UnitQrRequestCard from "@/components/inventory/UnitQrRequestCard";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("unit-inventory");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  // Enhanced form schema
  const inventoryFormSchema = insertInventorySchema.extend({
    unitId: z.union([z.number(), z.literal(null)]).optional(),
    category: z.string().min(1, "Category is required"),
    reorderThreshold: z.number().min(0),
    parLevel: z.number().min(1, "Par level must be at least 1"),
    currentStock: z.number().min(0, "Current stock cannot be negative"),
  });

  // Form setup
  const form = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      itemName: "",
      unitId: null,
      category: "",
      parLevel: 1,
      currentStock: 0,
      reorderThreshold: 0,
      notes: "",
      sku: "",
      upc: "",
      cost: 0,
      supplier: "",
      location: "",
      // minOrderQuantity: 1, // Removed - field doesn't exist in DB
      // isConsumable: true, // Removed - field doesn't exist in DB
    },
  });
  
  // Skip API calls for now and use mock data
  const {
    data: inventoryItems,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = { 
    data: undefined, 
    isLoading: false, 
    error: null 
  };

  // Mock units data
  const mockUnits = [
    { id: 1, name: "Beachside Villa" },
    { id: 2, name: "Mountain Cabin" },
    { id: 3, name: "Downtown Loft" }
  ];
  
  // Use mock units
  const { data: units } = { data: mockUnits };
  
  // Create inventory mutation
  const createInventoryMutation = useMutation({
    mutationFn: async (data: InsertInventory) => {
      const response = await apiRequest('POST', '/api/inventory', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventory Added",
        description: "New inventory item has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      form.reset();
      setAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add inventory",
        description: error.message || "An error occurred while adding inventory.",
      });
    }
  });
  
  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Inventory> }) => {
      const response = await apiRequest('PATCH', `/api/inventory/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventory Updated",
        description: "Inventory item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update inventory",
        description: error.message || "An error occurred while updating inventory.",
      });
    }
  });

  // Helper function to get unit name
  const getUnitName = (unitId: number | null) => {
    if (unitId === null) return "Garage Inventory";
    if (!units) return `Unit #${unitId}`;
    const unit = units.find((u) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  // Mock inventory data for now (replace with real API data later)
  const mockInventoryItems = [
    {
      id: 1,
      itemName: "Towels (Bath)",
      unitId: 1,
      parLevel: 8,
      currentStock: 6,
      lastUpdated: new Date(2023, 3, 15),
      category: "Linens",
      reorderThreshold: 4,
      notes: "White cotton bath towels",
      sku: "TOW-BAT-01",
      upc: "123456789012",
      cost: 1500, // $15.00
      supplier: "Synergy Linen Supply",
      location: "Bathroom closet",
      minOrderQuantity: 4
      // isConsumable and imageUrl commented out since they don't exist in DB
    },
    {
      id: 2,
      itemName: "Shampoo (Travel)",
      unitId: 1,
      parLevel: 10,
      currentStock: 2,
      lastUpdated: new Date(2023, 3, 20),
      category: "Toiletries",
      reorderThreshold: 5,
      notes: "2oz bottles",
      sku: "TOI-SHA-01",
      upc: "123456789013",
      cost: 250, // $2.50
      supplier: "Synergy Amenities",
      location: "Bathroom cabinet",
      minOrderQuantity: 20
      // isConsumable and imageUrl removed - they don't exist in DB
    },
    {
      id: 3,
      itemName: "Coffee Pods",
      unitId: 1,
      parLevel: 15,
      currentStock: 0,
      lastUpdated: new Date(2023, 3, 22),
      category: "Kitchen",
      reorderThreshold: 6,
      notes: "Dark roast",
      sku: "KIT-COF-01",
      upc: "123456789014",
      cost: 120, // $1.20
      supplier: "Synergy Foods",
      location: "Kitchen drawer",
      minOrderQuantity: 30
      // isConsumable and imageUrl fields removed - they don't exist in DB
    },
    {
      id: 4,
      itemName: "All-Purpose Cleaner",
      unitId: null,
      parLevel: 6,
      currentStock: 3,
      lastUpdated: new Date(2023, 3, 18),
      category: "Cleaning",
      reorderThreshold: 3,
      notes: "Multi-surface spray",
      sku: "CLN-APC-01",
      upc: "123456789015",
      cost: 550, // $5.50
      supplier: "Synergy Cleaning",
      location: "Garage shelf B1",
      minOrderQuantity: 6,
      isConsumable: true,
      imageUrl: null
    },
    {
      id: 5,
      itemName: "Toilet Paper",
      unitId: null,
      parLevel: 20,
      currentStock: 8,
      lastUpdated: new Date(2023, 3, 21),
      category: "Toiletries",
      reorderThreshold: 10,
      notes: "Double roll, 12-pack",
      sku: "TOI-TP-01",
      upc: "123456789016",
      cost: 1200, // $12.00
      supplier: "Synergy Supplies",
      location: "Garage shelf A3",
      minOrderQuantity: 5,
      isConsumable: true,
      imageUrl: null
    }
  ];

  // Use mock data since API isn't fully implemented yet
  const mockData = [...mockInventoryItems]; // Create a copy to avoid mutating the original

  // Filter inventory based on search, active tab, and status
  const filteredInventory = mockData.filter(
    (item) =>
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (activeTab === "unit-inventory"
        ? item.unitId !== null
        : activeTab === "garage-inventory"
        ? item.unitId === null
        : true) &&
      (filterStatus === "all" 
        ? true 
        : filterStatus === "low-stock" 
        ? (item.reorderThreshold && item.currentStock < item.reorderThreshold)
        : filterStatus === "out-of-stock"
        ? item.currentStock <= 0
        : true)
  );

  // Get stock status
  const getStockStatus = (item: any) => {
    if (item.currentStock <= 0) {
      return {
        badge: (
          <Badge className="bg-red-100 text-red-800 border-0">Out of Stock</Badge>
        ),
        severity: "critical",
      };
    }
    
    if (item.currentStock < item.reorderThreshold) {
      return {
        badge: (
          <Badge className="bg-yellow-100 text-yellow-800 border-0">Low Stock</Badge>
        ),
        severity: "warning",
      };
    }
    
    if (item.currentStock < item.parLevel) {
      return {
        badge: (
          <Badge className="bg-blue-100 text-blue-800 border-0">Below Par</Badge>
        ),
        severity: "info",
      };
    }
    
    return {
      badge: (
        <Badge className="bg-green-100 text-green-800 border-0">Stocked</Badge>
      ),
      severity: "ok",
    };
  };

  // Calculate stock level percentage
  const getStockPercentage = (current: number, par: number) => {
    if (par === 0) return 100;
    const percentage = Math.min(Math.round((current / par) * 100), 100);
    return percentage;
  };

  const handleAddInventory = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Inventory creation will be available in the next update.",
    });
  };

  const handleRestock = (itemId: number) => {
    toast({
      title: "Restock Request Sent",
      description: `Restock request for item #${itemId} has been created`,
    });
  };

  const handleOrderQueue = () => {
    toast({
      title: "Order Queue",
      description: "You can manage the purchase queue in the Order Queue tab",
    });
  };

  // Since we're using mock data, loading and error states aren't needed
  // But we'll keep these for when we move to real API data
  if (inventoryLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        </div>
      </Layout>
    );
  }

  if (inventoryError) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-red-500">Error loading inventory data</p>
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
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Inventory</h1>
            <p className="text-[#9EA2B1]">
              Manage unit and garage inventory
            </p>
          </div>

          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search inventory..."
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
                <DropdownMenuItem>All Items</DropdownMenuItem>
                <DropdownMenuItem>Low Stock Items</DropdownMenuItem>
                <DropdownMenuItem>By Category</DropdownMenuItem>
                <DropdownMenuItem>By Location</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={handleAddInventory}>
                  <Add className="h-4 w-4 mr-2" />
                  <span>Add Item</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-[#9EA2B1] mb-4">
                    Enter the inventory item details below
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Item Name
                        </label>
                        <Input placeholder="Enter item name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Location
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select location</option>
                          <option value="garage">Garage Inventory</option>
                          {units &&
                            units.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Category
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select category</option>
                          <option value="linens">Linens</option>
                          <option value="toiletries">Toiletries</option>
                          <option value="kitchen">Kitchen</option>
                          <option value="cleaning">Cleaning Supplies</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Current Stock
                          </label>
                          <Input type="number" min="0" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Par Level
                          </label>
                          <Input type="number" min="0" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reorder At
                          </label>
                          <Input type="number" min="0" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Notes
                        </label>
                        <textarea
                          className="w-full p-2 border border-gray-300 rounded"
                          rows={3}
                          placeholder="Additional notes..."
                        ></textarea>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Save Item</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs
          defaultValue="unit-inventory"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unit-inventory">Unit Inventory</TabsTrigger>
            <TabsTrigger value="garage-inventory">Garage Inventory</TabsTrigger>
            <TabsTrigger value="order-queue">Order Queue</TabsTrigger>
            <TabsTrigger value="qr-requests">QR Code Requests</TabsTrigger>
          </TabsList>

          {/* Unit Inventory Tab */}
          <TabsContent value="unit-inventory" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Par Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item) => {
                        const status = getStockStatus(item);
                        const stockPercentage = getStockPercentage(
                          item.currentStock,
                          item.parLevel
                        );
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-xs text-[#9EA2B1]">
                                {item.category || "Uncategorized"}
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
                                <span className="font-medium mr-2">
                                  {item.currentStock}
                                </span>
                                <Progress value={stockPercentage} className="h-2 w-16" />
                              </div>
                            </TableCell>
                            <TableCell>{item.parLevel}</TableCell>
                            <TableCell>{status.badge}</TableCell>
                            <TableCell>
                              {item.lastUpdated
                                ? format(new Date(item.lastUpdated), "MMM dd, yyyy")
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRestock(item.id)}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Restock
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-[#9EA2B1]"
                        >
                          {searchTerm
                            ? "No inventory items found matching your search"
                            : "No unit inventory items found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Garage Inventory Tab */}
          <TabsContent value="garage-inventory" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Par Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item) => {
                        const status = getStockStatus(item);
                        const stockPercentage = getStockPercentage(
                          item.currentStock,
                          item.parLevel
                        );
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-xs text-[#9EA2B1]">
                                ID: #{item.id}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.category || "Uncategorized"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {item.currentStock}
                                </span>
                                <Progress value={stockPercentage} className="h-2 w-16" />
                              </div>
                            </TableCell>
                            <TableCell>{item.parLevel}</TableCell>
                            <TableCell>{status.badge}</TableCell>
                            <TableCell>
                              {item.lastUpdated
                                ? format(new Date(item.lastUpdated), "MMM dd, yyyy")
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRestock(item.id)}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Reorder
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-[#9EA2B1]"
                        >
                          {searchTerm
                            ? "No inventory items found matching your search"
                            : "No garage inventory items found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Requests Tab */}
          <TabsContent value="qr-requests" className="mt-4">
            <UnitQrRequestCard units={units || mockUnits} />
          </TabsContent>

          {/* Order Queue Tab */}
          <TabsContent value="order-queue" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4 flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-blue-500" />
                    Order Queue Summary
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Pending Orders</span>
                        <span className="font-semibold">12</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Urgent (Next 48 hours)</span>
                        <span className="font-semibold text-red-600">4</span>
                      </div>
                      <Progress value={33} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Monthly Budget Used</span>
                        <span className="font-semibold">$1,450.75 / $2,500</span>
                      </div>
                      <Progress value={58} className="h-2" />
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Most Ordered Items</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                            <span>Toilet Paper</span>
                          </div>
                          <span className="text-[#9EA2B1]">42 units</span>
                        </li>
                        <li className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Hand Soap</span>
                          </div>
                          <span className="text-[#9EA2B1]">36 units</span>
                        </li>
                        <li className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                            <span>Towels</span>
                          </div>
                          <span className="text-[#9EA2B1]">24 units</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button className="w-full" onClick={handleOrderQueue}>
                        <Add className="h-4 w-4 mr-1" />
                        Create New Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Active Orders</h3>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Badge className="bg-red-100 text-red-800 border-0 mr-2">Urgent</Badge>
                            <span className="font-medium">Bathroom Supplies Restock</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <span>4 items</span>
                            <span className="mx-2">•</span>
                            <span>Due: Aug 18, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">$124.50</div>
                          <div className="text-xs text-[#9EA2B1]">Amazon</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={handleOrderQueue}>View Details</Button>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Badge className="bg-yellow-100 text-yellow-800 border-0 mr-2">Standard</Badge>
                            <span className="font-medium">Cleaning Supplies</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <span>6 items</span>
                            <span className="mx-2">•</span>
                            <span>Due: Aug 25, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">$78.25</div>
                          <div className="text-xs text-[#9EA2B1]">Costco</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={handleOrderQueue}>View Details</Button>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Badge className="bg-green-100 text-green-800 border-0 mr-2">Scheduled</Badge>
                            <span className="font-medium">Kitchen Essentials</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <span>8 items</span>
                            <span className="mx-2">•</span>
                            <span>Due: Sep 5, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">$215.80</div>
                          <div className="text-xs text-[#9EA2B1]">Target + Amazon</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={handleOrderQueue}>View Details</Button>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Badge className="bg-blue-100 text-blue-800 border-0 mr-2">Processing</Badge>
                            <span className="font-medium">Linens Restock</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <span>3 items</span>
                            <span className="mx-2">•</span>
                            <span>Ordered: Aug 10, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">$350.00</div>
                          <div className="text-xs text-[#9EA2B1]">Bedding Supplier</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={handleOrderQueue}>View Details</Button>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6">
                      <Button variant="outline" onClick={handleOrderQueue}>View All Orders</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Inventory Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[#2C2E3E]">Low Stock Alerts</h3>
                <Button 
                  variant="ghost" 
                  className="text-[#FFCF45] hover:text-[#FFCF45] hover:underline text-sm flex items-center"
                  onClick={handleOrderQueue}
                >
                  <span>View All</span>
                  <ArrowForward className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="border border-red-500 border-opacity-50 rounded-lg p-3 bg-red-500 bg-opacity-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Error className="text-red-500 mr-2" />
                      <div>
                        <p className="font-medium text-[#2C2E3E]">Beach House - Low on Towels</p>
                        <p className="text-[#9EA2B1] text-xs mt-1">Current: 4, Par Level: 12</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => toast({
                        title: "Restock Requested",
                        description: "Restock request created for Beach House towels",
                      })}
                      className="text-xs border-red-500 text-red-500 px-2 py-1 rounded h-auto"
                    >
                      Restock
                    </Button>
                  </div>
                </div>
                
                <div className="border border-yellow-500 border-opacity-50 rounded-lg p-3 bg-yellow-500 bg-opacity-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Warning className="text-yellow-500 mr-2" />
                      <div>
                        <p className="font-medium text-[#2C2E3E]">Downtown Loft - Coffee Running Low</p>
                        <p className="text-[#9EA2B1] text-xs mt-1">Current: 2, Par Level: 5</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => toast({
                        title: "Restock Requested",
                        description: "Restock request created for Downtown Loft coffee",
                      })}
                      className="text-xs border-yellow-500 text-yellow-500 px-2 py-1 rounded h-auto"
                    >
                      Restock
                    </Button>
                  </div>
                </div>
                
                <div className="border border-yellow-500 border-opacity-50 rounded-lg p-3 bg-yellow-500 bg-opacity-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Warning className="text-yellow-500 mr-2" />
                      <div>
                        <p className="font-medium text-[#2C2E3E]">Lakeside Cabin - Toilet Paper</p>
                        <p className="text-[#9EA2B1] text-xs mt-1">Current: 3, Par Level: 8</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => toast({
                        title: "Restock Requested",
                        description: "Restock request created for Lakeside Cabin toilet paper",
                      })}
                      className="text-xs border-yellow-500 text-yellow-500 px-2 py-1 rounded h-auto"
                    >
                      Restock
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Inventory Trends</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Most Restocked Items</span>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>Toilet Paper</span>
                      <div className="flex items-center text-green-500">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>42%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Least Used Items</span>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>Welcome Gifts</span>
                      <div className="flex items-center text-red-500">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        <span>12%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Monthly Spend</span>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>August 2023</span>
                      <div className="flex items-center text-yellow-500">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>$1,450.75</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toast({
                      title: "Inventory Report",
                      description: "Generating inventory report...",
                    })}
                  >
                    Generate Inventory Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
