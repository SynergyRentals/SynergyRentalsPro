import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ChecklistBuilder from "@/components/cleaning/ChecklistBuilder";
import ChecklistTemplates from "@/components/cleaning/ChecklistTemplates";
import { Settings, ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";

export default function CleaningSettingsPage() {
  const [activeTab, setActiveTab] = useState("templates");

  // Fetch cleaning checklist templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/cleaning-checklists'],
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/cleaning">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center">
              <Settings className="mr-2 h-6 w-6" />
              Cleaning Module Settings
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">Checklist Templates</TabsTrigger>
              <TabsTrigger value="builder">Template Builder</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
            </TabsList>

            {/* Checklist Templates Tab */}
            <TabsContent value="templates" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cleaning Checklist Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistTemplates />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Template Builder Tab */}
            <TabsContent value="builder" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Checklist Template Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistBuilder />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="configuration" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cleaning Module Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    
                    {/* Photo Documentation Settings */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Photo Documentation</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Required Photos</span>
                          <select className="border rounded p-1">
                            <option value="0">None</option>
                            <option value="1">1 Photo</option>
                            <option value="2">2 Photos</option>
                            <option value="3" selected>3 Photos</option>
                            <option value="5">5 Photos</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Require Room Tags</span>
                          <input type="checkbox" className="toggle" checked />
                        </div>
                      </div>
                    </div>
                    
                    {/* Cleaner Performance Settings */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Performance Tracking</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Track Time</span>
                          <input type="checkbox" className="toggle" checked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Performance Period</span>
                          <select className="border rounded p-1">
                            <option value="week">Weekly</option>
                            <option value="biweek" selected>Bi-weekly</option>
                            <option value="month">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Notification Settings */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Flagged Issues</span>
                          <input type="checkbox" className="toggle" checked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Cleaning Completions</span>
                          <input type="checkbox" className="toggle" checked />
                        </div>
                      </div>
                    </div>
                    
                    {/* Route Optimization Settings */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Route Optimization</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Enable Optimization</span>
                          <input type="checkbox" className="toggle" checked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Optimization Method</span>
                          <select className="border rounded p-1">
                            <option value="distance">Distance</option>
                            <option value="time" selected>Time</option>
                            <option value="combined">Combined</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      onClick={() => {
                        toast({
                          title: "Settings saved",
                          description: "Your cleaning module settings have been updated."
                        });
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}