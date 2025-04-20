/**
 * Restore Sample Data Script
 * 
 * This script inserts sample data back into the database to restore the application
 * to its normal operational state after a database cleanup.
 * 
 * Using CommonJS for compatibility with older Node modules
 */

require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  try {
    console.log('Starting sample data restoration...');
    
    // Connect to database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // First, check if we have any properties
    const propertyCountResult = await pool.query(`
      SELECT COUNT(*) FROM guesty_properties
    `);
    
    const propertyCount = parseInt(propertyCountResult.rows[0].count);
    
    if (propertyCount > 0) {
      console.log(`Database already has ${propertyCount} properties. No restoration needed.`);
      return;
    }
    
    // Insert sample property data
    await pool.query(`
      INSERT INTO guesty_properties (id, property_id, name, address, city, state, zipcode, bedrooms, bathrooms, accommodates, ical_url, created_at, updated_at)
      VALUES 
        (18, 'gp-18', 'Beachfront Villa', '123 Ocean Drive', 'Malibu', 'CA', '90210', 4, 3, 8, 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb', NOW(), NOW()),
        (19, 'gp-19', 'Mountain Cabin', '456 Pine Road', 'Aspen', 'CO', '81611', 3, 2, 6, NULL, NOW(), NOW()),
        (20, 'gp-20', 'Downtown Loft', '789 Main Street', 'New York', 'NY', '10001', 2, 2, 4, NULL, NOW(), NOW()),
        (21, 'gp-21', 'Lakeside Cottage', '101 Lake Shore Road', 'Lake Tahoe', 'CA', '96150', 2, 2, 5, NULL, NOW(), NOW()),
        (22, 'gp-22', 'Desert Oasis', '202 Palm Drive', 'Scottsdale', 'AZ', '85251', 3, 2, 6, NULL, NOW(), NOW())
    `);
    
    console.log('Inserted sample property data');
    
    // Insert sample reservation data
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    
    await pool.query(`
      INSERT INTO guesty_reservations (property_id, guest_name, check_in, check_out, status, total_guests, confirmation_code, created_at, updated_at)
      VALUES 
        (18, 'John Smith', $1, $2, 'confirmed', 4, 'RES-001', NOW(), NOW()),
        (19, 'Jane Doe', $3, $4, 'confirmed', 2, 'RES-002', NOW(), NOW()),
        (20, 'Michael Johnson', $5, $6, 'confirmed', 3, 'RES-003', NOW(), NOW())
    `, [
      today.toISOString(),
      nextWeek.toISOString(),
      tomorrow.toISOString(),
      twoWeeks.toISOString(),
      nextWeek.toISOString(),
      twoWeeks.toISOString()
    ]);
    
    console.log('Inserted sample reservation data');
    
    // Insert sample task data
    await pool.query(`
      INSERT INTO tasks (title, description, due_date, status, priority, assigned_to, created_at, updated_at)
      VALUES 
        ('Check HVAC system', 'Perform regular maintenance on the HVAC system', $1, 'pending', 'medium', NULL, NOW(), NOW()),
        ('Restock cleaning supplies', 'Purchase and restock all cleaning supplies', $2, 'pending', 'high', NULL, NOW(), NOW()),
        ('Update property photos', 'Take new professional photos of all properties', $3, 'pending', 'low', NULL, NOW(), NOW())
    `, [
      tomorrow.toISOString(),
      nextWeek.toISOString(),
      twoWeeks.toISOString()
    ]);
    
    console.log('Inserted sample task data');
    
    // Create sample project
    await pool.query(`
      INSERT INTO projects (name, description, status, start_date, end_date, created_by, created_at, updated_at)
      VALUES ('Property Renovation', 'Complete renovation of the Mountain Cabin property', 'in_progress', $1, $2, 1, NOW(), NOW())
    `, [today.toISOString(), twoWeeks.toISOString()]);
    
    console.log('Inserted sample project data');
    
    await pool.end();
    
    console.log('Sample data restoration completed successfully');
  } catch (error) {
    console.error('Error restoring sample data:', error);
    process.exit(1);
  }
}

main();