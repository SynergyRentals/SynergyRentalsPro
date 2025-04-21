/**
 * Backend CSV Import Direct Test Script
 * 
 * This script tests the CSV importer directly from the server side, bypassing authentication.
 * It creates test CSV files and directly calls the import function to verify it works correctly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { importGuestyPropertiesFromCSV } from './server/lib/csvImporter';

// Get the directory name using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test directory
const testDir = path.join(__dirname, 'tmp', 'test-csv');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create test CSV files
console.log('Creating test CSV files...');

// Valid CSV with all required fields
const validCSV = `NAME,ADDRESS,BEDROOMS,BATHROOMS,AMENITIES,LISTING_URL,ICAL_URL
Beach House,123 Ocean Dr,3,2.5,"WiFi,Pool,Beach Access",https://example.com/listing,https://example.com/ical
Mountain Cabin,456 Pine Rd,2,1,"Fireplace,Hiking",https://example.com/listing2,
City Apartment,789 Main St,1,1,"WiFi,Gym",https://example.com/listing3,`;

// CSV with missing name field (should show warnings)
const missingNameCSV = `ADDRESS,BEDROOMS,BATHROOMS,AMENITIES
123 Ocean Dr,3,2.5,"WiFi,Pool,Beach Access"
456 Pine Rd,2,1,"Fireplace,Hiking"`;

// CSV with completely unrecognized columns
const invalidColumnsCSV = `RANDOM,COLUMNS,HERE
value1,value2,value3
value4,value5,value6`;

// Empty CSV
const emptyCSV = ``;

// CSV with invalid data types
const invalidTypesCSV = `NAME,ADDRESS,BEDROOMS,BATHROOMS
Beach House,123 Ocean Dr,not-a-number,also-not-a-number`;

// Write files to disk
const validCsvPath = path.join(testDir, 'valid.csv');
const missingNameCsvPath = path.join(testDir, 'missing-name.csv');
const invalidColumnsCsvPath = path.join(testDir, 'invalid-columns.csv');
const emptyCsvPath = path.join(testDir, 'empty.csv');
const invalidTypesCsvPath = path.join(testDir, 'invalid-types.csv');

fs.writeFileSync(validCsvPath, validCSV);
fs.writeFileSync(missingNameCsvPath, missingNameCSV);
fs.writeFileSync(invalidColumnsCsvPath, invalidColumnsCSV);
fs.writeFileSync(emptyCsvPath, emptyCSV);
fs.writeFileSync(invalidTypesCsvPath, invalidTypesCSV);

// Test function to run a single import test
async function runTest(description, filePath) {
  console.log(`\n----- ${description} -----`);
  console.log(`Testing file: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return;
    }
    
    const result = await importGuestyPropertiesFromCSV(filePath);
    console.log('Import Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Import Error:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log('Starting CSV import tests...');
    
    // Import the actual properties file
    const realCsvPath = path.join(__dirname, 'attached_assets', '461800_2025-04-15_00_27_58.csv'); 
    console.log(`Testing actual property file from: ${realCsvPath}`);
    
    if (fs.existsSync(realCsvPath)) {
      console.log('Property CSV file exists. Attempting to import...');
      const fileContent = fs.readFileSync(realCsvPath, 'utf8').substring(0, 200);
      console.log('File preview:', fileContent, '...');
      
      await runTest('Real Property CSV Test', realCsvPath);
    } else {
      console.error('Property CSV file not found at path:', realCsvPath);
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    // Clean up test files
    try {
      console.log('Cleaning up test files...');
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('Test files cleaned up');
    } catch (cleanupError) {
      console.error('Error cleaning up test files:', cleanupError);
    }
  }
}

// Execute tests
runAllTests();