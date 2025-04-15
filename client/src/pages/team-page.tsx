import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Person,
  Groups,
  Phone,
  Email,
  Check,
  Assignment,
  TrendingUp,
  TrendingDown,
  Star,
  Edit,
  Description,
  Delete,
} from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import team components
import TeamMemberForm from "@/components/team/TeamMemberForm";
import TeamWorkload from "@/components/team/TeamWorkload";
import TrainingAndSops from "@/components/team/TrainingAndSops";
import TeamPerformance from "@/components/team/TeamPerformance";

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const { toast } = useToast();

  // Fetch team members (users)
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: undefined,
  });

  // Fetch tasks for workload view
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: undefined,
  });

  // Filter team members based on search
  const filteredUsers = users
    ? users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Helper functions
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { bg: string; text: string }> = {
      admin: { bg: "bg-purple-100", text: "text-purple-800" },
      ops: { bg: "bg-blue-100", text: "text-blue-800" },
      va: { bg: "bg-green-100", text: "text-green-800" },
      maintenance: { bg: "bg-yellow-100", text: "text-yellow-800" },
      cleaner: { bg: "bg-red-100", text: "text-red-800" },
    };

    const style = roleConfig[role] || { bg: "bg-gray-100", text: "text-gray-800" };
    
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        {role === "va" ? "Virtual Assistant" : role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getRoleDisplay = (role: string): string => {
    const roleMap: Record<string, string> = {
      admin: "Administrator",
      ops: "Operations Manager",
      va: "Virtual Assistant",
      maintenance: "Maintenance Tech",
      cleaner: "Cleaning Staff",
    };
    
    return roleMap[role] || "Team Member";
  };

  // Get workload for user
  const getUserWorkload = (userId: number) => {
    if (!tasks) return { count: 0, urgent: 0 };
    
    const userTasks = tasks.filter(task => 
      task.assignedTo === userId && !task.completed
    );
    
    const urgentTasks = userTasks.filter(task => 
      task.priority === "high" || task.priority === "urgent"
    );
    
    return {
      count: userTasks.length,
      urgent: urgentTasks.length
    };
  };

  // Handle adding a new team member
  const handleAddTeamMember = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Team member creation will be available in the next update.",
    });
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
          <p className="text-red-500">Error loading team data</p>
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
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Team</h1>
            <p className="text-[#9EA2B1]">
              Manage your team members, workloads, and performance
            </p>
          </div>

          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search team members..."
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
                <DropdownMenuItem>All Team Members</DropdownMenuItem>
                <DropdownMenuItem>Administrators</DropdownMenuItem>
                <DropdownMenuItem>Operations</DropdownMenuItem>
                <DropdownMenuItem>Virtual Assistants</DropdownMenuItem>
                <DropdownMenuItem>Maintenance</DropdownMenuItem>
                <DropdownMenuItem>Cleaners</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={handleAddTeamMember}>
                  <Add className="h-4 w-4 mr-2" />
                  <span>Add Team Member</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Team Member</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-[#9EA2B1] mb-4">
                    Enter the team member details below
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Full Name
                        </label>
                        <Input placeholder="Enter full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Email
                        </label>
                        <Input type="email" placeholder="Email address" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Phone
                        </label>
                        <Input placeholder="Phone number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Role
                        </label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select role</option>
                          <option value="admin">Administrator</option>
                          <option value="ops">Operations Manager</option>
                          <option value="va">Virtual Assistant</option>
                          <option value="maintenance">Maintenance Tech</option>
                          <option value="cleaner">Cleaner</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Username
                        </label>
                        <Input placeholder="Username for login" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Password
                        </label>
                        <Input type="password" placeholder="Temporary password" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Add Team Member</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs
          defaultValue="directory"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="workload">Task Load</TabsTrigger>
            <TabsTrigger value="training">Training & SOPs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Directory Tab */}
          <TabsContent value="directory" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Tasks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const workload = getUserWorkload(user.id);
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-3">
                                  {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-[#9EA2B1]">@{user.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getRoleBadge(user.role)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center text-sm">
                                  <Email className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                                  <span>{user.email}</span>
                                </div>
                                {user.phone && (
                                  <div className="flex items-center text-sm">
                                    <Phone className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.active ? (
                                <Badge className="bg-green-100 text-green-800 border-0">
                                  <Check className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 border-0">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium mr-2">{workload.count}</span>
                                {workload.urgent > 0 && (
                                  <Badge className="bg-red-100 text-red-800 border-0">
                                    {workload.urgent} Urgent
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "View Profile",
                                      description: `Viewing ${user.name}'s profile`,
                                    });
                                  }}
                                >
                                  <Person className="h-4 w-4 mr-1" />
                                  Profile
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "Edit User",
                                      description: `Edit ${user.name}'s details`,
                                    });
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-[#9EA2B1]"
                        >
                          {searchTerm
                            ? "No team members found matching your search"
                            : "No team members found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Load Tab */}
          <TabsContent value="workload" className="mt-4">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Team Workload Overview</h3>
                  
                  <div className="space-y-6">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const workload = getUserWorkload(user.id);
                        // Calculate workload percentage (max 100%)
                        const workloadPercentage = Math.min(workload.count * 10, 100);
                        // Determine color based on workload
                        let progressColor = "bg-green-500";
                        if (workloadPercentage > 80) progressColor = "bg-red-500";
                        else if (workloadPercentage > 50) progressColor = "bg-yellow-500";
                        
                        return (
                          <div key={user.id} className="space-y-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-[#9EA2B1]">{getRoleDisplay(user.role)}</div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <div className="flex items-center text-xs text-[#9EA2B1]">
                                    <Assignment className="h-3 w-3 mr-1" />
                                    <span>
                                      {workload.count} task{workload.count !== 1 ? 's' : ''}
                                      {workload.urgent > 0 && ` (${workload.urgent} urgent)`}
                                    </span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-xs text-[#FFCF45] hover:text-[#FFCF45]"
                                    onClick={() => {
                                      toast({
                                        title: "View Tasks",
                                        description: `Viewing ${user.name}'s tasks`,
                                      });
                                    }}
                                  >
                                    View Tasks
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <Progress 
                              value={workloadPercentage} 
                              className="h-2" 
                              indicatorClassName={progressColor}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[#9EA2B1]">
                        No team members found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Highest Workload</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-3">
                            SD
                          </div>
                          <div>
                            <div className="font-medium">Sarah Davis</div>
                            <div className="text-xs text-[#9EA2B1]">Cleaner</div>
                          </div>
                        </div>
                        <Badge className="bg-red-100 text-red-800 border-0">12 Tasks</Badge>
                      </div>
                      <Progress value={90} className="h-2" indicatorClassName="bg-red-500" />
                      <div className="pt-2 text-xs text-red-500">
                        Overallocated by 40% - Consider reassigning tasks
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Urgent Task Distribution</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span>Maintenance</span>
                        <span className="font-medium">8 urgent tasks</span>
                      </div>
                      <Progress value={40} className="h-2" />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>Cleaning</span>
                        <span className="font-medium">6 urgent tasks</span>
                      </div>
                      <Progress value={30} className="h-2" />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>Inventory</span>
                        <span className="font-medium">4 urgent tasks</span>
                      </div>
                      <Progress value={20} className="h-2" />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>Other</span>
                        <span className="font-medium">2 urgent tasks</span>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Team Capacity</h3>
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-4xl font-bold text-[#2C2E3E]">76%</div>
                        <div className="text-sm text-[#9EA2B1] mt-1">Current Capacity Utilization</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Today</span>
                          <span className="font-medium text-yellow-600">82%</span>
                        </div>
                        <Progress value={82} className="h-2 bg-gray-200" indicatorClassName="bg-yellow-500" />
                        
                        <div className="flex justify-between text-sm">
                          <span>This Week</span>
                          <span className="font-medium text-green-600">76%</span>
                        </div>
                        <Progress value={76} className="h-2 bg-gray-200" indicatorClassName="bg-green-500" />
                        
                        <div className="flex justify-between text-sm">
                          <span>Next Week</span>
                          <span className="font-medium text-green-600">65%</span>
                        </div>
                        <Progress value={65} className="h-2 bg-gray-200" indicatorClassName="bg-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Training & SOPs Tab */}
          <TabsContent value="training" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-0">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Training Materials</h3>
                  </div>
                  <div className="divide-y">
                    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
                      toast({
                        title: "Training Document",
                        description: "Opening Guest Check-in Procedure training",
                      });
                    }}>
                      <div className="flex items-center">
                        <Description className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Guest Check-in Procedure</div>
                          <div className="text-xs text-[#9EA2B1] mt-1">
                            For: Virtual Assistants, Operations
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
                      toast({
                        title: "Training Document",
                        description: "Opening Cleaning Standards training",
                      });
                    }}>
                      <div className="flex items-center">
                        <Description className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Cleaning Standards & Protocols</div>
                          <div className="text-xs text-[#9EA2B1] mt-1">
                            For: Cleaners, Operations
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
                      toast({
                        title: "Training Document",
                        description: "Opening Maintenance Response Protocols training",
                      });
                    }}>
                      <div className="flex items-center">
                        <Description className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Maintenance Response Protocols</div>
                          <div className="text-xs text-[#9EA2B1] mt-1">
                            For: Maintenance, Operations
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
                      toast({
                        title: "Training Document",
                        description: "Opening Inventory Management training",
                      });
                    }}>
                      <div className="flex items-center">
                        <Description className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Inventory Management System</div>
                          <div className="text-xs text-[#9EA2B1] mt-1">
                            For: All Staff
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
                      toast({
                        title: "Training Document",
                        description: "Opening Guest Communication Guidelines training",
                      });
                    }}>
                      <div className="flex items-center">
                        <Description className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Guest Communication Guidelines</div>
                          <div className="text-xs text-[#9EA2B1] mt-1">
                            For: Virtual Assistants, Operations
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "View All Materials",
                          description: "Opening the full training library",
                        });
                      }}
                    >
                      View All Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-[#2C2E3E]">Training Progress</h3>
                    <Button 
                      onClick={() => {
                        toast({
                          title: "Assign Training",
                          description: "Opening training assignment module",
                        });
                      }}
                    >
                      <Add className="h-4 w-4 mr-1" />
                      Assign Training
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Member</TableHead>
                          <TableHead>Training</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                                SD
                              </div>
                              <span>Sarah Davis</span>
                            </div>
                          </TableCell>
                          <TableCell>Cleaning Standards & Protocols</TableCell>
                          <TableCell>Aug 25, 2023</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">75%</span>
                              <Progress value={75} className="h-2 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-100 text-yellow-800 border-0">In Progress</Badge>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                                MJ
                              </div>
                              <span>Michael Johnson</span>
                            </div>
                          </TableCell>
                          <TableCell>System Training</TableCell>
                          <TableCell>Aug 18, 2023</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">100%</span>
                              <Progress value={100} className="h-2 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 border-0">Completed</Badge>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                                TS
                              </div>
                              <span>Tom Smith</span>
                            </div>
                          </TableCell>
                          <TableCell>Maintenance Response Protocols</TableCell>
                          <TableCell>Aug 30, 2023</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">0%</span>
                              <Progress value={0} className="h-2 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800 border-0">Not Started</Badge>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                                JW
                              </div>
                              <span>Jessica Wong</span>
                            </div>
                          </TableCell>
                          <TableCell>Guest Communication Guidelines</TableCell>
                          <TableCell>Aug 15, 2023</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">100%</span>
                              <Progress value={100} className="h-2 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 border-0">Completed</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Completion Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Completed</span>
                              <span className="font-medium">68%</span>
                            </div>
                            <Progress value={68} className="h-2" />
                            
                            <div className="flex justify-between text-sm">
                              <span>In Progress</span>
                              <span className="font-medium">22%</span>
                            </div>
                            <Progress value={22} className="h-2" />
                            
                            <div className="flex justify-between text-sm">
                              <span>Not Started</span>
                              <span className="font-medium">10%</span>
                            </div>
                            <Progress value={10} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Top Training Categories</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>System Training</span>
                              <span className="font-medium">12 modules</span>
                            </div>
                            <Progress value={80} className="h-2" />
                            
                            <div className="flex justify-between text-sm">
                              <span>Guest Relations</span>
                              <span className="font-medium">8 modules</span>
                            </div>
                            <Progress value={60} className="h-2" />
                            
                            <div className="flex justify-between text-sm">
                              <span>Cleaning Protocols</span>
                              <span className="font-medium">6 modules</span>
                            </div>
                            <Progress value={40} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Performance Overview</h3>
                  
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-green-500">92%</div>
                      <div className="text-sm text-[#9EA2B1] mt-1">Team Average Performance</div>
                      <div className="flex items-center justify-center text-xs text-green-500 mt-2">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>Up 3% from last month</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Cleaning Team</span>
                          <span className="font-medium text-green-600">96%</span>
                        </div>
                        <Progress value={96} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Maintenance Team</span>
                          <span className="font-medium text-green-600">94%</span>
                        </div>
                        <Progress value={94} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Virtual Assistants</span>
                          <span className="font-medium text-green-600">91%</span>
                        </div>
                        <Progress value={91} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Operations Team</span>
                          <span className="font-medium text-yellow-600">87%</span>
                        </div>
                        <Progress value={87} className="h-2" indicatorClassName="bg-yellow-500" />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t mt-4">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Performance Report",
                            description: "Generating detailed performance report",
                          });
                        }}
                      >
                        Generate Full Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#2C2E3E] mb-4">Top Performers</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mx-auto mb-2">
                          SD
                        </div>
                        <div className="font-medium">Sarah Davis</div>
                        <div className="text-xs text-[#9EA2B1]">Cleaner</div>
                        <div className="mt-2 flex items-center justify-center">
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                        </div>
                        <div className="mt-2 text-sm font-medium text-green-600">98%</div>
                      </div>
                      
                      <div className="border rounded-lg p-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mx-auto mb-2">
                          RM
                        </div>
                        <div className="font-medium">Robert Miller</div>
                        <div className="text-xs text-[#9EA2B1]">Maintenance</div>
                        <div className="mt-2 flex items-center justify-center">
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                        </div>
                        <div className="mt-2 text-sm font-medium text-green-600">97%</div>
                      </div>
                      
                      <div className="border rounded-lg p-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mx-auto mb-2">
                          JW
                        </div>
                        <div className="font-medium">Jessica Wong</div>
                        <div className="text-xs text-[#9EA2B1]">Virtual Assistant</div>
                        <div className="mt-2 flex items-center justify-center">
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                          <Star className="h-4 w-4 text-[#FFCF45]" />
                        </div>
                        <div className="mt-2 text-sm font-medium text-green-600">96%</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Performance Metrics</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Team Average</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Task Completion Rate</TableCell>
                            <TableCell>95%</TableCell>
                            <TableCell>97%</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-0">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Above Target
                              </Badge>
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell>On-Time Percentage</TableCell>
                            <TableCell>90%</TableCell>
                            <TableCell>92%</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-0">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Above Target
                              </Badge>
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell>Quality Control Pass Rate</TableCell>
                            <TableCell>95%</TableCell>
                            <TableCell>94%</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Slightly Below
                              </Badge>
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell>Guest Satisfaction</TableCell>
                            <TableCell>4.8/5.0</TableCell>
                            <TableCell>4.9/5.0</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-0">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Above Target
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Areas for Improvement</h4>
                      <div className="space-y-2">
                        <div className="p-3 border rounded-lg">
                          <div className="font-medium">Quality Control Processes</div>
                          <div className="text-sm text-[#9EA2B1] mt-1">
                            Implement additional quality control steps for cleaning staff to increase pass rate.
                          </div>
                        </div>
                        
                        <div className="p-3 border rounded-lg">
                          <div className="font-medium">Communication Response Times</div>
                          <div className="text-sm text-[#9EA2B1] mt-1">
                            Reduce VA response time to guest inquiries from current 2.5 hours to target of 1 hour.
                          </div>
                        </div>
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
