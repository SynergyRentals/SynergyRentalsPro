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
import { Button } from '@/components/ui/button';
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
  const [dateRange] = useState('Aug 1 - Aug 31');

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
            <Button variant="outline" className="flex items-center px-3 py-1.5 bg-white rounded border border-gray-200 text-sm">
              <Today className="h-4 w-4 mr-1" />
              <span>{dateRange}</span>
            </Button>
            
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
        
        {/* Performance and Inventory Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cleaner Performance */}
          <CleanerPerformance cleaners={cleanersData} />
          
          {/* Guest Sentiment */}
          <GuestSentiment data={sentimentData} />
          
          {/* Inventory Alerts */}
          <InventoryAlerts 
            alerts={inventoryAlerts} 
            onViewAll={handleViewAllInventory}
            onRestock={handleRestockItem}
          />
        </div>
        
        {/* AI Brain Assistant */}
        <AiAssistant />
      </div>
    </Layout>
  );
}
