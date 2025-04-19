import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BrainCircuit, CheckCircle, Loader2, Send, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

type AiInteraction = {
  id: number;
  userId: number;
  prompt: string;
  response: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
};

const AiAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Get the current user information
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setCurrentUser(data);
        }
      })
      .catch(err => console.error('Error fetching user data:', err));
    
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectTimeouts = [1000, 3000, 5000, 10000, 15000]; // Increasing timeouts
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    function connectWebSocket() {
      console.log(`Attempting WebSocket connection to ${wsUrl}`);
      
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        
        // Connection opened handler
        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          setWsConnected(true);
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          
          toast({
            title: 'Connected',
            description: 'Real-time AI Assistant connection established',
          });
        };
        
        // Message handler
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle different message types
            if (data.type === 'welcome') {
              console.log('WebSocket welcome message:', data.message);
            } else if (data.type === 'status_update') {
              // Update the interaction status in the cache
              queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
            } else if (data.type === 'ai_response') {
              // Update with the new interaction data
              queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
            } else if (data.type === 'error') {
              toast({
                title: 'Error',
                description: data.message || 'An error occurred with your AI request',
                variant: 'destructive',
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        // Connection closed handler
        socket.onclose = (event) => {
          console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
          setWsConnected(false);
          
          // Attempt to reconnect unless this was a normal closure or component unmounting
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const timeout = reconnectTimeouts[Math.min(reconnectAttempts, reconnectTimeouts.length - 1)];
            console.log(`Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts + 1} of ${maxReconnectAttempts})`);
            
            setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, timeout);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            toast({
              title: 'Connection Failed',
              description: 'Could not establish a connection to the AI service after multiple attempts',
              variant: 'destructive',
            });
          }
        };
        
        // Error handler
        socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          // Don't set connection state here, as the close event will also fire
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setWsConnected(false);
        
        // Try to reconnect after a delay
        if (reconnectAttempts < maxReconnectAttempts) {
          const timeout = reconnectTimeouts[Math.min(reconnectAttempts, reconnectTimeouts.length - 1)];
          console.log(`Error in WebSocket creation. Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts + 1} of ${maxReconnectAttempts})`);
          
          setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, timeout);
        }
      }
    }
    
    // Initial connection
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Use code 1000 to indicate normal closure (prevents reconnect attempts)
        socketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [toast, queryClient]);

  // Fetch user interactions with AI
  const { data: interactions = [], isLoading, error } = useQuery({
    queryKey: ['/api/ai-planner/interactions'],
    gcTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
    onSuccess: (data) => {
      console.log('Successfully loaded AI interactions:', data);
    },
    onError: (err) => {
      console.error('Error loading AI interactions:', err);
      toast({
        title: 'Error loading interactions',
        description: 'Could not load your previous conversations with the AI Assistant.',
        variant: 'destructive',
      });
    },
  });

  // Create a new interaction
  const createInteraction = useMutation({
    mutationFn: async (newPrompt: string) => {
      // Create empty placeholders for the required fields
      return await apiRequest('POST', '/api/ai-planner/interactions', {
        prompt: newPrompt,
        rawAiResponse: {}, // Empty object as placeholder
        generatedPlan: {}, // Empty object as placeholder
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      setPrompt('');
      toast({
        title: 'Request sent',
        description: 'Your request has been sent to the AI Assistant.',
      });
    },
    onError: (error) => {
      console.error('Error creating interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to send your request. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Simulate AI response (in a real implementation, this would be handled by a webhook)
  const simulateAiResponse = async (interaction: AiInteraction) => {
    if (!interaction || typeof interaction.id !== 'number') {
      console.error('Invalid interaction object in simulateAiResponse:', interaction);
      toast({
        title: 'Error',
        description: 'Failed to process AI request. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Update status to processing
      await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
        status: 'processing',
        rawAiResponse: {}, // Empty placeholder to ensure validation passes
        generatedPlan: {}, // Empty placeholder to ensure validation passes
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a response based on the prompt
      let response = '';
      
      if (interaction.prompt.toLowerCase().includes('task') && interaction.prompt.toLowerCase().includes('create')) {
        response = "I can help create a new task. Here's a suggested task:\n\n" +
          "Title: Follow up with cleaning team\n" +
          "Priority: Medium\n" +
          "Due Date: Tomorrow at 2pm\n" +
          "Description: Check that all units have been properly cleaned and prepared for upcoming guests\n\n" +
          "Would you like me to create this task for you?";
      } else if (interaction.prompt.toLowerCase().includes('project') && interaction.prompt.toLowerCase().includes('plan')) {
        response = "I can help create a project plan. Based on your request, here's a suggested project structure:\n\n" +
          "Project: Quarterly Maintenance Review\n\n" +
          "Milestones:\n" +
          "1. Initial property assessment (1 week)\n" +
          "2. Vendor coordination (2 weeks)\n" +
          "3. Maintenance implementation (3 weeks)\n" +
          "4. Final inspection (1 week)\n\n" +
          "Would you like me to set this up as a new project with these milestones?";
      } else if (interaction.prompt.toLowerCase().includes('analyze') || interaction.prompt.toLowerCase().includes('report')) {
        response = "Based on your current projects and tasks, here's a quick analysis:\n\n" +
          "- You have 5 high priority tasks pending\n" +
          "- The maintenance team is currently handling more tasks than the cleaning team\n" +
          "- Most of your tasks are concentrated around the end of the month\n\n" +
          "Would you like a more detailed analysis or help redistributing these tasks?";
      } else {
        response = "I understand you need assistance with your projects and tasks. I can help with:\n\n" +
          "- Creating new tasks or projects\n" +
          "- Planning project timelines and milestones\n" +
          "- Analyzing your current workload\n" +
          "- Suggesting task prioritization\n" +
          "- Generating reports\n\n" +
          "Please let me know what specific help you need with your projects or tasks.";
      }
      
      // Update with the response and required fields for schema validation
      await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
        status: 'completed',
        response,
        rawAiResponse: { simulatedResponse: true },
        generatedPlan: { content: response },
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
    } catch (error) {
      console.error('Error in simulateAiResponse:', error);
      
      // Mark as error if something fails
      try {
        await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
          status: 'error',
          rawAiResponse: { error: 'Simulation error' },
          generatedPlan: { error: 'Simulation error' },
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      } catch (updateError) {
        console.error('Error updating interaction status:', updateError);
      }
      
      toast({
        title: 'Error',
        description: 'Failed to process your request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsSubmitting(true);
    try {
      // First create a record of the interaction through the API
      const newInteraction = await createInteraction.mutateAsync(prompt);
      
      // Check if we got a valid interaction from the API
      if (!newInteraction || typeof newInteraction.id !== 'number') {
        console.error('Invalid interaction ID from API:', newInteraction);
        toast({
          title: 'Error',
          description: 'Failed to create interaction. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // If WebSocket is connected, send the request through WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser) {
        // Give the connection another health check before sending
        try {
          // Get the current project context if we're on a project page
          const projectIdMatch = window.location.pathname.match(/\/projects\/(\d+)/);
          const projectId = projectIdMatch ? parseInt(projectIdMatch[1], 10) : null;
          
          socketRef.current.send(JSON.stringify({
            type: 'ai_request',
            prompt,
            userId: currentUser.id,
            interactionId: newInteraction.id,
            projectId: projectId
          }));
          
          // The response will come back through the WebSocket
          console.log('Sent AI request through WebSocket');
          
          toast({
            title: 'Request sent',
            description: 'Your request is being processed by the AI Assistant',
          });
        } catch (wsError) {
          console.error('Error sending data through WebSocket:', wsError);
          // Fall back to simulation on WebSocket error
          await simulateAiResponse(newInteraction);
        }
      } else {
        // Fallback to simulate AI response if WebSocket is not available
        console.log('WebSocket not available, using simulated response');
        toast({
          title: 'Using offline mode',
          description: 'Connection to AI service unavailable. Using local response instead.',
        });
        await simulateAiResponse(newInteraction);
      }
    } catch (error) {
      console.error('Error submitting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [interactions]);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <CardTitle>AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {wsConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-amber-500" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
        <CardDescription>
          Get help with planning, organizing, and optimizing your projects and tasks
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="chat">
        <TabsList className="mx-6">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-destructive">Failed to load chat history</p>
              </div>
            ) : interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">AI Assistant</h3>
                <p className="text-muted-foreground max-w-md">
                  Ask for help with creating tasks, planning projects, analyzing workloads, or optimizing your schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction: AiInteraction) => (
                  <div key={interaction.id} className="space-y-4">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarImage src="/avatar.png" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted p-3 rounded-lg">
                        <p>{interaction.prompt}</p>
                      </div>
                    </div>
                    
                    {(interaction.response || interaction.status === 'processing') && (
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarImage src="/ai-avatar.png" />
                          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-primary/10 p-3 rounded-lg">
                          {interaction.status === 'processing' ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <p className="text-muted-foreground">Thinking...</p>
                            </div>
                          ) : interaction.status === 'error' ? (
                            <p className="text-destructive">Sorry, there was an error processing your request. Please try again.</p>
                          ) : (
                            <p className="whitespace-pre-line">{interaction.response}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>
          
          <CardFooter className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask for help with your projects and tasks..."
                className="min-h-[60px] flex-1"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting || !prompt.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="suggestions" className="p-4">
          <h3 className="font-medium mb-4">Suggested Prompts</h3>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => setPrompt("Create a new maintenance task for inspecting all HVAC systems")}
            >
              Create a new maintenance task for inspecting all HVAC systems
            </Button>
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => setPrompt("Help me plan a quarterly maintenance project for all properties")}
            >
              Help me plan a quarterly maintenance project for all properties
            </Button>
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => setPrompt("Analyze my team's current workload and suggest optimizations")}
            >
              Analyze my team's current workload and suggest optimizations
            </Button>
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => setPrompt("Generate a weekly report of completed and pending tasks")}
            >
              Generate a weekly report of completed and pending tasks
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="p-4">
          <h3 className="font-medium mb-4">Recent Interactions</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-destructive">Failed to load interaction history</p>
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No interactions yet</p>
          ) : (
            <div className="space-y-2">
              {interactions.map((interaction: AiInteraction) => (
                <Card key={interaction.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {interaction.prompt.length > 60 
                          ? `${interaction.prompt.substring(0, 60)}...` 
                          : interaction.prompt}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(interaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        interaction.status === 'completed' ? 'default' :
                        interaction.status === 'error' ? 'destructive' :
                        'outline'
                      }
                    >
                      {interaction.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {interaction.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AiAssistant;