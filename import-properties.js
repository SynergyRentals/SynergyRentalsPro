/**
 * Script to directly import properties from the uploaded CSV file
 * Run with: npx tsx import-properties.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { importGuestyPropertiesFromCSV } from './server/lib/csvImporter';
import fs from 'fs';

// Get the directory name using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the CSV file to import
const csvFilePath = path.join(__dirname, 'attached_assets', '461800_2025-04-15_00_27_58.csv');

async function importProperties() {
  try {
    console.log('Starting CSV import...');
    console.log(`Using CSV file: ${csvFilePath}`);

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: File not found: ${csvFilePath}`);
      return;
    }

    // Log file stats for debugging
    const stats = fs.statSync(csvFilePath);
    console.log(`File size: ${stats.size} bytes`);
    
    // Display first 200 characters of file content to verify
    const previewContent = fs.readFileSync(csvFilePath, 'utf8').substring(0, 200);
    console.log('File preview:', previewContent, '...');

    // Import the properties
    const result = await importGuestyPropertiesFromCSV(csvFilePath);
    
    console.log('\nImport Results:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('Properties Count:', result.propertiesCount);
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`  ${i+1}. ${warning}`);
      });
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i+1}. ${error}`);
      });
    }
    
    console.log('\nImport complete!');
  } catch (error) {
    console.error('Import Error:', error);
  }
}

// Run the import
importProperties();