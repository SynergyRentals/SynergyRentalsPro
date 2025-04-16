// Script to drop all property-related tables
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function dropPropertyTables() {
  console.log('Starting to drop property-related tables...');
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // List of tables to drop in proper order to respect foreign key constraints
    const tablesToDrop = [
      // Drop Guesty webhook events first (depends on guesty properties and reservations)
      'guesty_webhook_events',
      
      // Drop Guesty reservations
      'guesty_reservations',
      
      // Drop Guesty properties
      'guesty_properties',
      
      // Drop Guesty sync logs 
      'guesty_sync_logs'
    ];
    
    // Drop each table
    for (const table of tablesToDrop) {
      console.log(`Dropping table: ${table}`);
      try {
        // Check if table exists before dropping
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          )`, [table]);
          
        if (tableExists.rows[0].exists) {
          await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
          console.log(`Table ${table} dropped successfully`);
        } else {
          console.log(`Table ${table} does not exist, skipping`);
        }
      } catch (err) {
        console.error(`Error dropping table ${table}:`, err);
        throw err;
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('All property-related tables dropped successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error dropping property tables:', error);
    throw error;
  } finally {
    // Release the client
    client.release();
  }
}

// Execute the function
dropPropertyTables()
  .then(() => {
    console.log('Property tables cleanup complete');
    pool.end();
  })
  .catch(err => {
    console.error('Failed to drop property tables:', err);
    pool.end();
    process.exit(1);
  });