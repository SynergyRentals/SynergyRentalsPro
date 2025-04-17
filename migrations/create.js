/**
 * Migration script creator
 * 
 * This utility creates a new migration script with a timestamped name
 * Usage: node migrations/create.js "description of your change"
 */
import fs from 'fs';
import path from 'path';

// Get migration description from command line args
const description = process.argv[2] || 'migration';

// Create a timestamp for the migration name
const now = new Date();
const timestamp = now.toISOString()
  .replace(/[-:]/g, '')  // Remove dashes and colons
  .replace(/T/g, '_')    // Replace T with underscore
  .split('.')[0];        // Remove milliseconds

// Convert description to lowercase kebab-case
const formattedDescription = description
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

// Create the migration file name
const fileName = `${timestamp}_${formattedDescription}.js`;
const filePath = path.join('migrations', 'scripts', fileName);

// Migration file template
const template = `/**
 * Migration: ${description}
 * Created: ${now.toISOString()}
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Apply the migration
 */
export async function up() {
  try {
    console.log('Applying migration: ${description}');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // TODO: Implement your migration code here
    // Example:
    // await pool.query(\`
    //   ALTER TABLE your_table
    //   ADD COLUMN your_column TEXT;
    // \`);
    
    // Record this migration in the migrations table
    await pool.query(\`
      INSERT INTO migrations (name, applied_at)
      VALUES ('${fileName}', NOW());
    \`);
    
    await pool.end();
    
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

/**
 * Revert the migration
 */
export async function down() {
  try {
    console.log('Reverting migration: ${description}');
    
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // TODO: Implement your rollback code here
    // Example:
    // await pool.query(\`
    //   ALTER TABLE your_table
    //   DROP COLUMN your_column;
    // \`);
    
    // Remove this migration from the migrations table
    await pool.query(\`
      DELETE FROM migrations
      WHERE name = '${fileName}';
    \`);
    
    await pool.end();
    
    console.log('Migration reverted successfully.');
  } catch (error) {
    console.error('Error reverting migration:', error);
    process.exit(1);
  }
}

// When this script is run directly, create the migration file
if (require.main === module) {
  // Create the migrations file
  fs.writeFileSync(filePath, template);
  console.log(\`Created migration file: \${filePath}\`);
}
`;

// Create the migration file
fs.writeFileSync(filePath, template);
console.log(`Created migration file: ${filePath}`);