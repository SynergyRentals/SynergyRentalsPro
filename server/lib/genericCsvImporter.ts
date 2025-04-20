/**
 * Generic CSV Importer
 * 
 * This module provides a flexible framework for importing CSV data into any entity type
 * in the system. It handles field mapping, data validation, and entity relationships.
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Define supported entity types
export enum EntityType {
  USER = 'user',
  UNIT = 'unit',
  GUEST = 'guest',
  PROPERTY = 'property',
  GUESTY_PROPERTY = 'guesty_property',
  GUESTY_RESERVATION = 'guesty_reservation',
  PROJECT = 'project',
  TASK = 'task',
  MAINTENANCE = 'maintenance',
  INVENTORY = 'inventory',
  CLEANING_TASK = 'cleaning_task',
  DOCUMENT = 'document',
  VENDOR = 'vendor'
}

// Interface for mapping CSV columns to entity fields
export interface FieldMapping {
  csvField: string;
  entityField: string;
  required?: boolean;
  transformer?: (value: string) => any;
  validator?: (value: any) => boolean;
}

// Interface for the import result
export interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  errors: string[];
}

// Interface for import options
export interface ImportOptions {
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  updateExisting?: boolean;
  identifierField?: string;
  relationshipMappings?: {
    entityField: string;
    relatedEntityType: EntityType;
    relatedEntityField: string;
  }[];
  skipFirstRow?: boolean;
  delimiter?: string;
}

/**
 * Import data from a CSV file
 * @param filePath - Path to the CSV file
 * @param options - Import options
 * @returns Import result
 */
export async function importFromCsv(
  filePath: string,
  options: ImportOptions
): Promise<ImportResult> {
  // Initialize result
  const result: ImportResult = {
    success: false,
    message: '',
    recordsProcessed: 0,
    recordsImported: 0,
    recordsSkipped: 0,
    errors: [],
  };

  // Validate file existence
  if (!fs.existsSync(filePath)) {
    result.message = `File not found: ${filePath}`;
    return result;
  }

  try {
    // Configure parser
    const parser = parse({
      delimiter: options.delimiter || ',',
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_lines_with_error: true,
    });

    // Prepare data collection
    const records: any[] = [];
    
    // Process data from file
    const dataPromise = new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (row: any) => {
          try {
            // Skip first row if specified
            if (options.skipFirstRow && result.recordsProcessed === 0) {
              result.recordsProcessed++;
              return;
            }
            
            // Convert CSV row to entity object
            const record = mapRowToEntity(row, options.fieldMappings);
            
            // Validate required fields
            const requiredFieldsValid = validateRequiredFields(record, options.fieldMappings);
            if (!requiredFieldsValid) {
              result.errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
              result.recordsSkipped++;
              return;
            }
            
            records.push(record);
            result.recordsProcessed++;
          } catch (error) {
            result.errors.push(`Error processing row: ${JSON.stringify(row)} - ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.recordsSkipped++;
          }
        })
        .on('error', (error: Error) => {
          result.errors.push(`CSV parsing error: ${error.message}`);
          reject(error);
        })
        .on('end', () => {
          resolve();
        });
    });

    // Wait for the data to be processed
    await dataPromise;
    
    // Process relationships if specified
    if (options.relationshipMappings) {
      await resolveRelationships(records, options.relationshipMappings);
    }
    
    // Store records in database
    if (records.length > 0) {
      await storeRecords(records, options, result);
    }

    // Set success status based on results
    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully imported ${result.recordsImported} records`
      : `Import completed with ${result.errors.length} errors`;

    return result;
  } catch (error) {
    result.success = false;
    result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return result;
  }
}

/**
 * Map a CSV row to an entity object
 * @param row - CSV row
 * @param fieldMappings - Field mappings
 * @returns Mapped entity object
 */
function mapRowToEntity(row: any, fieldMappings: FieldMapping[]): any {
  const entity: any = {};
  
  for (const mapping of fieldMappings) {
    if (row[mapping.csvField] !== undefined) {
      // Apply transformer if provided
      if (mapping.transformer) {
        entity[mapping.entityField] = mapping.transformer(row[mapping.csvField]);
      } else {
        entity[mapping.entityField] = row[mapping.csvField];
      }
      
      // Apply validator if provided
      if (mapping.validator && entity[mapping.entityField] !== undefined) {
        if (!mapping.validator(entity[mapping.entityField])) {
          throw new Error(`Validation failed for field ${mapping.entityField}`);
        }
      }
    }
  }
  
  return entity;
}

/**
 * Validate required fields
 * @param entity - Mapped entity object
 * @param fieldMappings - Field mappings
 * @returns True if all required fields are present
 */
function validateRequiredFields(entity: any, fieldMappings: FieldMapping[]): boolean {
  for (const mapping of fieldMappings) {
    if (mapping.required && (entity[mapping.entityField] === undefined || entity[mapping.entityField] === '')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Resolve relationships between entities
 * @param records - Records to process
 * @param relationshipMappings - Relationship mappings
 */
async function resolveRelationships(
  records: any[],
  relationshipMappings: {
    entityField: string;
    relatedEntityType: EntityType;
    relatedEntityField: string;
  }[]
): Promise<void> {
  // Process each relationship type
  for (const relationship of relationshipMappings) {
    // Get all unique values for the relationship field
    const uniqueValues = new Set<string>();
    for (const record of records) {
      if (record[relationship.entityField]) {
        uniqueValues.add(record[relationship.entityField].toString());
      }
    }
    
    // Skip if no values to look up
    if (uniqueValues.size === 0) continue;
    
    // Get the related table and field
    const { table, field } = getTableAndField(relationship.relatedEntityType, relationship.relatedEntityField);
    if (!table || !field) continue;
    
    // Query for related entities
    const relatedEntities = await db
      .select()
      .from(table)
      .where(field.in([...uniqueValues]));
    
    // Create a map for quick lookup
    const relatedEntityMap = new Map();
    for (const entity of relatedEntities) {
      relatedEntityMap.set(entity[relationship.relatedEntityField].toString(), entity);
    }
    
    // Update records with related entity IDs
    for (const record of records) {
      if (record[relationship.entityField]) {
        const relatedEntity = relatedEntityMap.get(record[relationship.entityField].toString());
        if (relatedEntity) {
          // Replace the value with the actual ID if it's a reference to another entity
          record[relationship.entityField] = relatedEntity.id;
        } else {
          // Clear the field if no related entity found
          delete record[relationship.entityField];
        }
      }
    }
  }
}

/**
 * Get table and field objects for a given entity type and field
 * @param entityType - Entity type
 * @param fieldName - Field name
 * @returns Table and field objects
 */
function getTableAndField(entityType: EntityType, fieldName: string): { table: any; field: any } {
  switch (entityType) {
    case EntityType.USER:
      return { table: schema.users, field: schema.users[fieldName] };
    case EntityType.UNIT:
      return { table: schema.units, field: schema.units[fieldName] };
    case EntityType.GUEST:
      return { table: schema.guests, field: schema.guests[fieldName] };
    case EntityType.PROPERTY:
      return { table: schema.properties, field: schema.properties[fieldName] };
    case EntityType.GUESTY_PROPERTY:
      return { table: schema.guestyProperties, field: schema.guestyProperties[fieldName] };
    case EntityType.GUESTY_RESERVATION:
      return { table: schema.guestyReservations, field: schema.guestyReservations[fieldName] };
    case EntityType.PROJECT:
      return { table: schema.projects, field: schema.projects[fieldName] };
    case EntityType.TASK:
      return { table: schema.tasks, field: schema.tasks[fieldName] };
    case EntityType.MAINTENANCE:
      return { table: schema.maintenance, field: schema.maintenance[fieldName] };
    case EntityType.INVENTORY:
      return { table: schema.inventory, field: schema.inventory[fieldName] };
    case EntityType.CLEANING_TASK:
      return { table: schema.cleaningTasks, field: schema.cleaningTasks[fieldName] };
    case EntityType.DOCUMENT:
      return { table: schema.documents, field: schema.documents[fieldName] };
    case EntityType.VENDOR:
      return { table: schema.vendors, field: schema.vendors[fieldName] };
    default:
      return { table: null, field: null };
  }
}

/**
 * Store records in the database
 * @param records - Records to store
 * @param options - Import options
 * @param result - Import result to update
 */
async function storeRecords(
  records: any[],
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  const { table } = getTableAndField(options.entityType, 'id');
  if (!table) {
    result.errors.push(`Invalid entity type: ${options.entityType}`);
    return;
  }
  
  // Process each record
  for (const record of records) {
    try {
      // Check if record exists if updating is enabled
      if (options.updateExisting && options.identifierField && record[options.identifierField]) {
        const existingRecords = await db
          .select()
          .from(table)
          .where(eq(table[options.identifierField], record[options.identifierField]));
        
        if (existingRecords.length > 0) {
          // Update existing record
          await db
            .update(table)
            .set(record)
            .where(eq(table[options.identifierField], record[options.identifierField]));
          
          result.recordsImported++;
          continue;
        }
      }
      
      // Insert new record
      await db.insert(table).values(record);
      result.recordsImported++;
    } catch (error) {
      result.errors.push(`Error storing record: ${JSON.stringify(record)} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.recordsSkipped++;
    }
  }
}

/**
 * Generate a field mapping template for a given entity type
 * @param entityType - Entity type
 * @returns Field mapping template
 */
export function generateFieldMappingTemplate(entityType: EntityType): FieldMapping[] {
  switch (entityType) {
    case EntityType.USER:
      return [
        { csvField: 'Name', entityField: 'name', required: true },
        { csvField: 'Username', entityField: 'username', required: true },
        { csvField: 'Email', entityField: 'email', required: true },
        { csvField: 'Role', entityField: 'role', required: true },
        { csvField: 'Phone', entityField: 'phone' },
        { csvField: 'Active', entityField: 'active', transformer: (v) => v.toLowerCase() === 'true' },
      ];
    case EntityType.UNIT:
      return [
        { csvField: 'Name', entityField: 'name', required: true },
        { csvField: 'Address', entityField: 'address', required: true },
        { csvField: 'Lease URL', entityField: 'lease_url' },
        { csvField: 'WiFi Info', entityField: 'wifi_info' },
        { csvField: 'Notes', entityField: 'notes' },
        { csvField: 'Tags', entityField: 'tags', transformer: (v) => v.split(',').map(t => t.trim()) },
        { csvField: 'Active', entityField: 'active', transformer: (v) => v.toLowerCase() === 'true' },
        { csvField: 'iCal URL', entityField: 'ical_url' },
      ];
    case EntityType.GUESTY_PROPERTY:
      return [
        { csvField: 'Property ID', entityField: 'propertyId', required: true },
        { csvField: 'Name', entityField: 'name', required: true },
        { csvField: 'Address', entityField: 'address' },
        { csvField: 'Bedrooms', entityField: 'bedrooms', transformer: (v) => parseInt(v, 10) || 0 },
        { csvField: 'Bathrooms', entityField: 'bathrooms', transformer: (v) => parseFloat(v) || 0 },
        { csvField: 'Amenities', entityField: 'amenities', transformer: (v) => v.split(',').map(a => a.trim()) },
        { csvField: 'Listing URL', entityField: 'listingUrl' },
        { csvField: 'Guesty ID', entityField: 'guestyId' },
        { csvField: 'Nickname', entityField: 'nickname' },
        { csvField: 'City', entityField: 'city' },
        { csvField: 'State', entityField: 'state' },
        { csvField: 'Zipcode', entityField: 'zipcode' },
        { csvField: 'Country', entityField: 'country' },
        { csvField: 'Latitude', entityField: 'latitude', transformer: (v) => parseFloat(v) || null },
        { csvField: 'Longitude', entityField: 'longitude', transformer: (v) => parseFloat(v) || null },
        { csvField: 'iCal URL', entityField: 'icalUrl' },
      ];
    case EntityType.GUESTY_RESERVATION:
      return [
        { csvField: 'Reservation ID', entityField: 'reservationId', required: true },
        { csvField: 'Guest Name', entityField: 'guestName', required: true },
        { csvField: 'Guest Email', entityField: 'guestEmail' },
        { csvField: 'Property ID', entityField: 'propertyId', required: true },
        { csvField: 'Check In', entityField: 'checkIn', required: true, transformer: (v) => new Date(v) },
        { csvField: 'Check Out', entityField: 'checkOut', required: true, transformer: (v) => new Date(v) },
        { csvField: 'Status', entityField: 'status', required: true },
        { csvField: 'Channel', entityField: 'channel' },
        { csvField: 'Total Price', entityField: 'totalPrice', transformer: (v) => parseInt(v, 10) || 0 },
        { csvField: 'Guesty ID', entityField: 'guestyId' },
        { csvField: 'Guest Phone', entityField: 'guestPhone' },
        { csvField: 'Confirmation Code', entityField: 'confirmationCode' },
        { csvField: 'Adults', entityField: 'adults', transformer: (v) => parseInt(v, 10) || 0 },
        { csvField: 'Children', entityField: 'children', transformer: (v) => parseInt(v, 10) || 0 },
        { csvField: 'Total Guests', entityField: 'totalGuests', transformer: (v) => parseInt(v, 10) || 0 },
      ];
    // Add more entity types as needed
    default:
      return [];
  }
}

// Export utility functions
export { importFromCsv, generateFieldMappingTemplate };