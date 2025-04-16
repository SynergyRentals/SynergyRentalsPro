import { useState } from "react";
import { useToast } from "@/hooks/use-toast"; 
import Layout from "@/components/layout/Layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HostAIInboxSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");

  // These settings would be fetched from the server in a real implementation
  const [aiSuggestionEnabled, setAiSuggestionEnabled] = useState(true);
  const [aiTrainingFeedback, setAiTrainingFeedback] = useState(true);

  // Mock data for demonstration
  const recentDecisions = [
    { 
      id: 1, 
      taskTitle: "No Hot Water", 
      unitName: "Compton 2B", 
      suggestedUrgency: "Medium", 
      suggestedTeam: "Maintenance", 
      actualUrgency: "High", 
      actualTeam: "Maintenance", 
      date: "2025-04-15" 
    },
    { 
      id: 2, 
      taskTitle: "Missing Kitchen Supplies", 
      unitName: "Soulard 3A", 
      suggestedUrgency: "Low", 
      suggestedTeam: "Cleaning", 
      actualUrgency: "Low", 
      actualTeam: "Cleaning", 
      date: "2025-04-14" 
    }
  ];

  // In a real implementation, this would be saved to the server
  const saveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your AI inbox settings have been updated",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HostAI Inbox Settings</h1>
            <p className="text-muted-foreground">Configure how the AI-powered inbox works</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/projects-tasks/hostai-inbox"}
          >
            Back to Inbox
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">Decision History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions Configuration</CardTitle>
                <CardDescription>
                  Control how AI assists with task routing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-suggestions">Enable AI Suggestions</Label>
                    <p className="text-sm text-muted-foreground">
                      Let AI suggest urgency and team assignment
                    </p>
                  </div>
                  <Switch
                    id="ai-suggestions"
                    checked={aiSuggestionEnabled}
                    onCheckedChange={setAiSuggestionEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-training">AI Training Feedback</Label>
                    <p className="text-sm text-muted-foreground">
                      Send your decisions back to improve AI accuracy
                    </p>
                  </div>
                  <Switch
                    id="ai-training"
                    checked={aiTrainingFeedback}
                    onCheckedChange={setAiTrainingFeedback}
                  />
                </div>

                <Button onClick={saveSettings} className="mt-4">
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggestion Accuracy</CardTitle>
                <CardDescription>
                  How well the AI has been performing on suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Urgency Prediction Accuracy</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: "78%" }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">78% accurate</p>
                  </div>

                  <div>
                    <p className="font-medium">Team Assignment Accuracy</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">92% accurate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Routing Decisions</CardTitle>
                <CardDescription>
                  History of task routings and AI suggestion accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Suggested</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDecisions.map((decision) => (
                      <TableRow key={decision.id}>
                        <TableCell>{decision.taskTitle}</TableCell>
                        <TableCell>{decision.unitName}</TableCell>
                        <TableCell>
                          {decision.suggestedUrgency} • {decision.suggestedTeam}
                        </TableCell>
                        <TableCell>
                          <span className={decision.suggestedUrgency === decision.actualUrgency ? "text-green-600" : "text-amber-600"}>
                            {decision.actualUrgency}
                          </span>
                          {" • "}
                          <span className={decision.suggestedTeam === decision.actualTeam ? "text-green-600" : "text-amber-600"}>
                            {decision.actualTeam}
                          </span>
                        </TableCell>
                        <TableCell>{decision.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}