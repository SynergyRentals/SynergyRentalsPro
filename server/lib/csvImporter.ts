import { parse } from 'csv-parse';
import fs from 'fs';
import { guestyProperties, type InsertGuestyProperty } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

// Define the expected column headers for validation
const EXPECTED_COLUMNS = [
  // Primary column names (case-insensitive)
  'name', 'title', 'address', 'bedrooms', 'bathrooms', 'amenities', 
  'listing_url', 'listingurl', 'ical_url', 'icalurl', 'nickname'
];

/**
 * Validates a CSV file for expected structure and required fields
 * @param filePath Path to the CSV file
 * @returns Object with validation result and errors if any
 */
async function validateCSVStructure(filePath: string): Promise<{
  valid: boolean;
  errors: string[];
  columns?: string[];
}> {
  return new Promise((resolve) => {
    let firstRow: any = null;
    let errors: string[] = [];
    let missingRequired = false;

    // Create a parser just to check the header row
    const headerParser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      to: 1 // Only parse the first row to check headers
    });

    fs.createReadStream(filePath)
      .pipe(headerParser)
      .on('readable', function() {
        let record;
        while ((record = this.read()) !== null) {
          firstRow = record;
        }
      })
      .on('error', (error) => {
        errors.push(`CSV header validation error: ${error.message}`);
        resolve({ valid: false, errors });
      })
      .on('end', () => {
        if (!firstRow) {
          errors.push('CSV file is empty or has no header row');
          resolve({ valid: false, errors });
          return;
        }

        // Get all column headers from the first row
        const columnHeaders = Object.keys(firstRow).map(h => h.toLowerCase());

        // Check if we have any recognized columns
        const hasAnyValidColumn = EXPECTED_COLUMNS.some(col => 
          columnHeaders.includes(col.toLowerCase())
        );

        if (!hasAnyValidColumn) {
          errors.push('CSV file has no recognized property columns. Expected at least one of: ' + 
            EXPECTED_COLUMNS.join(', '));
          missingRequired = true;
        }

        // Must have either name/title and some form of unique identifier
        const hasName = columnHeaders.some(h => ['name', 'title'].includes(h.toLowerCase()));
        if (!hasName) {
          errors.push('CSV must have a NAME or TITLE column to identify properties');
          missingRequired = true;
        }

        resolve({ 
          valid: !missingRequired, 
          errors: errors.length > 0 ? errors : [],
          columns: columnHeaders
        });
      });
  });
}

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
  warnings?: string[];
}> {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        reject(new Error('CSV file is empty'));
        return;
      }

      // Validate the CSV structure first
      const validation = await validateCSVStructure(filePath);
      if (!validation.valid) {
        reject(new Error(`Invalid CSV format: ${validation.errors.join(', ')}`));
        return;
      }

      console.log('CSV validation passed. Found columns:', validation.columns);

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
      const warnings: string[] = [];

      // Create a read stream from the file
      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (row) => {
          try {
            // Debug the CSV row format with limited output size
            const rowPreview = Object.keys(row).slice(0, 3)
              .reduce((obj, key) => ({ ...obj, [key]: row[key] }), {});
            console.log('Processing CSV row:', JSON.stringify(rowPreview) + '...');

            // Handle different possible column names by checking each one
            const nickname = row.NICKNAME || row.Nickname || row.nickname || '';

            // Get a name for the property (required)
            const name = row.TITLE || row.Title || row.title || row.NAME || row.Name || row.name;
            if (!name) {
              // Skip rows without a name
              warnings.push(`Skipping row without a name/title: ${JSON.stringify(row).substring(0, 100)}...`);
              return;
            }

            // Generate a consistent property ID from the nickname, name, or a random value
            let propertyId;
            if (nickname) {
              propertyId = `csv-${nickname.replace(/\s+/g, '-').toLowerCase()}`;
            } else if (name) {
              propertyId = `csv-${name.replace(/\s+/g, '-').toLowerCase()}`;
            } else {
              propertyId = `csv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              warnings.push(`Generated random ID for row with no name or nickname: ${propertyId}`);
            }

            // Parse amenities - handle different formats
            let amenities = [];
            const amenitiesField = row.AMENITIES || row.Amenities || row.amenities;
            if (amenitiesField) {
              // Handle both comma-separated string and JSON array formats
              if (typeof amenitiesField === 'string') {
                // Try to parse as JSON first
                try {
                  if (amenitiesField.startsWith('[') && amenitiesField.endsWith(']')) {
                    const parsed = JSON.parse(amenitiesField);
                    if (Array.isArray(parsed)) {
                      amenities = parsed.map(item => String(item).trim()).filter(Boolean);
                    } else {
                      amenities = amenitiesField.split(',').map(item => item.trim()).filter(Boolean);
                    }
                  } else {
                    amenities = amenitiesField.split(',').map(item => item.trim()).filter(Boolean);
                  }
                } catch (e) {
                  // If JSON parse fails, fall back to comma-separated
                  amenities = amenitiesField.split(',').map(item => item.trim()).filter(Boolean);
                }
              } else if (Array.isArray(amenitiesField)) {
                amenities = amenitiesField.map(item => String(item).trim()).filter(Boolean);
              }
            }

            // Handle various URL formats
            const listingUrl = row.LISTING_URL || row.ListingUrl || row.listingUrl || row.listing_url || '';
            const icalUrl = row.ICAL_URL || row.IcalUrl || row.icalUrl || row.ical_url || null;

            try {
            // Additional validation for required fields
            if (!name || name.trim() === '') {
              warnings.push(`Row skipped: Missing name/title field: ${JSON.stringify(row).substring(0, 100)}...`);
              continue;
            }

            // Normalize and validate bedrooms
            let bedrooms = 1; // Default value
            const bedroomValue = row.BEDROOMS || row.Bedrooms || row.bedrooms;
            if (bedroomValue !== undefined && bedroomValue !== null && bedroomValue !== '') {
              const parsedBedrooms = parseInt(String(bedroomValue), 10);
              if (!isNaN(parsedBedrooms) && parsedBedrooms >= 0) {
                bedrooms = parsedBedrooms;
              } else {
                warnings.push(`Invalid bedroom value "${bedroomValue}" for property "${name}", using default: 1`);
              }
            }

            // Normalize and validate bathrooms
            let bathrooms = 1.0; // Default value
            const bathroomValue = row.BATHROOMS || row.Bathrooms || row.bathrooms;
            if (bathroomValue !== undefined && bathroomValue !== null && bathroomValue !== '') {
              const parsedBathrooms = parseFloat(String(bathroomValue));
              if (!isNaN(parsedBathrooms) && parsedBathrooms >= 0) {
                bathrooms = parsedBathrooms;
              } else {
                warnings.push(`Invalid bathroom value "${bathroomValue}" for property "${name}", using default: 1.0`);
              }
            }

            // Create property object with normalized values
            const property: InsertGuestyProperty = {
              propertyId: propertyId,
              name: name.substring(0, 255), // Ensure within field limits
              address: String(row.ADDRESS || row.Address || row.address || '').substring(0, 500),
              bedrooms: bedrooms,
              bathrooms: bathrooms,
              amenities: amenities,
              listingUrl: String(listingUrl || '').substring(0, 500),
              icalUrl: icalUrl ? String(icalUrl).substring(0, 500) : null
            };

            properties.push(property);
            console.log(`Added property: ${property.name} (${property.propertyId})`);
          } catch (error) {
            console.error('Error parsing CSV row:', error);
            errors.push(`Error parsing row: ${JSON.stringify(row).substring(0, 150)}... - ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                message: 'CSV file parsed, but no valid properties found',
                propertiesCount: 0,
                warnings,
                errors
              });
              return;
            }

            // Store properties in database
            let insertedCount = 0;
            let updatedCount = 0;
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
                  updatedCount++;
                } else {
                  // Insert new property
                  await db.insert(guestyProperties).values(sanitizedProperty);
                  insertedCount++;
                }
              } catch (dbError) {
                console.error('Error storing property in database:', dbError);
                errors.push(`Error storing property ${property.name}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
              }
            }

            resolve({
              success: true,
              message: `Successfully imported ${insertedCount} properties from CSV (${updatedCount} updated)`,
              propertiesCount: insertedCount + updatedCount,
              errors: errors.length > 0 ? errors : undefined,
              warnings: warnings.length > 0 ? warnings : undefined
            });
          } catch (error) {
            console.error('Error processing properties:', error);
            reject(error);
          }
        });
    } catch (error) {
      console.error('Unexpected error during CSV import:', error);
      reject(error);
    }
  });
}