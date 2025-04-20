/**
 * Batch Sync Service for Guesty API
 * 
 * This service handles efficient data synchronization with Guesty API 
 * while respecting the strict rate limit of 5 requests per 24 hours.
 * It focuses on maximizing the value of each request by:
 * 1. Prioritizing which data to fetch
 * 2. Using incremental sync patterns
 * 3. Optimizing request parameters
 */
import { db } from "../db";
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog
} from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { guestyClient } from "../lib/guestyApiClient";
import { checkBatchRateLimit, recordApiRequest } from "../lib/guestyRateLimiter";

interface BatchSyncOptions {
  prioritizeProperties?: boolean;
  prioritizeReservations?: boolean;
  reservationTimeRange?: {
    checkInAfter?: Date;
    checkInBefore?: Date;
    checkOutAfter?: Date;
    checkOutBefore?: Date;
  };
  forceSync?: boolean; // Override rate limits for urgent syncs (use carefully)
}

interface BatchSyncResult {
  success: boolean;
  message: string;
  propertiesSynced: number;
  reservationsSynced: number;
  requestsUsed: number;
  requestsRemaining: number;
  syncLogId?: number;
  errors: string[];
  propertiesDetails?: {
    new: number;
    updated: number;
    total: number;
  };
  reservationsDetails?: {
    new: number;
    updated: number;
    total: number;
  };
}

/**
 * Performs a strategic batch sync of Guesty data
 * Optimizes API usage by intelligently deciding what to sync
 * based on available requests and priorities
 */
export async function performBatchSync(options: BatchSyncOptions = {}): Promise<BatchSyncResult> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting Guesty batch sync with options:`, JSON.stringify(options));
  
  // Create sync log entry
  const syncLog: InsertGuestySyncLog = {
    syncType: 'batch',
    syncDate: startTime,
    startedAt: startTime,
    status: 'in_progress',
    itemsProcessed: 0,
    notes: `Starting batch sync with options: ${JSON.stringify(options)}`
  };
  
  // Insert the sync log and get the ID
  const [insertedLog] = await db.insert(guestySyncLogs).values(syncLog).returning();
  const syncLogId = insertedLog.id;
  
  // Initialize result
  const result: BatchSyncResult = {
    success: false,
    message: '',
    propertiesSynced: 0,
    reservationsSynced: 0,
    requestsUsed: 0,
    requestsRemaining: 0,
    syncLogId,
    errors: [],
    propertiesDetails: {
      new: 0,
      updated: 0,
      total: 0
    },
    reservationsDetails: {
      new: 0,
      updated: 0,
      total: 0
    }
  };
  
  try {
    // Check current rate limit status
    const rateLimitStatus = await checkBatchRateLimit(1); // Initially just check if we have at least 1 request available
    
    if (rateLimitStatus.isRateLimited && !options.forceSync) {
      // Update sync log with rate limited status
      await db.update(guestySyncLogs)
        .set({
          completedAt: new Date(),
          status: 'rate_limited',
          notes: rateLimitStatus.message
        })
        .where(eq(guestySyncLogs.id, syncLogId));
      
      return {
        ...result,
        message: `Rate limited: ${rateLimitStatus.message}`,
        requestsRemaining: rateLimitStatus.requestsRemaining
      };
    }
    
    // Calculate how many requests we need and are allowed to make
    const availableRequests = rateLimitStatus.requestsRemaining;
    console.log(`[${new Date().toISOString()}] We have ${availableRequests} Guesty API requests available`);
    
    // Decide how to allocate our available requests based on priorities
    let propertyRequestCount = 0;
    let reservationRequestCount = 0;
    
    if (options.prioritizeProperties && options.prioritizeReservations) {
      // If both are prioritized, split evenly but ensure at least 1 for each if we have enough
      if (availableRequests >= 2) {
        propertyRequestCount = Math.floor(availableRequests / 2);
        reservationRequestCount = availableRequests - propertyRequestCount;
      } else if (availableRequests === 1) {
        // With only one request, choose properties as they change less frequently
        propertyRequestCount = 1;
      }
    } else if (options.prioritizeProperties) {
      // If only properties are prioritized, allocate all to properties
      propertyRequestCount = availableRequests;
    } else if (options.prioritizeReservations) {
      // If only reservations are prioritized, allocate all to reservations
      reservationRequestCount = availableRequests;
    } else {
      // Default allocation with preference to reservations as they change more frequently
      if (availableRequests >= 3) {
        propertyRequestCount = Math.floor(availableRequests / 3); // Allocate 1/3 to properties
        reservationRequestCount = availableRequests - propertyRequestCount;
      } else if (availableRequests > 0) {
        reservationRequestCount = availableRequests; // Prioritize reservations with limited requests
      }
    }
    
    console.log(`[${new Date().toISOString()}] Allocated requests: ${propertyRequestCount} for properties, ${reservationRequestCount} for reservations`);
    
    // Execute property sync if we have allocated requests
    if (propertyRequestCount > 0) {
      try {
        const propertiesResult = await syncPropertiesWithMaxRequests(propertyRequestCount);
        result.propertiesSynced = propertiesResult.propertiesSynced;
        result.propertiesDetails = propertiesResult.details;
        result.requestsUsed += propertiesResult.requestsUsed;
        result.errors = [...result.errors, ...propertiesResult.errors];
        syncLog.itemsProcessed += propertiesResult.propertiesSynced;
        syncLog.propertiesCount = propertiesResult.propertiesSynced;
      } catch (error) {
        console.error('Error in property sync:', error);
        result.errors.push(`Property sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Execute reservation sync if we have allocated requests
    if (reservationRequestCount > 0) {
      try {
        const reservationsResult = await syncReservationsWithMaxRequests(
          reservationRequestCount, 
          options.reservationTimeRange
        );
        result.reservationsSynced = reservationsResult.reservationsSynced;
        result.reservationsDetails = reservationsResult.details;
        result.requestsUsed += reservationsResult.requestsUsed;
        result.errors = [...result.errors, ...reservationsResult.errors];
        syncLog.itemsProcessed += reservationsResult.reservationsSynced;
        syncLog.reservationsCount = reservationsResult.reservationsSynced;
      } catch (error) {
        console.error('Error in reservation sync:', error);
        result.errors.push(`Reservation sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Get updated rate limit status after our operations
    const finalRateLimitStatus = await checkBatchRateLimit(1);
    result.requestsRemaining = finalRateLimitStatus.requestsRemaining;
    
    // Update result success and message
    result.success = result.requestsUsed > 0;
    if (result.success) {
      const total = result.propertiesSynced + result.reservationsSynced;
      result.message = `Successfully synced ${total} items (${result.propertiesSynced} properties, ${result.reservationsSynced} reservations) using ${result.requestsUsed} Guesty API requests. ${result.requestsRemaining} requests remaining for today.`;
    } else {
      result.message = `No data synced with Guesty. ${result.errors.length > 0 ? 'Errors occurred. ' : ''}${result.requestsRemaining} API requests remaining.`;
    }
    
    // Update the sync log with completion status
    const completedAt = new Date();
    let status = 'success';
    if (result.errors.length > 0) {
      status = 'completed_with_errors';
    } else if (!result.success) {
      status = 'no_data_synced';
    }
    
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status,
        itemsProcessed: syncLog.itemsProcessed,
        propertiesCount: syncLog.propertiesCount || 0,
        reservationsCount: syncLog.reservationsCount || 0,
        notes: result.message
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    return result;
    
  } catch (error) {
    console.error('Error in batch sync:', error);
    
    // Update the sync log with error status
    const completedAt = new Date();
    const errorMessage = `Error during batch sync: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    await db.update(guestySyncLogs)
      .set({
        completedAt,
        status: 'error',
        notes: errorMessage
      })
      .where(eq(guestySyncLogs.id, syncLogId));
    
    return {
      ...result,
      success: false,
      message: errorMessage,
      errors: [...result.errors, errorMessage]
    };
  }
}

/**
 * Syncs properties using a maximum number of API requests
 */
async function syncPropertiesWithMaxRequests(maxRequests: number): Promise<{
  propertiesSynced: number;
  requestsUsed: number;
  details: { new: number; updated: number; total: number };
  errors: string[];
}> {
  console.log(`[${new Date().toISOString()}] Starting property sync with max ${maxRequests} requests`);
  
  const result = {
    propertiesSynced: 0,
    requestsUsed: 0,
    details: { new: 0, updated: 0, total: 0 },
    errors: [] as string[]
  };
  
  try {
    let hasMoreData = true;
    let page = 1;
    let skip = 0;
    const limit = 100; // Max limit supported by Guesty API
    
    // Paginate through properties while respecting the max requests limit
    while (hasMoreData && result.requestsUsed < maxRequests) {
      try {
        console.log(`[${new Date().toISOString()}] Fetching properties page ${page}, skip=${skip}`);
        
        // Make the API request
        const response = await guestyClient.getProperties({
          limit,
          skip,
          // Add fields filter to reduce response size
          fields: 'id,title,nickname,address,bedrooms,bathrooms,beds,amenities,pictures,propertyType,accommodates'
        });
        
        // Increment the request counter
        result.requestsUsed++;
        
        // Check if we got valid data
        if (!response || !response.results || !Array.isArray(response.results)) {
          throw new Error('Invalid response format from Guesty API');
        }
        
        const properties = response.results;
        const total = response.count || 0;
        result.details.total = total;
        
        console.log(`[${new Date().toISOString()}] Fetched ${properties.length} properties (${skip + properties.length}/${total})`);
        
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
              
              result.details.updated++;
            } else {
              // Insert new property
              await db.insert(guestyProperties).values(cleanedProperty);
              result.details.new++;
            }
            
            // Increment synced count
            result.propertiesSynced++;
            
          } catch (propertyError) {
            console.error('Error processing property:', propertyError);
            result.errors.push(`Error processing property ${property._id || 'unknown'}: ${propertyError instanceof Error ? propertyError.message : 'Unknown error'}`);
          }
        }
        
        // Determine if there's more data to fetch
        hasMoreData = properties.length === limit && (skip + properties.length) < total;
        
        // Update for next iteration
        skip += properties.length;
        page++;
        
        // No need to add delay here as we're already rate limited to 5 requests/day
        
      } catch (pageError) {
        console.error(`Error fetching properties page ${page}:`, pageError);
        result.errors.push(`Error fetching properties page ${page}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        
        // If we're getting rate limited by the API directly, stop trying
        if (pageError instanceof Error && pageError.message.includes('429')) {
          hasMoreData = false;
          result.errors.push('Rate limit exceeded, stopping sync');
        }
        
        // Still count this as a used request
        result.requestsUsed++;
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error syncing properties:', error);
    result.errors.push(`General property sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Syncs reservations using a maximum number of API requests
 */
async function syncReservationsWithMaxRequests(
  maxRequests: number,
  timeRange?: {
    checkInAfter?: Date;
    checkInBefore?: Date;
    checkOutAfter?: Date;
    checkOutBefore?: Date;
  }
): Promise<{
  reservationsSynced: number;
  requestsUsed: number;
  details: { new: number; updated: number; total: number };
  errors: string[];
}> {
  console.log(`[${new Date().toISOString()}] Starting reservation sync with max ${maxRequests} requests`);
  
  const result = {
    reservationsSynced: 0,
    requestsUsed: 0,
    details: { new: 0, updated: 0, total: 0 },
    errors: [] as string[]
  };
  
  try {
    // Set default date range if not specified (recent and upcoming reservations)
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const sixMonthsAhead = new Date(now);
    sixMonthsAhead.setMonth(now.getMonth() + 6);
    
    // Build date filters for the API request
    const dateFilters: any = {};
    
    // Apply custom time range if provided, otherwise use default
    if (timeRange) {
      if (timeRange.checkInAfter || timeRange.checkInBefore) {
        dateFilters.checkIn = {};
        if (timeRange.checkInAfter) {
          dateFilters.checkIn.$gte = timeRange.checkInAfter.toISOString();
        }
        if (timeRange.checkInBefore) {
          dateFilters.checkIn.$lte = timeRange.checkInBefore.toISOString();
        }
      }
      
      if (timeRange.checkOutAfter || timeRange.checkOutBefore) {
        dateFilters.checkOut = {};
        if (timeRange.checkOutAfter) {
          dateFilters.checkOut.$gte = timeRange.checkOutAfter.toISOString();
        }
        if (timeRange.checkOutBefore) {
          dateFilters.checkOut.$lte = timeRange.checkOutBefore.toISOString();
        }
      }
    } else {
      // Default time range - recent and upcoming
      dateFilters.checkIn = { $gte: oneMonthAgo.toISOString() };
      dateFilters.checkOut = { $lte: sixMonthsAhead.toISOString() };
    }
    
    // Get our most recent reservation to avoid fetching already-synced data
    const mostRecentSync = await db.select()
      .from(guestySyncLogs)
      .where(eq(guestySyncLogs.syncType, 'reservations'))
      .orderBy(desc(guestySyncLogs.completedAt))
      .limit(1);
    
    if (mostRecentSync.length > 0 && mostRecentSync[0].completedAt) {
      // If we have recent sync data, only get reservations updated since then
      const lastSync = mostRecentSync[0].completedAt;
      dateFilters.updatedAt = { $gte: lastSync.toISOString() };
      console.log(`[${new Date().toISOString()}] Only fetching reservations updated since ${lastSync.toISOString()}`);
    }
    
    let hasMoreData = true;
    let page = 1;
    let skip = 0;
    const limit = 100; // Max limit supported by Guesty API
    
    // Paginate through reservations while respecting the max requests limit
    while (hasMoreData && result.requestsUsed < maxRequests) {
      try {
        console.log(`[${new Date().toISOString()}] Fetching reservations page ${page}, skip=${skip}`);
        
        // Build API request params
        const params: any = {
          limit,
          skip,
          fields: 'id,listingId,guest,checkIn,checkOut,status,money,guests,confirmationCode,source',
          ...dateFilters
        };
        
        // Make the API request
        const response = await guestyClient.getReservations(params);
        
        // Increment the request counter
        result.requestsUsed++;
        
        // Check if we got valid data
        if (!response || !response.results || !Array.isArray(response.results)) {
          throw new Error('Invalid response format from Guesty API');
        }
        
        const reservations = response.results;
        const total = response.count || 0;
        result.details.total = total;
        
        console.log(`[${new Date().toISOString()}] Fetched ${reservations.length} reservations (${skip + reservations.length}/${total})`);
        
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
              
              result.details.updated++;
            } else {
              // Insert new reservation
              await db.insert(guestyReservations).values(cleanedReservation);
              result.details.new++;
            }
            
            // Increment synced count
            result.reservationsSynced++;
            
          } catch (reservationError) {
            console.error('Error processing reservation:', reservationError);
            result.errors.push(`Error processing reservation ${reservation._id || 'unknown'}: ${reservationError instanceof Error ? reservationError.message : 'Unknown error'}`);
          }
        }
        
        // Determine if there's more data to fetch
        hasMoreData = reservations.length === limit && (skip + reservations.length) < total;
        
        // Update for next iteration
        skip += reservations.length;
        page++;
        
        // No need to add delay here as we're already rate limited to 5 requests/day
        
      } catch (pageError) {
        console.error(`Error fetching reservations page ${page}:`, pageError);
        result.errors.push(`Error fetching reservations page ${page}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        
        // If we're getting rate limited by the API directly, stop trying
        if (pageError instanceof Error && pageError.message.includes('429')) {
          hasMoreData = false;
          result.errors.push('Rate limit exceeded, stopping sync');
        }
        
        // Still count this as a used request
        result.requestsUsed++;
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error syncing reservations:', error);
    result.errors.push(`General reservation sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

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
    guestyId: property._id || property.id,
    propertyId: property._id || property.id,
    name: property.title || 'Unnamed Property',
    nickname: property.nickname || property.title || 'Unnamed Property',
    address: [
      address.street,
      address.city,
      address.state,
      address.country,
      address.zipcode
    ].filter(Boolean).join(', '),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    beds: property.beds || 0,
    city: address.city || null,
    state: address.state || null,
    zipCode: address.zipcode || null,
    country: address.country || null,
    latitude: address.lat || null,
    longitude: address.lng || null,
    amenities: Array.isArray(property.amenities) 
      ? property.amenities
      : [],
    listingUrl: property.listingURL || property.listingUrl || null,
    picture: pictures,
    propertyType: property.propertyType || null,
    roomType: property.roomType || null,
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
  
  // Process guest counts
  let adults = 0;
  let children = 0;
  let infants = 0;
  let pets = 0;
  let totalGuests = 0;
  
  if (reservation.guests) {
    adults = reservation.guests.adults || 0;
    children = reservation.guests.children || 0;
    infants = reservation.guests.infants || 0;
    pets = reservation.guests.pets || 0;
    totalGuests = adults + children + infants;
  } else {
    totalGuests = reservation.numberOfGuests || 0;
  }
  
  return {
    guestyId: reservation._id || reservation.id,
    reservationId: reservation._id || reservation.id,
    propertyId: reservation.listing?._id || reservation.listingId || '',
    guestyPropertyId: reservation.listing?._id || reservation.listingId || '',
    guestId: guest._id || guest.id || null,
    confirmationCode: reservation.confirmationCode || null,
    guestName: guest.fullName || guest.firstName || 'Unknown Guest',
    guestEmail: guest.email || null,
    guestPhone: guest.phone || null,
    checkIn,
    checkOut,
    status: reservation.status || 'unknown',
    source: reservation.source || null,
    channel: reservation.channel || reservation.source || null,
    totalPrice,
    money,
    adults,
    children,
    infants,
    pets,
    totalGuests,
    createdAt: new Date(),
    updatedAt: new Date(),
    reservationData: reservation // Store the complete reservation data for reference
  };
}