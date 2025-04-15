/**
 * Service for syncing data from Guesty API
 * Handles pagination and data processing for on-demand refreshes
 */
import { db } from "../db";
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog,
  SelectGuestyProperty
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { guestyClient } from "../lib/guestyApiClient";

/**
 * Clean and transform a Guesty property object to match our schema
 */
function cleanPropertyData(property: any): InsertGuestyProperty {
  // Extract nested properties safely
  const pictures = Array.isArray(property.pictures) && property.pictures.length > 0
    ? property.pictures[0].thumbnail || property.pictures[0].regular || null
    : null;
  
  const address = property.address || {};
  
  return {
    propertyId: property._id || property.id,
    name: property.title || 'Unnamed Property',
    address: [
      address.street,
      address.city,
      address.state,
      address.country,
      address.zipcode
    ].filter(Boolean).join(', '),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    city: address.city || null,
    state: address.state || null,
    zipcode: address.zipcode || null,
    country: address.country || null,
    latitude: address.lat || null,
    longitude: address.lng || null,
    amenities: Array.isArray(property.amenities) 
      ? property.amenities
      : [],
    listingUrl: property.listingURL || property.listingUrl || null,
    pictureUrl: pictures,
    propertyType: property.propertyType || null,
    accommodates: property.accommodates || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    propertyData: property // Store the complete property data for reference
  };
}

/**
 * Clean and transform a Guesty reservation object to match our schema
 */
function cleanReservationData(reservation: any): InsertGuestyReservation {
  // Extract guest information
  const guest = reservation.guest || {};
  
  // Parse dates
  const checkIn = reservation.checkIn ? new Date(reservation.checkIn) : new Date();
  const checkOut = reservation.checkOut ? new Date(reservation.checkOut) : new Date();
  
  // Money values
  const money = reservation.money || {};
  const totalPrice = money.netAmount || money.totalPaid || 0;
  
  return {
    reservationId: reservation._id || reservation.id,
    propertyId: reservation.listing?._id || reservation.listingId || '',
    guestName: guest.fullName || guest.firstName || 'Unknown Guest',
    guestEmail: guest.email || null,
    checkIn,
    checkOut,
    status: reservation.status || 'unknown',
    channel: reservation.source || null,
    totalPrice,
    guestId: guest._id || guest.id || null,
    numberOfGuests: reservation.guests || 0,
    confirmationCode: reservation.confirmationCode || null,
    phoneNumber: guest.phone || null,
    notes: reservation.notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reservationData: reservation // Store the complete reservation data for reference
  };
}

/**
 * Syncs all properties from Guesty API with pagination
 * @returns Object with sync results
 */
export async function syncAllGuestyListings(): Promise<{
  success: boolean;
  message: string;
  propertiesCount: number;
  errors: string[];
  syncLogId?: number;
}> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting full Guesty properties sync`);
  
  // Create sync log entry
  const syncLog: InsertGuestySyncLog = {
    syncType: 'properties',
    syncDate: startTime,
    startedAt: startTime,
    status: 'in_progress',
    itemsProcessed: 0,
    notes: 'Starting full properties sync'
  };
  
  // Insert the sync log and get the ID
  const [insertedLog] = await db.insert(guestySyncLogs).values(syncLog).returning();
  const syncLogId = insertedLog.id;
  
  try {
    let allProperties: any[] = [];
    let currentSkip = 0;
    const limit = 100; // Max limit supported by Guesty API
    let hasMoreData = true;
    let page = 1;
    const errors: string[] = [];
    
    // Paginate through all properties
    while (hasMoreData) {
      try {
        console.log(`[${new Date().toISOString()}] Fetching properties page ${page}, skip=${currentSkip}`);
        
        // Make the API request
        const response = await guestyClient.getProperties({
          limit,
          skip: currentSkip
        });
        
        // Check if we got valid data
        if (!response || !response.results || !Array.isArray(response.results)) {
          throw new Error('Invalid response format from Guesty API');
        }
        
        const properties = response.results;
        const total = response.count || 0;
        
        console.log(`[${new Date().toISOString()}] Fetched ${properties.length} properties (${currentSkip + properties.length}/${total})`);
        
        // Process each property
        for (const property of properties) {
          try {
            // Clean and transform property data
            const cleanedProperty = cleanPropertyData(property);
            
            // Check if property already exists
            const existingProperty = await db.select()
              .from(guestyProperties)
              .where(eq(guestyProperties.propertyId, cleanedProperty.propertyId))
              .limit(1);
            
            if (existingProperty.length > 0) {
              // Update existing property
              await db.update(guestyProperties)
                .set({
                  ...cleanedProperty,
                  updatedAt: new Date()
                })
                .where(eq(guestyProperties.propertyId, cleanedProperty.propertyId));
            } else {
              // Insert new property
              await db.insert(guestyProperties).values(cleanedProperty);
            }
            
            // Increment processed count
            syncLog.itemsProcessed++;
            
          } catch (propertyError) {
            console.error('Error processing property:', propertyError);
            errors.push(`Error processing property ${property._id || 'unknown'}: ${propertyError instanceof Error ? propertyError.message : 'Unknown error'}`);
          }
        }
        
        // Add the properties to our collection
        allProperties = [...allProperties, ...properties];
        
        // Determine if there's more data to fetch
        hasMoreData = properties.length === limit && (currentSkip + properties.length) < total;
        
        // Update for next iteration
        currentSkip += properties.length;
        page++;
        
        // Add a small delay between requests to be kind to the API
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (pageError) {
        console.error(`Error fetching properties page ${page}:`, pageError);
        errors.push(`Error fetching properties page ${page}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        
        // If we're getting rate limited, stop trying
        if (pageError instanceof Error && pageError.message.includes('429')) {
          hasMoreData = false;
          errors.push('Rate limit exceeded, stopping sync');
        }
      }
    }
    
    // Update the sync log with success status
    const completedAt = new Date();
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status: errors.length > 0 ? 'completed_with_errors' : 'success',
        itemsProcessed: syncLog.itemsProcessed,
        notes: errors.length > 0 
          ? `Completed with ${errors.length} errors. Processed ${syncLog.itemsProcessed} properties.`
          : `Successfully synced ${syncLog.itemsProcessed} properties.`
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    console.log(`[${completedAt.toISOString()}] Completed properties sync. Processed ${syncLog.itemsProcessed} properties with ${errors.length} errors.`);
    
    return {
      success: true,
      message: errors.length > 0 
        ? `Synced ${syncLog.itemsProcessed} properties with ${errors.length} errors`
        : `Successfully synced ${syncLog.itemsProcessed} properties`,
      propertiesCount: syncLog.itemsProcessed,
      errors,
      syncLogId
    };
    
  } catch (error) {
    console.error('Error syncing properties:', error);
    
    // Update the sync log with error status
    const completedAt = new Date();
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status: 'error',
        notes: `Error during sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    return {
      success: false,
      message: `Error syncing properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
      propertiesCount: syncLog.itemsProcessed,
      errors: [`General sync error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      syncLogId
    };
  }
}

/**
 * Syncs all reservations from Guesty API with pagination
 * Focuses on recent and upcoming reservations (last month to 6 months ahead)
 * @returns Object with sync results
 */
export async function syncAllGuestyReservations(): Promise<{
  success: boolean;
  message: string;
  reservationsCount: number;
  errors: string[];
  syncLogId?: number;
}> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting full Guesty reservations sync`);
  
  // Calculate date ranges for recent and upcoming reservations
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  const sixMonthsAhead = new Date(now);
  sixMonthsAhead.setMonth(now.getMonth() + 6);
  
  // Create sync log entry
  const syncLog: InsertGuestySyncLog = {
    syncType: 'reservations',
    syncDate: startTime,
    startedAt: startTime,
    status: 'in_progress',
    itemsProcessed: 0,
    notes: 'Starting full reservations sync'
  };
  
  // Insert the sync log and get the ID
  const [insertedLog] = await db.insert(guestySyncLogs).values(syncLog).returning();
  const syncLogId = insertedLog.id;
  
  try {
    let allReservations: any[] = [];
    let currentSkip = 0;
    const limit = 100; // Max limit supported by Guesty API
    let hasMoreData = true;
    let page = 1;
    const errors: string[] = [];
    
    // Paginate through all reservations
    while (hasMoreData) {
      try {
        console.log(`[${new Date().toISOString()}] Fetching reservations page ${page}, skip=${currentSkip}`);
        
        // Make the API request
        const response = await guestyClient.getReservations({
          limit,
          skip: currentSkip,
          checkIn: { $gte: oneMonthAgo.toISOString() },
          checkOut: { $lte: sixMonthsAhead.toISOString() }
        });
        
        // Check if we got valid data
        if (!response || !response.results || !Array.isArray(response.results)) {
          throw new Error('Invalid response format from Guesty API');
        }
        
        const reservations = response.results;
        const total = response.count || 0;
        
        console.log(`[${new Date().toISOString()}] Fetched ${reservations.length} reservations (${currentSkip + reservations.length}/${total})`);
        
        // Process each reservation
        for (const reservation of reservations) {
          try {
            // Clean and transform reservation data
            const cleanedReservation = cleanReservationData(reservation);
            
            // Check if reservation already exists
            const existingReservation = await db.select()
              .from(guestyReservations)
              .where(eq(guestyReservations.reservationId, cleanedReservation.reservationId))
              .limit(1);
            
            if (existingReservation.length > 0) {
              // Update existing reservation
              await db.update(guestyReservations)
                .set({
                  ...cleanedReservation,
                  updatedAt: new Date()
                })
                .where(eq(guestyReservations.reservationId, cleanedReservation.reservationId));
            } else {
              // Insert new reservation
              await db.insert(guestyReservations).values(cleanedReservation);
            }
            
            // Increment processed count
            syncLog.itemsProcessed++;
            
          } catch (reservationError) {
            console.error('Error processing reservation:', reservationError);
            errors.push(`Error processing reservation ${reservation._id || 'unknown'}: ${reservationError instanceof Error ? reservationError.message : 'Unknown error'}`);
          }
        }
        
        // Add the reservations to our collection
        allReservations = [...allReservations, ...reservations];
        
        // Determine if there's more data to fetch
        hasMoreData = reservations.length === limit && (currentSkip + reservations.length) < total;
        
        // Update for next iteration
        currentSkip += reservations.length;
        page++;
        
        // Add a small delay between requests to be kind to the API
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (pageError) {
        console.error(`Error fetching reservations page ${page}:`, pageError);
        errors.push(`Error fetching reservations page ${page}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        
        // If we're getting rate limited, stop trying
        if (pageError instanceof Error && pageError.message.includes('429')) {
          hasMoreData = false;
          errors.push('Rate limit exceeded, stopping sync');
        }
      }
    }
    
    // Update the sync log with success status
    const completedAt = new Date();
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status: errors.length > 0 ? 'completed_with_errors' : 'success',
        itemsProcessed: syncLog.itemsProcessed,
        notes: errors.length > 0 
          ? `Completed with ${errors.length} errors. Processed ${syncLog.itemsProcessed} reservations.`
          : `Successfully synced ${syncLog.itemsProcessed} reservations.`
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    console.log(`[${completedAt.toISOString()}] Completed reservations sync. Processed ${syncLog.itemsProcessed} reservations with ${errors.length} errors.`);
    
    return {
      success: true,
      message: errors.length > 0 
        ? `Synced ${syncLog.itemsProcessed} reservations with ${errors.length} errors`
        : `Successfully synced ${syncLog.itemsProcessed} reservations`,
      reservationsCount: syncLog.itemsProcessed,
      errors,
      syncLogId
    };
    
  } catch (error) {
    console.error('Error syncing reservations:', error);
    
    // Update the sync log with error status
    const completedAt = new Date();
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status: 'error',
        notes: `Error during sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    return {
      success: false,
      message: `Error syncing reservations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      reservationsCount: syncLog.itemsProcessed,
      errors: [`General sync error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      syncLogId
    };
  }
}

/**
 * Syncs both properties and reservations from Guesty API
 * @returns Object with combined sync results
 */
export async function syncAllGuestyData(): Promise<{
  success: boolean;
  message: string;
  propertiesResult?: {
    success: boolean;
    propertiesCount: number;
    errors: string[];
  };
  reservationsResult?: {
    success: boolean;
    reservationsCount: number;
    errors: string[];
  };
}> {
  console.log(`[${new Date().toISOString()}] Starting full Guesty data sync (properties and reservations)`);
  
  try {
    // Sync properties first
    const propertiesResult = await syncAllGuestyListings();
    
    // Sync reservations next
    const reservationsResult = await syncAllGuestyReservations();
    
    // Determine overall success
    const success = propertiesResult.success || reservationsResult.success;
    
    // Generate combined message
    const message = [
      propertiesResult.success 
        ? `Properties: Synced ${propertiesResult.propertiesCount} properties successfully` 
        : `Properties: Sync failed with ${propertiesResult.errors.length} errors`,
      reservationsResult.success 
        ? `Reservations: Synced ${reservationsResult.reservationsCount} reservations successfully` 
        : `Reservations: Sync failed with ${reservationsResult.errors.length} errors`
    ].join('. ');
    
    return {
      success,
      message,
      propertiesResult: {
        success: propertiesResult.success,
        propertiesCount: propertiesResult.propertiesCount,
        errors: propertiesResult.errors
      },
      reservationsResult: {
        success: reservationsResult.success,
        reservationsCount: reservationsResult.reservationsCount,
        errors: reservationsResult.errors
      }
    };
    
  } catch (error) {
    console.error('Error in combined Guesty sync:', error);
    
    return {
      success: false,
      message: `Error during combined Guesty sync: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}