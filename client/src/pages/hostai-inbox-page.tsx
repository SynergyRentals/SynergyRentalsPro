import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import { HostAITaskInbox } from "@/components/tasks/HostAITaskInbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

export default function HostAIInboxPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);

  // Fetch current autopilot settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings/hostai-autopilot'],
    onError: () => {
      // If there's an error fetching settings, default to disabled
      setAutopilotEnabled(false);
    }
  });

  // Update autopilot settings when toggled
  const updateAutopilotMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('PATCH', '/api/settings/hostai-autopilot', { enabled });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: autopilotEnabled ? "Autopilot Mode enabled" : "Autopilot Mode disabled",
        description: autopilotEnabled 
          ? "AI will automatically process qualified tasks" 
          : "All tasks will require manual review",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/hostai-autopilot'] });
    },
    onError: (error) => {
      // Revert UI state on error
      setAutopilotEnabled(!autopilotEnabled);
      toast({
        title: "Error updating settings",
        description: "Failed to update Autopilot Mode settings",
        variant: "destructive"
      });
    }
  });

  // Update autopilot enabled state when settings data is loaded
  useEffect(() => {
    if (settings && 'enabled' in settings) {
      setAutopilotEnabled(settings.enabled);
    }
  }, [settings]);

  // Handle toggle change
  const handleAutopilotToggle = (checked: boolean) => {
    setAutopilotEnabled(checked);
    updateAutopilotMutation.mutate(checked);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HostAI Task Inbox</h1>
            <p className="text-muted-foreground">Process and route incoming tasks from HostAI</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={autopilotEnabled} 
                onCheckedChange={handleAutopilotToggle} 
                id="autopilot-mode"
                disabled={updateAutopilotMutation.isPending || settingsLoading}
              />
              <Label htmlFor="autopilot-mode" className="flex items-center cursor-pointer">
                <Zap className={`h-4 w-4 mr-1 ${autopilotEnabled ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                Autopilot Mode
              </Label>
            </div>
            <Button 
              onClick={() => window.location.href = "/projects-tasks/hostai-inbox/settings"}
              variant="outline"
            >
              Settings
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Unprocessed Tasks</CardTitle>
            <CardDescription>
              {autopilotEnabled 
                ? "AI is automatically processing qualified tasks. Only tasks requiring human review are shown below." 
                : "Review and assign incoming tasks from the HostAI system"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HostAITaskInbox autopilotEnabled={autopilotEnabled} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}