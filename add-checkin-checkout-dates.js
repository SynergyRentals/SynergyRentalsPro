// Script to add check_in_date and check_out_date columns to cleaning_tasks table
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Adding check_in_date and check_out_date columns to cleaning_tasks table...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if the check_in_date column already exists
    const checkInColumnExistsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_tasks' AND column_name = 'check_in_date';
    `;
    
    const checkInResult = await pool.query(checkInColumnExistsSql);
    
    if (checkInResult.rows.length > 0) {
      console.log('Column check_in_date already exists in cleaning_tasks table.');
    } else {
      // Add the check_in_date column
      const addCheckInColumnSql = `
        ALTER TABLE cleaning_tasks 
        ADD COLUMN check_in_date TIMESTAMP;
      `;
      
      await pool.query(addCheckInColumnSql);
      console.log('Successfully added check_in_date column to cleaning_tasks table.');
    }
    
    // Check if the check_out_date column already exists
    const checkOutColumnExistsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_tasks' AND column_name = 'check_out_date';
    `;
    
    const checkOutResult = await pool.query(checkOutColumnExistsSql);
    
    if (checkOutResult.rows.length > 0) {
      console.log('Column check_out_date already exists in cleaning_tasks table.');
    } else {
      // Add the check_out_date column
      const addCheckOutColumnSql = `
        ALTER TABLE cleaning_tasks 
        ADD COLUMN check_out_date TIMESTAMP;
      `;
      
      await pool.query(addCheckOutColumnSql);
      console.log('Successfully added check_out_date column to cleaning_tasks table.');
    }
    
    // Check if the has_flagged_issues column already exists
    const hasFlaggedIssuesColumnExistsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_tasks' AND column_name = 'has_flagged_issues';
    `;
    
    const hasFlaggedIssuesResult = await pool.query(hasFlaggedIssuesColumnExistsSql);
    
    if (hasFlaggedIssuesResult.rows.length > 0) {
      console.log('Column has_flagged_issues already exists in cleaning_tasks table.');
    } else {
      // Add the has_flagged_issues column
      const addHasFlaggedIssuesColumnSql = `
        ALTER TABLE cleaning_tasks 
        ADD COLUMN has_flagged_issues BOOLEAN DEFAULT false;
      `;
      
      await pool.query(addHasFlaggedIssuesColumnSql);
      console.log('Successfully added has_flagged_issues column to cleaning_tasks table.');
    }
    
    await pool.end();
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error performing migration:', error);
    process.exit(1);
  }
}

main();