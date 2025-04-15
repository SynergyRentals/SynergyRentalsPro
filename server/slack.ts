import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";

// Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * 
 * @param message - Structured message to send
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  try {
    // Don't attempt to send if no token is configured
    if (!process.env.SLACK_BOT_TOKEN) {
      console.log("[MOCK] Would send Slack message:", message);
      return undefined;
    }
    
    // Send the message
    const response = await slack.chat.postMessage(message);
    
    // Return the timestamp of the sent message
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}
