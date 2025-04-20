import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import TaskCard from '@/components/dashboard/TaskCard';
import Calendar from '@/components/dashboard/Calendar';
import CleanerPerformance from '@/components/dashboard/CleanerPerformance';
import GuestSentiment from '@/components/dashboard/GuestSentiment';
import InventoryAlerts from '@/components/dashboard/InventoryAlerts';
import AiAssistant from '@/components/dashboard/AiAssistant';
import OccupancyChart from '@/components/dashboard/OccupancyChart';
import MaintenanceStatusChart from '@/components/dashboard/MaintenanceStatusChart';
import GuestAnalytics from '@/components/dashboard/GuestAnalytics';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  Today, 
  Refresh, 
  TrendingUp, 
  People, 
  CleaningServices, 
  Build, 
  ArrowForward 
} from '@mui/icons-material';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState('Aug 1 - Aug 31');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      setDateRange(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}`);
      setIsCalendarOpen(false);
    }
  };

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: undefined,
  });

  // Fetch units
  const { data: units, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['/api/units'],
    queryFn: undefined,
  });

  // Fetch guests
  const { data: guests, isLoading: isLoadingGuests } = useQuery({
    queryKey: ['/api/guests'],
    queryFn: undefined,
  });

  // Fetch maintenance
  const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['/api/maintenance'],
    queryFn: undefined,
  });

  // Empty data for cleaners performance
  const cleanersData: { name: string; score: number }[] = [];

  // Empty data for sentiment
  const sentimentData = {
    average: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  // Empty inventory alerts (with proper typing)
  const inventoryAlerts: {
    id: number;
    severity: 'critical' | 'warning' | 'info';
    location: string;
    item: string;
    current: number;
    target: number;
  }[] = [];

  // Empty calendar events (with proper typing)
  const calendarEvents: {
    date: number;
    type: 'cleaning' | 'maintenance' | 'inventory' | 'urgent';
    label: string;
  }[] = [];

  // Empty tasks (with proper typing)
  const upcomingTasks: {
    type: 'cleaning' | 'maintenance' | 'inventory' | 'urgent';
    time: string;
    title: string;
    assignee?: { initials: string; name: string };
  }[] = [];

  const handleRefresh = () => {
    toast({
      title: "Dashboard refreshed",
      description: "Latest data has been loaded",
    });
  };

  const handleViewAllTasks = () => {
    navigate("/tasks");
  };

  const handleViewAllInventory = () => {
    navigate("/inventory");
  };

  const handleRestockItem = (itemId: number) => {
    toast({
      title: "Restock requested",
      description: `Restock request created for item #${itemId}`,
    });
  };

  // Loading states
  if (isLoadingTasks || isLoadingUnits || isLoadingGuests || isLoadingMaintenance) {
    // You could implement a skeleton loader here
  }

  // Empty stats
  const stats = {
    occupancyRate: "0%",
    occupancyChange: "0%",
    activeGuests: 0,
    checkInsToday: 0,
    scheduledCleanings: 0,
    delayedCleanings: 0,
    openMaintenance: 0,
    urgentMaintenance: 0,
  };

  // Empty data for the occupancy chart
  const occupancyData: { name: string; occupancy: number; revenue: number }[] = [];

  // Empty data for maintenance status chart with category structure maintained
  const maintenanceStatusData = [
    { name: 'Urgent', value: 0, color: '#ef4444' },
    { name: 'In Progress', value: 0, color: '#f59e0b' },
    { name: 'Scheduled', value: 0, color: '#3b82f6' },
    { name: 'Completed', value: 0, color: '#22c55e' },
  ];

  // Empty data for guest analytics
  const stayLengthData: { name: string; count: number }[] = [];

  // Empty current guests
  const currentGuests: { 
    id: number; 
    name: string; 
    location: string; 
    checkIn: string; 
    checkOut: string; 
    guestCount: number;
    rating?: number 
  }[] = [];

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Page Title and Date Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Dashboard</h1>
            <p className="text-[#9EA2B1]">Overview of your rental operations</p>
          </div>
          
          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center px-3 py-1.5 bg-white rounded border border-gray-200 text-sm">
                  <Today className="h-4 w-4 mr-1" />
                  <span>{dateRange}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker
                  mode="single"
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline"
              size="icon"
              className="p-1.5 bg-white rounded border border-gray-200 text-sm"
              onClick={handleRefresh}
            >
              <Refresh className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Occupancy Rate" 
            value={stats.occupancyRate} 
            icon={<TrendingUp className="text-green-500" />} 
            iconBgColor="bg-green-100" 
            changeValue={stats.occupancyChange} 
            changeText="from last month" 
            isPositive={true}
          />
          
          <StatsCard 
            title="Active Guests" 
            value={stats.activeGuests} 
            icon={<People className="text-blue-500" />} 
            iconBgColor="bg-blue-100"
            changeText={`${stats.checkInsToday} check-ins today`}
          />
          
          <StatsCard 
            title="Scheduled Cleanings" 
            value={stats.scheduledCleanings} 
            icon={<CleaningServices className="text-blue-500" />} 
            iconBgColor="bg-blue-100"
            statusText={`${stats.delayedCleanings} Delayed`}
            statusColor="bg-yellow-500 bg-opacity-20 text-yellow-500"
          />
          
          <StatsCard 
            title="Open Maintenance" 
            value={stats.openMaintenance} 
            icon={<Build className="text-red-500" />} 
            iconBgColor="bg-red-100"
            statusText={`${stats.urgentMaintenance} Urgent`}
            statusColor="bg-red-500 bg-opacity-20 text-red-500"
          />
        </div>
        
        {/* Occupancy Chart */}
        <OccupancyChart 
          data={occupancyData} 
          timeRange="Last 8 Months"
        />
        
        {/* Tasks and Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Tasks */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#2C2E3E]">Upcoming Tasks</h2>
              <Button 
                variant="ghost" 
                className="text-[#FFCF45] hover:text-[#FFCF45] hover:underline text-sm flex items-center"
                onClick={handleViewAllTasks}
              >
                <span>View All</span>
                <ArrowForward className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <TaskCard key={index} {...task} />
              ))}
            </div>
          </div>
          
          {/* Calendar View */}
          <Calendar 
            month="August" 
            year={2023} 
            events={calendarEvents} 
            currentDay={15}
          />
        </div>

        {/* Guest Analytics */}
        <GuestAnalytics 
          stayLengthData={stayLengthData}
          currentGuests={currentGuests}
          totalGuests={0}
          newGuestsPercent={0}
          repeatGuestsPercent={0}
          averageStayLength={0}
        />
        
        {/* Maintenance Status and Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance Status */}
          <MaintenanceStatusChart 
            data={maintenanceStatusData}
            total={maintenanceStatusData.reduce((sum, item) => sum + item.value, 0)}
          />
          
          {/* Inventory Alerts */}
          <InventoryAlerts 
            alerts={inventoryAlerts} 
            onViewAll={handleViewAllInventory}
            onRestock={handleRestockItem}
          />
        </div>
        
        {/* Performance and Guest Sentiment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleaner Performance */}
          <CleanerPerformance cleaners={cleanersData} />
          
          {/* Guest Sentiment */}
          <GuestSentiment data={sentimentData} />
        </div>
        
        {/* AI Brain Assistant */}
        <AiAssistant />
      </div>
    </Layout>
  );
}
