import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Assignment, 
  AssignmentTurnedIn, 
  AssignmentLate,
  CalendarMonth,
  AccessTime,
  Error,
  FilterList
} from "@mui/icons-material";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";

interface TeamWorkloadProps {
  users?: User[];
  tasks?: any[];
  onAssignTask?: (userId: number) => void;
}

export default function TeamWorkload({ users, tasks, onAssignTask }: TeamWorkloadProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Helper function to calculate workload percentage (0-100)
  const calculateWorkload = (userId: number) => {
    if (!tasks) return 0;
    
    // Get user's active tasks
    const userTasks = tasks.filter(task => 
      task.assignedTo === userId && !task.completed
    );
    
    // Calculate workload based on number of tasks
    // This is a simple calculation for demo purposes
    // In a real app, we might consider task priorities, deadlines, etc.
    const taskCount = userTasks.length;
    
    // Each user can handle up to 10 tasks comfortably
    const workloadPercentage = Math.min(taskCount * 10, 100);
    
    return workloadPercentage;
  };

  // Get workload status based on percentage
  const getWorkloadStatus = (percentage: number) => {
    if (percentage < 40) return "light";
    if (percentage < 80) return "moderate";
    return "heavy";
  };

  // Get color class based on workload
  const getWorkloadColorClass = (percentage: number) => {
    if (percentage < 40) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get urgent task count
  const getUrgentTaskCount = (userId: number) => {
    if (!tasks) return 0;
    
    return tasks.filter(task => 
      task.assignedTo === userId && 
      !task.completed && 
      (task.priority === "high" || task.priority === "urgent")
    ).length;
  };

  // Get task count by type
  const getTaskCountByType = (userId: number, type: string) => {
    if (!tasks) return 0;
    
    return tasks.filter(task => 
      task.assignedTo === userId && 
      !task.completed && 
      task.type === type
    ).length;
  };

  // Get upcoming due tasks (due in the next 3 days)
  const getUpcomingDueTasks = (userId: number) => {
    if (!tasks) return 0;
    
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    
    return tasks.filter(task => 
      task.assignedTo === userId && 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate) <= threeDaysLater &&
      new Date(task.dueDate) >= now
    ).length;
  };

  // Filter users based on workload status
  const filteredUsers = users?.filter(user => {
    if (filterStatus === "all") return true;
    
    const workload = calculateWorkload(user.id);
    const status = getWorkloadStatus(workload);
    
    return status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#2C2E3E]">Team Workload Overview</h3>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterList className="h-4 w-4 mr-2" />
              {filterStatus === "all" 
                ? "All Workloads" 
                : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) + " Workload"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterStatus("all")}>
              All Workloads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus("light")}>
              Light Workload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus("moderate")}>
              Moderate Workload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus("heavy")}>
              Heavy Workload
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredUsers?.map(user => {
          const workload = calculateWorkload(user.id);
          const urgentCount = getUrgentTaskCount(user.id);
          const cleaningTasks = getTaskCountByType(user.id, "cleaning");
          const maintenanceTasks = getTaskCountByType(user.id, "maintenance");
          const inventoryTasks = getTaskCountByType(user.id, "inventory");
          const upcomingDueTasks = getUpcomingDueTasks(user.id);
          
          return (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-3">
                      {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-[#2C2E3E]">{user.name}</h4>
                      <p className="text-sm text-[#9EA2B1]">
                        {user.role === "va" ? "Virtual Assistant" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4 items-center">
                    {urgentCount > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-0">
                        <Error className="h-3 w-3 mr-1" />
                        {urgentCount} Urgent
                      </Badge>
                    )}
                    
                    {upcomingDueTasks > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0">
                        <CalendarMonth className="h-3 w-3 mr-1" />
                        {upcomingDueTasks} Due Soon
                      </Badge>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onAssignTask?.(user.id)}
                    >
                      <Assignment className="h-4 w-4 mr-1" />
                      Assign Task
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <AccessTime className="h-4 w-4 text-[#9EA2B1] mr-1" />
                      <span className="text-sm font-medium text-[#2C2E3E]">Current Workload</span>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{workload}%</span>
                      <Badge className={`
                        ${workload < 40 ? 'bg-green-100 text-green-800' : 
                          workload < 80 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'} 
                        border-0
                      `}>
                        {getWorkloadStatus(workload).charAt(0).toUpperCase() + getWorkloadStatus(workload).slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress 
                    value={workload} 
                    className="h-2"
                    indicatorClassName={getWorkloadColorClass(workload)}
                  />
                </div>
                
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <Assignment className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm font-medium text-[#2C2E3E]">Total Tasks</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {tasks?.filter(t => t.assignedTo === user.id && !t.completed)?.length || 0}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <AssignmentTurnedIn className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-[#2C2E3E]">Completed</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {tasks?.filter(t => t.assignedTo === user.id && t.completed)?.length || 0}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <AssignmentLate className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-sm font-medium text-[#2C2E3E]">Overdue</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {tasks?.filter(t => 
                        t.assignedTo === user.id && 
                        !t.completed && 
                        t.dueDate && 
                        new Date(t.dueDate) < new Date()
                      )?.length || 0}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center mb-1">
                      <CalendarMonth className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium text-[#2C2E3E]">Due Soon</span>
                    </div>
                    <span className="text-2xl font-bold">{upcomingDueTasks}</span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cleaningTasks > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                      <span className="text-sm">Cleaning Tasks</span>
                      <Badge className="bg-blue-100 text-blue-800 border-0">
                        {cleaningTasks}
                      </Badge>
                    </div>
                  )}
                  
                  {maintenanceTasks > 0 && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                      <span className="text-sm">Maintenance Tasks</span>
                      <Badge className="bg-orange-100 text-orange-800 border-0">
                        {maintenanceTasks}
                      </Badge>
                    </div>
                  )}
                  
                  {inventoryTasks > 0 && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                      <span className="text-sm">Inventory Tasks</span>
                      <Badge className="bg-green-100 text-green-800 border-0">
                        {inventoryTasks}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!filteredUsers || filteredUsers.length === 0) && (
          <div className="text-center p-8 bg-slate-50 rounded-md">
            <Assignment className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[#9EA2B1]">No team members found with the selected workload filter.</p>
            {filterStatus !== "all" && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setFilterStatus("all")}
              >
                Show All Team Members
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}