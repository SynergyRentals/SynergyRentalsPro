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
    
    if (!webhookData || !webhookData.task) {
      return { success: false, message: 'Invalid webhook payload structure: missing task data' };
    }
    
    // Extract data from the webhook payload
    const { task, source, attachments, guest, listing } = webhookData;
    const creationDate = webhookData._creationDate ? new Date(webhookData._creationDate) : new Date();
    
    // Create a new HostAI task
    const newTask = await storage.createHostAiTask({
      status: 'new',
      description: task.description || 'No description provided',
      hostAiAction: task.action || null,
      hostAiAssigneeFirstName: task.assignee?.firstName || null,
      hostAiAssigneeLastName: task.assignee?.lastName || null,
      sourceType: source?.sourceType || null,
      sourceLink: source?.link || null,
      attachmentsJson: attachments || null,
      guestName: guest?.guestName || null,
      guestEmail: guest?.guestEmail || null,
      guestPhone: guest?.guestPhone || null,
      listingName: listing?.listingName || null,
      listingId: listing?.listingId || null,
      assignedToUserId: null, // Will be assigned by a team member later
      hostAiCreatedAt: creationDate
    });
    
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