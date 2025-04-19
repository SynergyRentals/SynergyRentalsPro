import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type for AI planning request
export interface PlanningRequest {
  prompt: string;
  projectContext?: any;
  userId: number;
  interactionId: number;
}

// Type for AI planning response
export interface PlanningResponse {
  response: string;
  suggestedTasks?: Array<{
    description: string;
    priority?: string;
    dueDate?: string;
    assignedTo?: number;
  }>;
  suggestedMilestones?: Array<{
    title: string;
    dueDate?: string;
  }>;
  suggestedDeadline?: string;
  suggestedTitle?: string;
  rawResponse?: any;
  error?: string;
}

/**
 * Generate a plan using OpenAI for a project or task
 * @param request - The planning request containing prompt and context
 * @returns A planning response with AI-generated content
 */
export async function generatePlan(request: PlanningRequest): Promise<PlanningResponse> {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing for AI plan generation");
    return {
      response: "I'm unable to generate a plan right now as the OpenAI API key is missing. Please contact your administrator.",
      error: "OPENAI_API_KEY environment variable is not set",
      suggestedTasks: [],
      suggestedMilestones: [],
      rawResponse: {
        error: "API key missing",
        status: "error"
      }
    };
  }

  const startTime = Date.now();

  try {
    // Log the request for debugging
    console.log(`Processing AI plan request ID: ${request.interactionId} for user: ${request.userId}`);
    
    // Set up system message based on whether we have project context
    const systemMessage = request.projectContext 
      ? `You are an AI project planning assistant for Synergy Rentals, a property management company. 
         You help create and optimize project plans, tasks, and milestones.
         Current project context: ${JSON.stringify(request.projectContext)}
         
         Respond with a JSON object that includes:
         1. "response": A detailed plan with structured sections (overview, approach, timeline, resources needed)
         2. "suggestedTasks": An array of specific tasks, each with description, priority, and suggested due date
         3. "suggestedMilestones": Key milestones for tracking progress
         4. "suggestedTitle": A concise title for the project
         5. "suggestedDeadline": Estimated completion date for the entire project`
      : `You are an AI project planning assistant for Synergy Rentals, a property management company.
         You help create and optimize project plans, tasks, and milestones.
         
         Respond with a JSON object that includes:
         1. "response": A detailed plan with structured sections (overview, approach, timeline, resources needed)
         2. "suggestedTasks": An array of specific tasks, each with description, priority, and suggested due date
         3. "suggestedMilestones": Key milestones for tracking progress
         4. "suggestedTitle": A concise title for the project
         5. "suggestedDeadline": Estimated completion date for the entire project`;

    // Build messages for the API call with more context
    const messages = [
      { 
        role: "system" as const, 
        content: systemMessage
      },
      { 
        role: "user" as const, 
        content: request.prompt
      }
    ];

    // Call OpenAI API with improved error handling
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2500, // Increased max tokens for more detailed responses
      response_format: { type: "json_object" },
    });

    // Parse the response content with better error handling
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI service");
    }

    let parsedResponse;
    try {
      // Parse the JSON response with error handling
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Invalid JSON response received from AI service");
    }
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    console.log(`AI plan generation completed in ${processingTime}ms for request ID: ${request.interactionId}`);
    
    // Return enhanced response in our standard format
    return {
      response: parsedResponse.response || parsedResponse.message || "I've analyzed your request and prepared a plan.",
      suggestedTasks: parsedResponse.tasks || parsedResponse.suggestedTasks || [],
      suggestedMilestones: parsedResponse.milestones || parsedResponse.suggestedMilestones || [],
      suggestedDeadline: parsedResponse.deadline || parsedResponse.suggestedDeadline || null,
      suggestedTitle: parsedResponse.title || parsedResponse.suggestedTitle || null,
      rawResponse: {
        ...parsedResponse,
        processingTime,
        processingMetadata: {
          model: "gpt-4o",
          promptLength: request.prompt.length,
          completionTime: new Date().toISOString(),
          requestId: request.interactionId
        }
      }
    };
  } catch (error: any) {
    // Calculate processing time even for errors
    const processingTime = Date.now() - startTime;
    console.error(`Error generating AI plan (${processingTime}ms):`, error);
    
    // Check for specific OpenAI API error types
    let errorMessage = "I encountered an error while generating your plan. Please try again.";
    let errorType = "unknown";
    
    if (error?.status === 401) {
      errorMessage = "Authentication error with the AI service. Please contact your administrator.";
      errorType = "auth";
    } else if (error?.status === 429) {
      errorMessage = "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
      errorType = "rate_limit";
    } else if (error?.status === 500) {
      errorMessage = "The AI service is experiencing technical difficulties. Please try again later.";
      errorType = "server";
    } else if (error.message?.includes("JSON")) {
      errorMessage = "There was a problem formatting the response. Please try a different prompt.";
      errorType = "format";
    }
    
    return {
      response: errorMessage,
      error: error.message || "Unknown error",
      suggestedTasks: [],
      suggestedMilestones: [],
      rawResponse: {
        error: {
          message: error.message || "Unknown error",
          type: errorType,
          processingTime,
          timestamp: new Date().toISOString(),
          status: "error"
        }
      }
    };
  }
}

/**
 * Analyze project or task data for insights
 * @param data - The data to analyze
 * @param prompt - Optional specific instructions
 * @returns An analysis of the data with recommendations
 */
export async function analyzeProjectData(data: any, prompt?: string): Promise<any> {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing for project data analysis");
    return {
      summary: "Unable to analyze data due to missing API key",
      insights: ["The OpenAI API key is missing. Please contact your administrator."],
      recommendations: ["Contact your system administrator to enable AI analysis features"],
      metrics: { error: "API_KEY_MISSING" },
      status: "error"
    };
  }

  const startTime = Date.now();
  
  try {
    // Enhanced system prompt with more detailed instructions
    const systemPrompt = `You are an AI analyst for Synergy Rentals, a property management company. 
      Analyze the provided data and generate detailed, actionable insights.
      Focus on identifying patterns, bottlenecks, and opportunities for improvement.
      Consider timeline efficiency, resource allocation, and milestone achievements.
      
      Provide your response as a JSON object with the following structure:
      {
        "summary": "A concise 2-3 sentence summary of the analysis",
        "insights": [
          {"title": "Key Insight 1", "description": "Detailed explanation", "impact": "high/medium/low"},
          {"title": "Key Insight 2", "description": "Detailed explanation", "impact": "high/medium/low"}
        ],
        "recommendations": [
          {"action": "Specific Recommendation 1", "priority": "high/medium/low", "timeframe": "immediate/short-term/long-term"},
          {"action": "Specific Recommendation 2", "priority": "high/medium/low", "timeframe": "immediate/short-term/long-term"}
        ],
        "metrics": {"key1": value1, "key2": value2, "efficiency_score": number},
        "processingMetadata": {"dataPoints": number, "analysisDepth": "high/medium/low"}
      }`;
    
    const userPrompt = prompt || "Analyze this project data and provide insights and recommendations";
    
    console.log(`Starting project data analysis with prompt: "${userPrompt.substring(0, 50)}..."`);
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `${userPrompt}\nData: ${JSON.stringify(data, null, 2)}` }
      ],
      temperature: 0.5,
      max_tokens: 2500, // Increased for more detailed responses
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI service");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Invalid JSON response received from AI service");
    }
    
    // Calculate and add processing time metrics
    const processingTime = Date.now() - startTime;
    console.log(`Project data analysis completed in ${processingTime}ms`);
    
    // Return enhanced response with metadata
    return {
      ...parsedResponse,
      processingMetadata: {
        ...(parsedResponse.processingMetadata || {}),
        processingTime,
        generatedAt: new Date().toISOString(),
        status: "success",
        model: "gpt-4o"
      }
    };
  } catch (error: any) {
    // Calculate processing time even for errors
    const processingTime = Date.now() - startTime;
    console.error(`Error analyzing project data (${processingTime}ms):`, error);
    
    // Check for specific error types to provide better error messages
    let errorMessage = "Analysis failed due to an unexpected error";
    let errorType = "unknown";
    
    if (error?.status === 401) {
      errorMessage = "Authentication error with the AI service";
      errorType = "auth";
    } else if (error?.status === 429) {
      errorMessage = "The AI service is currently experiencing high demand or has reached its rate limit";
      errorType = "rate_limit";
    } else if (error?.status === 500) {
      errorMessage = "The AI service is experiencing technical difficulties";
      errorType = "server";
    } else if (error.message?.includes("JSON")) {
      errorMessage = "There was a problem formatting the AI response";
      errorType = "format";
    }
    
    // Return a structured error response
    return {
      summary: errorMessage,
      insights: [`Error: ${error.message || "Unknown error"}`],
      recommendations: ["Try again later or contact support if the issue persists"],
      metrics: { error: errorType },
      error: {
        message: error.message || "Unknown error",
        type: errorType,
        processingTime,
        timestamp: new Date().toISOString(),
        status: "error"
      }
    };
  }
}

/**
 * Generate a response to a general AI assistant question
 * @param prompt - The user's prompt/question
 * @param context - Optional additional context
 * @returns A response to the user's question
 */
export async function generateAIAssistantResponse(prompt: string, context?: any): Promise<string> {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing for AI assistant response");
    return "I'm unable to respond right now as the OpenAI API key is missing. Please contact your administrator.";
  }

  const startTime = Date.now();
  
  try {
    // Prepare context for the system message with enhanced formatting
    const contextString = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    
    console.log(`Processing AI assistant request: "${prompt.substring(0, 50)}..."`);

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system" as const, 
          content: `You are an AI assistant for Synergy Rentals, a property management company's operations software.
            You help users with projects, tasks, and property management questions.
            Be concise but thorough in your responses. If you don't know something, say so.
            When suggesting tasks or projects, be specific and actionable.
            
            Current date: ${new Date().toISOString().split('T')[0]}
            ${contextString}`
        },
        { role: "user" as const, content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500, // Increased for more detailed responses
    });

    const processingTime = Date.now() - startTime;
    console.log(`AI assistant response generated in ${processingTime}ms`);
    
    return completion.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`Error generating assistant response (${processingTime}ms):`, error);
    
    // Check for specific error types and provide more informative messages
    if (error?.status === 401) {
      return "Authentication error with the AI service. Please contact your administrator.";
    } else if (error?.status === 429) {
      return "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
    } else if (error?.status === 500) {
      return "The AI service is experiencing technical difficulties. Please try again later.";
    }
    
    return "I encountered an error while processing your request. Please try again later.";
  }
}