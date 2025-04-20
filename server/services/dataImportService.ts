/**
 * Data Import Service
 * 
 * This service manages the import of various data types and maintains relationships
 * between entities across different modules of the application.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { 
  importFromCsv, 
  EntityType, 
  ImportResult, 
  FieldMapping, 
  generateFieldMappingTemplate 
} from '../lib/genericCsvImporter';
import { cleanupDatabase } from '../../scripts/cleanup-database';
import { sql } from 'drizzle-orm';

// Upload directory for import files
const UPLOAD_DIR = './tmp/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Interface for import configuration
 */
export interface ImportConfig {
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  updateExisting: boolean;
  identifierField?: string;
  relationshipConfig?: RelationshipConfig[];
  options?: {
    skipFirstRow?: boolean;
    delimiter?: string;
  };
}

/**
 * Interface for relationship configuration
 */
export interface RelationshipConfig {
  entityField: string;
  relatedEntityType: EntityType;
  relatedEntityField: string;
}

/**
 * Interface for uploaded file info
 */
export interface UploadedFileInfo {
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
}

/**
 * Save an uploaded file
 * @param file - Uploaded file info
 * @returns Path to the saved file
 */
export async function saveUploadedFile(file: Express.Multer.File | any): Promise<string> {
  // Generate a unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name || file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filepath = path.join(UPLOAD_DIR, filename);
  
  // Create a write stream
  const writeStream = fs.createWriteStream(filepath);
  
  // Save the file
  if (file.mv) {
    // For express-fileupload
    await file.mv(filepath);
  } else if (file.buffer) {
    // For multer
    fs.writeFileSync(filepath, file.buffer);
  } else {
    throw new Error('Unsupported file upload method');
  }
  
  return filepath;
}

/**
 * Import data from a CSV file
 * @param filePath - Path to the CSV file
 * @param config - Import configuration
 * @param userId - ID of the user performing the import
 * @returns Import result
 */
export async function importData(
  filePath: string,
  config: ImportConfig,
  userId?: number
): Promise<ImportResult> {
  // Import the data
  const result = await importFromCsv(filePath, {
    entityType: config.entityType,
    fieldMappings: config.fieldMappings,
    updateExisting: config.updateExisting,
    identifierField: config.identifierField,
    relationshipMappings: config.relationshipConfig,
    skipFirstRow: config.options?.skipFirstRow,
    delimiter: config.options?.delimiter,
  });
  
  // Log the import
  await db.insert(schema.logs).values({
    action: `IMPORT_${config.entityType.toUpperCase()}`,
    userId: userId,
    notes: `Imported ${result.recordsImported} ${config.entityType} records from CSV`,
    targetTable: getTargetTableName(config.entityType),
  });
  
  return result;
}

/**
 * Get the database table name for an entity type
 * @param entityType - Entity type
 * @returns Table name
 */
function getTargetTableName(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.USER:
      return 'users';
    case EntityType.UNIT:
      return 'units';
    case EntityType.GUEST:
      return 'guests';
    case EntityType.PROPERTY:
      return 'properties';
    case EntityType.GUESTY_PROPERTY:
      return 'guesty_properties';
    case EntityType.GUESTY_RESERVATION:
      return 'guesty_reservations';
    case EntityType.PROJECT:
      return 'projects';
    case EntityType.TASK:
      return 'tasks';
    case EntityType.MAINTENANCE:
      return 'maintenance';
    case EntityType.INVENTORY:
      return 'inventory';
    case EntityType.CLEANING_TASK:
      return 'cleaning_tasks';
    case EntityType.DOCUMENT:
      return 'documents';
    case EntityType.VENDOR:
      return 'vendors';
    default:
      return entityType.toString();
  }
}

/**
 * Clean database and import data from multiple CSV files
 * @param files - Object mapping entity types to file paths
 * @param configs - Object mapping entity types to import configurations
 * @param userId - ID of the user performing the import
 * @param cleanDatabase - Whether to clean the database before importing
 * @returns Import results
 */
export async function bulkImport(
  files: Record<EntityType, string>,
  configs: Record<EntityType, ImportConfig>,
  userId?: number,
  cleanDatabase: boolean = false
): Promise<Record<EntityType, ImportResult>> {
  // Clean the database if requested
  if (cleanDatabase) {
    await cleanupDatabase();
  }
  
  // Define import order to respect entity relationships
  const importOrder: EntityType[] = [
    EntityType.USER,
    EntityType.VENDOR,
    EntityType.UNIT,
    EntityType.GUEST,
    EntityType.PROPERTY,
    EntityType.GUESTY_PROPERTY,
    EntityType.GUESTY_RESERVATION,
    EntityType.INVENTORY,
    EntityType.MAINTENANCE,
    EntityType.PROJECT,
    EntityType.TASK,
    EntityType.CLEANING_TASK,
    EntityType.DOCUMENT,
  ];
  
  const results: Record<EntityType, ImportResult> = {} as Record<EntityType, ImportResult>;
  
  // Import entities in order
  for (const entityType of importOrder) {
    if (files[entityType] && configs[entityType]) {
      results[entityType] = await importData(
        files[entityType],
        configs[entityType],
        userId
      );
    }
  }
  
  // Post-process to ensure all relationships are properly established
  await ensureRelationships();
  
  return results;
}

/**
 * Ensure all relationships between entities are properly established
 */
async function ensureRelationships(): Promise<void> {
  // Link units to properties where possible
  await db.execute(sql`
    UPDATE units
    SET guesty_property_id = gp.id
    FROM guesty_properties gp
    WHERE units.name = gp.name AND units.guesty_property_id IS NULL
  `);
  
  // Link tasks to units where possible
  await db.execute(sql`
    UPDATE tasks
    SET unit_id = u.id
    FROM units u
    WHERE tasks.unit_name = u.name AND tasks.unit_id IS NULL
  `);
  
  // Link cleaning tasks to units where possible
  await db.execute(sql`
    UPDATE cleaning_tasks
    SET unit_id = u.id
    FROM units u
    WHERE cleaning_tasks.unit_name = u.name AND cleaning_tasks.unit_id IS NULL
  `);
  
  // Link maintenance records to units where possible
  await db.execute(sql`
    UPDATE maintenance
    SET unit_id = u.id
    FROM units u
    WHERE maintenance.unit_name = u.name AND maintenance.unit_id IS NULL
  `);
  
  // Link inventory to units where possible
  await db.execute(sql`
    UPDATE inventory
    SET unit_id = u.id
    FROM units u
    WHERE inventory.location_name = u.name AND inventory.unit_id IS NULL
  `);
  
  // More relationship fixes can be added as needed
}

/**
 * Get a sample of the data from a CSV file
 * @param filePath - Path to the CSV file
 * @param sampleSize - Number of rows to sample
 * @returns Array of sample rows
 */
export async function getSampleData(
  filePath: string,
  sampleSize: number = 5
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    const samples: any[] = [];
    let rowCount = 0;
    
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (row) => {
        if (rowCount < sampleSize) {
          samples.push(row);
          rowCount++;
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        resolve(samples);
      });
  });
}

/**
 * Analyze a CSV file to suggest field mappings
 * @param filePath - Path to the CSV file
 * @param entityType - Target entity type
 * @returns Suggested field mappings
 */
export async function suggestFieldMappings(
  filePath: string,
  entityType: EntityType
): Promise<FieldMapping[]> {
  // Get column headers from the CSV
  const parser = parse({
    delimiter: ',',
    columns: true,
    skip_empty_lines: true,
    trim: true,
    to: 1, // Only read the first row for headers
  });
  
  const headerPromise = new Promise<string[]>((resolve, reject) => {
    let headers: string[] = [];
    
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('headers', (csvHeaders: string[]) => {
        headers = csvHeaders;
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        resolve(headers);
      });
  });
  
  const headers = await headerPromise;
  
  // Get the template mappings for this entity type
  const templateMappings = generateFieldMappingTemplate(entityType);
  
  // Try to match CSV headers with template fields
  const suggestedMappings: FieldMapping[] = [];
  
  for (const templateMapping of templateMappings) {
    const matchedHeader = findBestMatch(templateMapping.csvField, headers);
    
    if (matchedHeader) {
      suggestedMappings.push({
        ...templateMapping,
        csvField: matchedHeader,
      });
    } else {
      // Keep the template mapping but mark it as unmatched
      suggestedMappings.push(templateMapping);
    }
  }
  
  return suggestedMappings;
}

/**
 * Find the best match for a field name in a list of headers
 * @param fieldName - Field name to match
 * @param headers - List of headers
 * @returns Best matching header or null
 */
function findBestMatch(fieldName: string, headers: string[]): string | null {
  // Direct match
  const directMatch = headers.find(h => 
    h.toLowerCase() === fieldName.toLowerCase()
  );
  
  if (directMatch) return directMatch;
  
  // Partial match
  const partialMatch = headers.find(h => 
    h.toLowerCase().includes(fieldName.toLowerCase()) || 
    fieldName.toLowerCase().includes(h.toLowerCase())
  );
  
  if (partialMatch) return partialMatch;
  
  // No match
  return null;
}

// Export the functions
export {
  importData,
  bulkImport,
  saveUploadedFile,
  getSampleData,
  suggestFieldMappings,
  ensureRelationships
};