// Reset admin password script for Synergy Rentals
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

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
  try {
    // Generate new password hash for 'admin'
    const newPasswordHash = await hashPassword('admin');
    
    // Update admin user password
    console.log("Updating admin password...");
    const result = await db.update(users)
      .set({ password: newPasswordHash })
      .where(eq(users.username, 'admin'))
      .returning();
    
    if (result.length > 0) {
      console.log(`Successfully updated password for user ID ${result[0].id} (${result[0].username})`);
    } else {
      console.log("No user found with username 'admin'");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script
main();