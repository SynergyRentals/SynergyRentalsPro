// Script to create missing cleaning_flags and cleaner_performance tables
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Creating missing cleaning-related tables...');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Check if cleaning_flags table exists
    const checkCleaningFlagsTableSql = `
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'cleaning_flags';
    `;
    
    const cleaningFlagsResult = await pool.query(checkCleaningFlagsTableSql);
    
    if (cleaningFlagsResult.rows.length > 0) {
      console.log('Table cleaning_flags already exists.');
    } else {
      // Create the cleaning_flags table
      const createCleaningFlagsTableSql = `
        CREATE TABLE cleaning_flags (
          id SERIAL PRIMARY KEY,
          cleaning_task_id INTEGER NOT NULL,
          reported_by INTEGER NOT NULL,
          flag_type TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          priority TEXT NOT NULL DEFAULT 'normal',
          photos TEXT[],
          escalated_to TEXT,
          assigned_to INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP,
          resolved_by INTEGER,
          resolution TEXT
        );
      `;
      
      await pool.query(createCleaningFlagsTableSql);
      console.log('Successfully created cleaning_flags table.');
    }
    
    // Check if cleaner_performance table exists
    const checkCleanerPerformanceTableSql = `
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'cleaner_performance';
    `;
    
    const cleanerPerformanceResult = await pool.query(checkCleanerPerformanceTableSql);
    
    if (cleanerPerformanceResult.rows.length > 0) {
      console.log('Table cleaner_performance already exists.');
    } else {
      // Create the cleaner_performance table
      const createCleanerPerformanceTableSql = `
        CREATE TABLE cleaner_performance (
          id SERIAL PRIMARY KEY,
          cleaner_id INTEGER NOT NULL REFERENCES users(id),
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          tasks_completed INTEGER NOT NULL DEFAULT 0,
          avg_score INTEGER,
          avg_duration INTEGER,
          flags_received INTEGER DEFAULT 0,
          on_time_percentage INTEGER,
          photo_quality_score INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      
      await pool.query(createCleanerPerformanceTableSql);
      console.log('Successfully created cleaner_performance table.');
    }
    
    await pool.end();
    
    console.log('Table creation completed successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

main();