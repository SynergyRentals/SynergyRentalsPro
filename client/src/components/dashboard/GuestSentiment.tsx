import { MoreVert } from '@mui/icons-material';
import { Button } from '@/components/ui/button';

interface SentimentData {
  average: number;
  positive: number;
  neutral: number;
  negative: number;
}

interface GuestSentimentProps {
  data: SentimentData;
}

export default function GuestSentiment({ data }: GuestSentimentProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Guest Sentiment</h2>
        <Button variant="ghost" size="icon" className="text-[#9EA2B1] hover:text-[#2C2E3E]">
          <MoreVert />
        </Button>
      </div>
      
      <div className="flex items-center justify-center py-2">
        <div className="w-36 h-36 relative">
          <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{data.average.toFixed(1)}</div>
              <div className="text-sm text-[#9EA2B1]">Average Rating</div>
            </div>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-green-500 border-opacity-70" 
               style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}></div>
          <div className="absolute inset-0 rounded-full border-4 border-green-500" 
               style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}></div>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        {/* Positive Sentiment */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#2C2E3E]">Positive</span>
            <span className="text-sm font-medium text-[#2C2E3E]">{data.positive}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${data.positive}%` }}></div>
          </div>
        </div>
        
        {/* Neutral Sentiment */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#2C2E3E]">Neutral</span>
            <span className="text-sm font-medium text-[#2C2E3E]">{data.neutral}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${data.neutral}%` }}></div>
          </div>
        </div>
        
        {/* Negative Sentiment */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#2C2E3E]">Negative</span>
            <span className="text-sm font-medium text-[#2C2E3E]">{data.negative}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${data.negative}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
