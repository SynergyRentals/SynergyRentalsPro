// Script to add the ical_url column to guesty_properties table
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Adding ical_url column to guesty_properties table...");
  
  try {
    // Check if the column already exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guesty_properties' 
      AND column_name = 'ical_url'
    `;
    
    if (checkResult.length === 0) {
      // Add the column if it doesn't exist
      await sql`
        ALTER TABLE guesty_properties 
        ADD COLUMN ical_url TEXT
      `;
      console.log("Successfully added ical_url column to guesty_properties table");
    } else {
      console.log("ical_url column already exists in guesty_properties table");
    }
  } catch (error) {
    console.error("Error adding ical_url column:", error);
  }
}

main().catch(console.error);