import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import fs from 'fs';
import path from 'path';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Create the tables for guesty
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guesty_properties (
        id SERIAL PRIMARY KEY,
        property_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        bedrooms INTEGER,
        bathrooms REAL,
        amenities TEXT[],
        listing_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS guesty_reservations (
        id SERIAL PRIMARY KEY,
        reservation_id TEXT NOT NULL UNIQUE,
        guest_name TEXT NOT NULL,
        guest_email TEXT,
        property_id TEXT NOT NULL,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP NOT NULL,
        status TEXT NOT NULL,
        channel TEXT,
        total_price INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS guesty_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        properties_count INTEGER,
        reservations_count INTEGER,
        error_message TEXT,
        sync_date TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Successfully created Guesty tables!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});