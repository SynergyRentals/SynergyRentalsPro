/**
 * Database Schema Validator
 * 
 * This script validates that the database schema matches the TypeScript schema definitions
 * Run it with: npx tsx scripts/validate-schema.ts
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { validateSchema, logSchemaValidationResults } from '../server/utils/schemaValidator';

dotenv.config();

async function main() {
  try {
    console.log('Validating database schema against TypeScript definitions...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Validate the schema
    const results = await validateSchema(pool);
    
    // Log the results
    logSchemaValidationResults(results);
    
    await pool.end();
    
    // Exit with error code if validation failed
    if (!results.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error validating schema:', error);
    process.exit(1);
  }
}

main();