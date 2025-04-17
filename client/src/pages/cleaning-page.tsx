import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Add,
  FilterList,
  CleaningServices,
  CheckCircle,
  Cancel,
  Schedule,
  Home,
  Person,
  CalendarMonth,
  PhotoCamera,
  Assignment,
  MapOutlined,
  Flag,
  VerifiedUser,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import our new components for cleaning functionality
import CleaningFlags from "@/components/cleaning/CleaningFlags";
import CleanerPerformance from "@/components/cleaning/CleanerPerformance";

export default function CleaningPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("schedule");

  // Fetch cleaning tasks
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/cleaning-tasks"],
  });

  console.log("Cleaning Tasks Response:", { tasks, isLoading, error });

  // Use all cleaning tasks from API endpoint (they're already filtered)
  const cleaningTasks = tasks || [];

  // Group by status
  const scheduledTasks = Array.isArray(cleaningTasks) 
    ? cleaningTasks.filter((task) => task.status !== "completed") 
    : [];
  const completedTasks = Array.isArray(cleaningTasks)
    ? cleaningTasks.filter((task) => task.status === "completed")
    : [];

  // Fetch units for reference
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  // Fetch users for reference (cleaners)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Helper function to get unit name
  const getUnitName = (unitId: number) => {
    if (!units || !Array.isArray(units)) return `Unit #${unitId}`;
    const unit = units.find((u: any) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  // Helper function to get cleaner name
  const getCleanerName = (userId: number | null | undefined) => {
    if (!userId || !users || !Array.isArray(users)) return "Unassigned";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : "Unknown";
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not scheduled";
    return format(new Date(dateString), "MMM dd, yyyy - h:mm a");
  };

  // Get status badge
  const getStatusBadge = (task: any) => {
    if (task.status === "completed") {
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    
    if (task.status === "in-progress") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Schedule className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    
    if (!task.scheduledFor || new Date(task.scheduledFor) > new Date()) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Schedule className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-red-100 text-red-800 border-0">
        <Cancel className="h-3 w-3 mr-1" />
        Overdue
      </Badge>
    );
  };

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
          <p className="text-red-500">Error loading cleaning data</p>
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
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Cleaning</h1>
            <p className="text-[#9EA2B1]">
              Manage cleaning schedules and quality control
            </p>
          </div>

          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search cleanings..."
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
                <DropdownMenuItem>All Cleanings</DropdownMenuItem>
                <DropdownMenuItem>Today's Schedule</DropdownMenuItem>
                <DropdownMenuItem>This Week</DropdownMenuItem>
                <DropdownMenuItem>By Cleaner</DropdownMenuItem>
                <DropdownMenuItem>By Property</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Add className="h-4 w-4 mr-2" />
                  <span>Schedule Cleaning</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule New Cleaning</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-[#9EA2B1] mb-4">
                    Enter the cleaning details below
                  </p>
                  {/* Form fields for new cleaning would go here */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Property
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select a property</option>
                          {units && Array.isArray(units) &&
                            units.map((unit: any) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Assigned To
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select a cleaner</option>
                          {users && Array.isArray(users) &&
                            users
                              .filter((user: any) => user.role === "cleaner")
                              .map((user: any) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Due Date and Time
                        </label>
                        <Input type="datetime-local" />
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
                          Notes
                        </label>
                        <textarea
                          className="w-full p-2 border border-gray-300 rounded"
                          rows={3}
                          placeholder="Additional instructions..."
                        ></textarea>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Schedule Cleaning</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs 
          defaultValue="schedule" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="quality-control">Quality Control</TabsTrigger>
            <TabsTrigger value="mapping">Cleaner Mapping</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledTasks.length > 0 ? (
                      scheduledTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                              <span>{getUnitName(task.unitId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-2">
                                <Person className="h-4 w-4" />
                              </div>
                              <span>{getCleanerName(task.assignedTo)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarMonth className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                              <span>{formatDate(task.scheduledFor)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(task)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Assignment className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Schedule className="h-4 w-4 mr-1" />
                                Reschedule
                              </Button>
                              <Button variant="default" size="sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-[#9EA2B1]"
                        >
                          No scheduled cleanings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Completed Cleanings */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-[#2C2E3E] mb-4">
                Recently Completed
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Cleaner</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Photos</TableHead>
                        <TableHead>QC Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTasks.length > 0 ? (
                        completedTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                                <span>{getUnitName(task.unitId)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-800 mr-2">
                                  <Person className="h-4 w-4" />
                                </div>
                                <span>{getCleanerName(task.assignedTo)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {task.completedAt
                                ? format(
                                    new Date(task.completedAt),
                                    "MMM dd, yyyy - h:mm a"
                                  )
                                : "Unknown"}
                            </TableCell>
                            <TableCell>
                              {task.completedAt && task.scheduledFor
                                ? "1h 45m"
                                : "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <PhotoCamera className="h-4 w-4 mr-1" />
                                {task.photos?.length || 0} Photos
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium mr-2 text-green-600">
                                  96%
                                </span>
                                <Progress value={96} className="h-2 w-20" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-[#9EA2B1]"
                          >
                            No completed cleanings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quality Control Tab */}
          <TabsContent value="quality-control" className="mt-4">
            {/* Quality Control Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4 flex items-center">
                    <CleaningServices className="h-5 w-5 mr-2 text-blue-500" />
                    Quality Control Overview
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Average QC Score</span>
                        <span className="font-semibold text-green-600">94%</span>
                      </div>
                      <Progress value={94} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Cleanings Inspected</span>
                        <span className="font-semibold">24/45</span>
                      </div>
                      <Progress value={53} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#9EA2B1]">Pass Rate</span>
                        <span className="font-semibold text-green-600">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Top Issues Found</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                          <span>Bathroom surfaces not properly cleaned</span>
                        </li>
                        <li className="flex items-center text-sm">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                          <span>Towels not properly folded or stocked</span>
                        </li>
                        <li className="flex items-center text-sm">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                          <span>Dust on ceiling fans</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Recent Inspections</h3>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                            <span className="font-medium">Beach House</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <Person className="h-3 w-3 mr-1" />
                            <span>Cleaned by Sarah Davis</span>
                            <span className="mx-2">•</span>
                            <span>Aug 15, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">97%</div>
                          <div className="text-xs text-[#9EA2B1]">QC Score</div>
                        </div>
                      </div>
                      <Progress value={97} className="h-1.5 mt-2" />
                      <div className="mt-3">
                        <Badge className="bg-green-100 text-green-800 border-0">Passed</Badge>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                            <span className="font-medium">Downtown Loft</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <Person className="h-3 w-3 mr-1" />
                            <span>Cleaned by Michael Johnson</span>
                            <span className="mx-2">•</span>
                            <span>Aug 14, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-yellow-600">82%</div>
                          <div className="text-xs text-[#9EA2B1]">QC Score</div>
                        </div>
                      </div>
                      <Progress value={82} className="h-1.5 mt-2" />
                      <div className="mt-3 flex items-center justify-between">
                        <Badge className="bg-yellow-100 text-yellow-800 border-0">Minor Issues</Badge>
                        <Button variant="outline" size="sm" className="h-7 text-xs">View Issues</Button>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Home className="h-4 w-4 mr-2 text-[#9EA2B1]" />
                            <span className="font-medium">Lakeside Cabin</span>
                          </div>
                          <div className="flex items-center text-sm text-[#9EA2B1] mt-1">
                            <Person className="h-3 w-3 mr-1" />
                            <span>Cleaned by Emily Wilson</span>
                            <span className="mx-2">•</span>
                            <span>Aug 13, 2023</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">68%</div>
                          <div className="text-xs text-[#9EA2B1]">QC Score</div>
                        </div>
                      </div>
                      <Progress value={68} className="h-1.5 mt-2" />
                      <div className="mt-3 flex items-center justify-between">
                        <Badge className="bg-red-100 text-red-800 border-0">Failed</Badge>
                        <Button variant="outline" size="sm" className="h-7 text-xs">View Issues</Button>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6">
                      <Button variant="outline">View All Inspections</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Advanced Quality Control Section */}
            <div className="mt-8 space-y-6">
              {/* Cleaning Flags Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Flag className="h-5 w-5 mr-2 text-red-500" />
                    Cleaning Issue Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="open" className="w-full">
                    <TabsList className="w-full grid grid-cols-4 mb-4">
                      <TabsTrigger value="open">Open</TabsTrigger>
                      <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                      <TabsTrigger value="escalated">Escalated</TabsTrigger>
                      <TabsTrigger value="resolved">Resolved</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open">
                      <CleaningFlags status="open" />
                    </TabsContent>
                    <TabsContent value="in-progress">
                      <CleaningFlags status="in-progress" />
                    </TabsContent>
                    <TabsContent value="escalated">
                      <CleaningFlags status="escalated" />
                    </TabsContent>
                    <TabsContent value="resolved">
                      <CleaningFlags status="resolved" />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              {/* Cleaner Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <VerifiedUser className="h-5 w-5 mr-2 text-green-500" />
                    Cleaner Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CleanerPerformance />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cleaner Mapping Tab */}
          <TabsContent value="mapping" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] flex items-center">
                    <MapOutlined className="h-5 w-5 mr-2 text-blue-500" />
                    Cleaner Route Optimization
                  </h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Today</Button>
                    <Button variant="outline" size="sm">Tomorrow</Button>
                    <Button variant="outline" size="sm">This Week</Button>
                  </div>
                </div>
                
                <div className="border rounded-lg bg-gray-50 h-96 flex items-center justify-center">
                  <div className="text-center">
                    <MapOutlined className="h-16 w-16 text-[#9EA2B1] mx-auto mb-4" />
                    <p className="text-[#9EA2B1]">Google Maps integration would display here</p>
                    <p className="text-sm text-[#9EA2B1] mt-2">Showing cleaner routes for optimal scheduling</p>
                    <Button className="mt-4">Load Map</Button>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Today's Cleaner Routes</h4>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                          <Person className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Sarah Davis</div>
                          <div className="text-sm text-[#9EA2B1]">3 properties • 14.2 miles total</div>
                        </div>
                        <Button variant="outline" size="sm">View Route</Button>
                      </div>
                      
                      <div className="p-3 border rounded-lg flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                          <Person className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Michael Johnson</div>
                          <div className="text-sm text-[#9EA2B1]">2 properties • 8.7 miles total</div>
                        </div>
                        <Button variant="outline" size="sm">View Route</Button>
                      </div>
                      
                      <div className="p-3 border rounded-lg flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                          <Person className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Emily Wilson</div>
                          <div className="text-sm text-[#9EA2B1]">4 properties • 19.5 miles total</div>
                        </div>
                        <Button variant="outline" size="sm">View Route</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Optimization Stats</h4>
                    <div className="p-4 border rounded-lg space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-[#9EA2B1]">Average Travel Distance</span>
                          <span className="font-medium">4.6 miles per property</span>
                        </div>
                        <Progress value={65} className="h-1.5" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-[#9EA2B1]">Time Efficiency</span>
                          <span className="font-medium text-green-600">82%</span>
                        </div>
                        <Progress value={82} className="h-1.5" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-[#9EA2B1]">Carbon Footprint Reduction</span>
                          <span className="font-medium text-green-600">28%</span>
                        </div>
                        <Progress value={28} className="h-1.5" />
                      </div>
                      
                      <div className="pt-2 border-t mt-4">
                        <h5 className="font-medium text-sm mb-2">Suggested Improvements</h5>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                            <span>Reassign Downtown Loft to Emily's route</span>
                          </li>
                          <li className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                            <span>Group Beach House cleanings on same day</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
