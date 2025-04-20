/**
 * Generic CSV Importer
 * 
 * This module provides utilities for importing CSV data into the database
 * in a flexible and configurable way.
 */

import fs from 'fs';
import * as schema from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

// Simple CSV parser since we can't use csv-parse
export function parseCSV(csvText: string, options: { columns: boolean, skip_empty_lines: boolean, delimiter?: string }): any[] {
  const delimiter = options.delimiter || ',';
  const lines = csvText.split('\n');
  const results: any[] = [];
  
  // Skip empty lines if requested
  const nonEmptyLines = options.skip_empty_lines 
    ? lines.filter(line => line.trim().length > 0)
    : lines;
  
  if (nonEmptyLines.length === 0) {
    return [];
  }
  
  // Extract headers from the first line
  const headers = nonEmptyLines[0].split(delimiter).map(header => {
    // Remove quotes and trim whitespace
    return header.replace(/^["'](.*)["']$/, '$1').trim();
  });
  
  // Process each data line
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    if (!line.trim()) continue;
    
    // Split by delimiter, respecting quotes
    const values = splitCSVLine(line, delimiter);
    
    if (options.columns) {
      // Create an object using headers as keys
      const row: any = {};
      for (let j = 0; j < headers.length; j++) {
        // Remove quotes from values
        const value = j < values.length ? values[j].replace(/^["'](.*)["']$/, '$1') : '';
        row[headers[j]] = value;
      }
      results.push(row);
    } else {
      // Just return the array of values
      results.push(values);
    }
  }
  
  return results;
}

// Helper function to split CSV line respecting quotes
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue);
  
  return result;
}

// Entity type enum (matches the one in the client-side DataManagement component)
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

// Field mapping interface (maps CSV fields to database fields)
export interface FieldMapping {
  csvField: string;
  entityField: string;
  required?: boolean;
}

// Import configuration interface
export interface ImportConfig {
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  updateExisting: boolean;
  identifierField?: string;
  options?: {
    skipFirstRow?: boolean;
    delimiter?: string;
  };
}

// Import results interface
export interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  errors: string[];
}

/**
 * Import data from a CSV file
 * @param filePath - Path to the CSV file
 * @param config - Import configuration
 * @returns Import results
 */
export async function importFromCsv(filePath: string, config: ImportConfig): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    message: '',
    recordsProcessed: 0,
    recordsImported: 0,
    recordsSkipped: 0,
    errors: [],
  };
  
  try {
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: config.options?.delimiter || ',',
    });
    
    // Skip first row if requested
    const startIndex = config.options?.skipFirstRow ? 1 : 0;
    const dataToProcess = records.slice(startIndex);
    
    result.recordsProcessed = dataToProcess.length;
    
    // Get the table for this entity type
    const table = getTableForEntityType(config.entityType);
    
    if (!table) {
      result.message = `Invalid entity type: ${config.entityType}`;
      return result;
    }
    
    // Process each record
    for (let i = 0; i < dataToProcess.length; i++) {
      const csvRecord = dataToProcess[i];
      
      try {
        // Map CSV fields to entity fields
        const entityRecord: Record<string, any> = {};
        
        // Apply field mappings
        for (const mapping of config.fieldMappings) {
          if (mapping.csvField && mapping.entityField) {
            // Get the value from the CSV record
            const value = csvRecord[mapping.csvField];
            
            // Skip empty values unless required
            if ((value === undefined || value === null || value === '') && !mapping.required) {
              continue;
            }
            
            // Check if required field is missing
            if ((value === undefined || value === null || value === '') && mapping.required) {
              throw new Error(`Required field ${mapping.entityField} is missing in record ${i + 1}`);
            }
            
            // Convert value to appropriate type
            entityRecord[mapping.entityField] = convertValue(value, mapping.entityField);
          }
        }
        
        // If updating existing records
        if (config.updateExisting && config.identifierField) {
          // Get the identifier value
          const identifierValue = entityRecord[config.identifierField];
          
          if (identifierValue) {
            // Check if the record exists
            const existingRecords = await db
              .select()
              .from(table)
              .where(eq(table[config.identifierField as keyof typeof table], identifierValue));
            
            if (existingRecords.length > 0) {
              // Update the existing record
              await db
                .update(table)
                .set(entityRecord)
                .where(eq(table[config.identifierField as keyof typeof table], identifierValue));
              
              result.recordsImported++;
              continue;
            }
          }
        }
        
        // Insert the record
        await db.insert(table).values(entityRecord);
        result.recordsImported++;
      } catch (error) {
        result.recordsSkipped++;
        result.errors.push(`Error in record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = true;
    result.message = `Imported ${result.recordsImported} records, skipped ${result.recordsSkipped} records`;
  } catch (error) {
    result.success = false;
    result.message = `Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
  
  return result;
}

/**
 * Generate a field mapping template for an entity type
 * @param entityType - Entity type
 * @returns Field mappings
 */
export function generateFieldMappingTemplate(entityType: EntityType): FieldMapping[] {
  // This function generates a template for field mappings based on the entity type
  const fieldMappings: FieldMapping[] = [];
  
  // Define required fields for each entity type
  const requiredFields: Record<EntityType, string[]> = {
    [EntityType.USER]: ['username', 'name', 'role'],
    [EntityType.UNIT]: ['name', 'address'],
    [EntityType.GUEST]: ['name', 'email'],
    [EntityType.PROPERTY]: ['name', 'address'],
    [EntityType.GUESTY_PROPERTY]: ['name', 'externalId'],
    [EntityType.GUESTY_RESERVATION]: ['propertyId', 'checkIn', 'checkOut'],
    [EntityType.PROJECT]: ['title', 'status'],
    [EntityType.TASK]: ['description', 'taskType'],
    [EntityType.MAINTENANCE]: ['description', 'unitId'],
    [EntityType.INVENTORY]: ['itemName', 'parLevel', 'currentStock'],
    [EntityType.CLEANING_TASK]: ['unitId', 'status'],
    [EntityType.DOCUMENT]: ['title', 'url'],
    [EntityType.VENDOR]: ['name', 'phone'],
  };
  
  // Get field names for the entity type
  const fields = getFieldsForEntityType(entityType);
  
  // Create field mappings
  for (const field of fields) {
    fieldMappings.push({
      csvField: '',
      entityField: field,
      required: requiredFields[entityType].includes(field),
    });
  }
  
  return fieldMappings;
}

/**
 * Get fields for an entity type
 * @param entityType - Entity type
 * @returns Field names
 */
function getFieldsForEntityType(entityType: EntityType): string[] {
  // Get the table for this entity type
  const table = getTableForEntityType(entityType);
  
  if (!table) {
    return [];
  }
  
  // Get field names from the table columns
  const fields = Object.keys(table).filter(key => {
    // Exclude special fields like relations, functions, etc.
    return typeof table[key] === 'object' && table[key] !== null && !key.startsWith('_');
  });
  
  return fields;
}

/**
 * Get the database table for an entity type
 * @param entityType - Entity type
 * @returns Database table
 */
function getTableForEntityType(entityType: EntityType): any {
  switch (entityType) {
    case EntityType.USER:
      return schema.users;
    case EntityType.UNIT:
      return schema.units;
    case EntityType.GUEST:
      return schema.guests;
    case EntityType.PROPERTY:
      return schema.properties;
    case EntityType.GUESTY_PROPERTY:
      return schema.guestyProperties;
    case EntityType.GUESTY_RESERVATION:
      return schema.guestyReservations;
    case EntityType.PROJECT:
      return schema.projects;
    case EntityType.TASK:
      return schema.tasks;
    case EntityType.MAINTENANCE:
      return schema.maintenance;
    case EntityType.INVENTORY:
      return schema.inventory;
    case EntityType.CLEANING_TASK:
      return schema.cleaningTasks;
    case EntityType.DOCUMENT:
      return schema.documents;
    case EntityType.VENDOR:
      return schema.vendors;
    default:
      return null;
  }
}

/**
 * Convert a value to the appropriate type
 * @param value - Value to convert
 * @param fieldName - Field name
 * @returns Converted value
 */
function convertValue(value: any, fieldName: string): any {
  // Skip null/undefined values
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert string to appropriate type based on common field naming patterns
  if (typeof value === 'string') {
    // Boolean fields
    if (
      fieldName.startsWith('is') ||
      fieldName.startsWith('has') ||
      fieldName === 'active' ||
      fieldName === 'enabled'
    ) {
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
    }
    
    // Date fields
    if (
      fieldName.endsWith('At') ||
      fieldName.endsWith('Date') ||
      fieldName === 'date' ||
      fieldName === 'checkIn' ||
      fieldName === 'checkOut'
    ) {
      // Try to parse as date
      try {
        return new Date(value);
      } catch (error) {
        // Return as string if parsing fails
        return value;
      }
    }
    
    // Number fields
    if (
      fieldName.endsWith('Id') ||
      fieldName === 'id' ||
      fieldName.endsWith('Count') ||
      fieldName.endsWith('Amount') ||
      fieldName === 'price' ||
      fieldName === 'cost' ||
      fieldName === 'quantity' ||
      fieldName === 'order' ||
      fieldName === 'parLevel' ||
      fieldName === 'currentStock' ||
      fieldName === 'reorderThreshold'
    ) {
      // Try to parse as number
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }
  }
  
  // Return the value as is for other cases
  return value;
}