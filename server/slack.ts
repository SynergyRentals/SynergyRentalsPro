import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";
import type { ConversationsHistoryResponse } from "@slack/web-api/dist/response/ConversationsHistoryResponse";

// Validate environment variables
function initializeSlack() {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.warn("WARNING: SLACK_BOT_TOKEN environment variable is not set. Slack functionality will be disabled.");
    return null;
  }

  if (!process.env.SLACK_CHANNEL_ID) {
    console.warn("WARNING: SLACK_CHANNEL_ID environment variable is not set. Default channel notifications will be disabled.");
  }
  
  return new WebClient(process.env.SLACK_BOT_TOKEN);
}

// Initialize Slack client
const slack = initializeSlack();

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
    if (!slack) {
      console.log("[MOCK] Would send Slack message:", message);
      return undefined;
    }
    
    // Use default channel if none provided
    if (!message.channel && process.env.SLACK_CHANNEL_ID) {
      message.channel = process.env.SLACK_CHANNEL_ID;
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

/**
 * Send a notification about a new maintenance request
 */
export async function sendMaintenanceNotification(maintenance: {
  id: number;
  unitId: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedBy: string;
}): Promise<string | undefined> {
  // Don't attempt to send if no token is configured
  if (!slack) {
    console.log("[MOCK] Would send maintenance notification:", maintenance);
    return undefined;
  }
  
  const priorityColor = 
    maintenance.priority === 'urgent' ? '#FF0000' :
    maintenance.priority === 'high' ? '#FFA500' :
    maintenance.priority === 'medium' ? '#FFFF00' : '#00FF00';
  
  return sendSlackMessage({
    text: `🛠️ New Maintenance Request: ${maintenance.title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🛠️ New Maintenance Request #${maintenance.id}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Title:*\n${maintenance.title}`
          },
          {
            type: "mrkdwn",
            text: `*Priority:*\n${maintenance.priority.toUpperCase()}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Unit:*\n${maintenance.unitId}`
          },
          {
            type: "mrkdwn",
            text: `*Reported By:*\n${maintenance.reportedBy}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Description:*\n${maintenance.description}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Status: ${maintenance.status} | Created: ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Details",
              emoji: true
            },
            url: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/maintenance?id=${maintenance.id}`,
            style: "primary"
          }
        ]
      }
    ]
  });
}

/**
 * Send a notification about low inventory
 */
export async function sendInventoryAlert(inventory: {
  id: number;
  name: string;
  category: string;
  currentQuantity: number;
  reorderThreshold: number;
  unitId?: number;
  location: string;
}): Promise<string | undefined> {
  // Don't attempt to send if no token is configured
  if (!slack) {
    console.log("[MOCK] Would send inventory alert:", inventory);
    return undefined;
  }
  
  return sendSlackMessage({
    text: `📉 Low Inventory Alert: ${inventory.name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📉 Low Inventory Alert`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Item:*\n${inventory.name}`
          },
          {
            type: "mrkdwn",
            text: `*Category:*\n${inventory.category}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Current Quantity:*\n${inventory.currentQuantity}`
          },
          {
            type: "mrkdwn",
            text: `*Reorder Threshold:*\n${inventory.reorderThreshold}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Location:*\n${inventory.location}`
          },
          {
            type: "mrkdwn",
            text: `*Unit:*\n${inventory.unitId || 'Central Storage'}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Alert Time: ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Inventory",
              emoji: true
            },
            url: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/inventory`,
            style: "primary"
          }
        ]
      }
    ]
  });
}

/**
 * Send a notification about a new guest check-in
 */
export async function sendGuestCheckInNotification(guest: {
  id: number;
  name: string;
  phone: string;
  email: string;
  unitId: number;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
}): Promise<string | undefined> {
  // Don't attempt to send if no token is configured
  if (!slack) {
    console.log("[MOCK] Would send guest check-in notification:", guest);
    return undefined;
  }
  
  return sendSlackMessage({
    text: `🏨 New Guest Check-In: ${guest.name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🏨 New Guest Check-In`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Guest:*\n${guest.name}`
          },
          {
            type: "mrkdwn",
            text: `*Unit:*\n${guest.unitId}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Check-In:*\n${new Date(guest.checkIn).toLocaleDateString()}`
          },
          {
            type: "mrkdwn",
            text: `*Check-Out:*\n${new Date(guest.checkOut).toLocaleDateString()}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Email:*\n${guest.email}`
          },
          {
            type: "mrkdwn",
            text: `*Phone:*\n${guest.phone}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Guest Count: ${guest.guestCount} | Notification Time: ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Guest Details",
              emoji: true
            },
            url: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/guests?id=${guest.id}`,
            style: "primary"
          }
        ]
      }
    ]
  });
}

/**
 * Reads the history of a channel
 * @param channel_id - Channel ID to read message history from
 * @returns Promise resolving to the messages
 */
export async function readSlackHistory(
  channel_id: string = process.env.SLACK_CHANNEL_ID!,
  messageLimit: number = 100,
): Promise<ConversationsHistoryResponse> {
  try {
    // Don't attempt to retrieve if no token is configured
    if (!slack) {
      console.log(`[MOCK] Would read message history from channel: ${channel_id}`);
      return { ok: false, error: "SLACK_BOT_TOKEN not configured" };
    }
    
    // Get messages
    return await slack.conversations.history({
      channel: channel_id,
      limit: messageLimit,
    });
  } catch (error) {
    console.error('Error reading Slack history:', error);
    throw error;
  }
}
