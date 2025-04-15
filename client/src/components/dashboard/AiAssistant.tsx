import { useState } from 'react';
import { Psychology, TrendingUp, Schedule, Description } from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

export default function AiAssistant() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAsk = async () => {
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/ask', { question });
      const data = await response.json();
      
      toast({
        title: "AI Response",
        description: data.answer.substring(0, 255) + (data.answer.length > 255 ? '...' : ''),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    setQuestion(prompt);
    // In a real app, this would also trigger the API call
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-[#FFCF45] flex items-center justify-center mr-3">
          <Psychology className="text-[#2C2E3E]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#2C2E3E]">AI Brain Assistant</h2>
          <p className="text-[#9EA2B1] text-sm">Get insights and answers from your operational data</p>
        </div>
      </div>
      
      <div className="relative">
        <Psychology className="absolute left-3 top-3 text-[#9EA2B1]" />
        <input 
          type="text" 
          placeholder="Ask the AI Brain about your properties, guests, or operations..." 
          className="w-full p-3 pl-10 pr-20 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCF45]"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAsk();
          }}
        />
        <Button 
          className="absolute right-3 top-2 bg-[#FFCF45] text-[#2C2E3E] hover:bg-opacity-90"
          onClick={handleAsk}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Ask"}
        </Button>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button 
          variant="outline"
          className="bg-[#2C2E3E] bg-opacity-5 hover:bg-opacity-10 text-[#2C2E3E] p-2 rounded text-sm flex items-center justify-center"
          onClick={() => handleQuickPrompt("Analyze booking trends for the last 3 months")}
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>Analyze booking trends</span>
        </Button>
        
        <Button 
          variant="outline"
          className="bg-[#2C2E3E] bg-opacity-5 hover:bg-opacity-10 text-[#2C2E3E] p-2 rounded text-sm flex items-center justify-center"
          onClick={() => handleQuickPrompt("What is the most efficient cleaning schedule for this week?")}
        >
          <Schedule className="h-4 w-4 mr-1" />
          <span>Optimize cleaning schedule</span>
        </Button>
        
        <Button 
          variant="outline"
          className="bg-[#2C2E3E] bg-opacity-5 hover:bg-opacity-10 text-[#2C2E3E] p-2 rounded text-sm flex items-center justify-center"
          onClick={() => handleQuickPrompt("Generate a standard operating procedure for guest check-in")}
        >
          <Description className="h-4 w-4 mr-1" />
          <span>Generate new SOP</span>
        </Button>
      </div>
    </div>
  );
}
