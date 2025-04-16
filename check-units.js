import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

// Create connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  try {
    // First, let's add the units schema definition directly
    const units = {
      id: { name: 'id', tableName: 'units' },
      name: { name: 'name', tableName: 'units' },
      address: { name: 'address', tableName: 'units' },
      leaseUrl: { name: 'lease_url', tableName: 'units' },
      wifiInfo: { name: 'wifi_info', tableName: 'units' },
      notes: { name: 'notes', tableName: 'units' },
      tags: { name: 'tags', tableName: 'units' },
      icalUrl: { name: 'ical_url', tableName: 'units' },
      active: { name: 'active', tableName: 'units' }
    };

    console.log('Checking units table...');
    try {
      const allUnits = await db.query('SELECT * FROM units');
      console.log('All units:', allUnits.rows);
      
      // Create test units if they don't exist
      if (allUnits.rows.length === 0 || allUnits.rows.length === 1) {
        console.log('\nCreating test units...');
        
        // Create Unit 2 if it doesn't exist yet
        if (!allUnits.rows.find(u => u.id === 2)) {
          console.log('Creating Test Unit 2...');
          await db.query(`
            INSERT INTO units (name, address, active) 
            VALUES ('Test Unit 2', '456 Test Street, Test City', true)
          `);
        }
        
        // Create Unit 3 if it doesn't exist yet  
        if (!allUnits.rows.find(u => u.id === 3)) {
          console.log('Creating Test Unit 3...');
          await db.query(`
            INSERT INTO units (name, address, active) 
            VALUES ('Test Unit 3', '789 Test Avenue, Test City', true)
          `);
        }
        
        // Show the updated units
        const updatedUnits = await db.query('SELECT * FROM units');
        console.log('\nUnits after adding test units:');
        console.log(updatedUnits.rows);
      } else {
        console.log('Units already exist in the database. No new units created.');
      }
      
      // Try to get guesty_properties if the table exists
      try {
        console.log('\nChecking Guesty properties...');
        const guestyProperties = await db.query('SELECT * FROM guesty_properties');
        console.log('Guesty properties:', guestyProperties.rows);
      } catch (error) {
        console.error('Error getting Guesty properties (table might not exist):', error.message);
      }
      
    } catch (error) {
      console.error('Error querying units:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();