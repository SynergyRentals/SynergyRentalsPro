import fetch from "node-fetch";
import { db } from "./db";
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Check if Guesty API keys are configured
const GUESTY_API_KEY = process.env.GUESTY_API_KEY;
const GUESTY_API_SECRET = process.env.GUESTY_API_SECRET;

const BASE_URL = "https://api.guesty.com/api/v2";

// Configure the API authentication
const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Basic ${Buffer.from(`${GUESTY_API_KEY}:${GUESTY_API_SECRET}`).toString("base64")}`
};

/**
 * Make a request to the Guesty API
 * @param endpoint - API endpoint path
 * @param method - HTTP method
 * @param data - Optional data for POST/PUT requests
 * @returns API response JSON
 */
async function makeGuestyRequest(endpoint: string, method: string = "GET", data: any = null) {
  if (!GUESTY_API_KEY || !GUESTY_API_SECRET) {
    throw new Error("Guesty API credentials are not configured. Please set GUESTY_API_KEY and GUESTY_API_SECRET environment variables.");
  }
  
  const url = `${BASE_URL}${endpoint}`;
  const options: any = {
    method,
    headers: authHeaders,
  };
  
  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Guesty API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
  if (!GUESTY_API_KEY || !GUESTY_API_SECRET) {
    const syncResult: InsertGuestySyncLog = {
      syncType: "properties",
      status: "failed",
      errorMessage: "Guesty API credentials not configured",
      propertiesCount: 0,
      reservationsCount: null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: "Guesty API credentials not configured. Please set GUESTY_API_KEY and GUESTY_API_SECRET environment variables.",
    };
  }
  
  try {
    // Start sync log
    const startTime = new Date();
    console.log("Starting Guesty properties sync at:", startTime.toISOString());
    
    // Fetch properties from Guesty API
    const response = await makeGuestyRequest("/listings?limit=100");
    const properties = response.results || [];
    
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
          .where(eq(guestyProperties.guestyId, cleanedProperty.guestyId))
          .limit(1);
        
        if (existingProperty.length > 0) {
          // Update existing property
          await db.update(guestyProperties)
            .set({
              ...cleanedProperty,
              updatedAt: new Date()
            })
            .where(eq(guestyProperties.guestyId, cleanedProperty.guestyId));
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
  if (!GUESTY_API_KEY || !GUESTY_API_SECRET) {
    const syncResult: InsertGuestySyncLog = {
      syncType: "reservations",
      status: "failed",
      errorMessage: "Guesty API credentials not configured",
      propertiesCount: null,
      reservationsCount: 0
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: "Guesty API credentials not configured. Please set GUESTY_API_KEY and GUESTY_API_SECRET environment variables.",
    };
  }
  
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
    
    // Fetch reservations from Guesty API with date filtering
    const queryParams = `?checkIn[$gte]=${oneMonthAgo.toISOString()}&checkOut[$lte]=${sixMonthsAhead.toISOString()}&limit=100`;
    const response = await makeGuestyRequest(`/reservations${queryParams}`);
    const reservations = response.results || [];
    
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
          .where(eq(guestyReservations.guestyId, cleanedReservation.guestyId))
          .limit(1);
        
        if (existingReservation.length > 0) {
          // Update existing reservation
          await db.update(guestyReservations)
            .set({
              ...cleanedReservation,
              updatedAt: new Date()
            })
            .where(eq(guestyReservations.guestyId, cleanedReservation.guestyId));
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
      .orderBy(desc(guestySyncLogs.startTime as any))
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