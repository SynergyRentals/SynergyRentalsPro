// Simple script to push Drizzle schema to the database
import { exec } from 'child_process';
import fs from 'fs';

async function main() {
  try {
    console.log('Creating database tables from schema.ts...');
    
    // Execute the SQL directly (generate and apply in one step)
    console.log('Applying schema to database...');
    
    // Use executeSQL helper to provide "yes" to all prompts
    const result = await executeSQL('npx drizzle-kit push:pg --verbose');
    
    if (result) {
      console.log('Database schema successfully applied!');
    } else {
      console.error('Failed to apply database schema');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error applying database schema:', err);
    process.exit(1);
  }
}

// Helper function to execute SQL with automatic "yes" answers
async function executeSQL(command) {
  return new Promise((resolve) => {
    const process = exec(command);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
      
      // If prompt detected, automatically answer with ENTER (select first option - create)
      if (data.toString().includes('created or renamed') || data.toString().includes('❯')) {
        process.stdin.write('\n');
      }
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('exit', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Run the main function
main();