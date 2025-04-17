/**
 * Migration status checker
 * 
 * This utility shows which migrations have been applied and which are pending
 * Usage: node migrations/status.js
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Checking migration status...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Ensure migrations table exists
    await createMigrationsTableIfNeeded(pool);
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(path.join('migrations', 'scripts'))
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort alphabetically to ensure timestamp order
    
    console.log('Migration status:');
    console.log('=================');
    
    // Check each migration file
    for (const migrationFile of migrationFiles) {
      const status = appliedMigrations.includes(migrationFile) ? '✓ Applied' : '✗ Pending';
      console.log(`${status} - ${migrationFile}`);
    }
    
    // Show summary
    const pendingCount = migrationFiles.length - appliedMigrations.length;
    console.log('=================');
    console.log(`Total: ${migrationFiles.length} migrations`);
    console.log(`Applied: ${appliedMigrations.length} migrations`);
    console.log(`Pending: ${pendingCount} migrations`);
    
    await pool.end();
  } catch (error) {
    console.error('Error checking migration status:', error);
    process.exit(1);
  }
}

/**
 * Create the migrations table if it doesn't exist
 */
async function createMigrationsTableIfNeeded(pool) {
  // Check if migrations table exists
  const tableExistsQuery = `
    SELECT to_regclass('migrations') IS NOT NULL AS exists;
  `;
  
  const tableExists = await pool.query(tableExistsQuery);
  
  if (!tableExists.rows[0].exists) {
    console.log('Creating migrations table...');
    
    const createTableQuery = `
      CREATE TABLE migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    await pool.query(createTableQuery);
    
    console.log('Successfully created migrations table.');
  }
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(pool) {
  const query = `
    SELECT name FROM migrations
    ORDER BY applied_at ASC;
  `;
  
  const result = await pool.query(query);
  
  return result.rows.map(row => row.name);
}

main();