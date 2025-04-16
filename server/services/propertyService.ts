import { db } from "../db";
import { properties } from "../../shared/schema-new";
import { eq } from "drizzle-orm";
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
 * Get all properties
 * @returns Array of all properties
 */
export async function getAllProperties() {
  return await db.select().from(properties).where(eq(properties.active, true));
}

/**
 * Get a property by ID
 * @param id Property ID
 * @returns Property or null if not found
 */
export async function getPropertyById(id: number) {
  const results = await db.select().from(properties).where(eq(properties.id, id));
  return results.length > 0 ? results[0] : null;
}

/**
 * Create a new property
 * @param property Property data
 * @returns Created property
 */
export async function createProperty(property: any) {
  const propertyData = {
    ...property,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.insert(properties).values(propertyData).returning();
  return result[0];
}

/**
 * Update a property
 * @param id Property ID
 * @param property Property data
 * @returns Updated property
 */
export async function updateProperty(id: number, property: any) {
  const propertyData = {
    ...property,
    updatedAt: new Date()
  };
  
  const result = await db.update(properties)
    .set(propertyData)
    .where(eq(properties.id, id))
    .returning();
    
  return result[0];
}

/**
 * Delete a property (soft delete by setting active=false)
 * @param id Property ID
 * @returns Deleted property
 */
export async function deleteProperty(id: number) {
  const result = await db.update(properties)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(properties.id, id))
    .returning();
    
  return result[0];
}

/**
 * Get calendar events for a property
 * @param propertyId Property ID
 * @returns Array of calendar events
 */
export async function getPropertyCalendar(propertyId: number): Promise<CalendarEvent[]> {
  // Get the property
  const property = await getPropertyById(propertyId);
  
  if (!property) {
    throw new Error(`Property not found with ID: ${propertyId}`);
  }
  
  // If the property doesn't have an iCal URL, return an empty array
  if (!property.icalUrl) {
    console.log(`Property ${propertyId} has no iCal URL configured, returning empty array`);
    return [];
  }
  
  try {
    // Fetch the calendar data
    console.log(`Fetching calendar data for property ${propertyId} from URL: ${property.icalUrl}`);
    const data = await fetchCalendarData(property.icalUrl);
    return data;
  } catch (error) {
    console.error(`Error fetching calendar data for property ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Fetch and parse iCal data from URL
 * @param url iCal URL
 * @returns Array of calendar events
 */
async function fetchCalendarData(url: string): Promise<CalendarEvent[]> {
  if (!url) {
    return [];
  }
  
  try {
    console.log(`Fetching iCal data from: ${url}`);
    
    // Fetch iCal data
    const data = await ical.async.fromURL(url);
    
    // Process the events
    const events: CalendarEvent[] = [];
    
    for (const key in data) {
      const event = data[key];
      
      // Only process VEVENT type entries
      if (event.type !== 'VEVENT') {
        continue;
      }
      
      // Skip events without valid dates
      if (!event.start || !event.end) {
        continue;
      }
      
      // Create a CalendarEvent object
      events.push({
        start: event.start,
        end: event.end,
        title: event.summary || 'Reservation',
        uid: event.uid,
        status: event.status?.toLowerCase() || 'confirmed'
      });
    }
    
    // Sort events by start date
    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    console.log(`Found ${events.length} calendar events`);
    return events;
  } catch (error) {
    console.error('Error fetching iCal data:', error);
    throw new Error(`Failed to fetch calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if an iCal URL is accessible and contains valid data
 * @param url iCal URL to validate
 * @returns Validation result object
 */
export async function validateIcalUrl(url: string): Promise<{ valid: boolean; message: string }> {
  if (!url) {
    return { valid: false, message: 'URL is required' };
  }
  
  try {
    // Parse the URL to validate it's a proper URL
    const parsedUrl = new URL(url);
    
    // Check if it's HTTP or HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, message: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // Try to fetch the iCal data
    const data = await ical.async.fromURL(url);
    
    // Check if we got any data
    if (!data || Object.keys(data).length === 0) {
      return { valid: false, message: 'No calendar data found at URL' };
    }
    
    // Check if there are any VEVENT entries
    const events = Object.values(data).filter(event => event.type === 'VEVENT');
    
    if (events.length === 0) {
      return { valid: false, message: 'No events found in calendar' };
    }
    
    return { valid: true, message: `Valid iCal URL with ${events.length} events` };
  } catch (error) {
    console.error('Error validating iCal URL:', error);
    return { 
      valid: false, 
      message: `Error validating URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}