import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  const hash = `${buf.toString("hex")}.${salt}`;
  console.log(`Hashed password for "${password}": ${hash}`);
  return hash;
}

hashPassword("password123");