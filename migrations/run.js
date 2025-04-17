/**
 * Migration runner
 * 
 * This utility runs all pending migrations
 * Usage: node migrations/run.js
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Running database migrations...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Ensure migrations table exists
    await createMigrationsTableIfNeeded(pool);
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    console.log(`Found ${appliedMigrations.length} previously applied migrations.`);
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(path.join('migrations', 'scripts'))
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort alphabetically to ensure they run in timestamp order
    
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    // Find migrations that haven't been applied
    const pendingMigrations = migrationFiles.filter(file => 
      !appliedMigrations.includes(file)
    );
    
    console.log(`Found ${pendingMigrations.length} pending migrations to apply.`);
    
    // Run each pending migration
    for (const migrationFile of pendingMigrations) {
      console.log(`Applying migration: ${migrationFile}`);
      
      // Import the migration file
      const migrationPath = path.join('..', 'migrations', 'scripts', migrationFile);
      const migration = await import(migrationPath);
      
      // Run the up function
      await migration.up();
      
      console.log(`Successfully applied migration: ${migrationFile}`);
    }
    
    await pool.end();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply.');
    } else {
      console.log(`Successfully applied ${pendingMigrations.length} migrations.`);
    }
  } catch (error) {
    console.error('Error running migrations:', error);
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