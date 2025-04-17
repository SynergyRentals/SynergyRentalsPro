const { Pool } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');

// Create a new pool directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  console.log(`Hashing password`);
  const salt = crypto.randomBytes(16).toString("hex");
  console.log(`Generated salt: ${salt}, length: ${salt.length}`);
  
  const buf = await scryptAsync(password, salt, 64);
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  
  console.log(`Generated hash of length: ${hashedPassword.length}`);
  return hashedPassword;
}

async function main() {
  try {
    // Hash the default password
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    console.log(`Hashed password: ${hashedPassword}`);
    
    // Update admin user
    const result = await pool.query(`
      UPDATE users 
      SET password = $1 
      WHERE username = 'admin'
    `, [hashedPassword]);
    
    console.log(`Updated ${result.rowCount} rows`);
    
    console.log('Admin password reset successfully to "password123"');
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);