// Script to fix missing columns in cleaning_flags and cleaner_performance tables
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Checking for missing columns in cleaning-related tables...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if resolved_by column exists in cleaning_flags table
    const checkResolvedByColumnSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_flags' AND column_name = 'resolved_by';
    `;
    
    const resolvedByResult = await pool.query(checkResolvedByColumnSql);
    
    if (resolvedByResult.rows.length > 0) {
      console.log('Column resolved_by already exists in cleaning_flags table.');
    } else {
      // Add the resolved_by column
      const addResolvedByColumnSql = `
        ALTER TABLE cleaning_flags 
        ADD COLUMN resolved_by INTEGER;
      `;
      
      await pool.query(addResolvedByColumnSql);
      console.log('Successfully added resolved_by column to cleaning_flags table.');
    }
    
    // Check if notes column exists in cleaner_performance table
    const checkNotesColumnSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaner_performance' AND column_name = 'notes';
    `;
    
    const notesResult = await pool.query(checkNotesColumnSql);
    
    if (notesResult.rows.length > 0) {
      console.log('Column notes already exists in cleaner_performance table.');
    } else {
      // Add the notes column
      const addNotesColumnSql = `
        ALTER TABLE cleaner_performance 
        ADD COLUMN notes TEXT;
      `;
      
      await pool.query(addNotesColumnSql);
      console.log('Successfully added notes column to cleaner_performance table.');
    }
    
    // Get all columns from the cleaning_flags table
    const cleaningFlagsColumnsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaning_flags';
    `;
    
    const cleaningFlagsColumns = await pool.query(cleaningFlagsColumnsSql);
    console.log('Existing columns in cleaning_flags table:');
    cleaningFlagsColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });
    
    // Get all columns from the cleaner_performance table
    const cleanerPerformanceColumnsSql = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cleaner_performance';
    `;
    
    const cleanerPerformanceColumns = await pool.query(cleanerPerformanceColumnsSql);
    console.log('Existing columns in cleaner_performance table:');
    cleanerPerformanceColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });
    
    await pool.end();
    
    console.log('Column fixes completed successfully.');
  } catch (error) {
    console.error('Error fixing columns:', error);
    process.exit(1);
  }
}

main();