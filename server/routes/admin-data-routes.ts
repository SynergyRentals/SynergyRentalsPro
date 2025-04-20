/**
 * Admin Data Management Routes
 * 
 * This module provides routes for administrative data management operations:
 * - Database cleanup (removing sample data)
 * - Data import from CSV files
 * - Data verification and validation
 */

import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { cleanupDatabase } from '../../scripts/cleanup-database';
import { 
  saveUploadedFile,
  getSampleData,
  suggestFieldMappings,
  importData,
  bulkImport
} from '../services/dataImportService';
import { 
  EntityType,
  FieldMapping,
  ImportConfig
} from '../lib/genericCsvImporter';

/**
 * Setup admin data management routes
 * @param app - Express application
 */
export function setupAdminDataRoutes(app: express.Express) {
  // Middleware to check if user is an admin
  const checkAdmin = (req: Request, res: Response, next: express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // @ts-ignore - req.user may not be defined in the type
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    return res.status(403).json({ success: false, message: 'Admin access required' });
  };
  
  // Route for database cleanup
  app.post('/api/admin/data/cleanup', checkAdmin, async (req: Request, res: Response) => {
    try {
      const result = await cleanupDatabase();
      
      return res.json(result);
    } catch (error) {
      console.error('Error cleaning up database:', error);
      return res.status(500).json({
        success: false,
        message: `Error cleaning up database: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for getting entity types
  app.get('/api/admin/data/entity-types', checkAdmin, (req: Request, res: Response) => {
    try {
      const entityTypes = Object.keys(EntityType)
        .filter(key => isNaN(Number(key)))
        .map(key => ({
          id: key,
          name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        }));
      
      return res.json({ success: true, entityTypes });
    } catch (error) {
      console.error('Error getting entity types:', error);
      return res.status(500).json({
        success: false,
        message: `Error getting entity types: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Configure file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: './tmp/'
  }));
  
  // Route for uploading CSV files
  app.post('/api/admin/data/upload', checkAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ success: false, message: 'No files were uploaded' });
      }
      
      const csvFile = req.files.file as fileUpload.UploadedFile;
      
      // Check if it's a CSV file
      if (!csvFile.name.endsWith('.csv')) {
        return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
      }
      
      // Save the file
      const filePath = await saveUploadedFile(csvFile);
      
      // Get sample data
      const sampleData = await getSampleData(filePath);
      
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        filePath,
        sampleData
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({
        success: false,
        message: `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for getting field mapping suggestions
  app.post('/api/admin/data/suggest-mappings', checkAdmin, async (req: Request, res: Response) => {
    try {
      const { filePath, entityType } = req.body;
      
      if (!filePath || !entityType) {
        return res.status(400).json({ success: false, message: 'File path and entity type are required' });
      }
      
      // Get field mapping suggestions
      const mappings = await suggestFieldMappings(filePath, entityType);
      
      return res.json({
        success: true,
        mappings
      });
    } catch (error) {
      console.error('Error suggesting field mappings:', error);
      return res.status(500).json({
        success: false,
        message: `Error suggesting field mappings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for importing data
  app.post('/api/admin/data/import', checkAdmin, async (req: Request, res: Response) => {
    try {
      const { filePath, config } = req.body;
      
      if (!filePath || !config) {
        return res.status(400).json({ success: false, message: 'File path and import configuration are required' });
      }
      
      // @ts-ignore - req.user may not be defined in the type
      const userId = req.user?.id;
      
      // Import the data
      const result = await importData(filePath, config, userId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error importing data:', error);
      return res.status(500).json({
        success: false,
        message: `Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for bulk importing data
  app.post('/api/admin/data/bulk-import', checkAdmin, async (req: Request, res: Response) => {
    try {
      const { imports } = req.body;
      
      if (!imports || !Array.isArray(imports)) {
        return res.status(400).json({ success: false, message: 'Imports array is required' });
      }
      
      // @ts-ignore - req.user may not be defined in the type
      const userId = req.user?.id;
      
      // Bulk import the data
      const results = await bulkImport(imports, userId);
      
      return res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Error bulk importing data:', error);
      return res.status(500).json({
        success: false,
        message: `Error bulk importing data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for getting database tables
  app.get('/api/admin/data/tables', checkAdmin, async (req: Request, res: Response) => {
    try {
      // Query the database for a list of tables
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        ORDER BY table_name
      `);
      
      const tables = result.map((row: any) => row.table_name);
      
      return res.json({
        success: true,
        tables
      });
    } catch (error) {
      console.error('Error getting database tables:', error);
      return res.status(500).json({
        success: false,
        message: `Error getting database tables: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route for getting data counts for each table
  app.get('/api/admin/data/counts', checkAdmin, async (req: Request, res: Response) => {
    try {
      const counts: Record<string, number> = {};
      
      // Add count for each main entity
      counts['users'] = (await db.select({ count: sql`count(*)` }).from(schema.users))[0].count.toString();
      counts['units'] = (await db.select({ count: sql`count(*)` }).from(schema.units))[0].count.toString();
      counts['guests'] = (await db.select({ count: sql`count(*)` }).from(schema.guests))[0].count.toString();
      counts['projects'] = (await db.select({ count: sql`count(*)` }).from(schema.projects))[0].count.toString();
      counts['tasks'] = (await db.select({ count: sql`count(*)` }).from(schema.tasks))[0].count.toString();
      counts['maintenance'] = (await db.select({ count: sql`count(*)` }).from(schema.maintenance))[0].count.toString();
      counts['inventory'] = (await db.select({ count: sql`count(*)` }).from(schema.inventory))[0].count.toString();
      counts['documents'] = (await db.select({ count: sql`count(*)` }).from(schema.documents))[0].count.toString();
      counts['vendors'] = (await db.select({ count: sql`count(*)` }).from(schema.vendors))[0].count.toString();
      
      // Add counts for cleaning-related tables
      counts['cleaning_tasks'] = (await db.select({ count: sql`count(*)` }).from(schema.cleaningTasks))[0].count.toString();
      counts['cleaning_checklists'] = (await db.select({ count: sql`count(*)` }).from(schema.cleaningChecklists))[0].count.toString();
      counts['cleaning_checklist_items'] = (await db.select({ count: sql`count(*)` }).from(schema.cleaningChecklistItems))[0].count.toString();
      counts['cleaning_checklist_completions'] = (await db.select({ count: sql`count(*)` }).from(schema.cleaningChecklistCompletions))[0].count.toString();
      counts['cleaning_flags'] = (await db.select({ count: sql`count(*)` }).from(schema.cleaningFlags))[0].count.toString();
      
      // Add counts for Guesty-related tables
      counts['guesty_properties'] = (await db.select({ count: sql`count(*)` }).from(schema.guestyProperties))[0].count.toString();
      counts['guesty_reservations'] = (await db.select({ count: sql`count(*)` }).from(schema.guestyReservations))[0].count.toString();
      counts['guesty_webhook_events'] = (await db.select({ count: sql`count(*)` }).from(schema.guestyWebhookEvents))[0].count.toString();
      counts['guesty_sync_logs'] = (await db.select({ count: sql`count(*)` }).from(schema.guestySyncLogs))[0].count.toString();
      
      return res.json({
        success: true,
        counts
      });
    } catch (error) {
      console.error('Error getting data counts:', error);
      return res.status(500).json({
        success: false,
        message: `Error getting data counts: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}