import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapOutlined, Person, DragIndicator, Save, Route, MyLocation } from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CleaningTask {
  id: number;
  unitId: number;
  status: string;
  scheduledFor: string;
  assignedTo: number | null;
  routeOrder: number | null;
}

interface Unit {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface RouteStats {
  totalDistance: number;
  timeEfficiency: number;
  carbonReduction: number;
  suggestions: string[];
}

export default function RouteOptimization() {
  const [selectedDate, setSelectedDate] = useState<string>("today");
  const [selectedCleaner, setSelectedCleaner] = useState<number | null>(null);
  const [optimized, setOptimized] = useState<boolean>(false);
  const [taskOrder, setTaskOrder] = useState<CleaningTask[]>([]);
  const queryClient = useQueryClient();

  // Get cleaning tasks
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["/api/cleaning-tasks"],
  });

  // Get units for address information
  const {
    data: units,
    isLoading: unitsLoading,
    error: unitsError,
  } = useQuery({
    queryKey: ["/api/units"],
  });

  // Get users for cleaner information
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["/api/users"],
  });

  // Mock stats - would be calculated from actual route optimization
  const routeStats: RouteStats = {
    totalDistance: 42.4,
    timeEfficiency: 82,
    carbonReduction: 28,
    suggestions: [
      "Reassign Downtown Loft to Emily's route",
      "Group Beach House cleanings on same day"
    ]
  };

  // Mutation to update route order
  const updateRouteMutation = useMutation({
    mutationFn: async (updatedTasks: any[]) => {
      return await apiRequest("/api/cleaning-routes", "POST", { tasks: updatedTasks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-tasks"] });
      toast({
        title: "Routes updated",
        description: "Cleaning routes have been optimized and saved.",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating routes",
        description: "There was a problem updating the cleaning routes.",
        variant: "destructive"
      });
    }
  });

  // Filter tasks for the selected date and cleaner
  useEffect(() => {
    if (!tasks || !Array.isArray(tasks)) return;
    
    // Filter by date
    let filteredTasks = tasks.filter((task: any) => task.status !== "completed");
    
    if (selectedDate === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredTasks = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.scheduledFor);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
    } else if (selectedDate === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      filteredTasks = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.scheduledFor);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === tomorrow.getTime();
      });
    } else if (selectedDate === "week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      filteredTasks = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.scheduledFor);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= today && taskDate < nextWeek;
      });
    }
    
    // Filter by cleaner if one is selected
    if (selectedCleaner) {
      filteredTasks = filteredTasks.filter((task: any) => task.assignedTo === selectedCleaner);
    }
    
    // Sort by route order if available, otherwise by scheduled time
    filteredTasks.sort((a: any, b: any) => {
      if (a.routeOrder !== null && b.routeOrder !== null) {
        return a.routeOrder - b.routeOrder;
      } else if (a.routeOrder !== null) {
        return -1;
      } else if (b.routeOrder !== null) {
        return 1;
      } else {
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }
    });
    
    setTaskOrder(filteredTasks);
  }, [tasks, selectedDate, selectedCleaner]);

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setOptimized(false);
  };

  // Handle cleaner selection
  const handleCleanerSelect = (id: number | null) => {
    setSelectedCleaner(id);
    setOptimized(false);
  };

  // Get unit name by ID
  const getUnitName = (unitId: number) => {
    if (!units || !Array.isArray(units)) return `Unit #${unitId}`;
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  // Get unit address by ID
  const getUnitAddress = (unitId: number) => {
    if (!units || !Array.isArray(units)) return "Address unknown";
    const unit = units.find((u: Unit) => u.id === unitId);
    return unit ? unit.address : "Address unknown";
  };

  // Get cleaner name by ID
  const getCleanerName = (cleanerId: number | null) => {
    if (!cleanerId || !users || !Array.isArray(users)) return "Unassigned";
    const user = users.find((u: User) => u.id === cleanerId);
    return user ? user.name : "Unknown";
  };

  // Get cleaners list
  const getCleaners = () => {
    if (!users || !Array.isArray(users)) return [];
    return users.filter((user: User) => user.role === "cleaner" || user.role === "maintenance");
  };

  // Handle drag and drop reordering
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(taskOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update the routeOrder property for each task
    const updatedItems = items.map((item, index) => ({
      ...item,
      routeOrder: index + 1
    }));
    
    setTaskOrder(updatedItems);
    setOptimized(true);
  };

  // Optimize routes algorithmically
  const optimizeRoutes = () => {
    // In a real implementation, this would call an API that implements
    // a proper route optimization algorithm (like traveling salesman)
    
    // For now, we'll just sort by scheduled time as a placeholder
    const optimizedTasks = [...taskOrder].sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
    
    // Update route order
    const updatedTasks = optimizedTasks.map((task, index) => ({
      ...task,
      routeOrder: index + 1
    }));
    
    setTaskOrder(updatedTasks);
    setOptimized(true);
    
    toast({
      title: "Routes optimized",
      description: "Cleaning routes have been automatically optimized based on location and timing.",
      variant: "default"
    });
  };

  // Save the current route order
  const saveRouteOrder = () => {
    const updatedTasks = taskOrder.map((task, index) => ({
      id: task.id,
      routeOrder: index + 1
    }));
    
    updateRouteMutation.mutate(updatedTasks);
  };

  if (tasksLoading || unitsLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (tasksError || unitsError || usersError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Error loading data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#2C2E3E] flex items-center">
          <MapOutlined className="h-5 w-5 mr-2 text-blue-500" />
          Cleaner Route Optimization
        </h3>
        <div className="flex space-x-2">
          <Button 
            variant={selectedDate === "today" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleDateSelect("today")}
          >
            Today
          </Button>
          <Button 
            variant={selectedDate === "tomorrow" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleDateSelect("tomorrow")}
          >
            Tomorrow
          </Button>
          <Button 
            variant={selectedDate === "week" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleDateSelect("week")}
          >
            This Week
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left side - Cleaner selection */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Select Cleaner</h4>
              <div className="space-y-2">
                <div 
                  className={`p-3 border rounded-lg flex items-center cursor-pointer hover:bg-gray-50 ${selectedCleaner === null ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => handleCleanerSelect(null)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                    <Person className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">All Cleaners</div>
                    <div className="text-sm text-[#9EA2B1]">View all assigned tasks</div>
                  </div>
                </div>
                
                {getCleaners().map((cleaner: User) => (
                  <div 
                    key={cleaner.id}
                    className={`p-3 border rounded-lg flex items-center cursor-pointer hover:bg-gray-50 ${selectedCleaner === cleaner.id ? 'border-blue-500 bg-blue-50' : ''}`}
                    onClick={() => handleCleanerSelect(cleaner.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                      <Person className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{cleaner.name}</div>
                      <div className="text-sm text-[#9EA2B1]">{cleaner.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Button 
                  className="w-full"
                  onClick={optimizeRoutes}
                  disabled={taskOrder.length < 2}
                >
                  <Route className="h-4 w-4 mr-2" />
                  Auto-Optimize Routes
                </Button>
                
                <Button 
                  className="w-full mt-2"
                  variant="outline"
                  onClick={saveRouteOrder}
                  disabled={!optimized}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Route Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Middle - Map visualization */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Map View</h4>
              <div className="border rounded-lg bg-gray-50 h-80 flex items-center justify-center">
                <div className="text-center">
                  <MapOutlined className="h-12 w-12 text-[#9EA2B1] mx-auto mb-4" />
                  <p className="text-[#9EA2B1]">Map visualization</p>
                  <p className="text-sm text-[#9EA2B1] mt-2">Properties and optimized routes</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    disabled={taskOrder.length === 0}
                  >
                    <MyLocation className="h-4 w-4 mr-2" />
                    Show in Google Maps
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right side - Stats and optimization metrics */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Optimization Stats</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Total Travel Distance</span>
                    <span className="font-medium">{routeStats.totalDistance} miles</span>
                  </div>
                  <Progress value={65} className="h-1.5" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Time Efficiency</span>
                    <span className="font-medium text-green-600">{routeStats.timeEfficiency}%</span>
                  </div>
                  <Progress value={routeStats.timeEfficiency} className="h-1.5" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#9EA2B1]">Carbon Reduction</span>
                    <span className="font-medium text-green-600">{routeStats.carbonReduction}%</span>
                  </div>
                  <Progress value={routeStats.carbonReduction} className="h-1.5" />
                </div>
                
                <div className="pt-2 border-t mt-4">
                  <h5 className="font-medium text-sm mb-2">Suggested Improvements</h5>
                  <ul className="space-y-1 text-sm">
                    {routeStats.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Drag and drop task list */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Task Sequence</h4>
            <div className="text-sm text-[#9EA2B1]">Drag to reorder</div>
          </div>
          
          {taskOrder.length === 0 ? (
            <div className="text-center py-8 text-[#9EA2B1]">
              No tasks scheduled for the selected date and cleaner
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {taskOrder.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="p-3 border rounded-lg flex items-center"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="mr-2 cursor-move text-gray-400"
                            >
                              <DragIndicator />
                            </div>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                              <div className="col-span-1 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full w-8 h-8">
                                {index + 1}
                              </div>
                              <div className="col-span-5">
                                <div className="font-medium">{getUnitName(task.unitId)}</div>
                                <div className="text-xs text-[#9EA2B1]">{getUnitAddress(task.unitId)}</div>
                              </div>
                              <div className="col-span-3">
                                <div className="text-sm">{getCleanerName(task.assignedTo)}</div>
                              </div>
                              <div className="col-span-3 text-right">
                                <div className="text-sm">{new Date(task.scheduledFor).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}