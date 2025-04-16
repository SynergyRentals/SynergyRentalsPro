import { db } from "../db";
import { properties } from "../../shared/schema-new";
import { eq } from "drizzle-orm";
import { processIcalURL } from "./icalService";

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
export async function getPropertyCalendar(id: number) {
  try {
    // Fetch the property to get the iCal URL
    const property = await getPropertyById(id);
    
    if (!property || !property.icalUrl) {
      return []; // Return empty array if property has no iCal URL
    }
    
    // Process the iCal URL and return events
    const events = await processIcalURL(property.icalUrl);
    return events;
  } catch (error) {
    console.error(`Error fetching calendar for property ${id}:`, error);
    throw error;
  }
}

// Validate iCal URL by attempting to fetch and parse it
export async function validateIcalUrl(url: string) {
  try {
    const events = await processIcalURL(url);
    return {
      valid: true,
      message: `Successfully validated iCal URL with ${events.length} events`,
      eventCount: events.length
    };
  } catch (error) {
    console.error("Error validating iCal URL:", error);
    return {
      valid: false,
      message: `Failed to validate iCal URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      eventCount: 0
    };
  }
}