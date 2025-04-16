/**
 * Utility script to set the iCal URL for property ID 18
 * This script directly sets the Guesty iCal URL for property 18 in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

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
      SELECT id, name, icalUrl FROM guesty_properties WHERE id = $1
    `, [PROPERTY_ID]);
    
    if (checkResult.rows.length === 0) {
      console.error(`Property with ID ${PROPERTY_ID} not found in guesty_properties table.`);
      return;
    }
    
    const property = checkResult.rows[0];
    console.log(`Found property: ${property.name} (ID: ${property.id})`);
    console.log(`Current iCal URL: ${property.icalurl || 'Not set'}`);
    
    // Update the iCal URL
    const updateResult = await pool.query(`
      UPDATE guesty_properties 
      SET icalUrl = $1, updatedAt = NOW() 
      WHERE id = $2
      RETURNING id, name, icalUrl
    `, [GUESTY_ICAL_URL, PROPERTY_ID]);
    
    const updatedProperty = updateResult.rows[0];
    console.log(`Successfully updated property.`);
    console.log(`New iCal URL: ${updatedProperty.icalurl}`);
    
  } catch (error) {
    console.error('Error updating property:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the script
main().catch(console.error);