// Import crypto and Node.js utilities
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { Pool } from '@neondatabase/serverless';

// Create promise-based version of scrypt
const scryptAsync = promisify(scrypt);

// Function to generate a new hashed password
async function hashPassword(password) {
  console.log(`Generating new password hash for: ${password}`);
  const salt = randomBytes(16).toString("hex");
  console.log(`Generated salt: ${salt}`);
  const buf = await scryptAsync(password, salt, 64);
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  console.log(`Generated hash: ${hashedPassword}`);
  return hashedPassword;
}

// Main function
async function main() {
  // Connect to PostgreSQL database
  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Generate new password hash for 'password'
    const newPasswordHash = await hashPassword('password');
    
    // Update admin user password
    console.log("Updating admin password...");
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
      [newPasswordHash, 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log(`Successfully updated password for user ID ${result.rows[0].id} (${result.rows[0].username})`);
    } else {
      console.log("No user found with username 'admin'");
    }
    
    // Also update manager user password
    console.log("Updating manager password...");
    const managerResult = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
      [newPasswordHash, 'manager']
    );
    
    if (managerResult.rows.length > 0) {
      console.log(`Successfully updated password for user ID ${managerResult.rows[0].id} (${managerResult.rows[0].username})`);
    } else {
      console.log("No user found with username 'manager'");
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log("Database connection closed");
  }
}

// Run the script
main();
