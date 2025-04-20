
import { Request, Response, Router } from 'express';
import { db } from '../db';
import { syncAllGuestyData } from '../services/guestySyncService';
import { guestySyncLogs } from '@shared/schema';
import { desc } from 'drizzle-orm';
import { checkRole } from '../auth';

/**
 * Sets up routes for Guesty synchronization
 * @param app Express application
 */
export function setupGuestySyncRoutes(app: Router) {
  // Route to trigger full Guesty sync (properties and reservations)
  app.post('/api/admin/guesty/full-sync', checkRole(['admin']), async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] Admin-triggered full Guesty sync requested by ${req.user?.email || 'unknown user'}`);
    
    try {
      // Check if Guesty secrets are configured
      if (!process.env.GUESTY_CLIENT_ID || !process.env.GUESTY_CLIENT_SECRET) {
        console.error('Missing Guesty API credentials in environment variables');
        return res.status(500).json({
          success: false,
          message: 'Guesty API credentials are not configured. Please set GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET environment variables.'
        });
      }
      
      // Perform full sync
      const result = await syncAllGuestyData();
      
      // Return result
      res.json({
        success: result.success,
        message: result.message,
        properties: result.propertiesResult ? {
          success: result.propertiesResult.success,
          count: result.propertiesResult.propertiesCount,
          errors: result.propertiesResult.errors.length
        } : null,
        reservations: result.reservationsResult ? {
          success: result.reservationsResult.success,
          count: result.reservationsResult.reservationsCount,
          errors: result.reservationsResult.errors.length
        } : null,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error in full Guesty sync route:', error);
      res.status(500).json({
        success: false,
        message: `Error performing full Guesty sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Route to get Guesty sync status
  app.get('/api/admin/guesty/status', checkRole(['admin']), async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] Admin requested Guesty sync status`);
    
    try {
      // Fetch the five most recent sync logs
      const recentLogs = await db.select()
        .from(guestySyncLogs)
        .orderBy(desc(guestySyncLogs.startedAt || guestySyncLogs.syncDate))
        .limit(5);
      
      // Return the logs
      res.json({
        success: true,
        logs: recentLogs.map(log => ({
          id: log.id,
          syncType: log.syncType,
          status: log.status,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          itemsProcessed: log.itemsProcessed,
          notes: log.notes,
        }))
      });
      
    } catch (error) {
      console.error('Error fetching Guesty sync logs:', error);
      res.status(500).json({
        success: false,
        message: `Error fetching Guesty sync logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}
import express from "express";
import { syncAll, getLatestSyncLog } from "../guesty";

const router = express.Router();

export function setupGuestySyncRoutes(app: express.Application) {
  app.use("/api/admin/guesty", router);
}

// Trigger full sync
router.post("/full-sync", async (_req, res) => {
  try {
    const result = await syncAll();
    res.status(result.success ? 200 : 500).json(result);
  } catch (err: any) {
    console.error("Full‑sync error:", err);
    res.status(500).json({ success: false, message: err?.message ?? "Unknown" });
  }
});

// Status endpoint
router.get("/status", async (_req, res) => {
  try {
    const data = await getLatestSyncLog();
    res.json(data ?? { message: "No sync history yet." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});
