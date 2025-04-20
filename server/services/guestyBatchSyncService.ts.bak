/**
 * Guesty Batch Sync Service
 * 
 * Handles batch synchronization of Guesty data while respecting rate limits.
 * This service provides functionality to sync properties and reservations
 * in the most efficient way possible given the strict 5 requests per 24 hours limit.
 */
import { storage } from '../storage';
import { guestyApiClient } from '../lib/guestyApiClient';
import { checkBatchRateLimit } from '../lib/guestyRateLimiter';
import { RateLimitError } from '../lib/guestyApiClient';
import { 
  InsertGuestySyncLog, 
  InsertGuestyProperty,
  InsertGuestyReservation
} from '@shared/schema';

// Sync status constants
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited',
}

// Sync types
export enum SyncType {
  PROPERTIES = 'properties',
  RESERVATIONS = 'reservations',
  PROPERTY_DETAILS = 'property_details',
  ALL = 'all',
}

// Error types
export enum SyncErrorType {
  RATE_LIMIT = 'rate_limit',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN = 'unknown',
}

// Basic response interface
interface SyncResponse {
  success: boolean;
  message: string;
  syncLogId?: number;
  error?: {
    type: SyncErrorType;
    details: string;
  };
}

// Rate limit status interface
interface RateLimitStatus {
  isRateLimited: boolean;
  requestsRemaining: number;
  nextAvailableTimestamp: Date | null;
  message: string;
}

/**
 * Creates a new sync log record
 */
async function createSyncLog(type: SyncType): Promise<number> {
  const syncLog = await storage.createGuestySyncLog({
    syncType: type,
    status: SyncStatus.PENDING,
    syncDate: new Date(),
    startedAt: new Date(),
    completedAt: null,
    itemsProcessed: 0,
    propertiesCount: null,
    reservationsCount: null,
    errorMessage: null,
    notes: null,
  });
  
  return syncLog.id;
}

/**
 * Updates an existing sync log
 */
async function updateSyncLog(
  logId: number,
  updates: Partial<InsertGuestySyncLog>
): Promise<void> {
  await storage.updateGuestySyncLog(logId, updates);
}

/**
 * Mark sync log as completed
 */
async function completeSyncLog(
  logId: number,
  itemsProcessed: number,
  itemsTotal: number
): Promise<void> {
  await updateSyncLog(logId, {
    status: SyncStatus.COMPLETED,
    completedAt: new Date(),
    itemsProcessed,
    notes: `Successfully processed ${itemsProcessed} of ${itemsTotal} items`,
  });
}

/**
 * Mark sync log as failed
 */
async function failSyncLog(
  logId: number,
  error: string,
  errorType: SyncErrorType = SyncErrorType.UNKNOWN
): Promise<void> {
  await updateSyncLog(logId, {
    status: SyncStatus.FAILED,
    completedAt: new Date(),
    errorMessage: error,
    notes: `Sync failed: ${errorType} - ${error}`,
  });
}

/**
 * Mark sync log as rate limited
 */
async function rateLimitSyncLog(
  logId: number,
  nextAvailableTime: Date | null,
  message: string
): Promise<void> {
  await updateSyncLog(logId, {
    status: SyncStatus.RATE_LIMITED,
    completedAt: new Date(),
    errorMessage: message,
    notes: `Rate limited: ${message}. Next available: ${nextAvailableTime ? nextAvailableTime.toISOString() : 'unknown'}`,
  });
}

/**
 * Check if we can initiate a new sync operation based on required API calls
 */
async function canInitiateSync(requiredApiCalls: number): Promise<RateLimitStatus> {
  return await checkBatchRateLimit(requiredApiCalls);
}

/**
 * Format a Guesty property for storage
 */
function formatGuestyProperty(data: any): InsertGuestyProperty {
  return {
    guestyId: data._id,
    name: data.title || 'Unnamed Property',
    address: data.address?.full || '',
    city: data.address?.city || null,
    state: data.address?.state || null,
    zipCode: data.address?.zipcode || null,
    country: data.address?.country || null,
    bedrooms: data.bedrooms || null,
    bathrooms: data.bathrooms || null,
    beds: data.beds || null,
    accommodates: data.accommodates || null,
    propertyType: data.propertyType || null,
    roomType: data.roomType || null,
    listingUrl: data.listingUrl || null,
    picture: data.picture?.regular || null,
    latitude: data.address?.location?.lat || null,
    longitude: data.address?.location?.lng || null,
    propertyData: JSON.stringify(data),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Format a Guesty reservation for storage
 */
function formatGuestyReservation(data: any, propertyId: string): InsertGuestyReservation {
  return {
    guestyId: data._id,
    guestyPropertyId: propertyId,
    propertyId: data.listing?.id || null,
    guestId: data.guest?._id || null,
    reservationId: data.reservationId || null,
    confirmationCode: data.confirmationCode || null,
    guestName: data.guest?.fullName || 'Unknown Guest',
    guestEmail: data.guest?.email || null,
    guestPhone: data.guest?.phone || null,
    checkIn: new Date(data.checkIn),
    checkOut: new Date(data.checkOut),
    status: data.status || 'unknown',
    source: data.source || null,
    channel: data.channel || null,
    totalPrice: data.money?.netAmount || null,
    money: data.money || null,
    adults: data.guests?.adults || 0,
    children: data.guests?.children || 0,
    infants: data.guests?.infants || 0,
    pets: data.guests?.pets || 0,
    totalGuests: data.guests?.total || 1,
    reservationData: JSON.stringify(data),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Sync all properties (summary data)
 */
export async function syncProperties(): Promise<SyncResponse> {
  // Create a new sync log
  const syncLogId = await createSyncLog(SyncType.PROPERTIES);
  
  try {
    // Check if we have enough API calls (we need at least 1)
    const rateLimitStatus = await canInitiateSync(1);
    if (rateLimitStatus.isRateLimited) {
      await rateLimitSyncLog(
        syncLogId,
        rateLimitStatus.nextAvailableTimestamp,
        rateLimitStatus.message
      );
      
      return {
        success: false,
        message: rateLimitStatus.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: rateLimitStatus.message,
        },
      };
    }
    
    // Update sync log to in progress
    await updateSyncLog(syncLogId, {
      status: SyncStatus.IN_PROGRESS,
    });
    
    // Get properties from Guesty API (we'll get up to 100 properties in a single request)
    const response = await guestyApiClient.getProperties(100, 0);
    
    if (!response || !response.results) {
      throw new Error('Invalid response from Guesty API');
    }
    
    const properties = response.results;
    const totalCount = response.count || properties.length;
    
    // Process each property
    let processedCount = 0;
    for (const propertyData of properties) {
      // Check if property already exists
      const existingProperty = await storage.getGuestyPropertyByGuestyId(propertyData._id);
      
      if (existingProperty) {
        // Update existing property
        await storage.updateGuestyProperty(existingProperty.id, {
          name: propertyData.title || existingProperty.name,
          address: propertyData.address?.full || existingProperty.address,
          city: propertyData.address?.city || existingProperty.city,
          state: propertyData.address?.state || existingProperty.state,
          zipCode: propertyData.address?.zipcode || existingProperty.zipCode,
          propertyData: JSON.stringify(propertyData),
          updatedAt: new Date(),
        });
      } else {
        // Create new property
        await storage.createGuestyProperty(formatGuestyProperty(propertyData));
      }
      
      processedCount++;
      
      // Update progress
      await updateSyncLog(syncLogId, {
        itemsProcessed: processedCount,
        itemsTotal: totalCount,
      });
    }
    
    // Mark as completed
    await completeSyncLog(syncLogId, processedCount, totalCount);
    
    return {
      success: true,
      message: `Successfully synced ${processedCount} of ${totalCount} properties`,
      syncLogId,
    };
  } catch (error: any) {
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      await rateLimitSyncLog(
        syncLogId,
        error.nextAvailableTimestamp,
        error.message
      );
      
      return {
        success: false,
        message: error.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: error.message,
        },
      };
    }
    
    // Handle other errors
    const errorMessage = error.message || 'Unknown error';
    await failSyncLog(
      syncLogId,
      errorMessage,
      error.name === 'AuthenticationError' ? SyncErrorType.API_ERROR : SyncErrorType.UNKNOWN
    );
    
    return {
      success: false,
      message: `Failed to sync properties: ${errorMessage}`,
      syncLogId,
      error: {
        type: SyncErrorType.UNKNOWN,
        details: errorMessage,
      },
    };
  }
}

/**
 * Sync all reservations for all properties
 */
export async function syncAllReservations(): Promise<SyncResponse> {
  // Create a new sync log
  const syncLogId = await createSyncLog(SyncType.RESERVATIONS);
  
  try {
    // Get all properties first
    const properties = await storage.getAllGuestyProperties();
    
    if (!properties || properties.length === 0) {
      await failSyncLog(
        syncLogId,
        'No properties found to sync reservations for',
        SyncErrorType.VALIDATION_ERROR
      );
      
      return {
        success: false,
        message: 'No properties found to sync reservations for',
        syncLogId,
        error: {
          type: SyncErrorType.VALIDATION_ERROR,
          details: 'Please sync properties first before syncing reservations',
        },
      };
    }
    
    // We need 1 API call per property for reservations
    const requiredApiCalls = properties.length;
    
    // Check if we have enough API calls
    const rateLimitStatus = await canInitiateSync(requiredApiCalls);
    if (rateLimitStatus.isRateLimited) {
      await rateLimitSyncLog(
        syncLogId,
        rateLimitStatus.nextAvailableTimestamp,
        rateLimitStatus.message
      );
      
      return {
        success: false,
        message: rateLimitStatus.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: rateLimitStatus.message,
        },
      };
    }
    
    // Update sync log to in progress
    await updateSyncLog(syncLogId, {
      status: SyncStatus.IN_PROGRESS,
      itemsTotal: properties.length,
    });
    
    // Sync reservations for each property
    let processedPropertyCount = 0;
    let totalReservationCount = 0;
    
    for (const property of properties) {
      if (!property.guestyId) {
        continue;
      }
      
      try {
        // Get reservations for the property
        const response = await guestyApiClient.getPropertyReservations(property.guestyId);
        
        if (!response || !response.results) {
          continue;
        }
        
        const reservations = response.results;
        
        // Process each reservation
        for (const reservationData of reservations) {
          // Check if reservation already exists
          const existingReservation = await storage.getGuestyReservationByGuestyId(reservationData._id);
          
          if (existingReservation) {
            // Update existing reservation
            await storage.updateGuestyReservation(existingReservation.id, {
              checkIn: new Date(reservationData.checkIn),
              checkOut: new Date(reservationData.checkOut),
              status: reservationData.status || existingReservation.status,
              guestName: reservationData.guest?.fullName || existingReservation.guestName,
              guestEmail: reservationData.guest?.email || existingReservation.guestEmail,
              guestPhone: reservationData.guest?.phone || existingReservation.guestPhone,
              adults: reservationData.guests?.adults || existingReservation.adults,
              children: reservationData.guests?.children || existingReservation.children,
              infants: reservationData.guests?.infants || existingReservation.infants,
              pets: reservationData.guests?.pets || existingReservation.pets,
              totalGuests: reservationData.guests?.total || 1,
              source: reservationData.source || existingReservation.source,
              channel: reservationData.channel || existingReservation.channel,
              totalPrice: reservationData.money?.netAmount || existingReservation.totalPrice,
              reservationData: JSON.stringify(reservationData),
              updatedAt: new Date(),
            });
          } else {
            // Create new reservation
            await storage.createGuestyReservation(formatGuestyReservation(
              reservationData,
              property.guestyId
            ));
          }
          
          totalReservationCount++;
        }
        
        processedPropertyCount++;
        
        // Update progress
        await updateSyncLog(syncLogId, {
          itemsProcessed: processedPropertyCount,
        });
      } catch (error: any) {
        // Log the error but continue with other properties
        console.error(`Error syncing reservations for property ${property.name}:`, error);
      }
    }
    
    // Mark as completed
    await completeSyncLog(
      syncLogId,
      processedPropertyCount,
      properties.length
    );
    
    return {
      success: true,
      message: `Successfully synced reservations for ${processedPropertyCount} properties with ${totalReservationCount} total reservations`,
      syncLogId,
    };
  } catch (error: any) {
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      await rateLimitSyncLog(
        syncLogId,
        error.nextAvailableTimestamp,
        error.message
      );
      
      return {
        success: false,
        message: error.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: error.message,
        },
      };
    }
    
    // Handle other errors
    const errorMessage = error.message || 'Unknown error';
    await failSyncLog(
      syncLogId,
      errorMessage,
      error.name === 'AuthenticationError' ? SyncErrorType.API_ERROR : SyncErrorType.UNKNOWN
    );
    
    return {
      success: false,
      message: `Failed to sync reservations: ${errorMessage}`,
      syncLogId,
      error: {
        type: SyncErrorType.UNKNOWN,
        details: errorMessage,
      },
    };
  }
}

/**
 * Sync reservations for a specific property
 */
export async function syncPropertyReservations(propertyId: number): Promise<SyncResponse> {
  // Create a new sync log
  const syncLogId = await createSyncLog(SyncType.RESERVATIONS);
  
  try {
    // Get the property first
    const property = await storage.getGuestyProperty(propertyId);
    
    if (!property || !property.guestyId) {
      await failSyncLog(
        syncLogId,
        `Property with ID ${propertyId} not found or missing Guesty ID`,
        SyncErrorType.VALIDATION_ERROR
      );
      
      return {
        success: false,
        message: `Property with ID ${propertyId} not found or missing Guesty ID`,
        syncLogId,
        error: {
          type: SyncErrorType.VALIDATION_ERROR,
          details: 'Property not found or missing Guesty ID',
        },
      };
    }
    
    // We need 1 API call
    const rateLimitStatus = await canInitiateSync(1);
    if (rateLimitStatus.isRateLimited) {
      await rateLimitSyncLog(
        syncLogId,
        rateLimitStatus.nextAvailableTimestamp,
        rateLimitStatus.message
      );
      
      return {
        success: false,
        message: rateLimitStatus.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: rateLimitStatus.message,
        },
      };
    }
    
    // Update sync log to in progress
    await updateSyncLog(syncLogId, {
      status: SyncStatus.IN_PROGRESS,
    });
    
    // Get reservations for the property
    const response = await guestyApiClient.getPropertyReservations(property.guestyId);
    
    if (!response || !response.results) {
      throw new Error('Invalid response from Guesty API');
    }
    
    const reservations = response.results;
    const totalCount = reservations.length;
    
    // Process each reservation
    let processedCount = 0;
    
    for (const reservationData of reservations) {
      // Check if reservation already exists
      const existingReservation = await storage.getGuestyReservationByGuestyId(reservationData._id);
      
      if (existingReservation) {
        // Update existing reservation
        await storage.updateGuestyReservation(existingReservation.id, {
          checkIn: new Date(reservationData.checkIn),
          checkOut: new Date(reservationData.checkOut),
          status: reservationData.status || existingReservation.status,
          guestName: reservationData.guest?.fullName || existingReservation.guestName,
          guestEmail: reservationData.guest?.email || existingReservation.guestEmail,
          guestPhone: reservationData.guest?.phone || existingReservation.guestPhone,
          adults: reservationData.guests?.adults || existingReservation.adults,
          children: reservationData.guests?.children || existingReservation.children,
          infants: reservationData.guests?.infants || existingReservation.infants,
          pets: reservationData.guests?.pets || existingReservation.pets,
          totalGuests: reservationData.guests?.total || 1,
          source: reservationData.source || existingReservation.source,
          channel: reservationData.channel || existingReservation.channel,
          totalPrice: reservationData.money?.netAmount || existingReservation.totalPrice,
          reservationData: JSON.stringify(reservationData),
          updatedAt: new Date(),
        });
      } else {
        // Create new reservation
        await storage.createGuestyReservation(formatGuestyReservation(
          reservationData,
          property.guestyId
        ));
      }
      
      processedCount++;
      
      // Update progress
      await updateSyncLog(syncLogId, {
        itemsProcessed: processedCount,
        itemsTotal: totalCount,
      });
    }
    
    // Mark as completed
    await completeSyncLog(syncLogId, processedCount, totalCount);
    
    return {
      success: true,
      message: `Successfully synced ${processedCount} reservations for property ${property.name}`,
      syncLogId,
    };
  } catch (error: any) {
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      await rateLimitSyncLog(
        syncLogId,
        error.nextAvailableTimestamp,
        error.message
      );
      
      return {
        success: false,
        message: error.message,
        syncLogId,
        error: {
          type: SyncErrorType.RATE_LIMIT,
          details: error.message,
        },
      };
    }
    
    // Handle other errors
    const errorMessage = error.message || 'Unknown error';
    await failSyncLog(
      syncLogId,
      errorMessage,
      error.name === 'AuthenticationError' ? SyncErrorType.API_ERROR : SyncErrorType.UNKNOWN
    );
    
    return {
      success: false,
      message: `Failed to sync reservations: ${errorMessage}`,
      syncLogId,
      error: {
        type: SyncErrorType.UNKNOWN,
        details: errorMessage,
      },
    };
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<any> {
  try {
    // Get rate limit status
    const rateLimitStatus = await checkBatchRateLimit(1);
    
    // Get the most recent sync log for each type
    const allLogs = await storage.getAllGuestySyncLogs();
    
    // Group by sync type and find the most recent
    const latestLogs: Record<string, any> = {};
    
    for (const log of allLogs) {
      if (!log.syncType) continue;
      if (!latestLogs[log.syncType] || 
          (log.startedAt && latestLogs[log.syncType]?.startedAt && 
           new Date(log.startedAt) > new Date(latestLogs[log.syncType].startedAt))) {
        latestLogs[log.syncType] = log;
      }
    }
    
    return {
      rateLimitStatus,
      syncLogs: latestLogs,
    };
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    throw new Error(`Failed to get sync status: ${error.message}`);
  }
}

/**
 * Get all sync logs
 */
export async function getAllSyncLogs(): Promise<any[]> {
  try {
    return await storage.getAllGuestySyncLogs();
  } catch (error: any) {
    console.error('Error getting sync logs:', error);
    throw new Error(`Failed to get sync logs: ${error.message}`);
  }
}

/**
 * Update GuestyApiClient credentials
 */
export function setApiCredentials(apiKey: string, apiSecret: string): void {
  guestyApiClient.setCredentials(apiKey, apiSecret);
}