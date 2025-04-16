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

  // Sample cleaners performance data (in a real app, this would come from API)
  const cleanersData = [
    { name: 'Sarah Davis', score: 98 },
    { name: 'Michael Johnson', score: 95 },
    { name: 'Emily Wilson', score: 87 },
    { name: 'David Lee', score: 92 },
  ];

  // Sample sentiment data (in a real app, this would come from API)
  const sentimentData = {
    average: 4.8,
    positive: 89,
    neutral: 8,
    negative: 3,
  };

  // Sample inventory alerts (in a real app, this would come from API)
  const inventoryAlerts = [
    { id: 1, severity: 'critical', location: 'Beach House', item: 'Low on Towels', current: 4, target: 12 },
    { id: 2, severity: 'warning', location: 'Downtown Loft', item: 'Coffee Running Low', current: 2, target: 5 },
    { id: 3, severity: 'warning', location: 'Lakeside Cabin', item: 'Toilet Paper', current: 3, target: 8 },
    { id: 4, severity: 'info', location: 'Garage Inventory', item: 'Cleaning Supplies', current: 5, target: 15 },
  ];

  // Sample calendar events (in a real app, this would come from API)
  const calendarEvents = [
    { date: 1, type: 'cleaning', label: '3 Cleanings' },
    { date: 4, type: 'maintenance', label: 'Maintenance' },
    { date: 6, type: 'inventory', label: 'Inventory' },
    { date: 9, type: 'cleaning', label: '2 Cleanings' },
    { date: 15, type: 'cleaning', label: '4 Cleanings' },
    { date: 15, type: 'urgent', label: 'Urgent' },
  ];

  // Sample tasks (in a real app, this would come from tasks API data)
  const upcomingTasks = [
    {
      type: 'cleaning',
      time: 'Today, 2:00 PM',
      title: 'Ocean View Suite Turnover',
      assignee: { initials: 'SD', name: 'Sarah Davis' },
    },
    {
      type: 'maintenance',
      time: 'Today, 4:30 PM',
      title: 'Fix AC in Downtown Loft',
      assignee: { initials: 'RM', name: 'Robert Miller' },
    },
    {
      type: 'inventory',
      time: 'Tomorrow, 10:00 AM',
      title: 'Restock Beach House Supplies',
      assignee: { initials: 'JW', name: 'Jessica Wong' },
    },
    {
      type: 'urgent',
      time: 'Tomorrow, 9:00 AM',
      title: 'Plumbing Issue at Lakeside Cabin',
      assignee: { initials: 'TS', name: 'Tom Smith' },
    },
  ];

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

  // Stats could be calculated from the API data
  const stats = {
    occupancyRate: "87%",
    occupancyChange: "4.6%",
    activeGuests: 14,
    checkInsToday: 8,
    scheduledCleanings: 9,
    delayedCleanings: 1,
    openMaintenance: 5,
    urgentMaintenance: 2,
  };

  // Sample data for the occupancy chart
  const occupancyData = [
    { name: 'Jan', occupancy: 72, revenue: 28000 },
    { name: 'Feb', occupancy: 75, revenue: 30000 },
    { name: 'Mar', occupancy: 81, revenue: 35000 },
    { name: 'Apr', occupancy: 84, revenue: 38000 },
    { name: 'May', occupancy: 78, revenue: 32000 },
    { name: 'Jun', occupancy: 92, revenue: 45000 },
    { name: 'Jul', occupancy: 96, revenue: 52000 },
    { name: 'Aug', occupancy: 87, revenue: 48000 },
  ];

  // Sample data for maintenance status chart
  const maintenanceStatusData = [
    { name: 'Urgent', value: 2, color: '#ef4444' },
    { name: 'In Progress', value: 8, color: '#f59e0b' },
    { name: 'Scheduled', value: 5, color: '#3b82f6' },
    { name: 'Completed', value: 23, color: '#22c55e' },
  ];

  // Sample data for guest analytics
  const stayLengthData = [
    { name: '1-2', count: 24 },
    { name: '3-4', count: 42 },
    { name: '5-7', count: 18 },
    { name: '8-14', count: 8 },
    { name: '15+', count: 3 },
  ];

  const currentGuests = [
    { 
      id: 1, 
      name: 'Sarah Johnson', 
      location: 'Beach House #2', 
      checkIn: 'Aug 12', 
      checkOut: 'Aug 18', 
      guestCount: 4,
      rating: 5.0
    },
    { 
      id: 2, 
      name: 'Michael Chen', 
      location: 'Downtown Loft', 
      checkIn: 'Aug 13', 
      checkOut: 'Aug 17', 
      guestCount: 2,
      rating: 4.8
    },
    { 
      id: 3, 
      name: 'Emily Davis', 
      location: 'Lakeside Cabin', 
      checkIn: 'Aug 15', 
      checkOut: 'Aug 22', 
      guestCount: 6
    },
  ];

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
          totalGuests={95}
          newGuestsPercent={32}
          repeatGuestsPercent={68}
          averageStayLength={4.7}
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
