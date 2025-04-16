// Script to create the new simplified properties table
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createPropertiesTable() {
  console.log('Creating new simplified properties table...');
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if the properties table already exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'properties'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('Properties table already exists, skipping creation');
    } else {
      // Create the new properties table with a simplified schema
      await client.query(`
        CREATE TABLE properties (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          bedrooms INTEGER DEFAULT 1,
          bathrooms INTEGER DEFAULT 1,
          description TEXT,
          notes TEXT,
          amenities TEXT[],
          ical_url TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('New properties table created successfully');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error creating properties table:', error);
    throw error;
  } finally {
    // Release the client
    client.release();
  }
}

// Execute the function
createPropertiesTable()
  .then(() => {
    console.log('Properties table creation complete');
    pool.end();
  })
  .catch(err => {
    console.error('Failed to create properties table:', err);
    pool.end();
    process.exit(1);
  });