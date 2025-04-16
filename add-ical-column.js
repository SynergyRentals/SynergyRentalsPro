// Script to add the ical_url column to guesty_properties table
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Adding ical_url column to guesty_properties table...");
  
  try {
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guesty_properties' 
      AND column_name = 'ical_url'
    `);
    
    if (checkResult.rows.length === 0) {
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE guesty_properties 
        ADD COLUMN ical_url TEXT
      `);
      console.log("Successfully added ical_url column to guesty_properties table");
    } else {
      console.log("ical_url column already exists in guesty_properties table");
    }
  } catch (error) {
    console.error("Error adding ical_url column:", error);
  }
}

main().catch(console.error);