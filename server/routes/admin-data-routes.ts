/**
 * Admin Data Management Routes
 * 
 * These routes handle data import, export, and database cleanup operations
 * for the admin data management interface.
 */

import { Express, Request, Response } from 'express';
import * as schema from '../../shared/schema';
import { db } from '../db';
import { storage } from '../storage';
import { checkRole } from '../middleware/auth';
import { 
  EntityType, 
  generateFieldMappingTemplate, 
  importFromCsv 
} from '../lib/genericCsvImporter';
import {
  saveUploadedFile,
  getSampleData,
  suggestFieldMappings,
  importData,
  bulkImport,
} from '../services/dataImportService';
import { cleanupDatabase } from '../../scripts/cleanup-database';
import { stringify } from 'csv-stringify/sync';
import path from 'path';
import fs from 'fs';

// Ensure tmp directory exists
const TMP_DIR = './tmp';
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Setup admin data routes
export function setupAdminDataRoutes(app: Express) {
  // Middleware to ensure only admins can access these routes
  const adminOnly = checkRole(['admin']);
  
  // Analyze uploaded CSV file and suggest field mappings
  app.post('/api/admin/data-import/analyze', adminOnly, async (req: Request, res: Response) => {
    try {
      // Validate request
      if (!req.files || !req.files.file) {
        return res.status(400).json({
          success: false,
          message: 'No file was uploaded'
        });
      }
      
      if (!req.body.entityType) {
        return res.status(400).json({
          success: false,
          message: 'No entity type specified'
        });
      }
      
      const entityType = req.body.entityType as EntityType;
      const uploadedFile = req.files.file as any;
      
      // Save the uploaded file
      const filePath = await saveUploadedFile(uploadedFile);
      
      // Get sample data from the file
      const previewData = await getSampleData(filePath, 5);
      
      // Suggest field mappings
      const suggestedMappings = await suggestFieldMappings(
        filePath,
        entityType
      );
      
      // Return the results
      res.json({
        success: true,
        message: 'File analyzed successfully',
        previewData,
        suggestedMappings,
      });
      
      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
    } catch (error) {
      console.error('Error analyzing file:', error);
      res.status(500).json({
        success: false,
        message: `Error analyzing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Import data from uploaded CSV file
  app.post('/api/admin/data-import/import', adminOnly, async (req: Request, res: Response) => {
    try {
      // Validate request
      if (!req.files || !req.files.file) {
        return res.status(400).json({
          success: false,
          message: 'No file was uploaded'
        });
      }
      
      if (!req.body.config) {
        return res.status(400).json({
          success: false,
          message: 'No import configuration provided'
        });
      }
      
      const config = JSON.parse(req.body.config);
      const uploadedFile = req.files.file as any;
      
      // Save the uploaded file
      const filePath = await saveUploadedFile(uploadedFile);
      
      // Import the data
      const result = await importData(
        filePath,
        config,
        req.user?.id
      );
      
      // Return the results
      res.json({
        success: result.success,
        message: result.message,
        recordsProcessed: result.recordsProcessed,
        recordsImported: result.recordsImported,
        recordsSkipped: result.recordsSkipped,
        errors: result.errors,
      });
      
      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
    } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({
        success: false,
        message: `Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Export data to CSV
  app.get('/api/admin/data-export/:entityType', adminOnly, async (req: Request, res: Response) => {
    try {
      const entityType = req.params.entityType as EntityType;
      
      // Get the table for this entity type
      const table = getTableForEntityType(entityType);
      
      if (!table) {
        return res.status(400).json({
          success: false,
          message: `Invalid entity type: ${entityType}`
        });
      }
      
      // Get all records from the table
      const records = await db.select().from(table);
      
      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No records found for entity type: ${entityType}`
        });
      }
      
      // Convert records to CSV
      const csv = stringify(records, {
        header: true,
      });
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${entityType}-export-${Date.now()}.csv`);
      
      // Send the CSV data
      res.send(csv);
      
      // Log the export action
      await db.insert(schema.logs).values({
        action: `EXPORT_${entityType.toUpperCase()}`,
        userId: req.user?.id,
        notes: `Exported ${records.length} ${entityType} records to CSV`,
        targetTable: getTableName(entityType),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        message: `Error exporting data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Clean up the database (delete all sample data)
  app.post('/api/admin/data-import/cleanup', adminOnly, async (req: Request, res: Response) => {
    try {
      // Clean up the database
      const result = await cleanupDatabase();
      
      // Return the results
      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Error cleaning up database:', error);
      res.status(500).json({
        success: false,
        message: `Error cleaning up database: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Get the database schema
  app.get('/api/admin/data-schema', adminOnly, async (req: Request, res: Response) => {
    try {
      // Get all entity types and their fields
      const entitySchemas: Record<EntityType, any[]> = {} as Record<EntityType, any[]>;
      
      // Add each entity type
      Object.values(EntityType).forEach((entityType) => {
        // Generate field mapping template for this entity type
        const fieldMappings = generateFieldMappingTemplate(entityType);
        
        // Add to the schemas object
        entitySchemas[entityType] = fieldMappings;
      });
      
      // Return the schema information
      res.json({
        success: true,
        schemas: entitySchemas
      });
    } catch (error) {
      console.error('Error getting database schema:', error);
      res.status(500).json({
        success: false,
        message: `Error getting database schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Get database statistics
  app.get('/api/admin/data-stats', adminOnly, async (req: Request, res: Response) => {
    try {
      // Get record counts for each entity type
      const stats: Record<string, number> = {};
      
      // Add counts for each entity type
      for (const entityType of Object.values(EntityType)) {
        const table = getTableForEntityType(entityType);
        if (table) {
          const [{ count }] = await db
            .select({ count: db.fn.count<number>() })
            .from(table);
          
          stats[entityType] = Number(count);
        }
      }
      
      // Return the statistics
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error getting database statistics:', error);
      res.status(500).json({
        success: false,
        message: `Error getting database statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
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
 * Get the table name for an entity type
 * @param entityType - Entity type
 * @returns Table name
 */
function getTableName(entityType: EntityType): string {
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