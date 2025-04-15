import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { ArrowForward } from '@mui/icons-material';
import { useLocation } from 'wouter';

interface MaintenanceStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  total: number;
}

export default function MaintenanceStatusChart({ data, total }: MaintenanceStatusChartProps) {
  const [, navigate] = useLocation();

  const handleViewAll = () => {
    navigate("/maintenance");
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded border border-gray-100">
          <p className="font-medium text-sm text-[#2C2E3E]" style={{ color: payload[0].payload.color }}>
            {payload[0].name}
          </p>
          <p className="text-sm">
            <span className="font-semibold">{payload[0].value}</span> requests
            <span className="text-[#9EA2B1] ml-1">
              ({Math.round((payload[0].value / total) * 100)}%)
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Generate prioritized maintenance list
  const urgentRequests = [
    { id: 1, title: "Fix broken AC unit", location: "Beach House #3", priority: "urgent" },
    { id: 2, title: "Water leak in bathroom", location: "Downtown Loft", priority: "high" },
    { id: 3, title: "Replace refrigerator", location: "Lake Cabin", priority: "medium" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Maintenance Status</h2>
        <Button 
          variant="ghost" 
          className="text-[#FFCF45] hover:text-[#FFCF45] hover:underline text-sm flex items-center"
          onClick={handleViewAll}
        >
          <span>View All</span>
          <ArrowForward className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle" 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                payload={data.map(item => ({
                  value: `${item.name} (${item.value})`,
                  type: 'circle',
                  color: item.color,
                }))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Priority list */}
        <div>
          <h3 className="font-medium text-sm mb-3">Priority Maintenance</h3>
          <div className="space-y-3">
            {urgentRequests.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-[#9EA2B1] mt-1">{item.location}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Button className="w-full bg-[#2C2E3E] hover:bg-opacity-90">
              Create Maintenance Request
            </Button>
          </div>
        </div>
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Urgent</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {data.find(item => item.name === 'Urgent')?.value || 0}
          </p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">In Progress</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {data.find(item => item.name === 'In Progress')?.value || 0}
          </p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Scheduled</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {data.find(item => item.name === 'Scheduled')?.value || 0}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Completed</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {data.find(item => item.name === 'Completed')?.value || 0}
          </p>
        </div>
      </div>
    </div>
  );
}