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
      relax_quotes: true,      // Allow relaxed quote processing
      relax_column_count: true, // Allow variable column counts across records
      skip_records_with_error: true, // Skip records with syntax errors
    });

    const properties: InsertGuestyProperty[] = [];
    const errors: string[] = [];

    // Create a read stream from the file
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (row) => {
        try {
          // Debug the CSV row format
          console.log('CSV row:', JSON.stringify(row));
          
          // Handle different possible column names by checking each one
          const nickname = row.NICKNAME || row.Nickname || row.nickname || '';
          if (!nickname) {
            console.warn('Warning: Row missing nickname, using random ID', row);
          }
          
          // Generate a consistent property ID from the nickname or a random value
          const propertyId = nickname ? 
            `csv-${nickname.replace(/\s+/g, '-').toLowerCase()}` : 
            `csv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Map CSV columns to property fields with flexible column naming
          const property: InsertGuestyProperty = {
            propertyId: propertyId,
            name: row.TITLE || row.Title || row.title || 
                 row.NAME || row.Name || row.name || 
                 nickname || 'Unnamed Property',
            address: row.ADDRESS || row.Address || row.address || '',
            bedrooms: parseInt(row.BEDROOMS || row.Bedrooms || row.bedrooms || '1', 10), 
            bathrooms: parseFloat(row.BATHROOMS || row.Bathrooms || row.bathrooms || '1.0'),
            amenities: row.AMENITIES ? row.AMENITIES.split(',') : 
                      (row.Amenities ? row.Amenities.split(',') : 
                      (row.amenities ? row.amenities.split(',') : [])),
            listingUrl: row.LISTING_URL || row.ListingUrl || row.listingUrl || '',
            icalUrl: row.ICAL_URL || row.IcalUrl || row.icalUrl || null,
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

              // Create a sanitized property object with proper types for database
              const sanitizedProperty: InsertGuestyProperty = {
                propertyId: String(property.propertyId || '').substring(0, 255),
                name: String(property.name || '').substring(0, 255),
                address: String(property.address || '').substring(0, 500),
                bedrooms: isNaN(Number(property.bedrooms)) ? 1 : Number(property.bedrooms),
                bathrooms: isNaN(Number(property.bathrooms)) ? 1 : Number(property.bathrooms),
                amenities: Array.isArray(property.amenities) ? 
                  property.amenities.map(a => String(a).trim()).filter(Boolean) : [],
                listingUrl: String(property.listingUrl || '').substring(0, 500),
                icalUrl: property.icalUrl ? String(property.icalUrl).substring(0, 500) : null,
              };
              
              if (existingProperties.length > 0) {
                // Update existing property
                await db
                  .update(guestyProperties)
                  .set(sanitizedProperty)
                  .where(eq(guestyProperties.propertyId, property.propertyId));
              } else {
                // Insert new property
                await db.insert(guestyProperties).values(sanitizedProperty);
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