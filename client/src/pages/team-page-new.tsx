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
  Edit,
  Delete,
} from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
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
  const [selectedRole, setSelectedRole] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team members (users)
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: userError,
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: undefined,
  });

  // Fetch tasks for workload view
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
  } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: undefined,
  });

  // Filter team members based on search and role
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

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
    
    const userTasks = tasks.filter((task: any) => 
      task.assignedTo === userId && !task.completed
    );
    
    const urgentTasks = userTasks.filter((task: any) => 
      task.priority === "high" || task.priority === "urgent"
    );
    
    return {
      count: userTasks.length,
      urgent: urgentTasks.length
    };
  };

  // Handle form submission for adding/editing team members
  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setEditingUser(null);
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
  };

  // Handle deleting a team member
  const handleDeleteUser = () => {
    if (!userToDelete) return;
    
    toast({
      title: "Delete Team Member",
      description: "This feature will be available in the next update.",
    });
    
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Handle opening Edit dialog
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setIsAddDialogOpen(true);
  };

  // Handle Opening Delete confirmation
  const handleDeleteConfirm = (user: any) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  if (isLoadingUsers) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        </div>
      </Layout>
    );
  }

  if (userError) {
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
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Team Management</h1>
            <p className="text-[#9EA2B1]">
              Manage team members, workloads, trainings, and performance
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
                  <span>
                    {selectedRole === "all" 
                      ? "All Roles" 
                      : getRoleDisplay(selectedRole)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedRole("all")}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("admin")}>
                  Administrators
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("ops")}>
                  Operations Managers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("va")}>
                  Virtual Assistants
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("maintenance")}>
                  Maintenance Technicians
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole("cleaner")}>
                  Cleaning Staff
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Add className="h-4 w-4 mr-2" />
              <span>Add Team Member</span>
            </Button>
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
                      filteredUsers.map((user: any) => {
                        const workload = getUserWorkload(user.id);
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-3">
                                  {user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
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
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <AlertDialog
                                  open={isDeleteDialogOpen && userToDelete?.id === user.id}
                                  onOpenChange={() => setIsDeleteDialogOpen(false)}
                                >
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                                      onClick={() => handleDeleteConfirm(user)}
                                    >
                                      <Delete className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                </AlertDialog>
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
                  <TeamWorkload 
                    users={filteredUsers} 
                    tasks={tasks} 
                    onAssignTask={(userId) => {
                      toast({
                        title: "Assign Task",
                        description: `Feature to assign task to user #${userId} coming soon.`
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Training & SOPs Tab */}
          <TabsContent value="training" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <TrainingAndSops
                  users={users}
                  currentUser={users[0]} // Normally this would be the logged-in user
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <TeamPerformance 
                  users={filteredUsers}
                  tasks={tasks}
                  timeframe="month"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Team Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Update the team member's information below"
                : "Fill out the form to add a new team member"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TeamMemberForm 
              initialData={editingUser} 
              onSuccess={handleFormSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team member{' '}
              <span className="font-semibold">{userToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}