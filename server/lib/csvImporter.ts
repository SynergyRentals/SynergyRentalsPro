import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import { db } from '../db';
import { guestyProperties, InsertGuestyProperty, guestySyncLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Import Guesty properties from a CSV file
 * @param filePath Path to the CSV file
 * @returns Object with import results
 */
export async function importGuestyPropertiesFromCSV(filePath: string): Promise<{
  success: boolean;
  message: string;
  propertiesCount: number;
  errors?: string[];
}> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`,
        propertiesCount: 0,
        errors: [`File not found: ${filePath}`]
      };
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const records: any[] = [];
    for await (const record of parser) {
      records.push(record);
    }

    if (records.length === 0) {
      return {
        success: false,
        message: 'No properties found in CSV',
        propertiesCount: 0
      };
    }

    console.log(`Found ${records.length} properties in CSV`);

    // Process each property
    const errors: string[] = [];
    let successCount = 0;

    for (const record of records) {
      try {
        // Clean and transform the data
        const propertyData: InsertGuestyProperty = {
          propertyId: record.NICKNAME || `csv-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: record.TITLE || 'Untitled Property',
          address: record.ADDRESS || 'No address provided',
          bedrooms: extractBedroomsFromTitle(record.TITLE),
          bathrooms: extractBathroomsFromTitle(record.TITLE),
          amenities: record.TAGS ? record.TAGS.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '') : [],
          listingUrl: ''
        };

        // Check if property already exists
        const existingProperties = await db.select()
          .from(guestyProperties)
          .where(eq(guestyProperties.propertyId, propertyData.propertyId));

        if (existingProperties.length > 0) {
          // Update existing property
          await db.update(guestyProperties)
            .set({
              ...propertyData,
              updatedAt: new Date()
            })
            .where(eq(guestyProperties.propertyId, propertyData.propertyId));
          console.log(`Updated property: ${propertyData.name}`);
        } else {
          // Insert new property
          await db.insert(guestyProperties).values(propertyData);
          console.log(`Inserted property: ${propertyData.name}`);
        }

        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing property ${record.NICKNAME || 'unknown'}: ${errorMessage}`);
        errors.push(`Error processing property ${record.NICKNAME || 'unknown'}: ${errorMessage}`);
      }
    }

    // Create a sync log
    await db.insert(guestySyncLogs).values({
      syncType: 'properties',
      status: errors.length === 0 ? 'success' : 'partial',
      propertiesCount: successCount,
      errorMessage: errors.length > 0 ? errors.join('; ').substring(0, 500) : null
    });

    return {
      success: true,
      message: `Successfully imported ${successCount} of ${records.length} properties`,
      propertiesCount: successCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error importing properties from CSV: ${errorMessage}`);
    
    // Create a sync log
    await db.insert(guestySyncLogs).values({
      syncType: 'properties',
      status: 'error',
      propertiesCount: 0,
      errorMessage: errorMessage
    });
    
    return {
      success: false,
      message: `Error importing properties from CSV: ${errorMessage}`,
      propertiesCount: 0,
      errors: [errorMessage]
    };
  }
}

/**
 * Extract the number of bedrooms from the property title
 * @param title Property title
 * @returns Number of bedrooms or null if not found
 */
function extractBedroomsFromTitle(title: string): number | null {
  if (!title) return null;
  
  // Handle common patterns like "2BR", "2-BR", "2 BR", "2 Bedroom", "2B/1B", etc.
  const patterns = [
    /(\d+)BR/i,
    /(\d+)-BR/i,
    /(\d+) BR/i,
    /(\d+) Bedroom/i,
    /(\d+)B\//i,
    /(\d+) B\//i,
    /(\d+)-B\//i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  // Look for "Studio" which typically means 0 or 1 bedroom
  if (title.toLowerCase().includes('studio')) {
    return 0;
  }
  
  return null;
}

/**
 * Extract the number of bathrooms from the property title
 * @param title Property title
 * @returns Number of bathrooms or null if not found
 */
function extractBathroomsFromTitle(title: string): number | null {
  if (!title) return null;
  
  // Handle common patterns like "1BA", "1-BA", "1 BA", "1 Bathroom", "/1B", etc.
  const patterns = [
    /(\d+)BA/i,
    /(\d+)-BA/i, 
    /(\d+) BA/i,
    /(\d+) Bathroom/i,
    /\/(\d+)B/i,
    /\/(\d+) B/i,
    /\/(\d+)-B/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return null;
}