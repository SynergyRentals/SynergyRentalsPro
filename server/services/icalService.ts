import ical from 'node-ical';
import axios from 'axios';

interface ICalEvent {
  id: string;
  summary: string;
  description: string | null;
  start: Date;
  end: Date;
  location: string | null;
  created: Date | null;
  lastModified: Date | null;
  status: string | null;
  organizer: string | null;
}

/**
 * Fetch and parse iCal data from a URL
 * @param icalUrl - URL to the iCal file
 * @returns Array of parsed calendar events
 */
export async function getCalendarEvents(icalUrl: string): Promise<ICalEvent[]> {
  try {
    // Fetch the iCal data
    const response = await axios.get(icalUrl);
    const icalData = response.data;
    
    // Parse the iCal data
    const parsedEvents = ical.parseICS(icalData);
    
    // Convert to our event format
    const events: ICalEvent[] = [];
    
    for (const [key, event] of Object.entries(parsedEvents)) {
      if (event.type !== 'VEVENT') {
        continue;
      }
      
      events.push({
        id: key,
        summary: event.summary || 'Untitled Event',
        description: event.description || null,
        start: event.start,
        end: event.end,
        location: event.location || null,
        created: event.created || null,
        lastModified: event.lastmodified || null,
        status: event.status || null,
        organizer: typeof event.organizer === 'string' ? event.organizer : event.organizer?.params?.CN || null
      });
    }
    
    // Sort events by start date
    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  } catch (error) {
    console.error('Error fetching or parsing iCal data:', error);
    throw new Error('Failed to fetch or parse iCal data');
  }
}

export { ICalEvent };