import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  BarChart,
  Insights,
  TrendingUp,
  TrendingDown,
  Equalizer,
  Compare,
  PieChart,
  Description,
  Home,
  ChecklistRtl
} from "@mui/icons-material";
import { DateRange } from "react-day-picker";
import { format, subMonths, startOfMonth, endOfMonth, addMonths, differenceInDays } from "date-fns";
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
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

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
  
  // Calculate aggregate metrics from performance data
  const getTeamMetrics = () => {
    if (!performanceData || !Array.isArray(performanceData) || performanceData.length === 0) {
      return {
        totalTasks: 0,
        avgScore: 0,
        avgOnTime: 0,
        totalFlags: 0,
        totalCleaners: 0,
        highPerformers: 0
      };
    }
    
    const totalTasks = performanceData.reduce((sum, p) => sum + (p.tasksCompleted || 0), 0);
    const avgScore = Math.round(performanceData.reduce((sum, p) => sum + (p.avgScore || 0), 0) / performanceData.length);
    const avgOnTime = Math.round(performanceData.reduce((sum, p) => sum + (p.onTimePercentage || 0), 0) / performanceData.length);
    const totalFlags = performanceData.reduce((sum, p) => sum + (p.flagsReceived || 0), 0);
    const totalCleaners = performanceData.length;
    const highPerformers = performanceData.filter(p => (p.avgScore || 0) >= 90).length;
    
    return {
      totalTasks,
      avgScore,
      avgOnTime,
      totalFlags,
      totalCleaners,
      highPerformers
    };
  };
  
  const teamMetrics = getTeamMetrics();

  return (
    <div className="space-y-6">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Insights className="h-5 w-5 mr-2 text-blue-500" />
              Team Performance Overview
            </CardTitle>
            <CardDescription>
              {dateRange?.from && dateRange?.to ? (
                `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
              ) : (
                "All time performance metrics"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-gray-500">Total Tasks</span>
                <div className="flex items-center mt-1">
                  <Assignment className="h-5 w-5 mr-2 text-blue-500" />
                  <span className="text-2xl font-semibold">{teamMetrics.totalTasks}</span>
                </div>
              </div>
              
              <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-gray-500">Avg Quality</span>
                <div className="flex items-center mt-1">
                  <AutoAwesome className="h-5 w-5 mr-2 text-amber-500" />
                  <span className="text-2xl font-semibold">{teamMetrics.avgScore}%</span>
                </div>
              </div>
              
              <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-gray-500">On-Time Rate</span>
                <div className="flex items-center mt-1">
                  <Schedule className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-2xl font-semibold">{teamMetrics.avgOnTime}%</span>
                </div>
              </div>
              
              <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-gray-500">Total Issues</span>
                <div className="flex items-center mt-1">
                  <Flag className="h-5 w-5 mr-2 text-red-500" />
                  <span className="text-2xl font-semibold">{teamMetrics.totalFlags}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Active Cleaners</span>
                  <div className="flex items-center mt-1">
                    <Person className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="text-xl font-medium">{teamMetrics.totalCleaners}</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Top Performers</span>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                    <span className="text-xl font-medium">{teamMetrics.highPerformers}</span>
                    <span className="text-sm ml-1 text-gray-500">
                      ({Math.round((teamMetrics.highPerformers / Math.max(1, teamMetrics.totalCleaners)) * 100)}%)
                    </span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden md:flex">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <CalendarMonth className="h-5 w-5 mr-2 text-blue-500" />
              Performance Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
              
              <div className="flex justify-between mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfMonth(new Date()),
                    to: new Date()
                  })}
                >
                  This Month
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfMonth(subMonths(new Date(), 1)),
                    to: endOfMonth(subMonths(new Date(), 1))
                  })}
                >
                  Last Month
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(new Date(), 3),
                    to: new Date()
                  })}
                >
                  Quarter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
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
              <DropdownMenuItem onClick={() => setSearchTerm("Top Performer")}>
                High Performers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("Needs Improvement")}>
                Needs Improvement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("New")}>
                New Cleaners
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("Flagged")}>
                Flagged Issues
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => {
            // Generate CSV data
            const csvContent = [
              ['Name', 'Tasks Completed', 'Avg Score', 'Flagged Issues', 'On-Time %', 'Checklists Completed'].join(','),
              ...filteredPerformanceData.map(item => {
                const cleanerInfo = getCleanerInfo(item.cleanerId);
                return [
                  cleanerInfo.name,
                  item.tasksCompleted || 0,
                  item.avgScore !== null ? `${item.avgScore}%` : 'N/A',
                  item.flagsReceived || 0,
                  item.onTimePercentage !== null ? `${item.onTimePercentage}%` : 'N/A',
                  item.checklistsCompleted || 0
                ].join(',');
              })
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `cleaner-performance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Checklists Completed</span>
                              <span className="text-sm">
                                {selectedCleaner.checklistsCompleted || 0}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <ChecklistRtl className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="text-sm text-gray-600">{selectedCleaner.checklistsCompleted || 0} of {selectedCleaner.tasksCompleted || 0} tasks</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Comparative Score</span>
                              <span className="text-sm">
                                {selectedCleaner.comparativeScore ? `${selectedCleaner.comparativeScore}th percentile` : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <Compare className="h-4 w-4 mr-2 text-purple-500" />
                              <span className="text-sm text-gray-600">
                                {selectedCleaner.comparativeScore ? 
                                  (selectedCleaner.comparativeScore > 75 ? "Top performer" : 
                                   selectedCleaner.comparativeScore > 50 ? "Above average" : 
                                   selectedCleaner.comparativeScore > 25 ? "Below average" : "Needs improvement") 
                                  : "Not enough data"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Performance Trends</CardTitle>
                        <CardDescription>Metrics over the past 3 months</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedCleaner.trendData ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart
                              data={selectedCleaner.trendData?.scores || [
                                { month: 'Jan', score: 85, onTime: 92, flags: 1 },
                                { month: 'Feb', score: 88, onTime: 94, flags: 0 },
                                { month: 'Mar', score: 90, onTime: 95, flags: 0 }
                              ]}
                              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="score" stroke="#8884d8" name="Cleaning Score" />
                              <Line type="monotone" dataKey="onTime" stroke="#82ca9d" name="On-Time %" />
                              <Line type="monotone" dataKey="flags" stroke="#ff7f0e" name="Issues" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                            <p className="text-sm">Trend data not available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Workload Distribution</CardTitle>
                        <CardDescription>Types of properties cleaned</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedCleaner.workloadDistribution ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={selectedCleaner.workloadDistribution?.properties || [
                                  { name: 'Apartments', value: 60 },
                                  { name: 'Houses', value: 30 },
                                  { name: 'Condos', value: 10 }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {(selectedCleaner.workloadDistribution?.properties || []).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <PieChart className="h-12 w-12 mb-2 opacity-30" />
                            <p className="text-sm">Workload data not available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Task Metrics</CardTitle>
                        <CardDescription>Task completion analytics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsBarChart
                            data={[
                              { name: 'Turnover', completed: selectedCleaner.tasksCompleted || 0, avg: 35 },
                              { name: 'Deep Clean', completed: selectedCleaner.checklistsCompleted || 0, avg: 15 },
                              { name: 'Mid-Stay', completed: selectedCleaner.flagsReceived || 0, avg: 5 }
                            ]}
                            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completed" fill="#8884d8" name="Completed" />
                            <Bar dataKey="avg" fill="#82ca9d" name="Team Avg" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                  
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