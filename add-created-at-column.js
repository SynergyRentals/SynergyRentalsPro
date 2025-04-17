// Script to add created_at column to cleaner_performance table
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Adding created_at column to cleaner_performance table...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if the created_at column already exists
    const checkCreatedAtColumnSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaner_performance' AND column_name = 'created_at';
    `;
    
    const createdAtResult = await pool.query(checkCreatedAtColumnSql);
    
    if (createdAtResult.rows.length > 0) {
      console.log('Column created_at already exists in cleaner_performance table.');
    } else {
      // Add the created_at column
      const addCreatedAtColumnSql = `
        ALTER TABLE cleaner_performance 
        ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
      `;
      
      await pool.query(addCreatedAtColumnSql);
      console.log('Successfully added created_at column to cleaner_performance table.');
    }
    
    // Check for a Select Item error by investigating tab components
    const checkTabValues = `
      SELECT value FROM cleaning_tabs;
    `;
    
    try {
      const tabValues = await pool.query(checkTabValues);
      console.log('Tab values in cleaning_tabs:');
      tabValues.rows.forEach(row => {
        console.log(`- ${row.value}`);
      });
    } catch (err) {
      console.log('No cleaning_tabs table found or other error:', err.message);
    }
    
    await pool.end();
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error performing migration:', error);
    process.exit(1);
  }
}

main();