import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, User, Clock, Star, Flag, Calendar, BarChart3, TrendingUp, Award } from "lucide-react";

// Helper to format date range for period
const formatPeriodRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
};

export default function CleanerPerformance() {
  const [selectedPeriod, setSelectedPeriod] = useState("last30");
  const [selectedCleanerId, setSelectedCleanerId] = useState<number | null>(null);
  const [viewingCleanerDetails, setViewingCleanerDetails] = useState<any | null>(null);
  
  // Fetch all cleaner performance metrics
  const { 
    data: performanceData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/cleaner-performance"],
    queryFn: async () => {
      const response = await fetch("/api/cleaner-performance");
      if (!response.ok) {
        throw new Error("Failed to fetch cleaner performance data");
      }
      return response.json();
    }
  });
  
  // Fetch users (to get cleaner names)
  const { 
    data: users
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    }
  });
  
  // Helper to get cleaner name by id
  const getCleanerName = (cleanerId: number) => {
    if (!users || !Array.isArray(users)) return "Unknown Cleaner";
    const user = users.find((user: any) => user.id === cleanerId);
    return user ? user.name : `Cleaner #${cleanerId}`;
  };
  
  // Generate cleaner initials for avatar
  const getCleanerInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Filter performance metrics by period
  const getFilteredPerformanceData = () => {
    if (!performanceData) return [];
    
    const now = new Date();
    let filteredData = [...performanceData];
    
    // Filter by selected period
    switch (selectedPeriod) {
      case "last7":
        // Last 7 days
        const last7Date = new Date(now);
        last7Date.setDate(now.getDate() - 7);
        filteredData = filteredData.filter((data: any) => new Date(data.periodEnd) >= last7Date);
        break;
      case "last30":
        // Last 30 days
        const last30Date = new Date(now);
        last30Date.setDate(now.getDate() - 30);
        filteredData = filteredData.filter((data: any) => new Date(data.periodEnd) >= last30Date);
        break;
      case "last90":
        // Last 90 days
        const last90Date = new Date(now);
        last90Date.setDate(now.getDate() - 90);
        filteredData = filteredData.filter((data: any) => new Date(data.periodEnd) >= last90Date);
        break;
      // Add other period filters as needed
    }
    
    // Filter by cleaner if one is selected
    if (selectedCleanerId) {
      filteredData = filteredData.filter((data: any) => data.cleanerId === selectedCleanerId);
    }
    
    return filteredData;
  };
  
  const filteredPerformance = getFilteredPerformanceData();
  
  // Get average scores across cleaners
  const getAverages = () => {
    if (!filteredPerformance.length) return { avgScore: 0, avgDuration: 0, totalTasks: 0, onTimeAvg: 0 };
    
    const total = filteredPerformance.reduce(
      (acc: any, curr: any) => {
        return {
          avgScore: acc.avgScore + (curr.avgScore || 0),
          avgDuration: acc.avgDuration + (curr.avgDuration || 0),
          totalTasks: acc.totalTasks + (curr.tasksCompleted || 0),
          onTimeAvg: acc.onTimeAvg + (curr.onTimePercentage || 0),
        };
      },
      { avgScore: 0, avgDuration: 0, totalTasks: 0, onTimeAvg: 0 }
    );
    
    const count = filteredPerformance.length;
    return {
      avgScore: Math.round((total.avgScore / count) * 10) / 10,
      avgDuration: Math.round(total.avgDuration / count),
      totalTasks: total.totalTasks,
      onTimeAvg: Math.round(total.onTimeAvg / count),
    };
  };
  
  const averages = getAverages();
  
  // Calculate top performers
  const getTopPerformers = () => {
    if (!filteredPerformance.length) return [];
    
    // Group by cleaner ID and calculate averages
    const cleanerMap = new Map();
    
    filteredPerformance.forEach((performance: any) => {
      if (!cleanerMap.has(performance.cleanerId)) {
        cleanerMap.set(performance.cleanerId, {
          cleanerId: performance.cleanerId,
          name: getCleanerName(performance.cleanerId),
          totalScore: performance.avgScore || 0,
          count: 1,
          tasksCompleted: performance.tasksCompleted || 0,
          flagsReceived: performance.flagsReceived || 0,
        });
      } else {
        const existing = cleanerMap.get(performance.cleanerId);
        cleanerMap.set(performance.cleanerId, {
          ...existing,
          totalScore: existing.totalScore + (performance.avgScore || 0),
          count: existing.count + 1,
          tasksCompleted: existing.tasksCompleted + (performance.tasksCompleted || 0),
          flagsReceived: existing.flagsReceived + (performance.flagsReceived || 0),
        });
      }
    });
    
    // Convert map to array and calculate average
    const cleanerArray = Array.from(cleanerMap.values()).map((cleaner: any) => ({
      ...cleaner,
      avgScore: Math.round((cleaner.totalScore / cleaner.count) * 10) / 10,
    }));
    
    // Sort by average score (descending)
    return cleanerArray.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  };
  
  const topPerformers = getTopPerformers();
  
  // Handle opening cleaner details
  const viewCleanerDetails = (cleanerId: number) => {
    // Check if performanceData exists before filtering
    if (!performanceData || !Array.isArray(performanceData)) {
      return;
    }
    
    // Filter performance data for this cleaner
    const cleanerPerformance = performanceData.filter(
      (performance: any) => performance.cleanerId === cleanerId
    );
    
    if (cleanerPerformance && cleanerPerformance.length) {
      setViewingCleanerDetails({
        cleanerId,
        name: getCleanerName(cleanerId),
        performanceHistory: cleanerPerformance.sort(
          (a: any, b: any) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
        ),
      });
    }
  };
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading cleaner performance data...</span>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mr-2" />
        <span>Failed to load cleaner performance data. Please try again.</span>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
              Cleaner Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              {users && Array.isArray(users) && users.length > 0 && (
                <Select 
                  value={selectedCleanerId ? String(selectedCleanerId) : "all"} 
                  onValueChange={(val) => setSelectedCleanerId(val === "all" ? null : Number(val))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All cleaners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cleaners</SelectItem>
                    {users.filter((user: any) => user.role === "cleaner").map((user: any) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-medium mb-4">Performance Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Average Score</p>
                        <p className="text-2xl font-bold">{averages.avgScore}</p>
                      </div>
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Tasks Completed</p>
                        <p className="text-2xl font-bold">{averages.totalTasks}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Avg. Duration</p>
                        <p className="text-2xl font-bold">{averages.avgDuration} min</p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">On-Time %</p>
                        <p className="text-2xl font-bold">{averages.onTimeAvg}%</p>
                      </div>
                      <Calendar className="h-8 w-8 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div>
              <h3 className="text-base font-medium mb-4">Top Performers</h3>
              {topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((performer, index) => (
                    <div 
                      key={performer.cleanerId} 
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => viewCleanerDetails(performer.cleanerId)}
                    >
                      <div className="flex items-center">
                        <div className="flex items-center flex-1">
                          <Avatar className="h-8 w-8 mr-2 bg-blue-100 text-blue-600">
                            <span>{getCleanerInitials(performer.name)}</span>
                          </Avatar>
                          <div>
                            <p className="font-medium">{performer.name}</p>
                            <div className="flex items-center text-xs text-gray-500">
                              <span>{performer.tasksCompleted} tasks completed</span>
                              <span className="mx-1">•</span>
                              <Flag className="h-3 w-3 mr-1 text-gray-400" />
                              <span>{performer.flagsReceived} flags</span>
                            </div>
                          </div>
                        </div>
                        {index === 0 && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-0">
                            <Award className="h-3 w-3 mr-1" /> Top
                          </Badge>
                        )}
                        <div className="ml-2 text-right">
                          <span className="font-bold text-blue-700">{performer.avgScore}</span>
                          <div className="flex items-center justify-end">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <Star className="h-3 w-3 text-yellow-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                  <User className="h-12 w-12 mb-3 opacity-20" />
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cleaner Details Dialog */}
      <Dialog open={!!viewingCleanerDetails} onOpenChange={(open) => !open && setViewingCleanerDetails(null)}>
        <DialogContent className="max-w-4xl">
          {viewingCleanerDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2 bg-blue-100 text-blue-600">
                    <span>{getCleanerInitials(viewingCleanerDetails.name)}</span>
                  </Avatar>
                  {viewingCleanerDetails.name}'s Performance History
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Tabs defaultValue="history">
                  <TabsList className="mb-4">
                    <TabsTrigger value="history">Performance History</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="history">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {viewingCleanerDetails.performanceHistory.map((record: any) => (
                          <Card key={record.id} className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium">
                                  Period: {formatPeriodRange(record.periodStart, record.periodEnd)}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {record.tasksCompleted} tasks completed
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center">
                                  <span className="text-xl font-bold">{record.avgScore || 'N/A'}</span>
                                  <Star className="h-4 w-4 text-yellow-500 ml-1" />
                                </div>
                                <p className="text-xs text-gray-500">Average Score</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">On-Time Percentage</p>
                                <div className="flex items-center">
                                  <Progress value={record.onTimePercentage || 0} className="h-2 mr-2 flex-1" />
                                  <span className="text-sm font-medium">{record.onTimePercentage || 0}%</span>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Avg. Duration</p>
                                <p className="text-sm font-medium">
                                  {record.avgDuration || 'N/A'} minutes
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Flags Received</p>
                                <div className="flex items-center">
                                  <Flag className="h-4 w-4 mr-1 text-red-500" />
                                  <span className="text-sm font-medium">{record.flagsReceived || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {record.notes && (
                              <div className="mt-3 border-t pt-2">
                                <p className="text-xs text-gray-500 mb-1">Notes</p>
                                <p className="text-sm">{record.notes}</p>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="analytics">
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">
                          Advanced analytics visualizations will be added in the next update
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}