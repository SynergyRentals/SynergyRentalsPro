import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState("company");
  
  // Fetch company insights
  const { data: insights, isLoading: insightsLoading, error: insightsError } = useQuery({
    queryKey: ['/api/insights'],
    enabled: activeTab === "insights"
  });

  // Get severity badge styling
  function getSeverityBadge(severity: string) {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500">Low</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  }

  // Get insight type icon
  function getInsightTypeIcon(type: string) {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "suggestion":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  }

  return (
    <div className="p-4">
      <Container>
        <h1 className="text-3xl font-bold mb-6">Company Dashboard</h1>
        
        <Tabs defaultValue="company" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="company">Company Information</TabsTrigger>
            <TabsTrigger value="insights">Company Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                  <CardDescription>Basic information about Synergy Rentals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><span className="font-semibold">Company Name:</span> Synergy Rentals</p>
                    <p><span className="font-semibold">Founded:</span> 2020</p>
                    <p><span className="font-semibold">Headquarters:</span> Miami, FL</p>
                    <p><span className="font-semibold">Total Properties:</span> 24</p>
                    <p><span className="font-semibold">Employees:</span> 15</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Mission Statement</CardTitle>
                  <CardDescription>Our guiding principles</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    At Synergy Rentals, we strive to provide exceptional short-term rental experiences 
                    by combining smart technology with personalized service. Our mission is to maximize 
                    property value for owners while delivering memorable stays for guests.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>How to reach us</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><span className="font-semibold">General Inquiries:</span> info@synergyrentals.com</p>
                    <p><span className="font-semibold">Support:</span> support@synergyrentals.com</p>
                    <p><span className="font-semibold">Operations:</span> operations@synergyrentals.com</p>
                    <p><span className="font-semibold">Phone:</span> (305) 555-1234</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="insights">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Insights</CardTitle>
                  <CardDescription>AI-powered insights for optimizing your operations</CardDescription>
                </CardHeader>
                <CardContent>
                  {insightsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : insightsError ? (
                    <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800">
                      <h3 className="text-lg font-semibold flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Error loading insights
                      </h3>
                      <p className="mt-2">
                        There was a problem fetching company insights. Please try again later.
                      </p>
                    </div>
                  ) : insights && insights.length > 0 ? (
                    <div className="space-y-6">
                      {insights.map((insight: any) => (
                        <div key={insight.id} className="border rounded-md p-4 hover:bg-slate-50">
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getInsightTypeIcon(insight.insightType)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="text-lg font-medium">{insight.title}</h3>
                                {getSeverityBadge(insight.severity)}
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{insight.description}</p>
                              <div className="mt-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">{insight.type}</Badge>
                                  {insight.actionable && (
                                    <Badge variant="secondary">Actionable</Badge>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs flex items-center">
                                  View Details <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 border rounded-md">
                      <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No insights available</h3>
                      <p className="text-sm text-slate-500 mt-2">
                        Generate insights using the AI Tools page to see insights here.
                      </p>
                      <Button className="mt-4">Go to AI Tools</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}