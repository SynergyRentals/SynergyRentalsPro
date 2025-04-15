import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  AccessTime,
  Group,
  Star,
  LocationOn,
  ArrowForward,
  Insights
} from '@mui/icons-material';

interface GuestAnalyticsProps {
  stayLengthData: {
    name: string;
    count: number;
  }[];
  currentGuests: {
    id: number;
    name: string;
    location: string;
    checkIn: string;
    checkOut: string;
    guestCount: number;
    rating?: number;
  }[];
  totalGuests: number;
  newGuestsPercent: number;
  repeatGuestsPercent: number;
  averageStayLength: number;
}

export default function GuestAnalytics({ 
  stayLengthData, 
  currentGuests, 
  totalGuests, 
  newGuestsPercent, 
  repeatGuestsPercent,
  averageStayLength
}: GuestAnalyticsProps) {
  const { toast } = useToast();
  
  const handleViewGuestDetails = (guestId: number) => {
    toast({
      title: "Viewing guest details",
      description: `Navigating to guest #${guestId}`,
    });
  };

  const handleViewAllGuests = () => {
    // Navigate to guests page
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded border border-gray-100">
          <p className="font-medium text-sm">{`${label} nights`}</p>
          <p className="text-sm">
            <span className="font-semibold">{payload[0].value}</span> guests
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Guest Analytics</h2>
        <Button 
          variant="ghost" 
          className="text-[#FFCF45] hover:text-[#FFCF45] hover:underline text-sm flex items-center"
          onClick={handleViewAllGuests}
        >
          <span>All Guests</span>
          <ArrowForward className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stay Length Distribution */}
          <div>
            <h3 className="text-sm font-medium mb-3">Stay Length Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stayLengthData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#9EA2B1' }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#9EA2B1' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#FFCF45" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Guest Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-yellow-50">
              <p className="text-xs text-[#9EA2B1]">Total Guests</p>
              <p className="text-xl font-semibold text-[#2C2E3E]">{totalGuests}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <p className="text-xs text-[#9EA2B1]">New Guests</p>
              <p className="text-xl font-semibold text-[#2C2E3E]">{newGuestsPercent}%</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <p className="text-xs text-[#9EA2B1]">Repeat Guests</p>
              <p className="text-xl font-semibold text-[#2C2E3E]">{repeatGuestsPercent}%</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <p className="text-xs text-[#9EA2B1]">Avg. Stay</p>
              <p className="text-xl font-semibold text-[#2C2E3E]">{averageStayLength} nights</p>
            </div>
          </div>
          
          {/* Guest Insights */}
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <div className="rounded-full bg-blue-100 p-2 mr-3">
                <Insights className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 text-sm">Guest Booking Insights</h3>
                <p className="text-xs text-blue-600 mt-1">
                  Weekend bookings are up 12% and average stay length is increasing. Most new bookings 
                  are coming from returning guests, suggesting good satisfaction levels.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Guests */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium mb-3">Current Guests</h3>
          <div className="space-y-3">
            {currentGuests.map((guest) => (
              <div 
                key={guest.id} 
                className="border border-gray-100 rounded-lg p-3 hover:border-[#FFCF45] transition-colors cursor-pointer"
                onClick={() => handleViewGuestDetails(guest.id)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{guest.name}</h4>
                  {guest.rating && (
                    <div className="flex items-center text-xs">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="ml-1">{guest.rating}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-xs text-[#9EA2B1]">
                    <LocationOn className="h-3 w-3 mr-1" />
                    <span>{guest.location}</span>
                  </div>
                  <div className="flex items-center text-xs text-[#9EA2B1]">
                    <AccessTime className="h-3 w-3 mr-1" />
                    <span>{guest.checkIn} → {guest.checkOut}</span>
                  </div>
                  <div className="flex items-center text-xs text-[#9EA2B1]">
                    <Group className="h-3 w-3 mr-1" />
                    <span>{guest.guestCount} {guest.guestCount === 1 ? 'guest' : 'guests'}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {currentGuests.length === 0 && (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-[#9EA2B1]">No current guests</p>
              </div>
            )}
            
            <Button variant="outline" className="w-full mt-4">
              View All Current Guests
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}