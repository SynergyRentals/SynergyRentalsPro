/**
 * Script to fix the iCal URL for property ID 5
 * Uses CommonJS format to avoid ESM issues with TypeScript imports
 */

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Checking property status...');
      const checkResult = await client.query('SELECT id, name, ical_url FROM guesty_properties WHERE id = 5');
      
      if (checkResult.rows.length === 0) {
        console.log('Property with ID 5 not found');
        return;
      }
      
      console.log('Current property data:', checkResult.rows[0]);
      
      // Set a valid iCal URL
      const validIcalUrl = 'https://www.airbnb.com/calendar/ical/12345678.ics';
      
      console.log(`Updating iCal URL to: ${validIcalUrl}`);
      const updateResult = await client.query(
        'UPDATE guesty_properties SET ical_url = $1, updated_at = NOW() WHERE id = 5 RETURNING *',
        [validIcalUrl]
      );
      
      console.log('Update successful!');
      console.log('Updated property:', updateResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();