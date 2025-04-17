/**
 * This script adds cleaner performance metrics fields to the database.
 * These include tracking of completed checklists, comparative scores, trend data, and workload balance metrics.
 */
import pg from 'pg';
import { config } from 'dotenv';

config();

async function main() {
  try {
    console.log('Adding cleaner metrics fields to cleaner_performance table...');
    
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();
    
    // Check if the columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cleaner_performance' 
      AND column_name IN ('checklists_completed', 'trend_data', 'comparative_score', 'workload_distribution');
    `;
    
    const { rows } = await client.query(checkColumnsQuery);
    const existingColumns = rows.map(row => row.column_name);
    
    // Add columns if they don't exist
    if (!existingColumns.includes('checklists_completed')) {
      console.log('Adding checklists_completed column...');
      await client.query(`
        ALTER TABLE cleaner_performance
        ADD COLUMN checklists_completed INTEGER DEFAULT 0;
      `);
    }
    
    if (!existingColumns.includes('trend_data')) {
      console.log('Adding trend_data column...');
      await client.query(`
        ALTER TABLE cleaner_performance
        ADD COLUMN trend_data JSONB;
      `);
    }
    
    if (!existingColumns.includes('comparative_score')) {
      console.log('Adding comparative_score column...');
      await client.query(`
        ALTER TABLE cleaner_performance
        ADD COLUMN comparative_score INTEGER;
      `);
    }
    
    if (!existingColumns.includes('workload_distribution')) {
      console.log('Adding workload_distribution column...');
      await client.query(`
        ALTER TABLE cleaner_performance
        ADD COLUMN workload_distribution JSONB;
      `);
    }
    
    console.log('Successfully added cleaner metrics fields to cleaner_performance table');
    
    await client.end();
  } catch (error) {
    console.error('Error adding cleaner metrics fields:', error);
    process.exit(1);
  }
}

main();