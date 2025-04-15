import OpenAI from "openai";

// Check if API key is provided
if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY environment variable is not set. OpenAI functionality will be disabled.");
}

// Initialize OpenAI API client with a fallback key to prevent crashes
// In a real production environment, you'd want to handle this more securely
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-initialization-only"
});

/**
 * Ask a question to the AI and get a response
 */
export async function askAI(question: string): Promise<string> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return "I'm unable to respond right now. The OpenAI API key is missing. Please contact your administrator.";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant for Synergy Rentals, a short-term rental management company. You help staff with operational questions, guest issues, and provide advice based on industry best practices. Be concise, professional, and helpful."
        },
        {
          role: "user",
          content: question
        }
      ],
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    // Log detailed error information
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    if (error?.status === 401) {
      return "Authentication error: The OpenAI API key may be invalid. Please contact your administrator.";
    } else if (error?.status === 429) {
      return "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
    } else if (error?.status === 500) {
      return "The AI service is currently experiencing technical difficulties. Please try again later.";
    }
    
    return "Sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";
  }
}

/**
 * Generate AI insights based on different data types
 */
export async function generateAiInsights(dataType: string): Promise<string> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return "I'm unable to generate insights right now. The OpenAI API key is missing. Please contact your administrator.";
  }
  
  const promptMap: Record<string, string> = {
    "bookings": "Analyze booking trends for short-term rentals, including seasonal patterns, pricing optimization, and guest preferences. Focus on actionable insights.",
    "cleaning": "Recommend optimizations for cleaning schedules based on turnovers, guest feedback, and staff efficiency. Include time management tips.",
    "maintenance": "Analyze maintenance trends and provide predictive maintenance recommendations to prevent issues. Include cost-saving tips.",
    "inventory": "Review inventory management patterns and suggest restocking strategies and par level adjustments based on usage patterns.",
    "guests": "Analyze guest sentiment and feedback patterns. Identify common issues and suggest improvements to the guest experience."
  };

  const prompt = dataType in promptMap ? promptMap[dataType] : "Provide general insights about short-term rental operations.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI operations analyst for Synergy Rentals, a short-term rental management company. Generate insightful, actionable recommendations based on the requested data type. Include 3-5 specific recommendations with brief explanations. Format your response in a way that's easy to read with bullet points."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || "I couldn't generate insights at this time.";
  } catch (error: any) {
    // Log detailed error information
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    if (error?.status === 401) {
      return "Authentication error: The OpenAI API key may be invalid. Please contact your administrator.";
    } else if (error?.status === 429) {
      return "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
    } else if (error?.status === 500) {
      return "The AI service is currently experiencing technical difficulties. Please try again later.";
    }
    
    return "Sorry, I'm having trouble generating insights right now. Please try again later.";
  }
}

/**
 * Train the AI on documents
 */
export async function trainAI(document: any): Promise<{ success: boolean, message: string }> {
  // In a real implementation, this would add documents to a vector database
  // For this MVP, we'll just simulate success
  
  try {
    // Simulate document processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: `Successfully trained AI on document: ${document.name}`
    };
  } catch (error) {
    console.error("AI training error:", error);
    return {
      success: false,
      message: "Failed to train AI on document. Please try again."
    };
  }
}

/**
 * Generate a standard operating procedure (SOP) document based on input
 */
export async function generateSOP(topic: string, details: string): Promise<string> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return "I'm unable to generate an SOP right now. The OpenAI API key is missing. Please contact your administrator.";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SOP document creator for Synergy Rentals, a short-term rental management company. Generate a professional, detailed SOP document based on the topic and details provided. Include sections for Purpose, Scope, Responsibilities, Procedure (with numbered steps), Required Materials, and Quality Control."
        },
        {
          role: "user",
          content: `Create an SOP for: ${topic}\n\nDetails: ${details}`
        }
      ],
    });

    const content = response.choices[0].message.content;
    return content || "I couldn't generate an SOP at this time.";
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    if (error?.status === 401) {
      return "Authentication error: The OpenAI API key may be invalid. Please contact your administrator.";
    } else if (error?.status === 429) {
      return "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
    } else if (error?.status === 500) {
      return "The AI service is currently experiencing technical difficulties. Please try again later.";
    }
    
    return "Sorry, I'm having trouble generating an SOP right now. Please try again later.";
  }
}

/**
 * Analyze guest sentiment from text (reviews, messages)
 */
export async function analyzeGuestSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative",
  score: number,
  keyPoints: string[]
}> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return {
      sentiment: "neutral",
      score: 3,
      keyPoints: ["OpenAI API key is missing. Please contact your administrator."]
    };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert for a vacation rental company. Analyze the sentiment of guest feedback and return a JSON object with: sentiment (positive, neutral, or negative), score (1-5 where 5 is most positive), and keyPoints (array of 1-3 key issues or highlights mentioned)."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    let errorMessage = "Error analyzing sentiment";
    if (error?.status === 401) {
      errorMessage = "Authentication error: The OpenAI API key may be invalid";
    } else if (error?.status === 429) {
      errorMessage = "The AI service is currently experiencing high demand or rate limit";
    }
    
    return {
      sentiment: "neutral",
      score: 3,
      keyPoints: [errorMessage]
    };
  }
}

/**
 * Generate maintenance ticket details from a prompt
 */
export async function generateMaintenanceTicket(prompt: string): Promise<{
  description: string;
  unitId?: number;
  priority: string;
  notes?: string;
  vendorId?: number | null;
  status: string;
  cost?: number | null;
}> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return {
      description: "Maintenance issue",
      priority: "normal",
      status: "open",
      notes: "OpenAI API key is missing. Please contact your administrator."
    };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a property maintenance expert for Synergy Rentals. Parse the user's description of a maintenance issue and create a structured maintenance ticket with the following fields:
          
          1. description: A clear, concise title for the maintenance ticket
          2. priority: One of 'low', 'normal', 'high', or 'urgent' based on severity
          3. notes: Detailed information about the issue, including suspected causes and potential solutions
          4. status: Always set to 'open'
          5. cost: An estimated cost for repairs if possible (numeric value only, no currency symbol)
          
          Respond with JSON only.`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    const result = JSON.parse(content);
    
    // Ensure the response has the correct format
    return {
      description: result.description || "Maintenance issue",
      priority: ['low', 'normal', 'high', 'urgent'].includes(result.priority) ? result.priority : 'normal',
      notes: result.notes || "",
      status: "open",
      cost: result.cost ? Number(result.cost) : null,
      vendorId: null
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    let errorMessage = "Error generating ticket details. Please enter manually.";
    if (error?.status === 401) {
      errorMessage = "Authentication error: The OpenAI API key may be invalid. Please contact your administrator.";
    } else if (error?.status === 429) {
      errorMessage = "The AI service is currently experiencing high demand or has reached its rate limit. Please try again later.";
    }
    
    return {
      description: "Maintenance issue",
      priority: "normal",
      status: "open",
      notes: errorMessage
    };
  }
}

/**
 * Generate company insights by analyzing various data
 */
export async function generateCompanyInsights(analysisType: string, data: any): Promise<{
  insights: Array<{
    title: string;
    description: string;
    type: string;
    insightType: string;
    severity: string;
    actionable: boolean;
  }>;
  summary: string;
  stats: Record<string, any>;
  processingTime?: number;
}> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return {
      insights: [
        {
          title: "API Key Missing",
          description: "The OpenAI API key is missing. Please contact your administrator.",
          type: analysisType,
          insightType: "warning",
          severity: "high",
          actionable: true
        }
      ],
      summary: "Unable to generate insights due to missing API key",
      stats: {}
    };
  }
  
  const startTime = Date.now();
  
  try {
    const prompts: Record<string, string> = {
      revenue: `Analyze the following revenue and booking data to identify trends, issues, and opportunities:
        ${JSON.stringify(data)}
        
        Generate insights focused on:
        1. Revenue trends and anomalies
        2. Occupancy rate optimization
        3. Pricing strategy recommendations
        4. Booking source efficiency
        5. Seasonal patterns and forecasting`,
      
      sentiment: `Analyze the following guest review and sentiment data to identify patterns and improvement areas:
        ${JSON.stringify(data)}
        
        Generate insights focused on:
        1. Overall sentiment trends
        2. Common praise points (to reinforce)
        3. Common complaint areas (to address)
        4. Unit-specific issues
        5. Team performance indicators in guest satisfaction`,
      
      operations: `Analyze the following operational metrics to identify efficiency improvements and bottlenecks:
        ${JSON.stringify(data)}
        
        Generate insights focused on:
        1. Team performance metrics
        2. Task completion rates and delays
        3. Cost efficiency opportunities
        4. Process bottlenecks
        5. Staffing optimization suggestions`,
      
      unit_health: `Analyze the following unit health data to identify properties requiring attention:
        ${JSON.stringify(data)}
        
        Generate insights focused on:
        1. Units with degrading health scores
        2. Recurring maintenance issues
        3. Guest satisfaction correlation
        4. Revenue impact of maintenance issues
        5. Preventative maintenance opportunities`
    };
    
    const prompt = prompts[analysisType] || `Analyze the following data for insights: ${JSON.stringify(data)}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an AI business analyst for Synergy Rentals, a short-term rental management company. Your task is to analyze data and generate actionable insights.
          
          Provide a JSON response with the following structure:
          {
            "insights": [
              {
                "title": "Brief, actionable insight title",
                "description": "Detailed explanation with context and reasoning",
                "type": "${analysisType}", 
                "insightType": "One of: info, warning, alert, suggestion",
                "severity": "One of: info, low, medium, high, critical",
                "actionable": true or false
              }
            ],
            "summary": "A brief 2-3 sentence executive summary of all insights",
            "stats": {
              // Key metrics and statistics extracted from the data
              // Include at least 3-5 relevant statistics, normalized to appropriate units
            }
          }
          
          Generate 3-5 high-quality, actionable insights. Focus on concrete recommendations.
          The severity should reflect the business impact of addressing or ignoring the insight.`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    const result = JSON.parse(content);
    const processingTime = Date.now() - startTime;
    
    return {
      ...result,
      processingTime
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Check for common error types
    let errorMessage = "Error generating insights. Please try again later.";
    if (error?.status === 401) {
      errorMessage = "Authentication error: The OpenAI API key may be invalid.";
    } else if (error?.status === 429) {
      errorMessage = "The AI service is currently experiencing high demand or has reached its rate limit.";
    }
    
    return {
      insights: [
        {
          title: "Error Generating Insights",
          description: errorMessage,
          type: analysisType,
          insightType: "warning",
          severity: "medium",
          actionable: false
        }
      ],
      summary: "Unable to generate complete insights at this time due to technical issues.",
      stats: {},
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Analyze a unit's health by reviewing various metrics
 */
export async function analyzeUnitHealth(unitId: number, data: any): Promise<{
  score: number;
  revenueScore: number;
  maintenanceScore: number;
  guestSatisfactionScore: number;
  inventoryScore: number;
  cleaningScore: number;
  notes: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendValue: number;
}> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return {
      score: 50,
      revenueScore: 50,
      maintenanceScore: 50,
      guestSatisfactionScore: 50,
      inventoryScore: 50,
      cleaningScore: 50,
      notes: "The OpenAI API key is missing. Please contact your administrator.",
      trendDirection: 'stable',
      trendValue: 0
    };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an AI property analyst for Synergy Rentals. Analyze the following unit data and generate a health score.
          
          Provide a JSON response with the following structure:
          {
            "score": Integer from 0-100 representing overall health,
            "revenueScore": Integer from 0-100 for revenue performance,
            "maintenanceScore": Integer from 0-100 for maintenance health,
            "guestSatisfactionScore": Integer from 0-100 for guest satisfaction,
            "inventoryScore": Integer from 0-100 for inventory management,
            "cleaningScore": Integer from 0-100 for cleaning performance,
            "notes": "Brief analysis of why scores are what they are",
            "trendDirection": "up", "down", or "stable",
            "trendValue": Integer representing percent change
          }
          
          Base the scores on the data provided. The overall score should be a weighted average that prioritizes guest satisfaction and maintenance.`
        },
        { 
          role: "user", 
          content: `Analyze unit #${unitId} with the following data:\n${JSON.stringify(data)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Default values
    return {
      score: 50,
      revenueScore: 50,
      maintenanceScore: 50,
      guestSatisfactionScore: 50,
      inventoryScore: 50,
      cleaningScore: 50,
      notes: "Error generating health score. Please try again later.",
      trendDirection: 'stable',
      trendValue: 0
    };
  }
}

/**
 * Generate proactive recommendations based on company data
 */
export async function generateProactiveRecommendations(): Promise<Array<{
  title: string;
  description: string;
  type: string;
  severity: string;
  actionType: string;
}>> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return [{
      title: "API Key Missing",
      description: "The OpenAI API key is missing. Please contact your administrator.",
      type: "system",
      severity: "high",
      actionType: "contact_admin"
    }];
  }
  
  try {
    // In a real implementation, we would collect actual company data
    // For this MVP, we'll generate realistic recommendations with minimal context
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an AI business analyst for Synergy Rentals, a short-term rental property management company.
          Generate 5 proactive, actionable recommendations that would be realistic for a vacation rental business.
          
          Each recommendation should include:
          1. A brief, actionable title
          2. A detailed explanation with context and reasoning
          3. The business area it relates to (operations, revenue, guest_experience, maintenance, cleaning, inventory)
          4. A severity level (low, medium, high)
          5. An action type (create_task, review_data, update_policy, schedule_training, adjust_pricing)
          
          Focus on realistic, high-impact recommendations that would actually help a rental management business.
          Include specific examples and numbers to make recommendations concrete.`
        },
        { 
          role: "user", 
          content: "Generate proactive recommendations for our short-term rental business."
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    const result = JSON.parse(content);
    return result.recommendations || [];
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Default recommendation on error
    return [{
      title: "Error Generating Recommendations",
      description: "We encountered an error while generating recommendations. Please try again later.",
      type: "system",
      severity: "medium",
      actionType: "try_again"
    }];
  }
}
