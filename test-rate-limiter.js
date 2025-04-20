/**
 * Test script to verify rate limiter functionality
 * 
 * This script tests the rate limiter by adding test records
 * and checking the rate limit status.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';

// Load environment variables
dotenv.config();

// Configure Neon WebSockets
neonConfig.webSocketConstructor = ws;

// Create a new pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Function to add a test request record
async function addTestRequest() {
  try {
    const endpoint = '/test-endpoint';
    const requestType = 'GET';
    const timestamp = new Date();
    const responseStatus = 200;
    
    const result = await pool.query(`
      INSERT INTO guesty_rate_limits 
      (endpoint, "requestTimestamp", "requestType", "responseStatus")
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [endpoint, timestamp, requestType, responseStatus]);
    
    console.log(`Added test request record with ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error('Error adding test request:', error);
  }
}

// Function to check rate limit status
async function checkRateLimitStatus() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await pool.query(`
      SELECT COUNT(*) AS request_count 
      FROM guesty_rate_limits
      WHERE "requestTimestamp" > $1
    `, [oneDayAgo]);
    
    const requestCount = parseInt(result.rows[0].request_count, 10);
    const MAX_REQUESTS_PER_DAY = 5;
    const remainingRequests = Math.max(0, MAX_REQUESTS_PER_DAY - requestCount);
    
    console.log(`Rate limit status:
      - Total requests in last 24 hours: ${requestCount}
      - Remaining requests: ${remainingRequests}
      - Is rate limited: ${remainingRequests === 0 ? 'YES' : 'NO'}
    `);
    
    if (remainingRequests === 0) {
      const oldestRequest = await pool.query(`
        SELECT "requestTimestamp"
        FROM guesty_rate_limits
        ORDER BY "requestTimestamp" ASC
        LIMIT 1
      `);
      
      if (oldestRequest.rows.length > 0) {
        const oldestTimestamp = new Date(oldestRequest.rows[0].requestTimestamp);
        const nextAvailableTime = new Date(oldestTimestamp.getTime() + 24 * 60 * 60 * 1000);
        
        console.log(`Next available request time: ${nextAvailableTime.toISOString()}`);
      }
    }
  } catch (error) {
    console.error('Error checking rate limit status:', error);
  }
}

// Function to clean up test data (be careful with this in production!)
async function cleanupTestData() {
  try {
    const result = await pool.query(`
      DELETE FROM guesty_rate_limits
      WHERE endpoint = '/test-endpoint'
      RETURNING id
    `);
    
    console.log(`Cleaned up ${result.rowCount} test records`);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

// Main function
async function main() {
  try {
    console.log('=== RATE LIMITER TEST SCRIPT ===');
    
    // Check initial status
    console.log('\nInitial rate limit status:');
    await checkRateLimitStatus();
    
    // Add 3 test requests
    console.log('\nAdding 3 test requests...');
    await addTestRequest();
    await addTestRequest();
    await addTestRequest();
    
    // Check updated status
    console.log('\nUpdated rate limit status:');
    await checkRateLimitStatus();
    
    // Clean up (optional - comment out to keep test data)
    console.log('\nCleaning up test data...');
    await cleanupTestData();
    
    // Final status check
    console.log('\nFinal rate limit status after cleanup:');
    await checkRateLimitStatus();
    
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('\nTest completed.');
  }
}

// Run the main function
main();