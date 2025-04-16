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
    console.log('Processing HostAI webhook with raw data:', JSON.stringify(webhookData, null, 2));
    
    // Super flexible validation - accept ANY data from HostAI
    // We'll try to extract as much data as possible from whatever format they send
    if (!webhookData) {
      return { 
        success: false, 
        message: 'Empty webhook payload received. Please provide some data.' 
      };
    }
    
    // Extract the most critical field - the description - from wherever we can find it
    let description = '';
    
    if (typeof webhookData === 'string') {
      // If they just sent a string, use it as the description
      description = webhookData;
    } else if (typeof webhookData === 'object') {
      // Try to find a description from various possible locations
      if (webhookData.task?.description) {
        description = webhookData.task.description;
      } else if (webhookData.description) {
        description = webhookData.description;
      } else if (webhookData.message) {
        description = webhookData.message;
      } else if (webhookData.text) {
        description = webhookData.text;
      } else if (webhookData.content) {
        description = webhookData.content;
      } else if (webhookData.data?.description) {
        description = webhookData.data.description;
      } else {
        // If we still don't have a description, create one from the webhook data
        description = `HostAI task received at ${new Date().toISOString()}`;
      }
    }
    
    // Extract all possible fields, with very flexible mapping
    let task: any = webhookData.task || {};
    let source: any = webhookData.source || {};
    let attachments: any = webhookData.attachments || [];
    let guest: any = webhookData.guest || {};
    let listing: any = webhookData.listing || {};
    
    // If the fields might be directly in the root
    if (!webhookData.task && typeof webhookData === 'object') {
      // Try to extract task-related data from the root
      task = {
        description: description,
        action: webhookData.action || webhookData.actionType || webhookData.type || 'unknown',
        assignee: webhookData.assignee || {}
      };
      
      // Extract source-related data
      source = {
        sourceType: webhookData.sourceType || webhookData.source || 'HostAI',
        link: webhookData.link || webhookData.url || webhookData.sourceLink || null
      };
      
      // Extract guest-related data
      guest = {
        guestName: webhookData.guestName || webhookData.guest || null,
        guestEmail: webhookData.guestEmail || webhookData.email || null,
        guestPhone: webhookData.guestPhone || webhookData.phone || null
      };
      
      // Extract listing-related data
      listing = {
        listingName: webhookData.listingName || webhookData.propertyName || webhookData.property || null,
        listingId: webhookData.listingId || webhookData.propertyId || null
      };
      
      // Extract attachments if they might be in a different format
      if (webhookData.attachment) {
        attachments = [webhookData.attachment];
      } else if (webhookData.files) {
        attachments = webhookData.files;
      } else if (webhookData.images) {
        attachments = webhookData.images;
      }
    }
    
    // Get creation date or default to now
    const creationDate = webhookData._creationDate ? 
      new Date(webhookData._creationDate) : 
      webhookData.createdAt ? 
        new Date(webhookData.createdAt) : 
        webhookData.created ? 
          new Date(webhookData.created) : 
          new Date();
    
    // Log what we extracted for debugging
    console.log('Extracted HostAI webhook data:', { 
      task,
      description,
      source, 
      attachments: Array.isArray(attachments) ? `${attachments.length} attachments` : 'No attachments',
      guest, 
      listing, 
      creationDate 
    });
    
    // Convert attachments to proper format if needed
    let attachmentsJson = attachments;
    
    // If attachments is just a URL string, convert to proper format
    if (typeof attachments === 'string') {
      attachmentsJson = [{ url: attachments }];
    } else if (Array.isArray(attachments)) {
      // Make sure all attachments have a url property
      attachmentsJson = attachments.map(attachment => {
        if (typeof attachment === 'string') {
          return { url: attachment };
        } else if (attachment && typeof attachment === 'object') {
          // If it already has a url property, use it
          if (attachment.url) {
            return attachment;
          } else if (attachment.link) {
            return { ...attachment, url: attachment.link };
          } else if (attachment.path) {
            return { ...attachment, url: attachment.path };
          }
        }
        return attachment;
      });
    }
    
    // Get assignee data
    const assignee = task.assignee || {};
    
    // Create a new HostAI task
    const newTask = await storage.createHostAiTask({
      status: 'new',
      description: description || 'No description provided',
      hostAiAction: task.action || null,
      hostAiAssigneeFirstName: assignee.firstName || assignee.first_name || null,
      hostAiAssigneeLastName: assignee.lastName || assignee.last_name || null,
      sourceType: source.sourceType || null,
      sourceLink: source.link || null,
      attachmentsJson: attachmentsJson || null,
      guestName: guest.guestName || guest.name || null,
      guestEmail: guest.guestEmail || guest.email || null,
      guestPhone: guest.guestPhone || guest.phone || null,
      listingName: listing.listingName || listing.name || null,
      listingId: listing.listingId || listing.id || null,
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