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
  try {
    // Set up system message based on whether we have project context
    const systemMessage = request.projectContext 
      ? `You are an AI project planning assistant for a property management company. 
         You help create and optimize project plans, tasks, and milestones.
         Current project context: ${JSON.stringify(request.projectContext)}`
      : `You are an AI project planning assistant for a property management company.
         You help create and optimize project plans, tasks, and milestones.`;

    // Build messages for the API call
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

    // Call OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    // Parse the response content
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI service");
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(content);
    
    // Return response in our standard format
    return {
      response: parsedResponse.response || parsedResponse.message || "I've analyzed your request and prepared a plan.",
      suggestedTasks: parsedResponse.tasks || parsedResponse.suggestedTasks,
      suggestedMilestones: parsedResponse.milestones || parsedResponse.suggestedMilestones,
      suggestedDeadline: parsedResponse.deadline || parsedResponse.suggestedDeadline,
      suggestedTitle: parsedResponse.title || parsedResponse.suggestedTitle,
      rawResponse: parsedResponse
    };
  } catch (error: any) {
    console.error("Error generating AI plan:", error);
    return {
      response: "I'm sorry, I encountered an error while generating your plan. Please try again.",
      error: error.message || "Unknown error"
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
  try {
    const systemPrompt = `You are an AI analyst for a property management company. 
      Analyze the provided data and generate insights.
      Focus on identifying patterns, bottlenecks, and opportunities for improvement.
      Provide your response as a JSON object with the following structure:
      {
        "summary": "A brief summary of the analysis",
        "insights": ["Insight 1", "Insight 2", ...],
        "recommendations": ["Recommendation 1", "Recommendation 2", ...],
        "metrics": {"key1": value1, "key2": value2, ...}
      }`;
    
    const userPrompt = prompt || "Analyze this project data and provide insights and recommendations";
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `${userPrompt}\nData: ${JSON.stringify(data)}` }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI service");
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error("Error analyzing project data:", error);
    return {
      summary: "Analysis failed due to an error",
      error: error.message || "Unknown error"
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
  try {
    // Prepare context for the system message
    const contextString = context ? `\nContext: ${JSON.stringify(context)}` : '';

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system" as const, 
          content: `You are an AI assistant for a property management company's operations software.
            You help users with projects, tasks, and property management questions.
            Be concise but thorough in your responses. If you don't know something, say so.
            When suggesting tasks or projects, be specific and actionable.${contextString}`
        },
        { role: "user" as const, content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error: any) {
    console.error("Error generating assistant response:", error);
    return "I encountered an error while processing your request. Please try again later.";
  }
}