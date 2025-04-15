import fetch from "node-fetch";
import { db } from "./db";
import { 
  guestyProperties, guestyReservations, guestySyncLogs,
  InsertGuestyProperty, InsertGuestyReservation, InsertGuestySyncLog
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Guesty OAuth2 configuration
const GUESTY_CLIENT_ID = process.env.GUESTY_CLIENT_ID;
const GUESTY_CLIENT_SECRET = process.env.GUESTY_CLIENT_SECRET;
const BASE_URL = "https://api.guesty.com/api/v2";
const OAUTH_URL = "https://login.guesty.com/oauth2/aus1p8qrh53CcQTI95d7/v1/token";

// Token storage - in production this should be stored in a database
interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // timestamp when the token expires
}

// In-memory token cache
let tokenCache: TokenData | null = {
  // Use the provided OAuth2 token from the updated information
  access_token: "eyJraWQiOiJwNTVFdjZtU1lNLVN3blliNmVZQTZ6elptSkQxSm1KMmNLSEhTejhqMDhNIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULkJKR0xWb0JiX1FrckR6MHZGVi1OQk9IQ2RnMnVUUFdId3VzREliVUh3QmsiLCJpc3MiOiJodHRwczovL2xvZ2luLmd1ZXN0eS5jb20vb2F1dGgyL2F1czFwOHFyaDUzQ2NRVEk5NWQ3IiwiYXVkIjoiaHR0cHM6Ly9vcGVuLWFwaS5ndWVzdHkuY29tIiwiaWF0IjoxNzQ0NjkwMDMzLCJleHAiOjE3NDQ3NzY0MzMsImNpZCI6IjBvYW9hYWxqMmJEMkNhRjRCNWQ3Iiwic2NwIjpbIm9wZW4tYXBpIl0sInJlcXVlc3RlciI6IkVYVEVSTkFMIiwiYWNjb3VudElkIjo3",
  refresh_token: "", // We weren't provided a refresh token
  expires_at: Date.now() + (86400 * 1000) // Set expiration based on expires_in (86400 seconds)
};

/**
 * Get a valid OAuth2 access token, retrieving a new one if necessary
 * @returns A valid access token
 */
export async function getAccessToken(): Promise<string> {
  if (!GUESTY_CLIENT_ID || !GUESTY_CLIENT_SECRET) {
    throw new Error("Guesty OAuth credentials are not configured. Please set GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET environment variables.");
  }

  // Since we have pre-configured the token and know it's valid,
  // just return it directly during development
  if (tokenCache && tokenCache.access_token) {
    return tokenCache.access_token;
  }

  // The code below is kept for production use when the token expires
  
  // Check if we have a valid cached token
  const now = Date.now();
  if (tokenCache && tokenCache.expires_at > now + 60000) { // Add 1 minute buffer
    return tokenCache.access_token;
  }

  // If we have a refresh token, try to use it
  if (tokenCache && tokenCache.refresh_token) {
    try {
      const newToken = await refreshAccessToken(tokenCache.refresh_token);
      return newToken;
    } catch (error) {
      console.error('Error refreshing token, will try to get a new one', error);
      // If refresh fails, continue to get a new token
    }
  }

  // Get a new token using client credentials flow
  return await getNewAccessToken();
}

/**
 * Get a new OAuth2 access token using client credentials flow
 * @returns A new access token
 */
async function getNewAccessToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', GUESTY_CLIENT_ID!);
  params.append('client_secret', GUESTY_CLIENT_SECRET!);
  params.append('scope', 'users listings reservations');

  try {
    const response = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Guesty OAuth error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Cache the token
    tokenCache = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '', // May not be provided in client credentials flow
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting new access token:', error);
    throw error;
  }
}

/**
 * Refresh an OAuth2 access token using a refresh token
 * @param refreshToken The refresh token
 * @returns A new access token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', GUESTY_CLIENT_ID!);
  params.append('client_secret', GUESTY_CLIENT_SECRET!);
  params.append('refresh_token', refreshToken);

  try {
    const response = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Guesty OAuth refresh error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Update the token cache
    tokenCache = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
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
  // Get a valid access token
  const accessToken = await getAccessToken();
  
  const url = `${BASE_URL}${endpoint}`;
  const options: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
  };
  
  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // If unauthorized, try to refresh the token and retry once
      if (response.status === 401) {
        // Clear token cache to force a new token request
        tokenCache = null;
        const newAccessToken = await getAccessToken();
        
        // Retry the request with the new token
        options.headers.Authorization = `Bearer ${newAccessToken}`;
        const retryResponse = await fetch(url, options);
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`Guesty API error after token refresh (${retryResponse.status}): ${errorText}`);
        }
        
        return await retryResponse.json();
      }
      
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
  if (!GUESTY_CLIENT_ID || !GUESTY_CLIENT_SECRET) {
    const syncResult: InsertGuestySyncLog = {
      syncType: "properties",
      status: "failed",
      errorMessage: "Guesty OAuth credentials not configured",
      propertiesCount: 0,
      reservationsCount: null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: "Guesty OAuth credentials not configured. Please set GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET environment variables.",
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
  if (!GUESTY_CLIENT_ID || !GUESTY_CLIENT_SECRET) {
    const syncResult: InsertGuestySyncLog = {
      syncType: "reservations",
      status: "failed",
      errorMessage: "Guesty OAuth credentials not configured",
      propertiesCount: null,
      reservationsCount: 0
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      success: false,
      message: "Guesty OAuth credentials not configured. Please set GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET environment variables.",
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