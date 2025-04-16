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
  console.log(`Fetching iCal data from URL: ${icalUrl}`);
  try {
    // Fetch the iCal data
    console.log('Making axios request...');
    const response = await axios.get(icalUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Synergy-Rentals-Calendar/1.0'
      }
    });
    console.log('Received response with status:', response.status);
    const icalData = response.data;
    
    if (!icalData || typeof icalData !== 'string') {
      console.error('Invalid iCal data format. Expected string but got:', typeof icalData);
      console.log('iCal data sample:', JSON.stringify(icalData).substring(0, 200) + '...');
      throw new Error('Invalid iCal data format');
    }
    
    // Parse the iCal data
    console.log('Parsing iCal data...');
    try {
      const parsedEvents = ical.parseICS(icalData);
      console.log(`Found ${Object.keys(parsedEvents).length} total items, filtering for events...`);
      
      // Convert to our event format
      const events: ICalEvent[] = [];
      
      for (const [key, event] of Object.entries(parsedEvents)) {
        if (event.type !== 'VEVENT') {
          console.log(`Skipping non-event item of type: ${event.type}`);
          continue;
        }
        
        try {
          if (!event.start || !event.end) {
            console.log(`Skipping event with missing start/end time:`, event);
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
        } catch (eventError) {
          console.error('Error processing individual event:', eventError);
        }
      }
      
      console.log(`Successfully processed ${events.length} calendar events`);
      
      // Sort events by start date
      return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (parseError) {
      console.error('Error parsing iCal data:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('Error fetching or parsing iCal data:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    throw new Error(`Failed to fetch or parse iCal data: ${error.message}`);
  }
}

export { ICalEvent };