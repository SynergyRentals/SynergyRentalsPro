/**
 * Utility functions for webhook handling
 */
import crypto from 'crypto';

/**
 * Generate a Guesty webhook signature for testing
 * @param payload The webhook payload as an object
 * @param secret The webhook secret to use for signing
 * @returns The HMAC-SHA256 signature
 */
export function generateWebhookSignature(payload: any, secret: string): string {
  // Convert payload to JSON string if it's an object
  const jsonPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Generate HMAC signature
  return crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(jsonPayload))
    .digest('hex');
}

/**
 * Extract webhook details from a Guesty webhook payload
 * @param webhook The webhook payload from Guesty
 * @returns Extracted event details
 */
export function extractWebhookDetails(webhook: any): {
  eventType: string;
  entityType: string;
  entityId: string;
  data: any;
} {
  // Get the event type from the webhook event field
  // Format is typically entityType.eventAction (e.g., listing.created, reservation.updated)
  const [entityType, eventAction] = (webhook.event || '').split('.');
  const eventType = eventAction || 'unknown';
  
  // Get the entity ID from the data field
  const entityId = (webhook.data && webhook.data._id) || '';
  
  return {
    eventType,
    entityType,
    entityId,
    data: webhook.data || {}
  };
}

/**
 * Generate a full webhook test payload
 * @param entityType Type of entity (property, reservation)
 * @param eventType Type of event (created, updated, deleted, cancelled)
 * @param data Custom data to include
 * @returns A complete webhook payload
 */
export function generateTestWebhookPayload(
  entityType: 'listing' | 'reservation', 
  eventType: 'created' | 'updated' | 'deleted' | 'cancelled',
  data: any = {}
): any {
  // Create a unique event ID
  const eventId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Generate the event string (e.g., "listing.created")
  const eventString = `${entityType}.${eventType}`;
  
  // Ensure data has an _id field
  const mergedData = {
    _id: `test-${entityType}-${Date.now()}`,
    ...data
  };
  
  // Return the complete webhook payload
  return {
    eventId,
    event: eventString,
    data: mergedData
  };
}