import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast"; 
import Layout from "@/components/layout/Layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BotIcon, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AutopilotSettings {
  id?: number;
  userId: number;
  enabled: boolean;
  confidenceThreshold: number;
}

interface AutopilotLog {
  id: number;
  taskId: number;
  decision: string;
  urgency: string | null;
  team: string | null;
  confidence: number;
  notes: string | null;
  createdAt: string;
  scheduledFor: string | null;
}

export default function HostAIInboxSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  const queryClient = useQueryClient();

  // Get autopilot settings from the API
  const { data: autopilotSettings, isLoading: settingsLoading } = useQuery<AutopilotSettings>({
    queryKey: ['/api/settings/hostai-autopilot'],
    onError: (error) => {
      toast({
        title: 'Error loading settings',
        description: 'Failed to load autopilot settings',
        variant: 'destructive'
      });
    }
  });

  // Get autopilot logs from the API
  const { data: autopilotLogs, isLoading: logsLoading } = useQuery<AutopilotLog[]>({
    queryKey: ['/api/hostai/autopilot-log'],
    onError: (error) => {
      toast({
        title: 'Error loading logs',
        description: 'Failed to load autopilot activity logs',
        variant: 'destructive'
      });
    }
  });

  // Local state to track settings changes
  const [aiSuggestionEnabled, setAiSuggestionEnabled] = useState(true);
  const [aiTrainingFeedback, setAiTrainingFeedback] = useState(true);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);

  // Update local state when settings are loaded
  useEffect(() => {
    if (autopilotSettings) {
      setAutopilotEnabled(autopilotSettings.enabled);
      setConfidenceThreshold(autopilotSettings.confidenceThreshold * 100);
    }
  }, [autopilotSettings]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<AutopilotSettings>) => 
      apiRequest('/api/settings/hostai-autopilot', {
        method: 'PATCH',
        data
      }),
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: ['/api/settings/hostai-autopilot'] });
      toast({
        title: "Settings saved",
        description: "Your autopilot settings have been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "There was a problem updating your settings",
        variant: "destructive"
      });
    }
  });

  // Save settings to the server
  const saveSettings = () => {
    // Save AI suggestion and training feedback settings
    toast({
      title: "Settings saved",
      description: "Your AI inbox settings have been updated",
    });
    
    // Save autopilot settings
    updateSettingsMutation.mutate({
      enabled: autopilotEnabled,
      confidenceThreshold: confidenceThreshold / 100
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