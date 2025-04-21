import pg from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;

// Create a new pool directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const scryptAsync = promisify(crypto.scrypt);

async function comparePasswords(supplied, stored) {
  console.log(`Comparing passwords - stored hash length: ${stored.length}`);
  
  try {
    // Extract hash and salt from stored password
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error(`Invalid password format - missing hash or salt`);
      return false;
    }
    
    console.log(`Hash length: ${hashed.length}, Salt length: ${salt.length}`);
    
    // Convert stored hash to buffer
    const hashedBuf = Buffer.from(hashed, "hex");
    
    // Hash the supplied password with the same salt
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    
    // Compare the hashes
    console.log(`Hashed buffer length: ${hashedBuf.length}, Supplied buffer length: ${suppliedBuf.length}`);
    console.log(`Hashed buffer: ${hashedBuf.toString('hex').substring(0, 20)}...`);
    console.log(`Supplied buffer: ${suppliedBuf.toString('hex').substring(0, 20)}...`);
    
    // Compare the hashes directly for debugging
    const match = hashedBuf.toString('hex') === suppliedBuf.toString('hex');
    console.log(`Direct comparison result: ${match}`);
    
    // Compare using timing-safe method (proper way)
    const result = crypto.timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`TimingSafeEqual result: ${result}`);
    
    return result;
  } catch (error) {
    console.error(`Error comparing passwords:`, error);
    return false;
  }
}

async function main() {
  try {
    // Get the admin user from the database
    const { rows } = await pool.query(`
      SELECT * FROM users WHERE username = 'admin'
    `);
    
    if (rows.length === 0) {
      console.error('Admin user not found');
      return;
    }
    
    const user = rows[0];
    console.log(`Found admin user with ID: ${user.id}`);
    console.log(`Stored password hash: ${user.password}`);
    
    // Try to validate the password
    const isValid = await comparePasswords('admin', user.password);
    console.log(`Password validation result: ${isValid}`);
    
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);