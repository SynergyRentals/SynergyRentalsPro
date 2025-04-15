import crypto from 'crypto';
import { Request, Response } from 'express';
import { db } from '../db';
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog 
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// This constant should be set as an environment variable in production
const GUESTY_WEBHOOK_SECRET = process.env.GUESTY_WEBHOOK_SECRET || '';

/**
 * Verify the signature from Guesty webhooks to ensure authenticity
 * @param req - Express request object containing the signature and body
 * @returns boolean indicating if the signature is valid
 */
export function verifyGuestySignature(req: Request): boolean {
  if (!GUESTY_WEBHOOK_SECRET) {
    console.warn('GUESTY_WEBHOOK_SECRET not set. Webhook signature verification disabled!');
    return true; // For development only - in production, return false if secret is not set
  }

  const signature = req.header('X-Guesty-Signature-V2');
  if (!signature) {
    console.error('Missing X-Guesty-Signature-V2 header');
    return false;
  }

  // Get raw body from the request
  const rawBody = JSON.stringify(req.body);
  if (!rawBody) {
    console.error('Empty request body');
    return false;
  }

  // Compute HMAC using SHA256
  const hmac = crypto.createHmac('sha256', GUESTY_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const computedSignature = hmac.digest('hex');

  // Time-constant comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

/**
 * Create a sync log entry for a webhook event
 * @param eventType - Type of event (property or reservation)
 * @param status - Success or error status
 * @param details - Additional details for the log
 */
async function createWebhookSyncLog(
  eventType: 'property' | 'reservation',
  status: 'success' | 'error',
  details: {
    entityId?: string;
    errorMessage?: string;
    action?: string;
  }
): Promise<void> {
  const syncLog: InsertGuestySyncLog = {
    syncType: `webhook_${eventType}`,
    status: status,
    propertiesCount: eventType === 'property' ? 1 : 0,
    reservationsCount: eventType === 'reservation' ? 1 : 0,
    errorMessage: details.errorMessage,
    notes: JSON.stringify({
      entityId: details.entityId,
      action: details.action,
      source: 'webhook'
    })
  };

  await db.insert(guestySyncLogs).values(syncLog);
}

/**
 * Process a property update from Guesty webhook
 * @param propertyData - Property data from webhook
 * @returns Success status and message
 */
export async function processPropertyWebhook(propertyData: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!propertyData || !propertyData.id) {
      throw new Error('Invalid property data structure');
    }

    // Check if property already exists
    const existingProperty = await db.select()
      .from(guestyProperties)
      .where(eq(guestyProperties.propertyId, propertyData.id))
      .limit(1);

    // Clean and transform property data
    const cleanProperty: InsertGuestyProperty = {
      propertyId: propertyData.id,
      name: propertyData.title || 'Unnamed Property',
      address: propertyData.address?.full || propertyData.address?.street || 'No address',
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      amenities: propertyData.amenities || [],
      listingUrl: propertyData.listingUrl || null
    };

    // Insert or update the property
    if (existingProperty.length === 0) {
      // Create new property
      await db.insert(guestyProperties).values(cleanProperty);
      
      await createWebhookSyncLog('property', 'success', {
        entityId: propertyData.id,
        action: 'create'
      });
      
      return {
        success: true,
        message: `Property ${propertyData.id} created from webhook`
      };
    } else {
      // Update existing property
      await db.update(guestyProperties)
        .set(cleanProperty)
        .where(eq(guestyProperties.propertyId, propertyData.id));
      
      await createWebhookSyncLog('property', 'success', {
        entityId: propertyData.id,
        action: 'update'
      });
      
      return {
        success: true,
        message: `Property ${propertyData.id} updated from webhook`
      };
    }
  } catch (error) {
    console.error('Error processing property webhook:', error);
    
    await createWebhookSyncLog('property', 'error', {
      entityId: propertyData?.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      action: 'process'
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during property webhook processing'
    };
  }
}

/**
 * Process a reservation update from Guesty webhook
 * @param reservationData - Reservation data from webhook
 * @returns Success status and message
 */
export async function processReservationWebhook(reservationData: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!reservationData || !reservationData.id) {
      throw new Error('Invalid reservation data structure');
    }

    // Check if reservation already exists
    const existingReservation = await db.select()
      .from(guestyReservations)
      .where(eq(guestyReservations.reservationId, reservationData.id))
      .limit(1);

    // Clean and transform reservation data
    const cleanReservation: InsertGuestyReservation = {
      reservationId: reservationData.id,
      guestName: reservationData.guest?.fullName || 'Unknown Guest',
      guestEmail: reservationData.guest?.email || null,
      propertyId: reservationData.listing || '',
      checkIn: new Date(reservationData.checkIn),
      checkOut: new Date(reservationData.checkOut),
      status: reservationData.status || 'unknown',
      channel: reservationData.integration?.platform || null,
      totalPrice: Math.round((reservationData.money?.netAmount || 0) * 100) // Convert to cents
    };

    // Insert or update the reservation
    if (existingReservation.length === 0) {
      // Create new reservation
      await db.insert(guestyReservations).values(cleanReservation);
      
      await createWebhookSyncLog('reservation', 'success', {
        entityId: reservationData.id,
        action: 'create'
      });
      
      return {
        success: true,
        message: `Reservation ${reservationData.id} created from webhook`
      };
    } else {
      // Update existing reservation
      await db.update(guestyReservations)
        .set(cleanReservation)
        .where(eq(guestyReservations.reservationId, reservationData.id));
      
      await createWebhookSyncLog('reservation', 'success', {
        entityId: reservationData.id,
        action: 'update'
      });
      
      return {
        success: true,
        message: `Reservation ${reservationData.id} updated from webhook`
      };
    }
  } catch (error) {
    console.error('Error processing reservation webhook:', error);
    
    await createWebhookSyncLog('reservation', 'error', {
      entityId: reservationData?.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      action: 'process'
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during reservation webhook processing'
    };
  }
}

/**
 * Process a property deletion from Guesty webhook
 * @param propertyId - ID of the property to delete
 * @returns Success status and message
 */
export async function processPropertyDeletionWebhook(propertyId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!propertyId) {
      throw new Error('Invalid property ID');
    }

    // Delete the property
    await db.delete(guestyProperties)
      .where(eq(guestyProperties.propertyId, propertyId));
    
    await createWebhookSyncLog('property', 'success', {
      entityId: propertyId,
      action: 'delete'
    });
    
    return {
      success: true,
      message: `Property ${propertyId} deleted from webhook`
    };
  } catch (error) {
    console.error('Error processing property deletion webhook:', error);
    
    await createWebhookSyncLog('property', 'error', {
      entityId: propertyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      action: 'delete'
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during property deletion webhook processing'
    };
  }
}

/**
 * Process a reservation deletion from Guesty webhook
 * @param reservationId - ID of the reservation to delete
 * @returns Success status and message
 */
export async function processReservationDeletionWebhook(reservationId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!reservationId) {
      throw new Error('Invalid reservation ID');
    }

    // Delete the reservation
    await db.delete(guestyReservations)
      .where(eq(guestyReservations.reservationId, reservationId));
    
    await createWebhookSyncLog('reservation', 'success', {
      entityId: reservationId,
      action: 'delete'
    });
    
    return {
      success: true,
      message: `Reservation ${reservationId} deleted from webhook`
    };
  } catch (error) {
    console.error('Error processing reservation deletion webhook:', error);
    
    await createWebhookSyncLog('reservation', 'error', {
      entityId: reservationId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      action: 'delete'
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during reservation deletion webhook processing'
    };
  }
}