/**
 * Admin Data Routes
 * 
 * API endpoints for data administration, including importing and cleaning up data.
 */

import express from 'express';
import multer from 'express-fileupload';
import * as schema from '../../shared/schema';
import { db } from '../db';
import { storage } from '../storage';
import { cleanupDatabase } from '../../scripts/cleanup-database';
import { importData } from '../services/dataImportService';

const router = express.Router();

// Setup function to register the admin data routes
export function setupAdminDataRoutes(app: express.Application) {
  app.use('/api/admin/data', router);
}

// Middleware to check if user is admin
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
};

// Get available entity types for data operations
router.get('/entity-types', async (req, res) => {
  try {
    // Return all entity types available in the system
    const entityTypes = [
      'users',
      'units',
      'guests',
      'tasks',
      'maintenanceIssues',
      'inventoryItems',
      'vendors',
      'projects',
      'guestyProperties',
      'guestyReservations'
    ];

    res.json({ types: entityTypes });
  } catch (error) {
    console.error('Error fetching entity types:', error);
    res.status(500).json({ error: 'Failed to fetch entity types' });
  }
});

// Get table counts for database overview
router.get('/table-counts', async (req, res) => {
  try {
    // Get counts from all relevant tables using SQL count
    const { pool } = await import('../db');
    
    // Get counts using raw SQL queries
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM units) as unit_count,
        (SELECT COUNT(*) FROM guests) as guest_count,
        (SELECT COUNT(*) FROM tasks) as task_count,
        (SELECT COUNT(*) FROM maintenance_issues) as maintenance_issue_count,
        (SELECT COUNT(*) FROM inventory_items) as inventory_item_count,
        (SELECT COUNT(*) FROM vendors) as vendor_count,
        (SELECT COUNT(*) FROM projects) as project_count,
        (SELECT COUNT(*) FROM guesty_properties) as guesty_property_count,
        (SELECT COUNT(*) FROM guesty_reservations) as guesty_reservation_count,
        (SELECT COUNT(*) FROM guesty_sync_logs) as guesty_sync_log_count,
        (SELECT COUNT(*) FROM guesty_webhook_events) as guesty_webhook_event_count
    `);
    
    const counts = result.rows[0];

    // Return counts from the SQL query
    res.json({
      counts: {
        users: Number(counts.user_count),
        units: Number(counts.unit_count),
        guests: Number(counts.guest_count),
        tasks: Number(counts.task_count),
        maintenance_issues: Number(counts.maintenance_issue_count),
        inventory_items: Number(counts.inventory_item_count),
        vendors: Number(counts.vendor_count),
        projects: Number(counts.project_count),
        guesty_properties: Number(counts.guesty_property_count),
        guesty_reservations: Number(counts.guesty_reservation_count),
        guesty_sync_logs: Number(counts.guesty_sync_log_count),
        guesty_webhook_events: Number(counts.guesty_webhook_event_count)
      }
    });
  } catch (error) {
    console.error('Error fetching table counts:', error);
    res.status(500).json({ error: 'Failed to fetch table counts' });
  }
});

// Clean up sample data
router.post('/cleanup', async (req, res) => {
  try {
    const result = await cleanupDatabase();
    res.json(result);
  } catch (error) {
    console.error('Error cleaning up database:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clean up database',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Import data from CSV
router.post('/import', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file as multer.UploadedFile;
    const entityType = req.body.entityType;
    const fieldMappings = JSON.parse(req.body.fieldMappings);

    if (!entityType) {
      return res.status(400).json({ error: 'Entity type is required' });
    }

    // Read file content
    const csvData = file.data.toString();

    // Import the data
    const result = await importData(entityType, csvData, fieldMappings);
    res.json(result);
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to import data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;