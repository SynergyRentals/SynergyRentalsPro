import ical from 'node-ical';
import https from 'https';
import http from 'http';

export interface CalendarEvent {
  start: Date;
  end: Date;
  title: string;
  uid: string;
  status?: string;
}

/**
 * Validate if a URL is properly formatted and accessible
 * @param url URL to validate
 * @returns True if URL is valid, false otherwise
 */
async function validateUrl(url: string): Promise<boolean> {
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
          res.on('data', () => {});
          resolve(res.statusCode >= 200 && res.statusCode < 400);
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
  try {
    console.log(`Fetching iCal data from: ${url}`);
    
    // First validate the URL
    const isValid = await validateUrl(url);
    if (!isValid) {
      console.error(`Invalid or inaccessible iCal URL: ${url}`);
      throw new Error('Invalid or inaccessible URL');
    }
    
    const data = await ical.async.fromURL(url);
    
    // Process the events
    const events = Object.values(data)
      .filter(event => event.type === 'VEVENT')
      .map(event => ({
        start: event.start,
        end: event.end,
        title: event.summary || 'Reservation',
        uid: event.uid || crypto.randomUUID(), // Generate a UID if not provided
        status: event.status || 'confirmed'
      }));
    
    console.log(`Successfully parsed ${events.length} events from iCal feed`);
    return events;
  } catch (error) {
    console.error('Error parsing iCal feed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', error);
    }
    throw new Error(`Failed to parse iCal feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simple cache implementation for iCal data
 * Caches results for 60 minutes to avoid overloading external services
 */
const icalCache = new Map<string, { 
  data: CalendarEvent[], 
  timestamp: number,
  error?: { message: string, timestamp: number } 
}>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes in milliseconds
const ERROR_CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds for errors

/**
 * Get calendar events with caching
 * @param url The URL of the iCal feed
 * @returns Array of calendar events
 */
export async function getCachedCalendarEvents(url: string): Promise<CalendarEvent[]> {
  if (!url || url.trim() === '') {
    console.error('Empty iCal URL provided');
    throw new Error('Empty or invalid iCal URL');
  }
  
  const now = Date.now();
  const cachedData = icalCache.get(url);
  
  // If we have cached error and it's still within the error cache period,
  // don't retry immediately to avoid hammering external services
  if (cachedData?.error && (now - cachedData.error.timestamp < ERROR_CACHE_TTL)) {
    console.log(`Using cached error for iCal URL: ${url}, Error: ${cachedData.error.message}`);
    throw new Error(`Cached error: ${cachedData.error.message}`);
  }
  
  // Return cached data if it exists and is still valid
  if (cachedData?.data && (now - cachedData.timestamp < CACHE_TTL)) {
    console.log(`Using cached iCal data for: ${url} (${cachedData.data.length} events)`);
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
      // Clear any previous error
      error: undefined 
    });
    
    return events;
  } catch (error) {
    // Cache the error to prevent hammering the service
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching calendar data';
    console.error(`Error fetching iCal data for URL: ${url}`, errorMessage);
    
    // If we have previous valid data, return it even though it's expired
    if (cachedData?.data && cachedData.data.length > 0) {
      console.log(`Returning stale cached data due to fetch error for: ${url}`);
      
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
      error: { message: errorMessage, timestamp: now } 
    });
    
    throw new Error(`Failed to fetch calendar data: ${errorMessage}`);
  }
}