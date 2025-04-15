import { TrendingUp, TrendingDown } from "@mui/icons-material";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  changeValue?: string | number;
  changeText?: string;
  isPositive?: boolean;
  statusText?: string;
  statusColor?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  changeValue,
  changeText,
  isPositive,
  statusText,
  statusColor
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#9EA2B1] text-sm">{title}</p>
          <p className="text-3xl font-semibold text-[#2C2E3E] mt-1">{value}</p>
        </div>
        <div className={`rounded-full ${iconBgColor} p-2`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-3 flex items-center">
        {changeValue && changeText && (
          <>
            <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} font-medium flex items-center`}>
              {isPositive ? <TrendingUp className="text-xs mr-1" /> : <TrendingDown className="text-xs mr-1" />}
              <span>{changeValue}</span>
            </span>
            <span className="text-xs text-[#9EA2B1] ml-1">{changeText}</span>
          </>
        )}
        
        {statusText && (
          <span className={`text-xs ${statusColor} rounded-full px-2 py-0.5`}>
            {statusText}
          </span>
        )}
      </div>
    </div>
  );
}
