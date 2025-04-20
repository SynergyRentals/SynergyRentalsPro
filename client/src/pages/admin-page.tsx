import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { GuestyCSVImport } from "@/components/guesty/GuestyCSVImport";
import { GuestyBatchSync } from "@/components/guesty";

function GuestyHealthCheck() {
  const { toast } = useToast();
  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [details, setDetails] = useState<any>(null);

  const healthCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/guesty/health-check');
      return await response.json();
    },
    onSuccess: (data) => {
      setHealthStatus(data.success ? 'success' : 'error');
      setDetails(data);
      toast({
        title: data.success ? 'Domain Reachable' : 'Domain Unreachable',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setHealthStatus('error');
      toast({
        title: 'Health Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  });

  const handleHealthCheck = () => {
    setHealthStatus('loading');
    healthCheckMutation.mutate();
  };

  const getStatusDisplay = () => {
    if (healthStatus === 'idle') return null;
    
    if (healthStatus === 'loading') {
      return <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700">Checking...</Badge>;
    }
    
    if (healthStatus === 'success') {
      return <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">Domain Reachable</Badge>;
    }
    
    if (healthStatus === 'error') {
      return <Badge variant="outline" className="ml-2 bg-red-50 text-red-700">Domain Unreachable</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleHealthCheck}
          disabled={healthStatus === 'loading'}
          className="flex items-center"
        >
          {healthStatus === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking Domain...
            </>
          ) : healthStatus === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Check API Domain
            </>
          ) : healthStatus === 'error' ? (
            <>
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Check API Domain
            </>
          ) : (
            <>Check API Domain</>
          )}
        </Button>
        {getStatusDisplay()}
      </div>
      {healthStatus === 'success' && details && (
        <div className="text-xs text-muted-foreground">
          <p>Domain: open-api.guesty.com</p>
          <p>Response Time: {new Date(details.timestamp).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}

function GuestyConnectionTest() {
  const { toast } = useToast();
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [details, setDetails] = useState<any>(null);

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/guesty/test-connection');
      return await response.json();
    },
    onSuccess: (data) => {
      setTestStatus(data.success ? 'success' : 'error');
      setDetails(data);
      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setTestStatus('error');
      toast({
        title: 'Connection Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  });

  const handleTestConnection = () => {
    setTestStatus('loading');
    testConnectionMutation.mutate();
  };

  const getStatusDisplay = () => {
    if (testStatus === 'idle') return null;
    
    if (testStatus === 'loading') {
      return <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700">Testing...</Badge>;
    }
    
    if (testStatus === 'success') {
      return <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">Connected</Badge>;
    }
    
    if (testStatus === 'error') {
      return <Badge variant="outline" className="ml-2 bg-red-50 text-red-700">Connection Failed</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleTestConnection}
          disabled={testStatus === 'loading'}
          className="flex items-center"
        >
          {testStatus === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : testStatus === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Test Full Connection
            </>
          ) : testStatus === 'error' ? (
            <>
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Test Full Connection
            </>
          ) : (
            <>Test Full Connection</>
          )}
        </Button>
        {getStatusDisplay()}
      </div>
      {testStatus === 'success' && details && (
        <div className="text-xs text-muted-foreground">
          <p>Connected as: {details.userData?.firstName} {details.userData?.lastName}</p>
          <p>Account ID: {details.userData?.accountId}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  // User management
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: activeTab === "users",
  });

  // System logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["/api/logs"],
    enabled: activeTab === "logs",
  });

  // System settings
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    slack: "",
    guestyKey: "",
    guestySecret: "",
  });

  const [isUpdatingKeys, setIsUpdatingKeys] = useState(false);

  const updateAPIKeys = async () => {
    setIsUpdatingKeys(true);
    try {
      // Make API call to update the API keys
      const response = await apiRequest('POST', '/api/settings/update-api-keys', {
        openAiKey: apiKeys.openai,
        slackToken: apiKeys.slack,
        guestyApiKey: apiKeys.guestyKey,
        guestyApiSecret: apiKeys.guestySecret
      });
      
      // If Guesty API keys were provided, update the client
      if (apiKeys.guestyKey && apiKeys.guestySecret) {
        // Update Guesty API credentials
        await apiRequest('POST', '/api/guesty/set-credentials', {
          apiKey: apiKeys.guestyKey,
          apiSecret: apiKeys.guestySecret
        });
      }
      
      toast({
        title: "API Keys Updated",
        description: "The system API keys have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingKeys(false);
    }
  };

  return (
    <div className="p-4">
      <Container>
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <Tabs defaultValue="users" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>
          
          {/* User Management Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage system users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button>Add New User</Button>
                </div>
                
                {usersLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {user.active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">Edit</Button>
                                <Button variant="outline" size="sm" className="text-red-500">
                                  {user.active ? "Deactivate" : "Activate"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Review system activity and audit trail</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="log-filter">Filter by Action</Label>
                    <Select>
                      <SelectTrigger id="log-filter">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="log-user">Filter by User</Label>
                    <Select>
                      <SelectTrigger id="log-user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {logsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{log.userId}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>{log.targetTable}</TableCell>
                            <TableCell>{log.ipAddress}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system-wide settings and API integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">API Integrations</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        placeholder="sk-..."
                        value={apiKeys.openai}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Required for AI assistant, insights generation, and sentiment analysis
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="slack-key">Slack Bot Token</Label>
                      <Input
                        id="slack-key"
                        type="password"
                        placeholder="xoxb-..."
                        value={apiKeys.slack}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, slack: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Required for sending notifications to Slack
                      </p>
                    </div>

                    <div>
                      <Label>Guesty API Integration</Label>
                      <div className="flex flex-col space-y-4 mt-2">
                        <div>
                          <Label htmlFor="guesty-key">Guesty API Key</Label>
                          <Input
                            id="guesty-key"
                            type="password"
                            placeholder="Your Guesty API key"
                            value={apiKeys.guestyKey}
                            onChange={(e) => setApiKeys(prev => ({ ...prev, guestyKey: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Required for Guesty API integration. Enter your API key from the Guesty developer portal.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="guesty-secret">Guesty API Secret</Label>
                          <Input
                            id="guesty-secret"
                            type="password"
                            placeholder="Your Guesty API secret"
                            value={apiKeys.guestySecret}
                            onChange={(e) => setApiKeys(prev => ({ ...prev, guestySecret: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Required for Guesty API integration. Enter your API secret from the Guesty developer portal.
                          </p>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <GuestyHealthCheck />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Check if the Guesty API domain (open-api.guesty.com) is reachable
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <GuestyConnectionTest />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Test OAuth2 integration with Guesty API for property and reservation synchronization
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <GuestyCSVImport />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Import properties from CSV when Guesty API rate limits are reached
                          </p>
                        </div>
                        
                        <div className="pt-3">
                          <GuestyBatchSync />
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={updateAPIKeys} disabled={isUpdatingKeys}>
                      {isUpdatingKeys ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update API Keys"
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">System Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="default-maintenance-priority">Default Maintenance Priority</Label>
                        <Select defaultValue="medium">
                          <SelectTrigger id="default-maintenance-priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="cleaning-buffer">Cleaning Buffer (hours)</Label>
                        <Input id="cleaning-buffer" type="number" defaultValue="3" min="0" max="24" />
                      </div>
                    </div>
                    
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}