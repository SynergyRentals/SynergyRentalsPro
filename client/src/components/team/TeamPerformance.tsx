import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Star,
  CheckCircle,
  AssignmentLate,
  Assignment
} from "@mui/icons-material";
import { User } from "@shared/schema";

// Helper functions to calculate metrics based on tasks
const calculateCompletionRate = (userId: number, tasks: any[]) => {
  if (!tasks?.length) return 0;
  
  const userTasks = tasks.filter(task => task.assignedTo === userId);
  if (userTasks.length === 0) return 0;
  
  const completedTasks = userTasks.filter(task => task.completed);
  return Math.round((completedTasks.length / userTasks.length) * 100);
};

const calculateOnTimeRate = (userId: number, tasks: any[]) => {
  if (!tasks?.length) return 0;
  
  const userTasks = tasks.filter(task => 
    task.assignedTo === userId && task.completed
  );
  if (userTasks.length === 0) return 0;
  
  // For demo purposes, we'll consider 70% of tasks as on-time
  // In a real implementation, we would compare dueDate with completedAt
  const onTimeTasks = userTasks.filter((_, index) => index % 10 < 7);
  return Math.round((onTimeTasks.length / userTasks.length) * 100);
};

const calculateQualityScore = (userId: number, tasks: any[]) => {
  // For demo purposes, we'll return a random score between 3.5 and 5.0
  return (3.5 + Math.random() * 1.5).toFixed(1);
};

// Interface for the component props
interface TeamPerformanceProps {
  users: User[];
  tasks: any[];
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
}

export default function TeamPerformance({ 
  users, 
  tasks, 
  timeframe = 'month' 
}: TeamPerformanceProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Helper function to get the trend indicator
  const getTrendIndicator = (score: number) => {
    if (score > 75) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (score < 50) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  // Helper to get color class based on percentage
  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-8">
      {/* Timeframe selector */}
      <div className="flex space-x-2">
        {['week', 'month', 'quarter', 'year'].map((period) => (
          <Badge
            key={period}
            variant={selectedTimeframe === period ? "default" : "outline"}
            className={`cursor-pointer px-3 py-1 ${
              selectedTimeframe === period ? "bg-blue-500" : ""
            }`}
            onClick={() => setSelectedTimeframe(period as any)}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Badge>
        ))}
      </div>

      {/* Performance metrics for each user */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {users?.map((user) => {
          // Calculate metrics
          const completionRate = calculateCompletionRate(user.id, tasks);
          const onTimeRate = calculateOnTimeRate(user.id, tasks);
          const qualityScore = calculateQualityScore(user.id, tasks);
          
          return (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-3">
                      {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2C2E3E]">{user.name}</h3>
                      <p className="text-sm text-[#9EA2B1]">
                        {user.role === "va" ? "Virtual Assistant" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex items-center mr-3">
                      <Star className="h-5 w-5 text-yellow-500 mr-1" />
                      <span className="font-medium">{qualityScore}</span>
                    </div>
                    {getTrendIndicator(completionRate)}
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Task Completion Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-[#9EA2B1] mr-1" />
                        <span className="text-sm font-medium text-[#2C2E3E]">Task Completion</span>
                      </div>
                      <span className="text-sm font-medium">{completionRate}%</span>
                    </div>
                    <Progress 
                      value={completionRate} 
                      className="h-2" 
                      indicatorClassName={getColorClass(completionRate)}
                    />
                  </div>

                  {/* On-Time Completion */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <AssignmentLate className="h-4 w-4 text-[#9EA2B1] mr-1" />
                        <span className="text-sm font-medium text-[#2C2E3E]">On-Time Rate</span>
                      </div>
                      <span className="text-sm font-medium">{onTimeRate}%</span>
                    </div>
                    <Progress 
                      value={onTimeRate} 
                      className="h-2" 
                      indicatorClassName={getColorClass(onTimeRate)}
                    />
                  </div>

                  {/* Task Statistics */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center bg-slate-50 p-2 rounded">
                      <Assignment className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <div className="font-medium">{tasks?.filter(t => t.assignedTo === user.id)?.length || 0}</div>
                      <div className="text-xs text-[#9EA2B1]">Total Tasks</div>
                    </div>
                    <div className="text-center bg-slate-50 p-2 rounded">
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <div className="font-medium">{tasks?.filter(t => t.assignedTo === user.id && t.completed)?.length || 0}</div>
                      <div className="text-xs text-[#9EA2B1]">Completed</div>
                    </div>
                    <div className="text-center bg-slate-50 p-2 rounded">
                      <AssignmentLate className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                      <div className="font-medium">{tasks?.filter(t => t.assignedTo === user.id && !t.completed)?.length || 0}</div>
                      <div className="text-xs text-[#9EA2B1]">In Progress</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No users message */}
      {(!users || users.length === 0) && (
        <div className="text-center p-8 text-[#9EA2B1]">
          No team members to display.
        </div>
      )}
    </div>
  );
}