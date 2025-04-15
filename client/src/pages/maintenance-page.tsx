import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function MaintenancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tickets");

  // Fetch maintenance items
  const {
    data: maintenance,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/maintenance"],
    queryFn: undefined,
  });

  // Fetch units for reference
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
    queryFn: undefined,
  });

  // Fetch vendors for reference
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: undefined,
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
  const getPriorityBadge = (priority: string) => {
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

  // Filter maintenance based on search and active tab
  const filteredMaintenance = maintenance
    ? maintenance.filter(
        (item) =>
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  
  // Open tickets and completed tickets for the tickets tab
  const openTickets = filteredMaintenance.filter(item => item.status !== "completed");
  const completedTickets = filteredMaintenance.filter(item => item.status === "completed");

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
                <DropdownMenuItem>All Tickets</DropdownMenuItem>
                <DropdownMenuItem>Urgent Priority</DropdownMenuItem>
                <DropdownMenuItem>Assigned to Me</DropdownMenuItem>
                <DropdownMenuItem>By Property</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
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
                <div className="py-4">
                  <p className="text-[#9EA2B1] mb-4">
                    Enter the maintenance issue details below
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Property
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select a property</option>
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
                          Description
                        </label>
                        <textarea
                          className="w-full p-2 border border-gray-300 rounded"
                          rows={3}
                          placeholder="Describe the maintenance issue..."
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Priority
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="low">Low</option>
                          <option value="normal" selected>
                            Normal
                          </option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Assign to Vendor
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Unassigned</option>
                          {vendors &&
                            vendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Estimated Cost
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                          <Input className="pl-6" placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Ticket</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                              <Button variant="outline" size="sm">
                                <AssignmentInd className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                              <Button variant="default" size="sm">
                                <Check className="h-4 w-4 mr-1" />
                                Complete
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
                              <Button variant="outline" size="sm">
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
    </Layout>
  );
}
