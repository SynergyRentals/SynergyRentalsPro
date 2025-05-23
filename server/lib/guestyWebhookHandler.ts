import crypto from 'crypto';
import { Request } from 'express';
import { db } from '../db';
import { 
  guestySyncLogs,
  guestyProperties,
  guestyReservations
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// This secret key must be provided by Guesty and stored in environment variables
// Do not use a placeholder or default value
const GUESTY_WEBHOOK_SECRET = process.env.GUESTY_WEBHOOK_SECRET;

/**
 * Verify the signature from Guesty webhooks to ensure authenticity
 * @param req - Express request object containing the signature and body
 * @returns boolean indicating if the signature is valid
 */
export function verifyGuestySignature(req: Request): boolean {
  try {
    const signature = req.header('X-Guesty-Signature-V2');
    if (!signature) {
      console.error('[Webhook] No Guesty signature found in request headers');
      return false;
    }

    // For testing, we'll allow a bypass signature
    if (process.env.NODE_ENV === 'development' && signature === 'test-bypass-signature') {
      console.warn('[Webhook] Using test bypass signature - ONLY FOR DEVELOPMENT');
      return true;
    }

    // Check if the webhook secret is set in environment variables
    if (!GUESTY_WEBHOOK_SECRET) {
      console.error('[Webhook] GUESTY_WEBHOOK_SECRET is not set in environment variables');
      console.error('[Webhook] Please set the GUESTY_WEBHOOK_SECRET value directly in the environment variables.');
      console.error('[Webhook] Visit your Guesty account or contact Guesty support to get the correct webhook signing key.');
      return false;
    }

    // Get raw body from the request
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    // Create HMAC using the webhook secret
    const hmac = crypto.createHmac('sha256', GUESTY_WEBHOOK_SECRET);
    hmac.update(rawBody);
    const calculatedSignature = hmac.digest('hex');

    // Compare with the signature sent by Guesty
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('[Webhook] Error verifying Guesty webhook signature:', error);
    return false;
  }
}

/**
 * Create a sync log entry for a webhook event
 * @param eventType - Type of event (property or reservation)
 * @param status - Success or error status
 * @param details - Additional details for the log
 */
async function createWebhookSyncLog(
  eventType: string,
  status: 'success' | 'error',
  details: string
): Promise<void> {
  try {
    const syncLog = {
      sync_type: `webhook_${eventType}`,
      sync_date: new Date(),
      started_at: new Date(),
      completed_at: new Date(),
      status: status,
      items_processed: 1,
      notes: details
    };

    await db.insert(guestySyncLogs).values(syncLog);
  } catch (error) {
    console.error(`Failed to create webhook sync log for ${eventType}:`, error);
  }
}

/**
 * Process a property update from Guesty webhook
 * @param propertyData - Property data from webhook
 * @returns Success status and message
 */
export async function processPropertyWebhook(propertyData: any): Promise<{ success: boolean; message: string }> {
  try {
    if (!propertyData || !propertyData.id) {
      return { success: false, message: 'Invalid property data' };
    }

    console.log(`Processing property webhook for ID: ${propertyData.id}`);

    // Clean and transform the property data based on existing schema
    const cleanProperty = {
      guesty_id: propertyData.id,
      name: propertyData.nickname || propertyData.title || 'Unnamed Property',
      address: propertyData.address?.full || null,
      property_id: propertyData.id,
      bedrooms: propertyData.bedrooms || null,
      bathrooms: propertyData.bathrooms || null,
      amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : [],
      listing_url: propertyData.listingUrl || null,
      
      // Additional fields we added
      picture: propertyData.picture?.thumbnail || null,
      city: propertyData.address?.city || null,
      state: propertyData.address?.state || null,
      zipcode: propertyData.address?.zipcode || null,
      country: propertyData.address?.country || null,
      latitude: propertyData.address?.location?.lat || null,
      longitude: propertyData.address?.location?.lng || null,
      beds: propertyData.beds || null,
      property_type: propertyData.propertyType || null,
      room_type: propertyData.roomType || null,
      accommodates: propertyData.accommodates || null,
      images: Array.isArray(propertyData.images) 
        ? propertyData.images.map((img: any) => img.thumbnail || img.regular || img.url).filter(Boolean)
        : [],
      property_data: propertyData
    };

    // Check if property already exists
    const existingProperty = await db.select()
      .from(guestyProperties)
      .where(eq(guestyProperties.guesty_id, propertyData.id))
      .limit(1);

    if (existingProperty.length > 0) {
      // Update existing property
      await db.update(guestyProperties)
        .set({
          ...cleanProperty,
          updated_at: new Date()
        })
        .where(eq(guestyProperties.guesty_id, propertyData.id));

      await createWebhookSyncLog('property', 'success', `Updated property: ${cleanProperty.name} (ID: ${propertyData.id})`);
      return { success: true, message: `Property updated: ${cleanProperty.name}` };
    } else {
      // Insert new property
      await db.insert(guestyProperties).values(cleanProperty);
      
      await createWebhookSyncLog('property', 'success', `Created new property: ${cleanProperty.name} (ID: ${propertyData.id})`);
      return { success: true, message: `Property created: ${cleanProperty.name}` };
    }
  } catch (error) {
    console.error('Error processing property webhook:', error);
    
    await createWebhookSyncLog('property', 'error', `Error processing property ID ${propertyData?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return { 
      success: false, 
      message: `Error processing property webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      return { success: false, message: 'Invalid reservation data' };
    }

    console.log(`Processing reservation webhook for ID: ${reservationData.id}`);

    // Clean and transform the reservation data based on existing schema
    const cleanReservation = {
      guesty_id: reservationData.id,
      reservation_id: reservationData.id,
      property_id: reservationData.listing?._id || null,
      guest_name: reservationData.guest?.fullName || 'Unknown Guest',
      guest_email: reservationData.guest?.email || null,
      check_in: reservationData.checkIn ? new Date(reservationData.checkIn) : new Date(),
      check_out: reservationData.checkOut ? new Date(reservationData.checkOut) : new Date(),
      status: reservationData.status || 'unknown',
      channel: reservationData.source || 'direct',
      total_price: reservationData.money?.total || 0,
      
      // Additional fields we've added to the schema
      guest_id: reservationData.guest?._id || null,
      guest_phone: reservationData.guest?.phone || null,
      confirmation_code: reservationData.confirmationCode || null,
      money: {
        total: reservationData.money?.total || 0,
        currency: reservationData.money?.currency || 'USD'
      },
      source: reservationData.source || null,
      adults: reservationData.guests?.adults || 0,
      children: reservationData.guests?.children || 0,
      infants: reservationData.guests?.infants || 0,
      pets: reservationData.guests?.pets || 0,
      total_guests: reservationData.guests?.total || 0,
      reservation_data: reservationData
    };

    // Check if reservation already exists
    const existingReservation = await db.select()
      .from(guestyReservations)
      .where(eq(guestyReservations.guesty_id, reservationData.id))
      .limit(1);

    if (existingReservation.length > 0) {
      // Update existing reservation
      await db.update(guestyReservations)
        .set({
          ...cleanReservation,
          updated_at: new Date()
        })
        .where(eq(guestyReservations.guesty_id, reservationData.id));

      await createWebhookSyncLog('reservation', 'success', `Updated reservation: ${cleanReservation.reservation_id} for guest ${cleanReservation.guest_name}`);
      return { success: true, message: `Reservation updated: ${cleanReservation.reservation_id}` };
    } else {
      // Insert new reservation
      await db.insert(guestyReservations).values(cleanReservation);
      
      await createWebhookSyncLog('reservation', 'success', `Created new reservation: ${cleanReservation.reservation_id} for guest ${cleanReservation.guest_name}`);
      return { success: true, message: `Reservation created: ${cleanReservation.reservation_id}` };
    }
  } catch (error) {
    console.error('Error processing reservation webhook:', error);
    
    await createWebhookSyncLog('reservation', 'error', `Error processing reservation ID ${reservationData?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return { 
      success: false, 
      message: `Error processing reservation webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      return { success: false, message: 'Invalid property ID' };
    }

    console.log(`Processing property deletion webhook for ID: ${propertyId}`);

    // Get the property name before deletion for the log
    const existingProperty = await db.select()
      .from(guestyProperties)
      .where(eq(guestyProperties.guesty_id, propertyId))
      .limit(1);

    const propertyName = existingProperty[0]?.name || 'Unknown Property';

    // Delete the property
    await db.delete(guestyProperties)
      .where(eq(guestyProperties.guesty_id, propertyId));

    await createWebhookSyncLog('property', 'success', `Deleted property: ${propertyName} (ID: ${propertyId})`);
    return { success: true, message: `Property deleted: ${propertyName} (ID: ${propertyId})` };
  } catch (error) {
    console.error('Error processing property deletion webhook:', error);
    
    await createWebhookSyncLog('property', 'error', `Error deleting property ID ${propertyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return { 
      success: false, 
      message: `Error processing property deletion webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      return { success: false, message: 'Invalid reservation ID' };
    }

    console.log(`Processing reservation deletion webhook for ID: ${reservationId}`);

    // Get the reservation details before deletion for the log
    const existingReservation = await db.select()
      .from(guestyReservations)
      .where(eq(guestyReservations.guesty_id, reservationId))
      .limit(1);

    const guestName = existingReservation[0]?.guest_name || 'Unknown Guest';

    // Delete the reservation
    await db.delete(guestyReservations)
      .where(eq(guestyReservations.guesty_id, reservationId));

    await createWebhookSyncLog('reservation', 'success', `Deleted reservation: ${reservationId} for guest ${guestName}`);
    return { success: true, message: `Reservation deleted: ${reservationId} for guest ${guestName}` };
  } catch (error) {
    console.error('Error processing reservation deletion webhook:', error);
    
    await createWebhookSyncLog('reservation', 'error', `Error deleting reservation ID ${reservationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return { 
      success: false, 
      message: `Error processing reservation deletion webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}