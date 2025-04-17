// Script to add resolution column to cleaning_flags table
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Adding resolution column to cleaning_flags table...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if the resolution column already exists
    const checkResolutionColumnSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_flags' AND column_name = 'resolution';
    `;
    
    const resolutionResult = await pool.query(checkResolutionColumnSql);
    
    if (resolutionResult.rows.length > 0) {
      console.log('Column resolution already exists in cleaning_flags table.');
    } else {
      // Add the resolution column
      const addResolutionColumnSql = `
        ALTER TABLE cleaning_flags 
        ADD COLUMN resolution TEXT;
      `;
      
      await pool.query(addResolutionColumnSql);
      console.log('Successfully added resolution column to cleaning_flags table.');
    }
    
    await pool.end();
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error performing migration:', error);
    process.exit(1);
  }
}

main();