/**
 * Migration: Add example column to cleaning_tasks
 * Created: 2025-04-17T00:00:00.000Z
 * 
 * This is an example migration to demonstrate proper migration format.
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Apply the migration
 */
export async function up() {
  try {
    console.log('Applying migration: Add example column to cleaning_tasks');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if column already exists to prevent errors
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cleaning_tasks' AND column_name = 'example_column';
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, add it
      await pool.query(`
        ALTER TABLE cleaning_tasks
        ADD COLUMN example_column TEXT;
      `);
      console.log('Added example_column to cleaning_tasks table');
    } else {
      console.log('Column example_column already exists, skipping');
    }
    
    // Record this migration in the migrations table
    await pool.query(`
      INSERT INTO migrations (name, applied_at)
      VALUES ('20250417000000_add_example_column.js', NOW())
      ON CONFLICT (name) DO NOTHING;
    `);
    
    await pool.end();
    
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

/**
 * Revert the migration
 */
export async function down() {
  try {
    console.log('Reverting migration: Add example column to cleaning_tasks');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Drop the column if it exists
    await pool.query(`
      ALTER TABLE cleaning_tasks
      DROP COLUMN IF EXISTS example_column;
    `);
    
    // Remove this migration from the migrations table
    await pool.query(`
      DELETE FROM migrations
      WHERE name = '20250417000000_add_example_column.js';
    `);
    
    await pool.end();
    
    console.log('Migration reverted successfully.');
  } catch (error) {
    console.error('Error reverting migration:', error);
    process.exit(1);
  }
}