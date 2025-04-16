/**
 * Process webhook events from HostAI
 */
import { db } from '../db';
import { hostAiTasks } from '../../shared/schema';
import { storage } from '../storage';

/**
 * Process a HostAI webhook
 * @param webhookData - The webhook payload
 * @returns Result of processing
 */
export async function processHostAiWebhook(webhookData: any): Promise<{ success: boolean; message: string; taskId?: number }> {
  try {
    console.log('Processing HostAI webhook:', JSON.stringify(webhookData, null, 2));
    
    // More flexible validation to ensure we can process HostAI webhooks
    // We'll check for task.description or task, and try to extract as much data as possible
    const hasValidTask = webhookData && 
      (webhookData.task || 
      (typeof webhookData === 'object' && 'description' in webhookData));
    
    if (!hasValidTask) {
      return { 
        success: false, 
        message: 'Invalid webhook payload structure: missing task data. Please ensure payload contains a task object with description.' 
      };
    }
    
    // If the main data is at the root level instead of under 'task', restructure it
    let task, source, attachments, guest, listing, creationDate;
    
    if (webhookData.task) {
      // Standard format with task object
      task = webhookData.task;
      source = webhookData.source;
      attachments = webhookData.attachments;
      guest = webhookData.guest;
      listing = webhookData.listing;
      creationDate = webhookData._creationDate ? new Date(webhookData._creationDate) : new Date();
    } else {
      // Alternative format where task data might be at the root
      task = {
        description: webhookData.description || 'No description provided',
        action: webhookData.action,
        assignee: webhookData.assignee
      };
      source = webhookData.source;
      attachments = webhookData.attachments;
      guest = webhookData.guest;
      listing = webhookData.listing;
      creationDate = webhookData._creationDate ? new Date(webhookData._creationDate) : new Date();
    }
    
    // Log what we extracted for debugging
    console.log('Extracted HostAI webhook data:', { 
      task, source, attachments: Array.isArray(attachments) ? `${attachments.length} attachments` : 'No attachments',
      guest, listing, creationDate 
    });
    
    // Convert attachments to proper format if needed
    let attachmentsJson = attachments;
    
    // If attachments is just a URL string, convert to proper format
    if (typeof attachments === 'string') {
      attachmentsJson = [{ url: attachments }];
    }
    
    // Create a new HostAI task
    const newTask = await storage.createHostAiTask({
      status: 'new',
      description: task.description || 'No description provided',
      hostAiAction: task.action || null,
      hostAiAssigneeFirstName: task.assignee?.firstName || null,
      hostAiAssigneeLastName: task.assignee?.lastName || null,
      sourceType: source?.sourceType || null,
      sourceLink: source?.link || null,
      attachmentsJson: attachmentsJson || null,
      guestName: guest?.guestName || null,
      guestEmail: guest?.guestEmail || null,
      guestPhone: guest?.guestPhone || null,
      listingName: listing?.listingName || null,
      listingId: listing?.listingId || null,
      assignedToUserId: null, // Will be assigned by a team member later
      hostAiCreatedAt: creationDate
    });
    
    console.log(`HostAI task created successfully with ID: ${newTask.id}`);
    
    return { 
      success: true, 
      message: `HostAI task created successfully with ID: ${newTask.id}`,
      taskId: newTask.id
    };
  } catch (error) {
    console.error('Error processing HostAI webhook:', error);
    return { 
      success: false, 
      message: `Error processing HostAI webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}