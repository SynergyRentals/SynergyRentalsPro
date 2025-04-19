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
    // Get the current user information first
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          console.error('Failed to fetch user:', response.status);
          return;
        }
        const data = await response.json();
        if (data && data.id) {
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUser();
    
    // WebSocket connection state
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const maxReconnectAttempts = 10; // Increased max attempts
    const baseReconnectDelay = 1000;
    const maxReconnectDelay = 30000; // 30 seconds max delay
    
    // WebSocket connection URL with improved reliability
    const getWebSocketUrl = () => {
      // Force secure protocol for production environments
      const isProduction = window.location.hostname !== 'localhost' && 
                           !window.location.hostname.includes('127.0.0.1');
      
      // Always use secure protocol for production, or follow page protocol for development
      const protocol = isProduction || window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Use full host to ensure proper routing, with explicit port if needed
      const host = window.location.host;
      
      // Include a cache-busting parameter to avoid stale connections
      const timestamp = Date.now();
      return `${protocol}//${host}/ws?t=${timestamp}`;
    };
    
    // Function to calculate exponential backoff delay with jitter
    const getReconnectDelay = (attempt: number) => {
      // Exponential backoff: baseDelay * 2^attempt
      const delay = Math.min(
        baseReconnectDelay * Math.pow(2, attempt),
        maxReconnectDelay
      );
      // Add jitter (±20% randomness) to prevent reconnection storms
      return delay * (0.8 + Math.random() * 0.4);
    };
    
    // Enhanced WebSocket connection with improved error handling and connection management
    const connectWebSocket = () => {
      if (socketRef.current) {
        // Clean up any existing connection first with proper state checking
        try {
          // Check the readyState to determine proper cleanup action
          const currentState = socketRef.current.readyState;
          console.log(`Current WebSocket state before reconnect: ${currentState}`);
          
          if (currentState === WebSocket.OPEN) {
            console.log('Closing open WebSocket connection before reconnecting');
            // Use a clean close code with a reason
            socketRef.current.close(1000, 'Reconnecting');
          } else if (currentState === WebSocket.CONNECTING) {
            console.log('Terminating connecting WebSocket before reconnecting');
            // Terminate a socket in CONNECTING state since it can't be closed cleanly
            socketRef.current.close();
          }
          // For CLOSING or CLOSED states, no action needed
        } catch (e) {
          console.error('Error closing existing WebSocket:', e);
        }
        
        // Always null out the ref after cleanup attempt
        socketRef.current = null;
      }
      
      // Clear any pending reconnect timer
      if (reconnectTimer) {
        console.log('Clearing existing reconnect timer');
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      try {
        // Include detailed debugging information in connection URL
        const wsUrl = getWebSocketUrl();
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        
        // Create new connection with more detailed setup
        const socket = new WebSocket(wsUrl);
        
        // Set binary type to improve compatibility
        socket.binaryType = 'arraybuffer';
        
        // Store reference to connection
        socketRef.current = socket;
        
        // Connection opened handler
        socket.addEventListener('open', () => {
          console.log('WebSocket connection established');
          setWsConnected(true);
          reconnectAttempts = 0; // Reset reconnect counter
          
          toast({
            title: 'Connected',
            description: 'Real-time AI Assistant connection established',
          });
        });
        
        // Message handler
        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data.type);
            
            switch (data.type) {
              case 'welcome':
                console.log('WebSocket welcome message:', data.message);
                break;
              case 'heartbeat':
                // Reset connection status and update last activity
                setWsConnected(true);
                console.log('Heartbeat received at:', data.timestamp);
                break;
              case 'status_update':
                console.log('Status update for interaction:', data.interactionId);
                queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
                break;
              case 'ai_response':
                console.log('AI response received for interaction:', 
                  data.interaction?.id || 'unknown');
                queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
                
                // Show a success toast notification when receiving a completed response
                if (data.interaction?.status === 'completed') {
                  toast({
                    title: 'AI Response Ready',
                    description: 'Your request has been processed successfully',
                  });
                }
                break;
              case 'error':
                console.error('WebSocket error message:', data.message);
                toast({
                  title: 'Error',
                  description: data.message || 'An error occurred with your AI request',
                  variant: 'destructive',
                });
                break;
              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });
        
        // Connection closed handler
        socket.addEventListener('close', (event) => {
          console.log(`WebSocket disconnected: code=${event.code}, reason=${event.reason || 'No reason provided'}`);
          setWsConnected(false);
          
          // Attempt to reconnect with exponential backoff (unless it was a clean close)
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = getReconnectDelay(reconnectAttempts);
            console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1} of ${maxReconnectAttempts})`);
            
            reconnectTimer = setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('Maximum reconnection attempts reached');
            toast({
              title: 'Connection Failed',
              description: 'Could not establish a connection to the AI service after multiple attempts',
              variant: 'destructive',
            });
          }
        });
        
        // Error handler
        socket.addEventListener('error', (event) => {
          console.error('WebSocket error:', event);
          // Error handling is managed by the close event which will follow
        });
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setWsConnected(false);
        
        // Try to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = getReconnectDelay(reconnectAttempts);
          console.log(`Error in WebSocket creation. Attempting to reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1} of ${maxReconnectAttempts})`);
          
          reconnectTimer = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, delay);
        }
      }
    };
    
    // Create initial connection
    connectWebSocket();
    
    // Clean up on component unmount
    return () => {
      // Clear any pending reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      // Close WebSocket connection if it exists
      if (socketRef.current) {
        try {
          // Use code 1000 for a clean close
          socketRef.current.close(1000, 'Component unmounting');
        } catch (e) {
          console.error('Error during WebSocket cleanup:', e);
        }
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
      try {
        console.log('Creating new interaction with prompt:', newPrompt);
        
        // Create a properly formatted interaction with all required fields
        const response = await apiRequest('POST', '/api/ai-planner/interactions', {
          prompt: newPrompt,
          rawAiResponse: {status: 'pending'}, // More detailed placeholder
          generatedPlan: {status: 'pending'}, // More detailed placeholder
          // Include all potentially required fields based on schema
          context: {},
          editedPlan: null,
          finalPlan: null,
        });
        
        console.log('Interaction created successfully:', response);
        return response;
      } catch (err) {
        console.error('Error in createInteraction mutationFn:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('Interaction created successfully, data:', data);
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

  // Simulate AI response (fallback for when real APIs fail)
  const simulateAiResponse = async (interaction: AiInteraction) => {
    console.log('Starting simulation with interaction:', interaction);
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
      console.log('Updating interaction status to processing');
      
      // Update status to processing with all required fields
      await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
        status: 'processing',
        // Include detailed placeholders that follow schema requirements
        rawAiResponse: {
          status: 'processing',
          processingDetails: {
            startedAt: new Date().toISOString(),
            step: 'init'
          }
        },
        generatedPlan: {
          status: 'in_progress',
          stepComplete: false
        },
        // Include other fields that might be required
        editedPlan: null,
        finalPlan: null,
        context: {}
      });
      
      // Make sure UI is updated
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      
      // Simulate processing time (2 seconds)
      console.log('Simulating processing time...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a response based on the prompt
      let response = '';
      let prompt = interaction.prompt.toLowerCase();
      
      // Generate different responses based on prompt contents
      if (prompt.includes('task') && prompt.includes('create')) {
        response = "I can help create a new task. Here's a suggested task:\n\n" +
          "Title: Follow up with cleaning team\n" +
          "Priority: Medium\n" +
          "Due Date: Tomorrow at 2pm\n" +
          "Description: Check that all units have been properly cleaned and prepared for upcoming guests\n\n" +
          "Would you like me to create this task for you?";
      } else if (prompt.includes('project') && prompt.includes('plan')) {
        response = "I can help create a project plan. Based on your request, here's a suggested project structure:\n\n" +
          "Project: Quarterly Maintenance Review\n\n" +
          "Milestones:\n" +
          "1. Initial property assessment (1 week)\n" +
          "2. Vendor coordination (2 weeks)\n" +
          "3. Maintenance implementation (3 weeks)\n" +
          "4. Final inspection (1 week)\n\n" +
          "Would you like me to set this up as a new project with these milestones?";
      } else if (prompt.includes('analyze') || prompt.includes('report')) {
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
      
      console.log('Simulation complete, updating interaction with response');
      
      // Update with the response and required fields for schema validation
      const updatedInteraction = await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
        status: 'completed',
        // Include response in multiple places for compatibility
        response: response,
        rawAiResponse: { 
          simulatedResponse: true,
          content: response,
          completedAt: new Date().toISOString(),
          processingTime: 2000 // milliseconds
        },
        generatedPlan: { 
          content: response,
          status: 'complete',
          generatedAt: new Date().toISOString()
        },
        context: {
          simulationMode: true
        },
        editedPlan: null,
        finalPlan: null,
      });
      
      console.log('Interaction updated successfully:', updatedInteraction);
      
      // Ensure UI is updated
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      
      // Notify user
      toast({
        title: 'Response ready',
        description: 'The AI Assistant has processed your request in simulation mode.',
      });
      
    } catch (error) {
      console.error('Error in simulateAiResponse:', error);
      
      // Mark as error if something fails
      try {
        await apiRequest('PATCH', `/api/ai-planner/interactions/${interaction.id}`, {
          status: 'error',
          rawAiResponse: { 
            error: 'Simulation processing error',
            errorDetails: error instanceof Error ? error.message : 'Unknown error',
            errorTime: new Date().toISOString()
          },
          generatedPlan: { 
            error: 'Simulation error',
            status: 'failed'
          },
          editedPlan: null,
          finalPlan: null,
        });
        
        // Make sure UI is updated
        queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
      } catch (updateError) {
        console.error('Error updating interaction error status:', updateError);
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
    
    // Validate input
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    
    setIsSubmitting(true);
    
    try {
      // First create a record of the interaction through the REST API
      const newInteraction = await createInteraction.mutateAsync(trimmedPrompt);
      
      // Validate interaction creation result
      if (!newInteraction || typeof newInteraction.id !== 'number') {
        console.error('Invalid interaction returned from API:', newInteraction);
        toast({
          title: 'Error',
          description: 'Failed to create interaction record. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check if user is authenticated
      if (!currentUser || !currentUser.id) {
        console.error('Current user information is missing');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use the AI Assistant',
          variant: 'destructive',
        });
        return;
      }
      
      // Extract project context if available
      const projectIdMatch = window.location.pathname.match(/\/projects\/(\d+)/);
      const projectId = projectIdMatch ? parseInt(projectIdMatch[1], 10) : null;
      
      // Prepare request data
      const requestData = {
        type: 'ai_request',
        prompt: trimmedPrompt,
        userId: currentUser.id,
        interactionId: newInteraction.id,
        projectId: projectId
      };
      
      // Attempt to send via WebSocket if connected
      if (wsConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          // Send the request through WebSocket
          socketRef.current.send(JSON.stringify(requestData));
          
          console.log('AI request sent via WebSocket', {
            interactionId: newInteraction.id,
            projectContext: projectId ? 'Yes' : 'No'
          });
          
          toast({
            title: 'Request in progress',
            description: 'Your request is being processed by the AI Assistant',
          });
          
          // Response will be handled asynchronously by the WebSocket message handler
        } catch (wsError) {
          console.error('Failed to send request via WebSocket:', wsError);
          
          // Fall back to REST API processing
          await processViaRESTAPI(newInteraction, trimmedPrompt, currentUser.id, projectId);
        }
      } else {
        // WebSocket is not available, use the REST API endpoint
        console.log('WebSocket unavailable, using REST API fallback');
        
        await processViaRESTAPI(newInteraction, trimmedPrompt, currentUser.id, projectId);
      }
      
      // Enhanced function to process request using REST API when WebSockets fail
      // with improved error handling, polling logic, and user feedback
      async function processViaRESTAPI(interaction: any, prompt: string, userId: number, projectId: number | null) {
        try {
          console.log('Processing via REST API fallback with enhanced reliability');
          
          // Call the fallback endpoint with more detailed request information
          const response = await apiRequest('POST', '/api/ai-planner/process-request', {
            prompt,
            userId,
            projectId: projectId || undefined,
            interactionId: interaction.id, // Pass the existing interaction ID
            clientMetadata: {
              timestamp: new Date().toISOString(),
              fallbackReason: !wsConnected ? 'disconnected' : 'connection_error',
              userAgent: navigator.userAgent,
              viewportSize: `${window.innerWidth}x${window.innerHeight}`
            }
          });
          
          if (response && response.interactionId) {
            // Show a toast with more informative message
            toast({
              title: 'Request accepted',
              description: 'Your request is being processed in the background. Results will appear shortly.',
            });
            
            // Start polling for updates with progressive backoff
            queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
            
            // Define polling parameters with exponential backoff
            const initialPollingInterval = 1000; // Start with 1 second
            const maxPollingInterval = 10000; // Max 10 seconds
            const maxPollingTime = 120000; // Total polling time 2 minutes
            let currentPollingInterval = initialPollingInterval;
            let totalPollingTime = 0;
            let consecutiveErrors = 0;
            const maxConsecutiveErrors = 3;
            
            // Create a polling function that adjusts timing based on state
            const pollForUpdates = async () => {
              if (totalPollingTime >= maxPollingTime) {
                console.log('Maximum polling time reached');
                return;
              }
              
              const pollTimeout = setTimeout(async () => {
                try {
                  // Force refetch to get latest status
                  await queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
                  
                  // Get the current data
                  const interactions = queryClient.getQueryData(['/api/ai-planner/interactions']) || [];
                  const currentInteraction = Array.isArray(interactions) 
                    ? interactions.find((i: any) => i.id === interaction.id)
                    : null;
                  
                  // Reset error counter on successful poll
                  consecutiveErrors = 0;
                  
                  // Check if polling is complete
                  if (currentInteraction) {
                    console.log(`Polling: Interaction status is ${currentInteraction.status}`);
                    
                    if (currentInteraction.status === 'completed') {
                      console.log('Polling complete: Interaction is completed');
                      toast({
                        title: 'Response ready',
                        description: 'Your request has been processed successfully',
                      });
                      return; // Stop polling
                    } else if (currentInteraction.status === 'error') {
                      console.error('Polling complete: Interaction has error status');
                      toast({
                        title: 'Processing error',
                        description: 'There was an error processing your request',
                        variant: 'destructive',
                      });
                      return; // Stop polling
                    } else if (currentInteraction.status === 'processing') {
                      // Speed up polling when we know it's processing
                      currentPollingInterval = initialPollingInterval;
                    }
                  }
                  
                  // Continue polling with adjusted interval
                  totalPollingTime += currentPollingInterval;
                  currentPollingInterval = Math.min(
                    currentPollingInterval * 1.5, // Increase by 50%
                    maxPollingInterval
                  );
                  pollForUpdates();
                } catch (err) {
                  console.error('Error during polling:', err);
                  
                  // Increment error counter
                  consecutiveErrors++;
                  
                  if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.error('Too many consecutive polling errors, stopping');
                    toast({
                      title: 'Connection issue',
                      description: 'Unable to check request status. Please refresh.',
                      variant: 'destructive',
                    });
                    return; // Stop polling
                  }
                  
                  // Slow down polling on errors
                  totalPollingTime += currentPollingInterval;
                  currentPollingInterval = Math.min(
                    currentPollingInterval * 2, // Double on error
                    maxPollingInterval
                  );
                  pollForUpdates();
                }
              }, currentPollingInterval);
              
              // Safety cleanup
              return () => clearTimeout(pollTimeout);
            };
            
            // Start the polling process
            pollForUpdates();
          } else {
            throw new Error('Invalid response from REST API: Missing interactionId');
          }
        } catch (error) {
          console.error('Error with REST API fallback:', error);
          
          // More informative error message
          toast({
            title: 'Network issue detected',
            description: 'Switching to local processing mode for reliability',
            variant: 'destructive',
          });
          
          // Last resort - use simulation with better error handling
          try {
            await simulateAiResponse(interaction);
          } catch (simError) {
            console.error('Simulation fallback also failed:', simError);
            toast({
              title: 'Processing Failed',
              description: 'All processing attempts failed. Please try again later.',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in request processing:', error);
      
      toast({
        title: 'Request Failed',
        description: 'There was a problem processing your request. Please try again.',
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