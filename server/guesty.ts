import axios from 'axios';
import { db } from './db';
import { 
  guestyProperties, insertGuestyPropertySchema, 
  guestyReservations, insertGuestyReservationSchema,
  guestySyncLogs, insertGuestySyncLogSchema,
  type InsertGuestyProperty, type InsertGuestyReservation, type InsertGuestySyncLog
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Base Guesty API configuration
const GUESTY_API_BASE_URL = 'https://open-api.guesty.com/v1';

// Check if API key is available
if (!process.env.GUESTY_API_KEY) {
  console.warn('GUESTY_API_KEY environment variable is not set. Guesty API functionality will be disabled.');
}

// Create axios instance for Guesty API
const guestyApi = axios.create({
  baseURL: GUESTY_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${process.env.GUESTY_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add response interceptor for error handling
guestyApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Guesty API Error:', {
        status: error.response.status,
        data: error.response.data,
        endpoint: error.config.url,
        method: error.config.method
      });
      
      if (error.response.status === 401) {
        throw new Error('Guesty API authentication failed. Please check your API key.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Guesty API No Response:', error.request);
      throw new Error('No response received from Guesty API. Please check your internet connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Guesty API Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Helper function to clean property data
function cleanPropertyData(property: any): InsertGuestyProperty {
  return {
    propertyId: property.id,
    name: property.title || 'Unnamed Property',
    address: property.address?.full || 'No address provided',
    bedrooms: property.accommodations?.bedrooms || null,
    bathrooms: property.accommodations?.bathrooms || null,
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    listingUrl: property.publicUrl || null,
  };
}

// Helper function to clean reservation data
function cleanReservationData(reservation: any): InsertGuestyReservation {
  return {
    reservationId: reservation.id,
    guestName: `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim() || 'Unknown Guest',
    guestEmail: reservation.guest?.email || null,
    propertyId: reservation.listingId,
    checkIn: new Date(reservation.checkIn),
    checkOut: new Date(reservation.checkOut),
    status: reservation.status || 'unknown',
    channel: reservation.source || null,
    totalPrice: reservation.money?.netAmount ? Math.round(reservation.money.netAmount * 100) : null, // Convert to cents
  };
}

/**
 * Fetches properties from Guesty API and stores them in the database
 * @returns Object with sync results
 */
export async function syncProperties(): Promise<{ 
  count: number, 
  success: boolean, 
  message: string 
}> {
  // If API key is not set, return early
  if (!process.env.GUESTY_API_KEY) {
    return { 
      count: 0, 
      success: false, 
      message: 'GUESTY_API_KEY environment variable is not set'
    };
  }
  
  try {
    // Fetch properties from Guesty API
    const response = await guestyApi.get('/listings', {
      params: {
        limit: 100,
        fields: 'id,title,address,accommodations,amenities,publicUrl',
        // Filter for active properties only
        filters: JSON.stringify({
          isActive: true
        })
      }
    });
    
    const properties = response.data.results || [];
    
    // Process each property
    let newCount = 0;
    let updatedCount = 0;
    
    for (const property of properties) {
      const cleanProperty = cleanPropertyData(property);
      
      // Check if property already exists
      const existingProperty = await db.select()
        .from(guestyProperties)
        .where(eq(guestyProperties.propertyId, cleanProperty.propertyId))
        .limit(1);
      
      if (existingProperty.length === 0) {
        // Insert new property
        await db.insert(guestyProperties).values(cleanProperty);
        newCount++;
      } else {
        // Update existing property
        await db.update(guestyProperties)
          .set({ 
            name: cleanProperty.name,
            address: cleanProperty.address,
            bedrooms: cleanProperty.bedrooms,
            bathrooms: cleanProperty.bathrooms,
            amenities: cleanProperty.amenities,
            listingUrl: cleanProperty.listingUrl,
            updatedAt: new Date()
          })
          .where(eq(guestyProperties.propertyId, cleanProperty.propertyId));
        updatedCount++;
      }
    }
    
    // Log sync results
    const syncResult: InsertGuestySyncLog = {
      syncType: 'properties',
      status: 'success',
      propertiesCount: newCount + updatedCount,
      errorMessage: null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      count: newCount + updatedCount,
      success: true,
      message: `Successfully synced ${newCount} new and ${updatedCount} updated properties from Guesty`
    };
    
  } catch (error) {
    // Log sync error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const syncResult: InsertGuestySyncLog = {
      syncType: 'properties',
      status: 'error',
      propertiesCount: 0,
      errorMessage: errorMessage
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      count: 0,
      success: false,
      message: `Failed to sync properties: ${errorMessage}`
    };
  }
}

/**
 * Fetches reservations from Guesty API and stores them in the database
 * @returns Object with sync results
 */
export async function syncReservations(): Promise<{ 
  count: number, 
  success: boolean, 
  message: string 
}> {
  // If API key is not set, return early
  if (!process.env.GUESTY_API_KEY) {
    return { 
      count: 0, 
      success: false, 
      message: 'GUESTY_API_KEY environment variable is not set'
    };
  }
  
  try {
    // Calculate dates for filtering (last 30 days and future)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Fetch reservations from Guesty API
    const response = await guestyApi.get('/reservations', {
      params: {
        limit: 100,
        fields: 'id,listingId,guest,checkIn,checkOut,status,source,money',
        filters: JSON.stringify({
          checkIn: {
            $gte: thirtyDaysAgo.toISOString().split('T')[0] // Format as YYYY-MM-DD
          }
        })
      }
    });
    
    const reservations = response.data.results || [];
    
    // Process each reservation
    let newCount = 0;
    let updatedCount = 0;
    
    for (const reservation of reservations) {
      const cleanReservation = cleanReservationData(reservation);
      
      // Check if reservation already exists
      const existingReservation = await db.select()
        .from(guestyReservations)
        .where(eq(guestyReservations.reservationId, cleanReservation.reservationId))
        .limit(1);
      
      if (existingReservation.length === 0) {
        // Insert new reservation
        await db.insert(guestyReservations).values(cleanReservation);
        newCount++;
      } else {
        // Update existing reservation
        await db.update(guestyReservations)
          .set({ 
            guestName: cleanReservation.guestName,
            guestEmail: cleanReservation.guestEmail,
            checkIn: cleanReservation.checkIn,
            checkOut: cleanReservation.checkOut,
            status: cleanReservation.status,
            channel: cleanReservation.channel,
            totalPrice: cleanReservation.totalPrice,
            updatedAt: new Date()
          })
          .where(eq(guestyReservations.reservationId, cleanReservation.reservationId));
        updatedCount++;
      }
    }
    
    // Log sync results
    const syncResult: InsertGuestySyncLog = {
      syncType: 'reservations',
      status: 'success',
      reservationsCount: newCount + updatedCount,
      errorMessage: null
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      count: newCount + updatedCount,
      success: true,
      message: `Successfully synced ${newCount} new and ${updatedCount} updated reservations from Guesty`
    };
    
  } catch (error) {
    // Log sync error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const syncResult: InsertGuestySyncLog = {
      syncType: 'reservations',
      status: 'error',
      reservationsCount: 0,
      errorMessage: errorMessage
    };
    
    await db.insert(guestySyncLogs).values(syncResult);
    
    return {
      count: 0,
      success: false,
      message: `Failed to sync reservations: ${errorMessage}`
    };
  }
}

/**
 * Run a full sync of both properties and reservations
 * @returns Object with combined sync results
 */
export async function syncAll(): Promise<{
  properties_synced: number,
  reservations_synced: number,
  sync_status: string
}> {
  const propertiesResult = await syncProperties();
  const reservationsResult = await syncReservations();
  
  const sync_status = propertiesResult.success && reservationsResult.success 
    ? 'success' 
    : 'error';
  
  return {
    properties_synced: propertiesResult.count,
    reservations_synced: reservationsResult.count,
    sync_status
  };
}

/**
 * Get the latest sync log
 * @returns The latest sync log entry
 */
export async function getLatestSyncLog(): Promise<any> {
  const logs = await db.select()
    .from(guestySyncLogs)
    .orderBy(guestySyncLogs.syncDate, 'desc')
    .limit(1);
  
  return logs[0] || null;
}