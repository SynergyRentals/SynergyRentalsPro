import { MoreVert, Person } from '@mui/icons-material';
import { Button } from '@/components/ui/button';

interface CleanerData {
  name: string;
  score: number;
}

interface CleanerPerformanceProps {
  cleaners: CleanerData[];
}

export default function CleanerPerformance({ cleaners }: CleanerPerformanceProps) {
  // Helper function to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getTextColor = (score: number) => {
    if (score >= 95) return 'text-green-500';
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Cleaner Performance</h2>
        <Button variant="ghost" size="icon" className="text-[#9EA2B1] hover:text-[#2C2E3E]">
          <MoreVert />
        </Button>
      </div>
      
      <div className="space-y-4">
        {cleaners.map((cleaner, index) => (
          <div key={index} className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Person className="text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-medium text-[#2C2E3E]">{cleaner.name}</p>
                <span className={`${getTextColor(cleaner.score)} font-medium`}>{cleaner.score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className={`${getScoreColor(cleaner.score)} h-2 rounded-full`} 
                  style={{ width: `${cleaner.score}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
