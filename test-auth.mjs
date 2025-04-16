import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import pkg from '@neondatabase/serverless';
const { Pool } = pkg;

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function main() {
  console.log("Testing password comparison");
  
  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Get admin user credentials
  const { rows } = await pool.query('SELECT username, password FROM users WHERE username = $1', ['admin']);
  const user = rows[0];
  
  console.log("Found user:", user.username);
  
  // Test password comparison with 'password'
  const passwordCorrect = await comparePasswords('password', user.password);
  console.log("'password' is correct:", passwordCorrect);
  
  // Test password comparison with 'admin'
  const adminCorrect = await comparePasswords('admin', user.password);
  console.log("'admin' is correct:", adminCorrect);
  
  await pool.end();
}

main().catch(console.error);
