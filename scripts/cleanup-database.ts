/**
 * Database Cleanup Script
 * 
 * This script removes all data from the database, respecting foreign key relationships.
 * It should be used with caution as it will delete ALL data from the system.
 */

import { db } from "../server/db";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

async function cleanupDatabase() {
  console.log("Starting database cleanup...");
  
  try {
    // Begin transaction to ensure atomicity
    await db.transaction(async (tx) => {
      console.log("Deleting data in the correct order to respect foreign key constraints...");
      
      // Delete from dependent tables first to avoid foreign key constraint violations
      // Order matters here - delete child records before parent records
      
      // AI and Analytics tables
      console.log("Cleaning AI and analytics tables...");
      await tx.delete(schema.aiPlannerInteractions);
      await tx.delete(schema.aiGeneratedPlans);
      await tx.delete(schema.insightLogs);
      await tx.delete(schema.insights);
      await tx.delete(schema.unitHealthScores);
      await tx.delete(schema.reviewSentiment);
      await tx.delete(schema.revenueSnapshots);
      await tx.delete(schema.efficiencyMetrics);
      
      // HostAI related tables
      console.log("Cleaning HostAI related tables...");
      await tx.delete(schema.hostAiAutopilotLog);
      await tx.delete(schema.hostAiAutopilotSettings);
      await tx.delete(schema.hostAiTasks);
      await tx.delete(schema.hostAiSettings);
      await tx.delete(schema.hostAiLogs);
      
      // Cleaning related tables
      console.log("Cleaning cleaning-related tables...");
      await tx.delete(schema.cleaningChecklistCompletions);
      await tx.delete(schema.cleaningChecklistItems);
      await tx.delete(schema.cleaningChecklists);
      await tx.delete(schema.cleaningTasks);
      await tx.delete(schema.cleaningFlags);
      await tx.delete(schema.cleanerPerformance);
      
      // Project management tables
      console.log("Cleaning project management tables...");
      await tx.delete(schema.taskComments);
      await tx.delete(schema.projectFiles);
      await tx.delete(schema.projectTasks);
      await tx.delete(schema.projectMilestones);
      await tx.delete(schema.projects);
      
      // Property and reservation tables
      console.log("Cleaning property and reservation tables...");
      await tx.delete(schema.guestyWebhookEvents);
      await tx.delete(schema.guestyReservations);
      await tx.delete(schema.guestySyncLogs);
      await tx.delete(schema.guestyProperties);
      await tx.delete(schema.properties);
      
      // Operational tables
      console.log("Cleaning operational tables...");
      await tx.delete(schema.maintenance);
      await tx.delete(schema.tasks);
      await tx.delete(schema.inventoryTransactions);
      await tx.delete(schema.inventoryTransfers);
      await tx.delete(schema.inventory);
      await tx.delete(schema.documents);
      
      // Core tables (keep these last as they're referenced by other tables)
      console.log("Cleaning core tables...");
      await tx.delete(schema.guests);
      await tx.delete(schema.units);
      await tx.delete(schema.vendors);
      
      // Don't delete users unless explicitly requested
      // await tx.delete(schema.users).where(sql`id != 1`); // Keep admin user
      
      // Keep logs intact for auditing purposes
      console.log("Keeping logs for audit trail");
      
      // Create an entry in the logs table about this cleanup
      await tx.insert(schema.logs).values({
        action: "DATABASE_CLEANUP",
        notes: "Full database cleanup performed via script",
        timestamp: new Date(),
        // userId can be null for system operations
      });
    });
    
    console.log("Database cleanup completed successfully!");
    return { success: true, message: "Database cleanup completed successfully" };
  } catch (error) {
    console.error("Error during database cleanup:", error);
    return { 
      success: false, 
      message: `Database cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

// Only run this function if script is executed directly (not imported)
if (require.main === module) {
  cleanupDatabase()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  export { cleanupDatabase };
}