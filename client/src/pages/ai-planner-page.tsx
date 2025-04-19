import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, PlusCircle, Calendar, CheckSquare, User2, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AiPlannerPage() {
  // State for project creation form
  const [projectPrompt, setProjectPrompt] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [currentInteractionId, setCurrentInteractionId] = useState<number | null>(null);
  const [planningStage, setPlanningStage] = useState<'initial' | 'clarifying' | 'generating' | 'complete'>('initial');
  const [followupResponse, setFollowupResponse] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  
  // Get auth context and set up toast and query client
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set page title
  useEffect(() => {
    document.title = 'AI Project Planner | Synergy Rentals';
  }, []);

  // Fetch user's interactions
  const { data: interactions, isLoading: isLoadingInteractions } = useQuery({
    queryKey: ['/api/ai-planner/interactions'],
    enabled: !!user,
  });

  // Create a new interaction with the project prompt
  const createInteraction = useMutation({
    mutationFn: async (newPrompt: string) => {
      console.log('Creating new project plan with prompt:', newPrompt);
      
      // Use the new process-request endpoint for improved formalized planning workflow
      const response = await apiRequest('POST', '/api/ai-planner/process-request', {
        prompt: newPrompt,
        userId: user?.id,
        projectId: null,
      });
      
      return response;
    },
    onSuccess: (data) => {
      console.log('Project planning started successfully:', data);
      
      // Store the interaction ID for polling
      if (data && (data.id || data.interactionId)) {
        // The server returns interactionId but we check both for robustness
        const id = data.interactionId || data.id;
        setCurrentInteractionId(id);
        setPlanningStage('generating');
        
        // Start polling the interaction status
        pollInteractionStatus(id);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to start project planning. Please try again.',
          variant: 'destructive',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
    },
    onError: (error: any) => {
      console.error('Error creating project plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to start project planning. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update an existing interaction with followup information
  const updateInteraction = useMutation({
    mutationFn: async ({ id, followupText }: { id: number; followupText: string }) => {
      console.log('Sending followup response for interaction:', id);
      
      // Use the process-request endpoint for improved formalized planning workflow
      const response = await apiRequest('POST', '/api/ai-planner/process-request', {
        prompt: projectPrompt, // Include the original prompt
        userId: user?.id,
        interactionId: id,
        followupResponse: followupText
      });
      
      return response;
    },
    onSuccess: (data) => {
      console.log('Followup sent successfully:', data);
      
      // Continue polling the interaction status
      if (data && (data.id || data.interactionId)) {
        const id = data.interactionId || data.id;
        setPlanningStage('generating');
        setFollowupResponse('');
        pollInteractionStatus(id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-planner/interactions'] });
    },
    onError: (error: any) => {
      console.error('Error sending followup:', error);
      toast({
        title: 'Error',
        description: 'Failed to send followup information. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Convert a plan to a project
  const convertToProject = useMutation({
    mutationFn: async (interactionId: number) => {
      setCreatingProject(true);
      const response = await apiRequest('POST', `/api/projects/from-interaction/${interactionId}`, {});
      return response;
    },
    onSuccess: (data) => {
      console.log('Project created successfully:', data);
      setCreatingProject(false);
      
      toast({
        title: 'Success',
        description: 'Project created successfully!',
      });
      
      // Reset the form
      resetForm();
      
      // Redirect to the new project
      if (data && data.id) {
        window.location.href = `/projects/${data.id}`;
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      console.error('Error creating project:', error);
      setCreatingProject(false);
      
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Poll interaction status until it's complete or an error occurs
  const pollInteractionStatus = async (interactionId: number) => {
    try {
      const response = await apiRequest('GET', `/api/ai-planner/interactions/${interactionId}`, null);
      
      if (response) {
        console.log('Polling interaction status:', response.status);
        
        // Check if the AI is asking for clarification
        if (response.status === 'needs_clarification') {
          setPlanningStage('clarifying');
          setShowPlanDetails(true);
          return;
        }
        
        // Check if the plan is complete
        if (response.status === 'completed') {
          setPlanningStage('complete');
          setShowPlanDetails(true);
          return;
        }
        
        // Continue polling if still processing
        if (response.status === 'pending' || response.status === 'processing' || response.status === 'draft') {
          setTimeout(() => pollInteractionStatus(interactionId), 2000);
          return;
        }
        
        // Handle error status
        if (response.status === 'error') {
          toast({
            title: 'Error',
            description: 'There was an error generating your project plan. Please try again.',
            variant: 'destructive',
          });
          resetForm();
          return;
        }
        
        // Default: continue polling
        setTimeout(() => pollInteractionStatus(interactionId), 2000);
      }
    } catch (error) {
      console.error('Error polling interaction status:', error);
      toast({
        title: 'Error',
        description: 'Failed to retrieve project plan status. Please try again.',
        variant: 'destructive',
      });
      resetForm();
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project description',
        variant: 'destructive',
      });
      return;
    }
    
    createInteraction.mutateAsync(projectPrompt);
  };

  // Handle followup submission
  const handleFollowupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followupResponse.trim() || !currentInteractionId) {
      toast({
        title: 'Error',
        description: 'Please enter your response',
        variant: 'destructive',
      });
      return;
    }
    
    updateInteraction.mutateAsync({ id: currentInteractionId, followupText: followupResponse });
  };

  // Reset the form and state
  const resetForm = () => {
    setProjectPrompt('');
    setShowForm(false);
    setShowPlanDetails(false);
    setCurrentInteractionId(null);
    setPlanningStage('initial');
    setFollowupResponse('');
  };

  // Get the current interaction details
  const getCurrentInteraction = () => {
    if (!interactions || !currentInteractionId) return null;
    return interactions.find((interaction: any) => interaction.id === currentInteractionId) || null;
  };

  // Get suggested tasks from the current interaction
  const getSuggestedTasks = () => {
    const interaction = getCurrentInteraction();
    if (!interaction || !interaction.generatedPlan) return [];
    
    return interaction.generatedPlan.suggestedTasks || [];
  };

  // Get suggested milestones from the current interaction
  const getSuggestedMilestones = () => {
    const interaction = getCurrentInteraction();
    if (!interaction || !interaction.generatedPlan) return [];
    
    return interaction.generatedPlan.suggestedMilestones || [];
  };

  // Render the project planning form
  const renderProjectForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Project Plan</CardTitle>
        <CardDescription>
          Describe your project and our AI will create a plan with tasks and milestones
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="projectPrompt" className="text-sm font-medium">
                Project Description
              </label>
              <Textarea
                id="projectPrompt"
                placeholder="Describe your project in detail. Include goals, timeline constraints, resources available, and any specific requirements."
                value={projectPrompt}
                onChange={(e) => setProjectPrompt(e.target.value)}
                rows={6}
                className="w-full resize-none"
                disabled={createInteraction.isPending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowForm(false)} disabled={createInteraction.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!projectPrompt.trim() || createInteraction.isPending}>
            {createInteraction.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Plan...
              </>
            ) : (
              <>Generate Project Plan</>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );

  // Render the plan generation in progress view
  const renderPlanGenerating = () => {
    const currentInteraction = getCurrentInteraction();
    
    return (
      <Card className="w-full text-center p-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-xl font-semibold">Creating Your Project Plan</h3>
          <p className="text-muted-foreground max-w-md">
            Our AI is analyzing your project description and generating a detailed plan with tasks and milestones.
            This may take a minute or two.
          </p>
          
          <div className="flex items-center justify-center mt-4">
            <span className="text-sm text-muted-foreground">
              Planning for: <span className="font-medium text-foreground">{currentInteraction?.prompt?.substring(0, 50)}...</span>
            </span>
          </div>
        </div>
      </Card>
    );
  };

  // Render the clarification request view
  const renderClarificationRequest = () => {
    const currentInteraction = getCurrentInteraction();
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Additional Information Needed</CardTitle>
          <CardDescription>
            Our AI needs some clarification to create a better project plan
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleFollowupSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md">
              <h4 className="font-medium mb-2">Original Description:</h4>
              <p className="text-sm">{currentInteraction?.prompt}</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">AI's Questions:</h4>
              <div className="bg-primary/10 p-4 rounded-md">
                <p className="text-sm">{currentInteraction?.rawAiResponse?.clarificationQuestions || "Please provide more details about your project."}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="followupResponse" className="text-sm font-medium">
                Your Response
              </label>
              <Textarea
                id="followupResponse"
                placeholder="Provide additional information about your project..."
                value={followupResponse}
                onChange={(e) => setFollowupResponse(e.target.value)}
                rows={4}
                className="w-full resize-none"
                disabled={updateInteraction.isPending}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetForm} disabled={updateInteraction.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!followupResponse.trim() || updateInteraction.isPending}>
              {updateInteraction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send Response</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  };

  // Render the completed plan view
  const renderCompletedPlan = () => {
    const currentInteraction = getCurrentInteraction();
    const tasks = getSuggestedTasks();
    const milestones = getSuggestedMilestones();
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Project Plan Ready</CardTitle>
              <CardDescription>
                Your AI-generated project plan is ready to review
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-2">
              {tasks.length} Tasks • {milestones.length} Milestones
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Project Description</h3>
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p>{currentInteraction?.prompt}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Project Plan</h3>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-4">
                    <p>{currentInteraction?.generatedPlan?.content || currentInteraction?.response}</p>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Suggested Tasks</h3>
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.map((task: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-md">
                        <CheckSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="font-medium">{task.description}</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {task.priority && (
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {task.dueDate}
                              </div>
                            )}
                            {task.assignedTo && (
                              <div className="flex items-center text-muted-foreground">
                                <User2 className="h-3 w-3 mr-1" />
                                {task.assignedTo}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific tasks suggested.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="milestones" className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Suggested Milestones</h3>
                {milestones.length > 0 ? (
                  <div className="space-y-2">
                    {milestones.map((milestone: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-md">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="font-medium">{milestone.title}</div>
                          {milestone.dueDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              Target: {milestone.dueDate}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific milestones suggested.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetForm} disabled={creatingProject}>
            Start Over
          </Button>
          <Button 
            onClick={() => currentInteractionId && convertToProject.mutate(currentInteractionId)}
            disabled={creatingProject}
          >
            {creatingProject ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                Create Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render the main form based on the current planning stage
  const renderPlanningForm = () => {
    if (planningStage === 'initial') {
      return renderProjectForm();
    } else if (planningStage === 'generating') {
      return renderPlanGenerating();
    } else if (planningStage === 'clarifying') {
      return renderClarificationRequest();
    } else if (planningStage === 'complete') {
      return renderCompletedPlan();
    }
    
    return renderProjectForm();
  };

  // Render the history sheet with previous interactions
  const renderHistorySheet = () => {
    const completedInteractions = interactions?.filter((interaction: any) => 
      interaction.status === 'completed' || interaction.status === 'approved'
    ) || [];
    
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="ml-auto">
            View History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader className="mb-4">
            <SheetTitle>Project Planning History</SheetTitle>
            <SheetDescription>
              View your previous project plans created with AI
            </SheetDescription>
          </SheetHeader>
          
          {isLoadingInteractions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : completedInteractions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No completed project plans found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                <Accordion type="single" collapsible className="w-full">
                  {completedInteractions.map((interaction: any) => (
                    <AccordionItem key={interaction.id} value={interaction.id.toString()}>
                      <AccordionTrigger className="text-left">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{interaction.prompt.substring(0, 50)}...</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(interaction.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 py-1">
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Project Description</h4>
                            <p className="text-sm text-muted-foreground">{interaction.prompt}</p>
                          </div>
                          
                          {interaction.generatedPlan?.suggestedTasks?.length > 0 && (
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium">Tasks</h4>
                              <ul className="text-sm space-y-1">
                                {interaction.generatedPlan.suggestedTasks.map((task: any, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <CheckSquare className="h-3 w-3 text-primary mt-1" />
                                    <span>{task.description}</span>
                                  </li>
                                )).slice(0, 3)}
                                {interaction.generatedPlan.suggestedTasks.length > 3 && (
                                  <li className="text-xs text-muted-foreground pl-5">
                                    +{interaction.generatedPlan.suggestedTasks.length - 3} more tasks
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          <div className="pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setCurrentInteractionId(interaction.id);
                                setPlanningStage('complete');
                                setShowPlanDetails(true);
                                setShowForm(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col h-full p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">AI Project Planner</h1>
          {renderHistorySheet()}
        </div>
        
        <div className="flex-1 grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col">
            {showForm ? (
              <div className="flex-1">
                {renderPlanningForm()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-card border rounded-lg p-6">
                <div className="text-center max-w-md space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-full text-primary">
                      <PlusCircle className="h-10 w-10" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold">Create a New Project Plan</h2>
                  <p className="text-muted-foreground">
                    Describe your project and our AI will create a detailed plan with tasks, milestones, 
                    and recommendations tailored to your specific needs.
                  </p>
                  <Button size="lg" className="mt-2" onClick={() => setShowForm(true)}>
                    Create Project Plan
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Planner Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Be specific about what you want to accomplish</li>
                  <li>• Mention team members by name when assigning tasks</li>
                  <li>• Include deadlines when creating time-sensitive tasks</li>
                  <li>• Specify priority levels (Low, Medium, High, Urgent)</li>
                  <li>• Ask for help analyzing specific projects by name</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}