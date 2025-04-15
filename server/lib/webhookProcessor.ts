/**
 * Process webhook events from Guesty
 */
import { db } from '../db';
import { guestyWebhookEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  processPropertyWebhook, 
  processReservationWebhook,
  processPropertyDeletionWebhook,
  processReservationDeletionWebhook 
} from './guestyWebhookHandler';

/**
 * Log a webhook event to the database
 * @param eventType - Type of event (created, updated, deleted)
 * @param entityType - Type of entity (property, reservation)
 * @param entityId - ID of the entity
 * @param eventData - The full event data payload
 * @param signature - The signature from the request
 * @param ipAddress - IP address of the sender
 * @returns The ID of the created event log
 */
export async function logWebhookEvent(
  eventType: string,
  entityType: string,
  entityId: string,
  eventData: any,
  signature: string,
  ipAddress: string
): Promise<number> {
  try {
    // Insert the webhook event into the database
    const result = await db.insert(guestyWebhookEvents).values({
      eventType: eventType,
      entityType: entityType,
      entityId: entityId,
      eventData: eventData,
      signature: signature,
      ipAddress: ipAddress,
      createdAt: new Date(),
      processed: false
    }).returning({ id: guestyWebhookEvents.id });

    return result[0].id;
  } catch (error) {
    console.error('Error logging webhook event:', error);
    throw error;
  }
}

/**
 * Process a webhook event
 * @param eventId - ID of the event to process
 * @returns Result of processing
 */
export async function processWebhookEvent(eventId: number): Promise<{ success: boolean; message: string }> {
  try {
    // Get the event from the database
    const events = await db.select()
      .from(guestyWebhookEvents)
      .where(eq(guestyWebhookEvents.id, eventId))
      .limit(1);

    if (events.length === 0) {
      return { success: false, message: `Event ID ${eventId} not found` };
    }

    const event = events[0];
    const entityType = event.entityType;
    const eventType = event.eventType;
    const entityId = event.entityId;
    const eventData = event.eventData;

    let processingResult: { success: boolean; message: string };

    // Process based on entity type and event type
    if (entityType === 'property') {
      if (eventType === 'deleted') {
        processingResult = await processPropertyDeletionWebhook(entityId);
      } else {
        // created or updated
        processingResult = await processPropertyWebhook(eventData);
      }
    } else if (entityType === 'reservation') {
      if (eventType === 'deleted') {
        processingResult = await processReservationDeletionWebhook(entityId);
      } else {
        // created or updated
        processingResult = await processReservationWebhook(eventData);
      }
    } else {
      processingResult = { 
        success: false, 
        message: `Unknown entity type: ${entityType}` 
      };
    }

    // Update the event with processing results
    await db.update(guestyWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        processingErrors: !processingResult.success ? processingResult.message : null
      })
      .where(eq(guestyWebhookEvents.id, eventId));

    return processingResult;
  } catch (error) {
    console.error(`Error processing webhook event ${eventId}:`, error);
    
    // Update the event with processing error
    await db.update(guestyWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        processingErrors: error instanceof Error ? error.message : 'Unknown error'
      })
      .where(eq(guestyWebhookEvents.id, eventId));

    return { 
      success: false, 
      message: `Error processing webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extract Guesty entity details from webhook payload
 * @param payload - The webhook payload
 * @returns Object with event type, entity type, entity ID, and data
 */
export function extractWebhookDetails(payload: any): { 
  eventType: string;
  entityType: string;
  entityId: string;
  data: any;
} {
  // Default values
  let eventType = 'unknown';
  let entityType = 'unknown';
  let entityId = '';
  let data = null;

  try {
    // Extract event type (created, updated, deleted)
    if (payload.event) {
      // Convert event string like "reservation.created" to "created"
      const eventParts = payload.event.split('.');
      eventType = eventParts[eventParts.length - 1];
    }

    // Extract entity type (property, reservation)
    if (payload.event && payload.event.includes('.')) {
      // Convert event string like "reservation.created" to "reservation"
      entityType = payload.event.split('.')[0];
    }

    // Extract entity ID and data
    if (payload.data) {
      if (payload.data.id) {
        entityId = payload.data.id;
      } else if (payload.data._id) {
        entityId = payload.data._id;
      }
      
      data = payload.data;
    }

    return { eventType, entityType, entityId, data };
  } catch (error) {
    console.error('Error extracting webhook details:', error);
    return { eventType, entityType, entityId, data };
  }
}