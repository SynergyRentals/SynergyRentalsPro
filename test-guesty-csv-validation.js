/**
 * Simple test script to validate the CSV importer
 * 
 * This script creates test CSV files with various issues to verify the CSV importer
 * handles them correctly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Get the directory name using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test directory
const testDir = path.join(__dirname, 'tmp', 'test-csv');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create valid test CSV
const validCSV = `NAME,ADDRESS,BEDROOMS,BATHROOMS,AMENITIES,LISTING_URL,ICAL_URL
Beach House,123 Ocean Dr,3,2.5,"WiFi,Pool,Beach Access",https://example.com/listing,https://example.com/ical
Mountain Cabin,456 Pine Rd,2,1,"Fireplace,Hiking",https://example.com/listing2,
City Apartment,789 Main St,1,1,"WiFi,Gym",https://example.com/listing3,`;

// Create CSV with missing required fields
const invalidCSV = `ADDRESS,BEDROOMS,BATHROOMS
123 Ocean Dr,3,2.5
456 Pine Rd,2,1`;

// Create CSV with empty file
const emptyCSV = ``;

// Create CSVs on disk
fs.writeFileSync(path.join(testDir, 'valid.csv'), validCSV);
fs.writeFileSync(path.join(testDir, 'invalid.csv'), invalidCSV);
fs.writeFileSync(path.join(testDir, 'empty.csv'), emptyCSV);

// Functions to test CSV uploads
async function login() {
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Login failed: ${data.message || 'Unknown error'}`);
    }
    
    console.log('Login successful');
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function uploadCSV(token, filePath) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    console.log(`Uploading CSV file: ${filePath}`);
    
    const response = await fetch('http://localhost:5000/api/guesty/import-csv-upload', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    
    const data = await response.json();
    console.log('Upload response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, message: error.message };
  }
}

// Run the tests
async function runTests() {
  try {
    console.log('Starting CSV upload tests...');
    const token = await login();
    
    console.log('\n--- Testing valid CSV ---');
    await uploadCSV(token, path.join(testDir, 'valid.csv'));
    
    console.log('\n--- Testing invalid CSV ---');
    await uploadCSV(token, path.join(testDir, 'invalid.csv'));
    
    console.log('\n--- Testing empty CSV ---');
    await uploadCSV(token, path.join(testDir, 'empty.csv'));
    
    console.log('\n--- Testing non-existent CSV ---');
    await uploadCSV(token, path.join(testDir, 'does-not-exist.csv'));
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Clean up test files
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('Cleaned up test files');
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  }
}

runTests();