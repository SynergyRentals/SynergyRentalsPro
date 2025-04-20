/**
 * Data Import Service
 * 
 * This module provides services for importing data from CSV files into the database.
 * It handles file uploads, data sampling, field mapping suggestions, and bulk imports.
 */

import path from 'path';
import fs from 'fs';
import {
  EntityType,
  FieldMapping,
  ImportConfig,
  ImportResult,
  importFromCsv,
  generateFieldMappingTemplate
} from '../lib/genericCsvImporter';

// Import parseCSV function from the custom importer
import { parseCSV } from '../lib/genericCsvImporter';
import { db } from '../db';
import * as schema from '@shared/schema';
import { storage } from '../storage';

// Ensure tmp directory exists
const TMP_DIR = './tmp';
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Save an uploaded file to the temporary directory
 * @param uploadedFile - Uploaded file from express-fileupload
 * @returns Path to the saved file
 */
export async function saveUploadedFile(uploadedFile: any): Promise<string> {
  // Generate a unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const filename = `${timestamp}-${randomString}.csv`;
  const filePath = path.join(TMP_DIR, filename);
  
  // Save the file
  await uploadedFile.mv(filePath);
  
  return filePath;
}

/**
 * Get sample data from a CSV file
 * @param filePath - Path to the CSV file
 * @param rowCount - Number of rows to sample
 * @returns Sample data
 */
export async function getSampleData(filePath: string, rowCount: number = 5): Promise<any[]> {
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV using our custom parser
    const records = parseCSV(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    
    // Return the first n rows
    return records.slice(0, rowCount);
  } catch (error) {
    console.error('Error getting sample data:', error);
    return [];
  }
}

/**
 * Suggest field mappings for a CSV file
 * @param filePath - Path to the CSV file
 * @param entityType - Entity type
 * @returns Suggested field mappings
 */
export async function suggestFieldMappings(
  filePath: string,
  entityType: EntityType
): Promise<FieldMapping[]> {
  try {
    // Get sample data to extract CSV headers
    const sampleData = await getSampleData(filePath, 1);
    
    if (sampleData.length === 0) {
      return [];
    }
    
    // Get CSV column headers
    const csvHeaders = Object.keys(sampleData[0]);
    
    // Get default field mappings for the entity type
    const defaultMappings = generateFieldMappingTemplate(entityType);
    
    // Suggest mappings based on column name similarity
    for (const mapping of defaultMappings) {
      const entityField = mapping.entityField.toLowerCase();
      
      // Try to find an exact match
      const exactMatch = csvHeaders.find(header => 
        header.toLowerCase() === entityField
      );
      
      if (exactMatch) {
        mapping.csvField = exactMatch;
        continue;
      }
      
      // Try to find a partial match
      const partialMatch = csvHeaders.find(header => 
        header.toLowerCase().includes(entityField) || 
        entityField.includes(header.toLowerCase())
      );
      
      if (partialMatch) {
        mapping.csvField = partialMatch;
      }
    }
    
    return defaultMappings;
  } catch (error) {
    console.error('Error suggesting field mappings:', error);
    return [];
  }
}

/**
 * Import data from a CSV file
 * @param filePath - Path to the CSV file
 * @param config - Import configuration
 * @param userId - User ID for logging
 * @returns Import result
 */
export async function importData(
  filePath: string,
  config: ImportConfig,
  userId?: number
): Promise<ImportResult> {
  try {
    // Import the data
    const result = await importFromCsv(filePath, config);
    
    // Log the import
    if (userId) {
      await db.insert(schema.logs).values({
        action: `IMPORT_${config.entityType.toUpperCase()}`,
        userId,
        notes: `Imported ${result.recordsImported} ${config.entityType} records, skipped ${result.recordsSkipped} records`,
        targetTable: config.entityType,
        createdAt: new Date(),
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      success: false,
      message: `Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recordsProcessed: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      errors: [],
    };
  }
}

/**
 * Bulk import data from multiple CSV files
 * @param importConfigs - Array of import configurations
 * @param userId - User ID for logging
 * @returns Array of import results
 */
export async function bulkImport(
  importConfigs: { filePath: string; config: ImportConfig }[],
  userId?: number
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (const { filePath, config } of importConfigs) {
    const result = await importData(filePath, config, userId);
    results.push(result);
  }
  
  return results;
}