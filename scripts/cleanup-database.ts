/**
 * Database Cleanup Script
 * 
 * This script provides functions to clean up the database by removing sample data
 * while preserving important system data and user accounts.
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";

const {
  users,
  units,
  guests,
  tasks,
  maintenanceIssues,
  inventoryItems,
  vendors,
  projects,
  guestyProperties,
  guestyReservations,
  guestySyncLogs,
  guestyWebhookEvents
} = schema;

interface CleanupResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Clean up the database by removing sample data
 * @returns Cleanup result
 */
export async function cleanupDatabase(): Promise<CleanupResult> {
  try {
    console.log('Starting database cleanup...');
    
    // Get the list of tables that exist in the database
    const { pool } = await import('../server/db');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log("Existing tables:", existingTables);
    
    // Start a transaction to ensure all operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      let counts: Record<string, number> = {};
      const processTable = async (tableName: string, schemaObj: any, displayName: string) => {
        if (existingTables.includes(tableName)) {
          try {
            const deleted = await tx.delete(schemaObj).returning();
            console.log(`Deleted ${deleted.length} ${displayName}`);
            counts[displayName] = deleted.length;
          } catch (err) {
            console.error(`Error deleting from ${tableName}:`, err);
            throw err;
          }
        }
      };

      // Delete data in reverse order of dependencies
      
      // First level - webhook events, logs, and task-related items
      await processTable('guesty_webhook_events', guestyWebhookEvents, 'Guesty webhook events');
      await processTable('guesty_sync_logs', guestySyncLogs, 'Guesty sync logs');
      
      // AI planner interactions
      if (existingTables.includes('ai_planner_interactions')) {
        await tx.execute(sql`DELETE FROM ai_planner_interactions`);
        console.log('Deleted AI planner interactions');
        counts['aiPlannerInteractions'] = 1;
      }
      
      // Host AI related tables
      if (existingTables.includes('host_ai_tasks')) {
        await tx.execute(sql`DELETE FROM host_ai_tasks`);
        console.log('Deleted Host AI tasks');
        counts['hostAiTasks'] = 1;
      }
      
      if (existingTables.includes('host_ai_autopilot_log')) {
        await tx.execute(sql`DELETE FROM host_ai_autopilot_log`);
        console.log('Deleted Host AI autopilot logs');
        counts['hostAiAutopilotLog'] = 1;
      }
      
      // Second level - task-related tables
      if (existingTables.includes('cleaning_checklist_completions')) {
        await tx.execute(sql`DELETE FROM cleaning_checklist_completions`);
        console.log('Deleted cleaning checklist completions');
        counts['cleaningChecklistCompletions'] = 1;
      }
      
      if (existingTables.includes('cleaning_flags')) {
        await tx.execute(sql`DELETE FROM cleaning_flags`);
        console.log('Deleted cleaning flags');
        counts['cleaningFlags'] = 1;
      }
      
      if (existingTables.includes('task_comments')) {
        await tx.execute(sql`DELETE FROM task_comments`);
        console.log('Deleted task comments');
        counts['taskComments'] = 1;
      }
      
      // Third level - tasks, reservations
      if (existingTables.includes('cleaning_tasks')) {
        await tx.execute(sql`DELETE FROM cleaning_tasks`);
        console.log('Deleted cleaning tasks');
        counts['cleaningTasks'] = 1;
      }
      
      await processTable('guesty_reservations', guestyReservations, 'Guesty reservations');
      await processTable('tasks', tasks, 'tasks');
      
      // Fourth level - projects, maintenance, inventory
      if (existingTables.includes('project_milestones')) {
        await tx.execute(sql`DELETE FROM project_milestones`);
        console.log('Deleted project milestones');
        counts['projectMilestones'] = 1;
      }
      
      if (existingTables.includes('project_tasks')) {
        await tx.execute(sql`DELETE FROM project_tasks`);
        console.log('Deleted project tasks');
        counts['projectTasks'] = 1;
      }
      
      await processTable('projects', projects, 'projects');
      await processTable('maintenance_issues', maintenanceIssues, 'maintenance issues');
      await processTable('inventory_items', inventoryItems, 'inventory items');
      
      // Fifth level - properties, vendors
      await processTable('guesty_properties', guestyProperties, 'Guesty properties');
      
      if (existingTables.includes('properties')) {
        await tx.execute(sql`DELETE FROM properties`);
        console.log('Deleted properties');
        counts['properties'] = 1;
      }
      
      await processTable('vendors', vendors, 'vendors');
      
      // Sixth level - guests
      await processTable('guests', guests, 'guests');
      
      // Note: We do NOT delete units or users as these are core to the system
      // and likely contain important configuration data
      
      return counts;
    });
  
    console.log('Database cleanup completed successfully');
  
    return {
      success: true,
      message: 'Sample data has been successfully removed from the database.',
      details: result
    };
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return {
      success: false,
      message: `Failed to clean up database: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function main() {
  try {
    const result = await cleanupDatabase();
    console.log('Cleanup result:', result);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Unhandled error in cleanup script:', error);
    process.exit(1);
  }
}

// For ES modules, we'll run the main function automatically when the file is executed directly
// This will be ignored when imported as a module
if (import.meta.url === import.meta.resolve('./cleanup-database.ts')) {
  main();
}