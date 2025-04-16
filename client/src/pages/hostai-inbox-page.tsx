import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import { HostAITaskInbox } from "@/components/tasks/HostAITaskInbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostAIInboxPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HostAI Task Inbox</h1>
            <p className="text-muted-foreground">Process and route incoming tasks from HostAI</p>
          </div>
          <Button 
            onClick={() => window.location.href = "/projects-tasks/hostai-inbox/settings"}
            variant="outline"
          >
            Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Unprocessed Tasks</CardTitle>
            <CardDescription>
              Review and assign incoming tasks from the HostAI system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HostAITaskInbox />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}