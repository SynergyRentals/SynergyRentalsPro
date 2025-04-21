
const { Pool } = require('pg');
const { createHash, pbkdf2Sync, randomBytes } = require('crypto');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await pool.query('SELECT username, password FROM users WHERE username = ', ['admin']);
    if (result.rows.length > 0) {
      console.log('Admin account details:');
      console.log('Username:', result.rows[0].username);
      console.log('Password hash:', result.rows[0].password.substring(0, 20) + '...');
      console.log('Full hash length:', result.rows[0].password.length);
    } else {
      console.log('Admin account not found');
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
