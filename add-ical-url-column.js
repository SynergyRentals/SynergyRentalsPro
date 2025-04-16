import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding ical_url column to units table...');
    // Check if column exists first
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'units' AND column_name = 'ical_url'
    `);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, add it
      await pool.query(`
        ALTER TABLE units 
        ADD COLUMN ical_url TEXT
      `);
      console.log('Successfully added ical_url column to units table.');
    } else {
      console.log('ical_url column already exists in units table.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await pool.end();
  }
}

main();