import { parse } from 'csv-parse';
import fs from 'fs';
import { guestyProperties, type InsertGuestyProperty } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

/**
 * Imports Guesty properties from a CSV file
 * @param filePath Path to the CSV file
 * @returns Result object with success status and count
 */
export async function importGuestyPropertiesFromCSV(filePath: string): Promise<{
  success: boolean;
  message: string;
  propertiesCount: number;
  errors?: string[];
}> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const parser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const properties: InsertGuestyProperty[] = [];
    const errors: string[] = [];

    // Create a read stream from the file
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (row) => {
        try {
          // Map CSV columns to property fields
          // Generate a consistent property ID from the nickname
          const propertyId = `csv-${row.NICKNAME.replace(/\s+/g, '-').toLowerCase()}`;
          
          const property: InsertGuestyProperty = {
            propertyId: propertyId,
            name: row.TITLE || row.NICKNAME || '',
            address: row.ADDRESS || '',
            bedrooms: parseInt(row.BEDROOMS || '1', 10), 
            bathrooms: parseFloat(row.BATHROOMS || '1.0'),
            amenities: row.AMENITIES ? row.AMENITIES.split(',') : [],
            listingUrl: row.LISTING_URL || '',
            icalUrl: row.ICAL_URL || null,
          };

          properties.push(property);
        } catch (error) {
          console.error('Error parsing CSV row:', error);
          errors.push(`Error parsing row: ${JSON.stringify(row)}`);
        }
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      })
      .on('end', async () => {
        try {
          console.log(`Parsed ${properties.length} properties from CSV`);
          
          // Skip empty files
          if (properties.length === 0) {
            resolve({
              success: true,
              message: 'CSV file parsed, but no properties found',
              propertiesCount: 0,
            });
            return;
          }

          // Store properties in database
          let insertedCount = 0;
          for (const property of properties) {
            try {
              // Check if the property already exists by propertyId
              const existingProperties = await db
                .select()
                .from(guestyProperties)
                .where(eq(guestyProperties.propertyId, property.propertyId));

              if (existingProperties.length > 0) {
                // Update existing property
                await db
                  .update(guestyProperties)
                  .set(property)
                  .where(eq(guestyProperties.propertyId, property.propertyId));
              } else {
                // Insert new property
                await db.insert(guestyProperties).values(property);
              }
              
              insertedCount++;
            } catch (dbError) {
              console.error('Error storing property in database:', dbError);
              errors.push(`Error storing property ${property.name}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            }
          }

          resolve({
            success: true,
            message: `Successfully imported ${insertedCount} properties from CSV`,
            propertiesCount: insertedCount,
            errors: errors.length > 0 ? errors : undefined,
          });
        } catch (error) {
          console.error('Error processing properties:', error);
          reject(error);
        }
      });
  });
}