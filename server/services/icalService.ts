import ical from 'node-ical';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { addDays, subDays, isValid } from 'date-fns';
import { isHighTrafficProperty } from './configService';

export interface CalendarEvent {
  start: Date;
  end: Date;
  checkout?: Date; // Explicit checkout date (end date - 1 day)
  title: string;
  uid: string;
  status?: string;
}

/**
 * Utility functions for date handling to ensure consistency between frontend and backend
 */

/**
 * Get the actual checkout date from an iCal end date
 * In iCal standard, the end date is exclusive (the day AFTER the last day of the event)
 * @param endDate The end date from the iCal feed
 * @returns The actual checkout date (end date - 1 day)
 */
export function getCheckoutDate(endDate: Date): Date {
  if (!isValid(endDate)) {
    throw new Error("Invalid date provided to getCheckoutDate");
  }
  
  // First normalize the date to midnight
  const normalizedDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  // Then subtract one day to get the actual checkout date
  return subDays(normalizedDate, 1);
}

/**
 * Ensures a date is valid, returning a fallback if necessary
 * @param date The date to validate
 * @param fallback Optional fallback date (defaults to current date)
 * @returns A valid date
 */
export function ensureValidDate(date: any, fallback: Date = new Date()): Date {
  if (!date) return fallback;
  if (date instanceof Date && isValid(date)) return date;
  
  // Try to parse the date if it's a string
  if (typeof date === 'string') {
    try {
      const parsedDate = new Date(date);
      if (isValid(parsedDate)) return parsedDate;
    } catch (e) {
      console.warn(`Failed to parse date string: ${date}`);
    }
  }
  
  // Return fallback if all else fails
  return fallback;
}

interface iCalEvent {
  type: string;
  uid?: string;
  start?: Date;
  end?: Date;
  summary?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Validate if a URL is properly formatted and accessible
 * @param url URL to validate
 * @returns True if URL is valid, false otherwise
 */
async function validateUrl(url: string): Promise<boolean> {
  // Sanity check for URL parameter
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.error('Empty or non-string URL provided to validateUrl');
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    
    // Check if protocol is supported
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Try to do a HEAD request to check if the URL is accessible
    return new Promise((resolve) => {
      const req = (parsedUrl.protocol === 'https:' ? https : http).request(
        url,
        { method: 'HEAD', timeout: 5000 },
        (res) => {
          // Using ! assertion operator as we've verified these properties exist
          res.on('data', () => {});
          // Check if status code exists and is in the success range
          const statusCode = res.statusCode !== undefined ? res.statusCode : 0;
          resolve(statusCode >= 200 && statusCode < 400);
        }
      );
      
      req.on('error', (err) => {
        console.error(`Error validating URL: ${err.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.error('URL validation timed out');
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    console.error(`Invalid URL format: ${url}`, error);
    return false;
  }
}

/**
 * Parse an iCal feed from a URL and return a list of calendar events
 * @param url The URL of the iCal feed
 * @returns Array of calendar events
 */
export async function getCalendarEvents(url: string): Promise<CalendarEvent[]> {
  // Sanity check for URL parameter
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.error('Empty or non-string URL provided to getCalendarEvents');
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  try {
    console.log(`Fetching iCal data from: ${url}`);
    
    // First validate the URL
    const isValidUrl = await validateUrl(url);
    if (!isValidUrl) {
      console.error(`Invalid or inaccessible iCal URL: ${url}`);
      throw new Error('Invalid or inaccessible URL. Please check that the URL is correct and accessible.');
    }
    
    const data = await ical.async.fromURL(url, {
      // Add options to handle more calendar variations
      headers: {
        'User-Agent': 'Synergy-Rentals/1.0',
        'Accept': 'text/calendar,application/calendar+xml,text/plain'
      },
      timeout: 15000 // Increase timeout to 15 seconds for slow calendar servers
    });
    
    // Check if we got any data
    if (!data || Object.keys(data).length === 0) {
      console.error(`No valid calendar data found at URL: ${url}`);
      throw new Error('No calendar events found. The calendar may be empty or in an unsupported format.');
    }
    
    // Process the events with type checking and error handling
    const events: CalendarEvent[] = [];
    
    try {
      // Get the values from the data object safely
      const entries = Object.entries(data);
      console.log(`Processing ${entries.length} entries from iCal feed`);
      
      for (const [key, rawEvent] of entries) {
        try {
          // Type guard to ensure it's our expected event type
          const event = rawEvent as iCalEvent;
          
          // Only process VEVENT type entries
          if (event.type !== 'VEVENT') {
            console.log(`Skipping non-VEVENT entry of type: ${event.type}`);
            continue;
          }
          
          // Validate that we have valid start and end dates
          if (!event.start || !event.end) {
            console.warn(`Event missing start or end date, skipping: ${event.uid || key || 'unknown'}`);
            continue;
          }
          
          // Verify dates are valid Date objects
          const startIsValid = event.start instanceof Date && !isNaN(event.start.getTime());
          const endIsValid = event.end instanceof Date && !isNaN(event.end.getTime());
          
          if (!startIsValid || !endIsValid) {
            console.warn(`Event has invalid date objects, skipping: ${event.uid || key || 'unknown'}`);
            continue;
          }
          
          // Ensure dates are valid and normalized to midnight
          const validStart = ensureValidDate(event.start);
          const validEnd = ensureValidDate(event.end);
          
          // In iCal format, DTSTART is the first day of the reservation (check-in)
          // DTEND is the day AFTER the last day (exclusive end date)
          
          // Normalize dates to midnight for consistent comparisons
          const normalizedStart = new Date(
            validStart.getFullYear(), 
            validStart.getMonth(), 
            validStart.getDate()
          );
          
          const normalizedEnd = new Date(
            validEnd.getFullYear(), 
            validEnd.getMonth(), 
            validEnd.getDate()
          );
          
          // Calculate checkout date as the day before the end date (since end date is exclusive in iCal)
          const checkoutDate = getCheckoutDate(normalizedEnd);
          
          // Log date processing for debugging
          console.log(`Processing event ${event.uid || 'unknown'}: 
            Original dates: start=${validStart.toISOString()}, end=${validEnd.toISOString()}
            Normalized dates: start=${normalizedStart.toISOString()}, end=${normalizedEnd.toISOString()}
            Checkout date: ${checkoutDate.toISOString()}
          `);
          
          // Create a sanitized event object with normalized dates
          const calendarEvent: CalendarEvent = {
            start: normalizedStart,  // Check-in date (no adjustment needed)
            end: normalizedEnd,      // End date (exclusive in iCal)
            checkout: checkoutDate,  // Actual checkout date (day before end date)
            title: (event.summary && typeof event.summary === 'string') 
              ? event.summary 
              : 'Reservation',
            uid: (event.uid && typeof event.uid === 'string') 
              ? event.uid 
              : crypto.randomUUID(),
            status: (event.status && typeof event.status === 'string')
              ? event.status.toLowerCase() 
              : 'confirmed'
          };
          
          events.push(calendarEvent);
        } catch (itemError) {
          // Log the error but continue processing other events
          console.error(`Error processing calendar event ${key}:`, itemError);
        }
      }
    } catch (processingError) {
      console.error('Error while processing calendar data:', processingError);
      // If we have some events despite the error, return them
      if (events.length > 0) {
        console.log(`Returning ${events.length} events despite processing errors`);
        return events;
      }
      throw new Error('Failed to process calendar data');
    }
    
    // Sort events by start date
    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    console.log(`Successfully parsed ${events.length} events from iCal feed`);
    return events;
  } catch (error) {
    console.error('Error parsing iCal feed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) console.error('Error stack:', error.stack);
      
      // Provide more specific error messages based on common failures
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error(`Cannot connect to calendar server. The domain may be incorrect or the server is unavailable.`);
      } else if (error.message.includes('timeout')) {
        throw new Error(`Connection to calendar server timed out. The server may be slow or unresponsive.`);
      } else if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error(`Authorization failed. This calendar feed may require authentication.`);
      } else if (error.message.includes('404')) {
        throw new Error(`Calendar feed not found (404). The URL may be incorrect or the feed may have been moved.`);
      } else if (error.message.includes('500')) {
        throw new Error(`Calendar server error (500). The server encountered an internal error.`);
      } else {
        throw new Error(`Failed to parse iCal feed: ${error.message}`);
      }
    } else {
      console.error('Unknown error type:', error);
      throw new Error(`Failed to parse iCal feed: Unknown error`);
    }
  }
}

/**
 * Improved cache implementation for iCal data with adaptive TTL
 * Caches results with variable TTL based on property characteristics
 */
const icalCache = new Map<string, { 
  data: CalendarEvent[], 
  timestamp: number,
  propertyId?: number,
  error?: { message: string, timestamp: number } 
}>();

// Cache TTL configuration based on property traffic profile
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for regular properties
const HIGH_TRAFFIC_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for high traffic properties
const ERROR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for error cache

/**
 * Determine the appropriate cache TTL based on property attributes
 * @param propertyId The property ID to get the TTL for
 * @returns The cache TTL in milliseconds
 */
function getCacheTTL(propertyId?: number): number {
  return isHighTrafficProperty(propertyId) ? HIGH_TRAFFIC_CACHE_TTL : CACHE_TTL;
}

/**
 * Clear the iCal cache for a specific URL or all URLs
 * @param url Optional URL to clear from cache. If not provided, clears the entire cache.
 */
export function clearIcalCache(url?: string): void {
  if (url) {
    console.log(`Clearing iCal cache for URL: ${url}`);
    icalCache.delete(url);
  } else {
    console.log('Clearing entire iCal cache');
    icalCache.clear();
  }
}

/**
 * Get calendar events with adaptive caching
 * @param url The URL of the iCal feed
 * @param propertyId Optional property ID for adaptive cache TTL
 * @returns Array of calendar events
 */
export async function getCachedCalendarEvents(url: string, propertyId?: number): Promise<CalendarEvent[]> {
  // Validate URL
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.error('Empty or invalid iCal URL provided to getCachedCalendarEvents');
    throw new Error('Empty or invalid iCal URL');
  }
  
  const now = Date.now();
  const cachedData = icalCache.get(url);
  
  // If we have cached error and it's still within the error cache period,
  // don't retry immediately to avoid hammering external services
  if (cachedData?.error && (now - cachedData.error.timestamp < ERROR_CACHE_TTL)) {
    console.log(`Using cached error for iCal URL: ${url}, Error: ${cachedData.error.message}`);
    throw new Error(`${cachedData.error.message} (cached error, will retry after ${Math.ceil((ERROR_CACHE_TTL - (now - cachedData.error.timestamp)) / 60000)} minutes)`);
  }
  
  // Determine appropriate cache TTL based on property attributes
  const cacheTTL = getCacheTTL(propertyId || cachedData?.propertyId);
  
  // Return cached data if it exists and is still valid
  if (cachedData?.data && (now - cachedData.timestamp < cacheTTL)) {
    console.log(`Using cached iCal data for: ${url} (${cachedData.data.length} events, cached ${Math.floor((now - cachedData.timestamp) / 60000)} minutes ago)`);
    
    // Start a background refresh if cache is getting stale (> 75% of TTL)
    if (now - cachedData.timestamp > cacheTTL * 0.75) {
      console.log(`Starting background refresh for: ${url}`);
      refreshCacheInBackground(url, propertyId);
    }
    
    return cachedData.data;
  }
  
  // Attempt to fetch new data
  try {
    console.log(`Cache miss or expired for iCal URL: ${url}, fetching fresh data`);
    const events = await getCalendarEvents(url);
    
    // Cache the successful results
    icalCache.set(url, { 
      data: events, 
      timestamp: now,
      propertyId, // Store the property ID for future TTL calculations
      error: undefined // Clear any previous error
    });
    
    return events;
  } catch (error) {
    // Cache the error to prevent hammering the service
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching calendar data';
    console.error(`Error fetching iCal data for URL: ${url}`, errorMessage);
    
    // If we have previous valid data, return it even though it's expired
    if (cachedData?.data && cachedData.data.length > 0) {
      console.log(`Returning stale cached data (${cachedData.data.length} events) due to fetch error for: ${url}`);
      
      // Update the cache with the error but keep the stale data
      icalCache.set(url, { 
        ...cachedData,
        error: { message: errorMessage, timestamp: now } 
      });
      
      return cachedData.data;
    }
    
    // No valid data exists, cache the error and throw
    icalCache.set(url, { 
      data: [], 
      timestamp: now,
      propertyId,
      error: { message: errorMessage, timestamp: now } 
    });
    
    throw new Error(`Failed to fetch calendar data: ${errorMessage}`);
  }
}

/**
 * Refreshes the cache in the background without blocking the user request
 * @param url The URL of the iCal feed
 * @param propertyId Optional property ID for cache
 */
async function refreshCacheInBackground(url: string, propertyId?: number): Promise<void> {
  // We use setTimeout to run this asynchronously without blocking
  setTimeout(async () => {
    try {
      console.log(`Executing background refresh for: ${url}`);
      const events = await getCalendarEvents(url);
      
      // Update cache with fresh data
      const now = Date.now();
      icalCache.set(url, { 
        data: events, 
        timestamp: now,
        propertyId,
        error: undefined 
      });
      
      console.log(`Background refresh completed for: ${url}, got ${events.length} events`);
    } catch (error) {
      console.error(`Background refresh failed for: ${url}`, error);
      // Don't update cache on error during background refresh
    }
  }, 100); // Start after a small delay
}

/**
 * Main function to process an iCal URL and return calendar events
 * @param url The URL of the iCal feed
 * @param propertyId Optional property ID for adaptive caching
 * @returns Array of calendar events
 */
export async function processIcalURL(url: string, propertyId?: number): Promise<CalendarEvent[]> {
  try {
    // Get calendar events using the cached function - pass propertyId for adaptive caching
    const events = await getCachedCalendarEvents(url, propertyId);
    
    // Only return future and current events (events that end after now)
    const now = new Date();
    const filteredEvents = events.filter(event => {
      return event.end >= now;
    });
    
    console.log(`Processed iCal URL: ${url} - Found ${events.length} total events, ${filteredEvents.length} future events`);
    return filteredEvents;
  } catch (error) {
    console.error(`Error processing iCal URL: ${url}`, error);
    throw error;
  }
}