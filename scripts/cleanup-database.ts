/**
 * Database Cleanup Script
 * 
 * This script provides functions to clean up the database by removing sample data
 * while preserving important system data and user accounts.
 */

import { db } from '../server/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

// Interface for cleanup result
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
    // Keep track of deleted records
    const deletedCounts: Record<string, number> = {};
    
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Preserve admin users (don't delete them)
      const adminUsers = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(sql`${schema.users.role} = 'admin'`);
      
      const adminUserIds = adminUsers.map(user => user.id);
      
      // 1. Clean up cleaning-related tables 
      // (These need to be deleted first due to foreign key constraints)
      deletedCounts['cleaning_checklist_completions'] = (await tx
        .delete(schema.cleaningChecklistCompletions)
        .returning()).length;
      
      deletedCounts['cleaning_flags'] = (await tx
        .delete(schema.cleaningFlags)
        .returning()).length;
        
      deletedCounts['cleaning_tasks'] = (await tx
        .delete(schema.cleaningTasks)
        .returning()).length;
      
      deletedCounts['cleaning_checklists'] = (await tx
        .delete(schema.cleaningChecklists)
        .returning()).length;
      
      deletedCounts['cleaning_checklist_items'] = (await tx
        .delete(schema.cleaningChecklistItems)
        .returning()).length;
      
      // 2. Clean up operational tables
      deletedCounts['maintenance'] = (await tx
        .delete(schema.maintenance)
        .returning()).length;
      
      deletedCounts['inventory'] = (await tx
        .delete(schema.inventory)
        .returning()).length;
      
      deletedCounts['documents'] = (await tx
        .delete(schema.documents)
        .returning()).length;
      
      // 3. Clean up project and task tables
      deletedCounts['tasks'] = (await tx
        .delete(schema.tasks)
        .returning()).length;
      
      deletedCounts['projects'] = (await tx
        .delete(schema.projects)
        .returning()).length;
      
      // 4. Clean up guest-related tables
      deletedCounts['guest_notes'] = (await tx
        .delete(schema.guestNotes)
        .returning()).length;
      
      deletedCounts['guests'] = (await tx
        .delete(schema.guests)
        .returning()).length;
      
      // 5. Clean up Guesty integration tables
      deletedCounts['guesty_reservations'] = (await tx
        .delete(schema.guestyReservations)
        .returning()).length;
      
      deletedCounts['guesty_properties'] = (await tx
        .delete(schema.guestyProperties)
        .returning()).length;
      
      deletedCounts['guesty_webhook_events'] = (await tx
        .delete(schema.guestyWebhookEvents)
        .returning()).length;
      
      // 6. Clean up property and unit tables
      deletedCounts['properties'] = (await tx
        .delete(schema.properties)
        .returning()).length;
      
      deletedCounts['units'] = (await tx
        .delete(schema.units)
        .returning()).length;
      
      // 7. Clean up vendor tables
      deletedCounts['vendors'] = (await tx
        .delete(schema.vendors)
        .returning()).length;
      
      // 8. Clean up user accounts, but preserve admin accounts
      if (adminUserIds.length > 0) {
        deletedCounts['users'] = (await tx
          .delete(schema.users)
          .where(sql`${schema.users.id} NOT IN (${adminUserIds.join(',')})`)
          .returning()).length;
      } else {
        // If no admin users found, don't delete any users for safety
        deletedCounts['users'] = 0;
      }
      
      // 9. Clean up HostAI-related tables
      deletedCounts['host_ai_autopilot_log'] = (await tx
        .delete(schema.hostAiAutopilotLog)
        .returning()).length;
      
      deletedCounts['host_ai_autopilot_settings'] = (await tx
        .delete(schema.hostAiAutopilotSettings)
        .returning()).length;
      
      deletedCounts['ai_planner_interactions'] = (await tx
        .delete(schema.aiPlannerInteractions)
        .returning()).length;
      
      // 10. Clean up cleaner performance metrics
      deletedCounts['cleaner_performance'] = (await tx
        .delete(schema.cleanerPerformance)
        .returning()).length;
      
      // Do not delete logs, as they can be useful for auditing
      // Do not delete sessions, as they are needed for current users
      
      // Log the cleanup operation
      await tx.insert(schema.logs).values({
        action: 'DATABASE_CLEANUP',
        notes: 'Database cleanup performed via admin interface',
        targetTable: 'all',
        createdAt: new Date(),
      });
      
      // Calculate total records deleted
      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
      
      return {
        success: true,
        message: `Database cleanup successful. Deleted ${totalDeleted} records from ${Object.keys(deletedCounts).length} tables.`,
        details: {
          deletedCounts,
          totalDeleted,
          preservedAdminUsers: adminUserIds.length,
        },
      };
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return {
      success: false,
      message: `Error cleaning up database: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ES module doesn't have 'require.main === module', so we'll just export the function
// If you want to run this directly, use: 
// node --loader tsx scripts/cleanup-database.ts

// For direct execution in the future
export async function main() {
  try {
    const result = await cleanupDatabase();
    console.log(result.message);
    if (result.details) {
      console.log('Details:', JSON.stringify(result.details, null, 2));
    }
    return result.success ? 0 : 1;
  } catch (error) {
    console.error('Unhandled error:', error);
    return 1;
  }
}