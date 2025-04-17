import React from 'react';
import Layout from '@/components/layout/Layout';
import AiAssistant from '@/components/ai-assistant/AiAssistant';

export default function AiPlannerPage() {
  // Set page title
  React.useEffect(() => {
    document.title = 'AI Planner | Synergy Rentals';
  }, []);

  return (
    <Layout>
      <div className="flex flex-col h-full p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">AI Project Planner</h1>
        </div>
        
        <div className="flex-1 grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col">
            <AiAssistant />
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="bg-card border rounded-lg p-4">
              <h2 className="font-semibold text-lg mb-3">AI Planner Capabilities</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span>Create and assign tasks to team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                      <path d="M3 9h18"></path>
                      <path d="M9 21V9"></path>
                    </svg>
                  </div>
                  <span>Design project structures with milestones</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14"></path>
                      <path d="M18 13l-6 6"></path>
                      <path d="M6 13l6 6"></path>
                    </svg>
                  </div>
                  <span>Prioritize tasks based on urgency and impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12h20"></path>
                      <path d="M2 12v-2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2"></path>
                      <path d="M2 12v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2"></path>
                    </svg>
                  </div>
                  <span>Analyze workload distribution across teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded text-primary mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10h18"></path>
                      <path d="M6 14h2"></path>
                      <path d="M6 18h2"></path>
                      <rect width="18" height="12" x="3" y="6" rx="2"></rect>
                    </svg>
                  </div>
                  <span>Generate summary reports and recommendations</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card border rounded-lg p-4">
              <h2 className="font-semibold text-lg mb-3">Tips for Best Results</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Be specific about what you want to accomplish</li>
                <li>• Mention team members by name when assigning tasks</li>
                <li>• Include deadlines when creating time-sensitive tasks</li>
                <li>• Specify priority levels (Low, Medium, High, Urgent)</li>
                <li>• Ask for help analyzing specific projects by name</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}