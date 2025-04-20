/**
 * Data Import Service
 * 
 * This service handles importing data from CSV files, maintaining proper relationships
 * between entities, and ensuring data integrity during the import process.
 */

import { db } from '../db';
import { storage } from '../storage';
import * as schema from '../../shared/schema';
import { parse } from 'csv-parse/sync';

interface ImportResult {
  success: boolean;
  message: string;
  entityType: string;
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  warnings: string[];
}

interface FieldMapping {
  csvField: string;
  dbField: string;
}

/**
 * Parse CSV data into objects
 * @param csvData - Raw CSV data as string
 * @returns Array of objects parsed from CSV
 */
export function parseCsvData(csvData: string): Record<string, any>[] {
  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return records;
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    throw new Error(`Failed to parse CSV data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Map CSV fields to database fields
 * @param csvRecords - Array of objects parsed from CSV
 * @param fieldMappings - Mappings from CSV field names to database field names
 * @returns Array of objects with mapped field names
 */
export function mapFields(csvRecords: Record<string, any>[], fieldMappings: FieldMapping[]): Record<string, any>[] {
  return csvRecords.map(record => {
    const mappedRecord: Record<string, any> = {};
    
    fieldMappings.forEach(mapping => {
      if (record[mapping.csvField] !== undefined) {
        mappedRecord[mapping.dbField] = record[mapping.csvField];
      }
    });
    
    return mappedRecord;
  });
}

/**
 * Validate and transform data for import
 * @param mappedRecords - Records with mapped field names
 * @param entityType - Type of entity being imported
 * @returns Validated and transformed records
 */
export function validateAndTransform(mappedRecords: Record<string, any>[], entityType: string): Record<string, any>[] {
  return mappedRecords.map(record => {
    const validated = { ...record };
    
    // Perform entity-specific validation and transformation
    switch (entityType) {
      case 'users':
        // Ensure password exists for users
        if (!validated.password) {
          validated.password = 'changeme123'; // Default password
        }
        break;
        
      case 'units':
        // Ensure active status is boolean
        if (validated.active !== undefined) {
          validated.active = validated.active === 'true' || validated.active === '1' || validated.active === 'yes';
        }
        break;
        
      case 'guests':
        // Parse dates
        if (validated.checkIn) {
          validated.checkIn = new Date(validated.checkIn);
        }
        if (validated.checkOut) {
          validated.checkOut = new Date(validated.checkOut);
        }
        break;
        
      case 'tasks':
        // Parse dates and boolean
        if (validated.dueDate) {
          validated.dueDate = new Date(validated.dueDate);
        }
        if (validated.completed !== undefined) {
          validated.completed = validated.completed === 'true' || validated.completed === '1' || validated.completed === 'yes';
        }
        break;
        
      case 'guestyProperties':
        // Convert numeric values
        if (validated.bedrooms) {
          validated.bedrooms = Number(validated.bedrooms);
        }
        if (validated.bathrooms) {
          validated.bathrooms = Number(validated.bathrooms);
        }
        if (validated.maxGuests) {
          validated.maxGuests = Number(validated.maxGuests);
        }
        break;
        
      case 'guestyReservations':
        // Parse dates
        if (validated.checkIn) {
          validated.checkIn = new Date(validated.checkIn);
        }
        if (validated.checkOut) {
          validated.checkOut = new Date(validated.checkOut);
        }
        break;
    }
    
    return validated;
  });
}

/**
 * Import data into the database
 * @param entityType - Type of entity to import
 * @param csvData - CSV data as string
 * @param fieldMappings - Mappings from CSV field names to database field names
 * @returns Import result
 */
export async function importData(
  entityType: string,
  csvData: string,
  fieldMappings: FieldMapping[]
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let recordsImported = 0;
  
  try {
    // Parse and transform the data
    const parsedRecords = parseCsvData(csvData);
    const mappedRecords = mapFields(parsedRecords, fieldMappings);
    const validatedRecords = validateAndTransform(mappedRecords, entityType);
    
    // Import records in a transaction
    await db.transaction(async (tx) => {
      for (const record of validatedRecords) {
        try {
          // Import based on entity type
          switch (entityType) {
            case 'users':
              await storage.createUser(record);
              break;
              
            case 'units':
              await storage.createUnit(record);
              break;
              
            case 'guests':
              await storage.createGuest(record);
              break;
              
            case 'tasks':
              await storage.createTask(record);
              break;
              
            case 'maintenanceIssues':
              await storage.createMaintenanceIssue(record);
              break;
              
            case 'inventoryItems':
              await storage.createInventoryItem(record);
              break;
              
            case 'vendors':
              await storage.createVendor(record);
              break;
              
            case 'projects':
              await storage.createProject(record);
              break;
              
            case 'guestyProperties':
              await storage.createGuestyProperty(record);
              break;
              
            case 'guestyReservations':
              await storage.createGuestyReservation(record);
              break;
              
            default:
              throw new Error(`Unsupported entity type: ${entityType}`);
          }
          
          recordsImported++;
        } catch (error) {
          errors.push(`Error importing record: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });
    
    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Successfully imported ${recordsImported} records into ${entityType}`
        : `Partially imported data with ${errors.length} errors`,
      entityType,
      recordsProcessed: validatedRecords.length,
      recordsImported,
      errors,
      warnings
    };
  } catch (error) {
    console.error(`Error importing ${entityType} data:`, error);
    return {
      success: false,
      message: `Failed to import ${entityType} data: ${error instanceof Error ? error.message : String(error)}`,
      entityType,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings
    };
  }
}