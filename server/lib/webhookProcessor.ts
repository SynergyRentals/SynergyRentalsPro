import { db } from '../db';
import { 
  guestyWebhookEvents, 
  InsertGuestyWebhookEvent 
} from '@shared/schema';
import { 
  processPropertyWebhook, 
  processReservationWebhook,
  processPropertyDeletionWebhook,
  processReservationDeletionWebhook
} from './guestyWebhookHandler';
import { eq } from 'drizzle-orm';

/**
 * Process a webhook event based on entity type and action
 * @param webhookId - ID of the webhook event
 * @param entityType - Type of entity (property, reservation)
 * @param action - Action (created, updated, deleted)
 * @param data - Entity data payload
 * @returns Processing result
 */
export async function processWebhook(
  webhookId: number,
  entityType: string,
  action: string,
  data: any
): Promise<{ success: boolean; message: string }> {
  try {
    let result: { success: boolean; message: string };
    
    // Process based on entity type and action
    if (entityType === 'property') {
      if (action === 'deleted') {
        result = await processPropertyDeletionWebhook(data.id);
      } else {
        // created, updated
        result = await processPropertyWebhook(data);
      }
    } else if (entityType === 'reservation') {
      if (action === 'deleted') {
        result = await processReservationDeletionWebhook(data.id);
      } else {
        // created, updated
        result = await processReservationWebhook(data);
      }
    } else {
      result = {
        success: false,
        message: `Unsupported entity type: ${entityType}`
      };
    }
    
    // Update the webhook event with processing result
    await db.update(guestyWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        processingErrors: !result.success ? result.message : null
      })
      .where(eq(guestyWebhookEvents.id, webhookId));
    
    return result;
  } catch (error) {
    console.error(`Error processing webhook event ${webhookId}:`, error);
    
    // Update the webhook event with error information
    await db.update(guestyWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        processingErrors: error instanceof Error ? error.message : 'Unknown error'
      })
      .where(eq(guestyWebhookEvents.id, webhookId));
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during webhook processing'
    };
  }
}

/**
 * Process a webhook event asynchronously (fire and forget)
 * @param webhookId - ID of the webhook event
 * @param entityType - Type of entity (property, reservation)
 * @param action - Action (created, updated, deleted)
 * @param data - Entity data payload
 */
export function processWebhookAsync(
  webhookId: number,
  entityType: string,
  action: string,
  data: any
): void {
  // Launch processing in the background without awaiting completion
  processWebhook(webhookId, entityType, action, data)
    .catch(error => {
      console.error(`Asynchronous webhook processing error for event ${webhookId}:`, error);
    });
}