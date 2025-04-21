
import { importGuestyPropertiesFromCSV } from '../../server/lib/csvImporter';
import path from 'path';

// Test function to run a single import test
async function runTest(description: string, filePath: string) {
  console.log(`
----- ${description} -----`);
  console.log(`Testing file: ${filePath}`);
  
  try {
    const result = await importGuestyPropertiesFromCSV(filePath);
    console.log('Import Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error: any) {
    console.error('Import Error:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  const testDir = '/home/runner/workspace/tmp/test-csv';
  
  try {
    console.log('Starting CSV import tests...');
    
    // Test 1: Valid CSV
    await runTest('Valid CSV Test', path.join(testDir, 'valid.csv'));
    
    // Test 2: Missing Name Field CSV
    await runTest('Missing Name Field Test', path.join(testDir, 'missing-name.csv'));
    
    // Test 3: Invalid Columns CSV
    await runTest('Invalid Columns Test', path.join(testDir, 'invalid-columns.csv'));
    
    // Test 4: Empty CSV
    await runTest('Empty CSV Test', path.join(testDir, 'empty.csv'));
    
    // Test 5: Invalid Data Types CSV
    await runTest('Invalid Data Types Test', path.join(testDir, 'invalid-types.csv'));
    
    // Test 6: Non-existent file
    await runTest('Non-existent File Test', path.join(testDir, 'does-not-exist.csv'));
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Execute tests
runAllTests();
