import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface OccupancyChartProps {
  data: {
    name: string;
    occupancy: number;
    revenue: number;
  }[];
  timeRange: string;
}

export default function OccupancyChart({ data, timeRange }: OccupancyChartProps) {
  // Format currency for the tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage for the tooltip
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            Occupancy: <span className="font-semibold">{formatPercentage(payload[0].value)}</span>
          </p>
          <p className="text-sm text-green-600">
            Revenue: <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#2C2E3E]">Occupancy & Revenue</h2>
          <p className="text-[#9EA2B1] text-sm">Tracking performance for {timeRange}</p>
        </div>
        
        <div className="flex space-x-3 mt-2 md:mt-0">
          <div className="flex items-center text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-70 mr-1"></div>
            <span>Occupancy</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500 opacity-70 mr-1"></div>
            <span>Revenue</span>
          </div>
        </div>
      </div>
      
      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#9EA2B1' }} 
            />
            <YAxis 
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#9EA2B1' }}
              tickFormatter={formatPercentage}
              domain={[0, 100]}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#9EA2B1' }}
              tickFormatter={(value) => `$${value/1000}k`}
              domain={[0, 'dataMax + 5000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="occupancy" 
              stroke="#3b82f6" 
              fillOpacity={1}
              fill="url(#colorOccupancy)" 
              strokeWidth={2}
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="revenue" 
              stroke="#22c55e" 
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={2} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Key metrics summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Avg. Occupancy</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {Math.round(data.reduce((sum, item) => sum + item.occupancy, 0) / data.length)}%
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Highest Revenue</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {formatCurrency(Math.max(...data.map(item => item.revenue)))}
          </p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Total Revenue</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-[#9EA2B1]">Peak Occupancy</p>
          <p className="text-xl font-semibold text-[#2C2E3E]">
            {Math.max(...data.map(item => item.occupancy))}%
          </p>
        </div>
      </div>
    </div>
  );
}