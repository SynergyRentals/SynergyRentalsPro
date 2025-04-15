import { db } from "./db";
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { guestyClient } from "./lib/guestyApiClient";

/**
 * Perform a health check to verify that the Guesty API domain is reachable
 * @returns Object with health check status
 */
export async function healthCheck(): Promise<{
  success: boolean;
  message: string;
  timestamp: Date;
  rateLimit?: boolean;
}> {
  try {
    const result = await guestyClient.healthCheck();
    
    return {
      success: result.success,
      message: result.message,
      timestamp: new Date(),
      rateLimit: false
    };
  } catch (error) {
    console.error(`Guesty API health check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    // Check if the error is rate limit related
    const isRateLimit = error instanceof Error && error.message.includes("429");
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred during health check",
      timestamp: new Date(),
      rateLimit: isRateLimit
    };
  }
}

/**
 * Make a request to the Guesty API
 * @param endpoint - API endpoint path
 * @param method - HTTP method
 * @param data - Optional data for POST/PUT requests
 * @returns API response JSON
 */
export async function makeGuestyRequest(endpoint: string, method: string = "GET", data: any = null) {
  const options: any = {};
  if (data) {
    options.data = data;
  }
  
  try {
    // Make sure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    return await guestyClient.makeRequest(method as any, endpoint, options);
  } catch (error) {
    console.error(`Guesty API request failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    throw error;
  }
}

/**
 * Clean and transform a Guesty property object to match our schema
 */
function cleanPropertyData(property: any): InsertGuestyProperty {
  return {
    propertyId: property._id,
    name: property.title || "Unnamed Property",
    address: property.address ? JSON.stringify(property.address) : "Unknown Address",
    bedrooms: property.bedrooms || null,
    bathrooms: property.bathrooms || null,
    amenities: property.amenities || [],
    listingUrl: property.listingUrl || null
  };
}

/**
 * Clean and transform a Guesty reservation object to match our schema
 */
function cleanReservationData(reservation: any): InsertGuestyReservation {
  return {
    reservationId: reservation._id,
    propertyId: reservation.listing?._id || "",
    guestName: `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim() || "Unknown Guest",
    guestEmail: reservation.guest?.email || null,
    checkIn: reservation.checkIn ? new Date(reservation.checkIn) : new Date(),
    checkOut: reservation.checkOut ? new Date(reservation.checkOut) : new Date(Date.now() + 86400000), // Next day as fallback
    status: reservation.status || "pending",
    channel: reservation.source || null,
    totalPrice: Math.round((reservation.money?.totalPrice || 0) * 100) // Convert to cents
  };
}

/**
 * Fetches properties from Guesty API and stores them in the database
 * @returns Object with sync results
 */
export async function syncProperties(): Promise<{ 
  success: boolean; 
  message: string; 
  properties_synced?: number;
  errors?: string[];
}> {
  try {
    // Start sync log
    const startTime = new Date();
    console.log("Starting Guesty properties sync at:", startTime.toISOString());
    
    // Fetch properties from Guesty API using the client
    const response = await guestyClient.getProperties({ limit: 100 });
    const properties = response.data || [];
    
    if (!Array.isArray(properties)) {
      throw new Error("Invalid response format from Guesty API");
    }
    
    console.log(`Retrieved ${properties.length} properties from Guesty API`);
    
    // Process each property
    const errors: string[] = [];
    let successCount = 0;
    
    for (const property of properties) {
      try {
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
        
        successCount++;
      } catch (error) {
        const errorMessage = `Error processing property ${property._id}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }
    
    // Complete sync log
    const endTime = new Date();
    
    const syncResult: InsertGuestySyncLog = {
      syncType: "properties",
      status: errors.length > 0 ? "partial" : "success",
      propertiesCount: successCount,
      reservationsCount: null,
      errorMessage: errors.length > 0 ? errors.join("; ") : null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: true,
      message: `Successfully synced ${successCount} of ${properties.length} properties`,
      properties_synced: successCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error syncing properties:", error);
    
    const syncResult: InsertGuestySyncLog = {
      syncType: "properties",
      status: "failed",
      propertiesCount: 0,
      reservationsCount: null,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: `Error syncing properties: ${error instanceof Error ? error.message : "Unknown error"}`,
      properties_synced: 0
    };
  }
}

/**
 * Fetches reservations from Guesty API and stores them in the database
 * @returns Object with sync results
 */
export async function syncReservations(): Promise<{ 
  success: boolean; 
  message: string; 
  reservations_synced?: number;
  errors?: string[];
}> {
  try {
    // Start sync log
    const startTime = new Date();
    console.log("Starting Guesty reservations sync at:", startTime.toISOString());
    
    // Calculate date ranges for recent and upcoming reservations
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const sixMonthsAhead = new Date(now);
    sixMonthsAhead.setMonth(now.getMonth() + 6);
    
    // Fetch reservations from Guesty API using the client
    const response = await guestyClient.getReservations({
      limit: 100,
      checkIn: { $gte: oneMonthAgo.toISOString() },
      checkOut: { $lte: sixMonthsAhead.toISOString() }
    });
    
    const reservations = response.data || [];
    
    if (!Array.isArray(reservations)) {
      throw new Error("Invalid response format from Guesty API");
    }
    
    console.log(`Retrieved ${reservations.length} reservations from Guesty API`);
    
    // Process each reservation
    const errors: string[] = [];
    let successCount = 0;
    
    for (const reservation of reservations) {
      try {
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
        
        successCount++;
      } catch (error) {
        const errorMessage = `Error processing reservation ${reservation._id}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }
    
    // Complete sync log
    const endTime = new Date();
    
    const syncResult: InsertGuestySyncLog = {
      syncType: "reservations",
      status: errors.length > 0 ? "partial" : "success",
      propertiesCount: null,
      reservationsCount: successCount,
      errorMessage: errors.length > 0 ? errors.join("; ") : null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: true,
      message: `Successfully synced ${successCount} of ${reservations.length} reservations`,
      reservations_synced: successCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error syncing reservations:", error);
    
    const syncResult: InsertGuestySyncLog = {
      syncType: "reservations",
      status: "failed",
      propertiesCount: null,
      reservationsCount: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: `Error syncing reservations: ${error instanceof Error ? error.message : "Unknown error"}`,
      reservations_synced: 0
    };
  }
}

/**
 * Run a full sync of both properties and reservations
 * @returns Object with combined sync results
 */
export async function syncAll(): Promise<{
  success: boolean;
  message: string;
  properties_synced: number;
  reservations_synced: number;
  sync_status: string;
}> {
  try {
    const propertiesResult = await syncProperties();
    const reservationsResult = await syncReservations();
    
    const success = propertiesResult.success || reservationsResult.success;
    let status = "failed";
    
    if (propertiesResult.success && reservationsResult.success) {
      status = "complete";
    } else if (propertiesResult.success || reservationsResult.success) {
      status = "partial";
    }
    
    return {
      success,
      message: `Properties: ${propertiesResult.message}. Reservations: ${reservationsResult.message}`,
      properties_synced: propertiesResult.properties_synced || 0,
      reservations_synced: reservationsResult.reservations_synced || 0,
      sync_status: status
    };
  } catch (error) {
    console.error("Error during full Guesty sync:", error);
    return {
      success: false,
      message: `Error during full sync: ${error instanceof Error ? error.message : "Unknown error"}`,
      properties_synced: 0,
      reservations_synced: 0,
      sync_status: "failed"
    };
  }
}

/**
 * Get the latest sync log
 * @returns The latest sync log entry
 */
export async function getLatestSyncLog(): Promise<any> {
  try {
    const logs = await db
      .select()
      .from(guestySyncLogs)
      .orderBy(desc(guestySyncLogs.syncDate))
      .limit(5);
    
    if (logs.length === 0) {
      return null;
    }
    
    // Calculate overall status
    const latestPropertiesSync = logs.find(log => log.syncType === "properties");
    const latestReservationsSync = logs.find(log => log.syncType === "reservations");
    
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    // Check if syncs are recent (within last 24 hours)
    const propertiesRecent = latestPropertiesSync && latestPropertiesSync.syncDate 
      && new Date(latestPropertiesSync.syncDate) > oneDayAgo;
    const reservationsRecent = latestReservationsSync && latestReservationsSync.syncDate 
      && new Date(latestReservationsSync.syncDate) > oneDayAgo;
    
    // Check if syncs were successful
    const propertiesSuccess = latestPropertiesSync && latestPropertiesSync.status !== "failed";
    const reservationsSuccess = latestReservationsSync && latestReservationsSync.status !== "failed";
    
    let overallStatus = "unknown";
    
    if (propertiesRecent && reservationsRecent) {
      if (propertiesSuccess && reservationsSuccess) {
        overallStatus = "healthy";
      } else if (propertiesSuccess || reservationsSuccess) {
        overallStatus = "partial";
      } else {
        overallStatus = "error";
      }
    } else if (propertiesRecent || reservationsRecent) {
      overallStatus = "stale";
    } else {
      overallStatus = "outdated";
    }
    
    return {
      latest_logs: logs,
      properties_sync: latestPropertiesSync,
      reservations_sync: latestReservationsSync,
      status: overallStatus,
      last_sync: logs[0].syncDate
    };
  } catch (error) {
    console.error("Error fetching sync logs:", error);
    return null;
  }
}