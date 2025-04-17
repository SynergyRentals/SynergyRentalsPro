import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Sort,
  CalendarMonth,
  Flag,
  CheckCircle,
  Schedule,
  Timer,
  AutoAwesome,
  Person,
  PhotoCamera,
  Download,
  FilterList,
  Assignment,
} from "@mui/icons-material";
import { DateRange } from "react-day-picker";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Loader2 } from "lucide-react";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";

// Performance indicator component
const PerformanceIndicator = ({ 
  value, 
  max = 100, 
  type = "neutral" 
}: { 
  value: number; 
  max?: number; 
  type?: "positive" | "negative" | "neutral" 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  let progressClass = "bg-blue-500";
  if (type === "positive") {
    progressClass = percentage >= 90 ? "bg-green-500" : 
                   percentage >= 70 ? "bg-yellow-500" : "bg-red-500";
  } else if (type === "negative") {
    progressClass = percentage <= 10 ? "bg-green-500" : 
                   percentage <= 30 ? "bg-yellow-500" : "bg-red-500";
  }
  
  return (
    <div className="flex items-center space-x-2">
      <Progress value={percentage} className={`${progressClass} h-2`} />
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
};

export default function CleanerPerformance() {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedCleaner, setSelectedCleaner] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1))
  });
  const [showCleanerDetails, setShowCleanerDetails] = useState(false);
  
  // Fetch performance data
  const {
    data: performanceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/cleaner-performance", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";
      
      const response = await fetch(`/api/cleaner-performance?from=${fromDate}&to=${toDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cleaner performance data");
      }
      return response.json();
    },
  });
  
  // Fetch users for reference (cleaners)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Helper function to get cleaner info from user id
  const getCleanerInfo = (cleanerId: number) => {
    if (!users || !Array.isArray(users)) return { name: `Cleaner #${cleanerId}`, initials: "CL" };
    
    const user = users.find((u: any) => u.id === cleanerId);
    if (!user) return { name: `Cleaner #${cleanerId}`, initials: "CL" };
    
    const initials = user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
      
    return { name: user.name, initials };
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };
  
  // Get score color class
  const getScoreColorClass = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };
  
  // Sort performance data
  const sortedPerformanceData = performanceData
    ? [...performanceData].sort((a, b) => {
        if (sortBy === "name") {
          const cleanerA = getCleanerInfo(a.cleanerId).name.toLowerCase();
          const cleanerB = getCleanerInfo(b.cleanerId).name.toLowerCase();
          return sortOrder === "asc"
            ? cleanerA.localeCompare(cleanerB)
            : cleanerB.localeCompare(cleanerA);
        }
        
        if (sortBy === "tasks") {
          const tasksA = a.tasksCompleted || 0;
          const tasksB = b.tasksCompleted || 0;
          return sortOrder === "asc" ? tasksA - tasksB : tasksB - tasksA;
        }
        
        if (sortBy === "score") {
          const scoreA = a.avgScore || 0;
          const scoreB = b.avgScore || 0;
          return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
        }
        
        if (sortBy === "flags") {
          const flagsA = a.flagsReceived || 0;
          const flagsB = b.flagsReceived || 0;
          return sortOrder === "asc" ? flagsA - flagsB : flagsB - flagsA;
        }
        
        if (sortBy === "time") {
          const timeA = a.avgDuration || 0;
          const timeB = b.avgDuration || 0;
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        }
        
        if (sortBy === "ontime") {
          const ontimeA = a.onTimePercentage || 0;
          const ontimeB = b.onTimePercentage || 0;
          return sortOrder === "asc" ? ontimeA - ontimeB : ontimeB - ontimeA;
        }
        
        return 0;
      })
    : [];
  
  // Filter performance data by search
  const filteredPerformanceData = sortedPerformanceData.filter((item) => {
    const cleanerInfo = getCleanerInfo(item.cleanerId);
    return cleanerInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Handle sort click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading performance data</p>
        <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Actions and Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search cleaners..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Sort className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort("name")}>
                By Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("tasks")}>
                By Tasks Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("score")}>
                By Average Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("flags")}>
                By Flags Received
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("time")}>
                By Average Duration
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("ontime")}>
                By On-Time Percentage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FilterList className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>High Performers</DropdownMenuItem>
              <DropdownMenuItem>Needs Improvement</DropdownMenuItem>
              <DropdownMenuItem>New Cleaners</DropdownMenuItem>
              <DropdownMenuItem>Flagged Issues</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Performance Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-[#f9fafb] border-b pb-3">
          <CardTitle className="text-lg">Cleaner Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>Cleaner</span>
                    {sortBy === "name" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("tasks")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>Tasks Completed</span>
                    {sortBy === "tasks" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("score")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>Avg. Score</span>
                    {sortBy === "score" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("flags")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>Flagged Issues</span>
                    {sortBy === "flags" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("time")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>Avg. Duration</span>
                    {sortBy === "time" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("ontime")} className="cursor-pointer">
                  <div className="flex items-center">
                    <span>On-Time %</span>
                    {sortBy === "ontime" && (
                      <Sort className={`h-4 w-4 ml-1 ${sortOrder === "desc" ? "transform rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerformanceData.length > 0 ? (
                filteredPerformanceData.map((item) => {
                  const cleanerInfo = getCleanerInfo(item.cleanerId);
                  return (
                    <TableRow 
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCleaner(item);
                        setShowCleanerDetails(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>{cleanerInfo.initials}</AvatarFallback>
                          </Avatar>
                          <span>{cleanerInfo.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Assignment className="h-4 w-4 mr-2 text-blue-500" />
                          {item.tasksCompleted || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className={`font-medium ${getScoreColorClass(item.avgScore)}`}>
                            {item.avgScore !== null ? `${item.avgScore}%` : "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-red-500" />
                          {item.flagsReceived || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Timer className="h-4 w-4 mr-2 text-blue-500" />
                          {item.avgDuration ? `${item.avgDuration} mins` : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Schedule className="h-4 w-4 mr-2 text-green-500" />
                          {item.onTimePercentage !== null ? `${item.onTimePercentage}%` : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarMonth className="h-4 w-4 mr-1" />
                          {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCleaner(item);
                            setShowCleanerDetails(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#9EA2B1]">
                    {performanceData && performanceData.length > 0
                      ? "No cleaners match your search criteria"
                      : "No performance data available for the selected period"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Cleaner Detail Dialog */}
      <Dialog open={showCleanerDetails} onOpenChange={setShowCleanerDetails}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cleaner Performance Details</DialogTitle>
          </DialogHeader>
          
          {selectedCleaner && (
            <div className="py-4">
              <div className="flex items-center mb-6">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarFallback>
                    {getCleanerInfo(selectedCleaner.cleanerId).initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">
                    {getCleanerInfo(selectedCleaner.cleanerId).name}
                  </h3>
                  <p className="text-sm text-[#9EA2B1]">
                    {formatDate(selectedCleaner.periodStart)} - {formatDate(selectedCleaner.periodEnd)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-1">
                        {selectedCleaner.tasksCompleted || 0}
                      </div>
                      <p className="text-sm text-[#9EA2B1] flex items-center justify-center">
                        <Assignment className="h-4 w-4 mr-1" />
                        Tasks Completed
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedCleaner.avgScore)}`}>
                        {selectedCleaner.avgScore !== null ? `${selectedCleaner.avgScore}%` : "N/A"}
                      </div>
                      <p className="text-sm text-[#9EA2B1] flex items-center justify-center">
                        <AutoAwesome className="h-4 w-4 mr-1" />
                        Average Score
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-1">
                        {selectedCleaner.onTimePercentage !== null ? `${selectedCleaner.onTimePercentage}%` : "N/A"}
                      </div>
                      <p className="text-sm text-[#9EA2B1] flex items-center justify-center">
                        <Schedule className="h-4 w-4 mr-1" />
                        On-Time Percentage
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
                  <TabsTrigger value="tasks">Recent Tasks</TabsTrigger>
                  <TabsTrigger value="flags">Flagged Issues</TabsTrigger>
                </TabsList>
                
                <TabsContent value="metrics" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Average Score</span>
                            <span className={`text-sm ${getScoreColorClass(selectedCleaner.avgScore)}`}>
                              {selectedCleaner.avgScore !== null ? `${selectedCleaner.avgScore}%` : "N/A"}
                            </span>
                          </div>
                          <PerformanceIndicator 
                            value={selectedCleaner.avgScore || 0} 
                            type="positive" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Average Duration</span>
                            <span className="text-sm">
                              {selectedCleaner.avgDuration ? `${selectedCleaner.avgDuration} mins` : "N/A"}
                            </span>
                          </div>
                          <PerformanceIndicator 
                            value={selectedCleaner.avgDuration || 0} 
                            max={180} 
                            type="neutral" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">On-Time Percentage</span>
                            <span className="text-sm">
                              {selectedCleaner.onTimePercentage !== null ? `${selectedCleaner.onTimePercentage}%` : "N/A"}
                            </span>
                          </div>
                          <PerformanceIndicator 
                            value={selectedCleaner.onTimePercentage || 0} 
                            type="positive" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Flagged Issues</span>
                            <span className="text-sm">
                              {selectedCleaner.flagsReceived || 0}
                            </span>
                          </div>
                          <PerformanceIndicator 
                            value={selectedCleaner.flagsReceived || 0} 
                            max={10} 
                            type="negative" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Photo Quality Score</span>
                            <span className="text-sm">
                              {selectedCleaner.photoQualityScore !== null ? `${selectedCleaner.photoQualityScore}%` : "N/A"}
                            </span>
                          </div>
                          <PerformanceIndicator 
                            value={selectedCleaner.photoQualityScore || 0} 
                            type="positive" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {selectedCleaner.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Performance Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedCleaner.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="tasks" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recent Cleaning Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* This would normally be populated with actual task data */}
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-[#9EA2B1]">
                              No recent tasks available
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="flags" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Flagged Issues</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Issue Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* This would normally be populated with actual flag data */}
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-[#9EA2B1]">
                              No flagged issues found
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}