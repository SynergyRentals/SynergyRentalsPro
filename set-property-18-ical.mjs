/**
 * Utility script to set the iCal URL for property ID 18
 * This script directly sets the Guesty iCal URL for property 18 in the database
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Define the property ID and Guesty iCal URL
const PROPERTY_ID = 18;
const GUESTY_ICAL_URL = 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb';

async function main() {
  // Create a database connection
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL
  });
  
  console.log(`Starting update for property ID ${PROPERTY_ID}...`);
  
  try {
    // First, check if property exists
    const checkResult = await pool.query(`
      SELECT id, name, ical_url FROM guesty_properties WHERE id = $1
    `, [PROPERTY_ID]);
    
    if (checkResult.rows.length === 0) {
      console.error(`Property with ID ${PROPERTY_ID} not found in guesty_properties table.`);
      return;
    }
    
    const property = checkResult.rows[0];
    console.log(`Found property: ${property.name} (ID: ${property.id})`);
    console.log(`Current iCal URL: ${property.ical_url || 'Not set'}`);
    
    // Update the iCal URL
    const updateResult = await pool.query(`
      UPDATE guesty_properties 
      SET ical_url = $1, updated_at = NOW() 
      WHERE id = $2
      RETURNING id, name, ical_url
    `, [GUESTY_ICAL_URL, PROPERTY_ID]);
    
    if (updateResult.rows.length > 0) {
      const updatedProperty = updateResult.rows[0];
      console.log(`Successfully updated property.`);
      console.log(`New iCal URL: ${updatedProperty.ical_url}`);
    } else {
      console.log(`No rows were updated. Check if property ID ${PROPERTY_ID} exists.`);
    }
    
  } catch (error) {
    console.error('Error updating property:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the script
main().catch(console.error);