import { db } from "../db";
import { properties } from "../../shared/schema-new";
import { eq } from "drizzle-orm";
import { processIcalURL, clearIcalCache } from "./icalService";

// Get all properties
export async function getAllProperties() {
  try {
    const allProperties = await db.select().from(properties).where(eq(properties.active, true));
    return allProperties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
}

// Get property by ID
export async function getPropertyById(id: number) {
  try {
    const property = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return property.length > 0 ? property[0] : null;
  } catch (error) {
    console.error(`Error fetching property ${id}:`, error);
    throw error;
  }
}

// Create a new property
export async function createProperty(propertyData: any) {
  try {
    // Validate amenities is an array
    if (propertyData.amenities && !Array.isArray(propertyData.amenities)) {
      propertyData.amenities = [propertyData.amenities];
    }
    
    // Set active to true by default
    propertyData.active = true;
    
    const result = await db.insert(properties).values(propertyData).returning();
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error creating property:", error);
    throw error;
  }
}

// Update a property
export async function updateProperty(id: number, propertyData: any) {
  try {
    // Validate amenities is an array
    if (propertyData.amenities && !Array.isArray(propertyData.amenities)) {
      propertyData.amenities = [propertyData.amenities];
    }
    
    // Add updated timestamp
    propertyData.updatedAt = new Date();
    
    const result = await db
      .update(properties)
      .set(propertyData)
      .where(eq(properties.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error updating property ${id}:`, error);
    throw error;
  }
}

// Delete a property (soft delete by setting active = false)
export async function deleteProperty(id: number) {
  try {
    const result = await db
      .update(properties)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error deleting property ${id}:`, error);
    throw error;
  }
}

// Get property calendar
export async function getPropertyCalendar(id: number, refresh: boolean = false) {
  try {
    // Fetch the property to get the iCal URL
    const property = await getPropertyById(id);
    
    if (!property || !property.icalUrl) {
      throw new Error("No iCal URL configured for this property");
    }
    
    // Clear cache if refresh is requested
    if (refresh && property.icalUrl) {
      console.log(`Refreshing iCal cache for property ${id} with URL: ${property.icalUrl}`);
      clearIcalCache(property.icalUrl);
    }
    
    // Process the iCal URL and return events - passing property ID for adaptive caching
    const events = await processIcalURL(property.icalUrl, id);
    return events;
  } catch (error) {
    console.error(`Error fetching calendar for property ${id}:`, error);
    throw error;
  }
}

// Validate iCal URL by attempting to fetch and parse it
export async function validateIcalUrl(url: string) {
  try {
    // First check if URL is in a valid format
    try {
      new URL(url);
    } catch (e) {
      return {
        valid: false,
        message: "Invalid URL format. Please enter a valid URL.",
        eventCount: 0
      };
    }
    
    // Check protocol
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        valid: false,
        message: `Unsupported URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are supported.`,
        eventCount: 0
      };
    }
    
    // Check if URL ends with .ics which is common for iCal files
    const isIcsFile = parsedUrl.pathname.toLowerCase().endsWith('.ics');
    
    // Try to fetch and parse the iCal data
    console.log(`Validating iCal URL: ${url}`);
    const events = await processIcalURL(url);
    
    // Enhanced validation with sample event data
    if (events.length > 0) {
      const firstEvent = events[0];
      return {
        valid: true,
        message: `Successfully validated iCal URL with ${events.length} events`,
        eventCount: events.length,
        firstEventDate: firstEvent.start.toISOString().split('T')[0],
        lastEventDate: events[events.length - 1].start.toISOString().split('T')[0],
        sampleEvent: {
          title: firstEvent.title,
          start: firstEvent.start,
          end: firstEvent.end,
          checkout: firstEvent.checkout, // Include explicit checkout date
          status: firstEvent.status || 'confirmed'
        }
      };
    } else {
      return {
        valid: true,
        message: isIcsFile ? 
          "Valid iCal URL but no events found. The calendar may be empty." : 
          "URL accepted but no events found. The calendar may be empty or the URL might not point to a valid iCal feed.",
        eventCount: 0,
        warning: "No events were found in this calendar feed"
      };
    }
  } catch (error) {
    console.error("Error validating iCal URL:", error);
    
    // More descriptive error messages based on error type
    let errorMessage = "Failed to validate iCal URL";
    if (error instanceof Error) {
      if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        errorMessage = "Cannot connect to calendar server. Please check the URL domain is correct.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Connection to calendar server timed out. The server may be slow or unresponsive.";
      } else if (error.message.includes("401") || error.message.includes("403")) {
        errorMessage = "Calendar URL requires authentication. Please use a public iCal URL.";
      } else if (error.message.includes("404")) {
        errorMessage = "Calendar feed not found. Please check the URL is correct.";
      } else if (error.message.includes("parse")) {
        errorMessage = "Not a valid iCal feed. Please ensure the URL points to an iCal (.ics) resource.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      valid: false,
      message: errorMessage,
      eventCount: 0
    };
  }
}