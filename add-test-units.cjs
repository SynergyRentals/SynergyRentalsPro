// Simple script to add test units
const { Pool } = require('pg');

// Create a pool with the DATABASE_URL environment variable
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function createTestUnits() {
  try {
    console.log('Connecting to database...');
    
    // First, check the existing units
    const existingUnits = await pool.query('SELECT * FROM units');
    console.log(`Found ${existingUnits.rows.length} existing units:`);
    existingUnits.rows.forEach(unit => {
      console.log(`- ID: ${unit.id}, Name: ${unit.name}, icalUrl: ${unit.ical_url || 'none'}`);
    });
    
    // Create Unit 2 if it doesn't exist
    if (!existingUnits.rows.find(u => u.id === 2)) {
      console.log('\nCreating Test Unit 2...');
      await pool.query(`
        INSERT INTO units (name, address, active) 
        VALUES ('Test Unit 2', '456 Test Street, Test City', true)
      `);
    } else {
      console.log('\nUnit 2 already exists');
    }
    
    // Create Unit 3 if it doesn't exist
    if (!existingUnits.rows.find(u => u.id === 3)) {
      console.log('Creating Test Unit 3...');
      await pool.query(`
        INSERT INTO units (name, address, active) 
        VALUES ('Test Unit 3', '789 Test Avenue, Test City', true)
      `);
    } else {
      console.log('Unit 3 already exists');
    }
    
    // Show all units after changes
    const finalUnits = await pool.query('SELECT * FROM units');
    console.log('\nFinal units:');
    finalUnits.rows.forEach(unit => {
      console.log(`- ID: ${unit.id}, Name: ${unit.name}, icalUrl: ${unit.ical_url || 'none'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestUnits();