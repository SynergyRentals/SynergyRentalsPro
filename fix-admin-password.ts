import { db } from './server/db';
import { pool } from './server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log("Starting admin password reset script");
  
  try {
    // Check if admin user exists
    const existingUsers = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (existingUsers.length === 0) {
      console.log("Admin user does not exist, creating new admin user");
      
      // Create admin user if it doesn't exist
      const hashedPassword = await hashPassword('admin');
      console.log(`Generated password hash for 'admin': ${hashedPassword}`);
      
      const result = await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin'
      }).returning();
      
      console.log("Admin user created successfully:", result[0]);
    } else {
      console.log("Updating existing admin user password");
      
      // Update existing admin user password
      const hashedPassword = await hashPassword('admin');
      console.log(`Generated password hash for 'admin': ${hashedPassword}`);
      
      const result = await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, 'admin'))
        .returning();
        
      console.log("Admin password updated successfully:", result[0]);
    }
    
    console.log("Admin password reset completed");
  } catch (error) {
    console.error("Error resetting admin password:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

main().catch(console.error);