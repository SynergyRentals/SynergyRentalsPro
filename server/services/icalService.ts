import ical from 'node-ical';

export interface CalendarEvent {
  start: Date;
  end: Date;
  title: string;
  uid: string;
}

/**
 * Parse an iCal feed from a URL and return a list of calendar events
 * @param url The URL of the iCal feed
 * @returns Array of calendar events
 */
export async function getCalendarEvents(url: string): Promise<CalendarEvent[]> {
  try {
    console.log(`Fetching iCal data from: ${url}`);
    const data = await ical.async.fromURL(url);
    
    // Process the events
    const events = Object.values(data)
      .filter(event => event.type === 'VEVENT')
      .map(event => ({
        start: event.start,
        end: event.end,
        title: event.summary || 'Reservation',
        uid: event.uid || crypto.randomUUID(), // Generate a UID if not provided
      }));
    
    console.log(`Parsed ${events.length} events from iCal feed`);
    return events;
  } catch (error) {
    console.error('Error parsing iCal feed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', error);
    }
    throw new Error('Failed to parse iCal feed');
  }
}

/**
 * Simple cache implementation for iCal data
 * Caches results for 60 minutes to avoid overloading external services
 */
const icalCache = new Map<string, { data: CalendarEvent[], timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes in milliseconds

/**
 * Get calendar events with caching
 * @param url The URL of the iCal feed
 * @returns Array of calendar events
 */
export async function getCachedCalendarEvents(url: string): Promise<CalendarEvent[]> {
  const now = Date.now();
  const cachedData = icalCache.get(url);
  
  // Return cached data if it exists and is still valid
  if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
    console.log(`Using cached iCal data for: ${url}`);
    return cachedData.data;
  }
  
  // Otherwise fetch new data
  const events = await getCalendarEvents(url);
  
  // Cache the results
  icalCache.set(url, { data: events, timestamp: now });
  
  return events;
}