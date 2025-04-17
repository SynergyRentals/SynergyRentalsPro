// Script to add priority column to cleaning_tasks table
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Adding priority column to cleaning_tasks table...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if the column already exists
    const checkColumnExistsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_tasks' AND column_name = 'priority';
    `;
    
    const checkResult = await pool.query(checkColumnExistsSql);
    
    if (checkResult.rows.length > 0) {
      console.log('Column priority already exists in cleaning_tasks table.');
    } else {
      // Add the priority column
      const addColumnSql = `
        ALTER TABLE cleaning_tasks 
        ADD COLUMN priority TEXT DEFAULT 'normal';
      `;
      
      await pool.query(addColumnSql);
      console.log('Successfully added priority column to cleaning_tasks table.');
    }
    
    await pool.end();
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error performing migration:', error);
    process.exit(1);
  }
}

main();