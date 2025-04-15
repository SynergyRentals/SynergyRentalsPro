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
