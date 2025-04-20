/**
 * Guesty Rate Limiter Service
 * 
 * Implements a persistent rate limiting mechanism for Guesty API 
 * to respect their strict 5 requests per 24 hours limit.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

interface RateLimitStatus {
  isRateLimited: boolean;
  requestsRemaining: number;
  nextAvailableTimestamp: Date | null;
  message: string;
}

// Table name for storing rate limit data
const RATE_LIMIT_TABLE = 'guesty_rate_limits';

/**
 * Ensures the rate limit table exists
 */
export async function ensureRateLimitTableExists(): Promise<void> {
  try {
    // Check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${RATE_LIMIT_TABLE}
      )
    `);
    
    // If the table doesn't exist, create it
    if (!tableExists.rows[0].exists) {
      await db.execute(sql`
        CREATE TABLE ${sql.identifier(RATE_LIMIT_TABLE)} (
          id SERIAL PRIMARY KEY,
          endpoint TEXT NOT NULL,
          request_timestamp TIMESTAMP NOT NULL,
          request_type TEXT NOT NULL,
          response_status INTEGER,
          response_data JSONB
        )
      `);
      console.log(`Created ${RATE_LIMIT_TABLE} table`);
    }
  } catch (error) {
    console.error('Error ensuring rate limit table exists:', error);
    throw error;
  }
}

/**
 * Records an API request to the rate limit table
 */
export async function recordApiRequest(
  endpoint: string,
  requestType: string,
  responseStatus?: number,
  responseData?: any
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(RATE_LIMIT_TABLE)} 
      (endpoint, request_timestamp, request_type, response_status, response_data)
      VALUES (
        ${endpoint},
        ${new Date()},
        ${requestType},
        ${responseStatus || null},
        ${responseData ? JSON.stringify(responseData) : null}
      )
    `);
  } catch (error) {
    console.error('Error recording API request:', error);
    // Don't throw here to avoid disrupting the main flow if logging fails
  }
}

/**
 * Checks if we can make a request to Guesty API based on rate limits
 * @returns RateLimitStatus object with rate limit information
 */
export async function checkRateLimit(): Promise<RateLimitStatus> {
  try {
    // Initialize the rate limit table if it doesn't exist
    await ensureRateLimitTableExists();
    
    // Count requests in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await db.execute(sql`
      SELECT COUNT(*) as request_count 
      FROM ${sql.identifier(RATE_LIMIT_TABLE)}
      WHERE request_timestamp > ${oneDayAgo}
    `);
    
    const requestCount = parseInt(result.rows[0].request_count, 10);
    const MAX_REQUESTS_PER_DAY = 5;
    const remainingRequests = Math.max(0, MAX_REQUESTS_PER_DAY - requestCount);
    
    if (remainingRequests === 0) {
      // If rate limited, find out when the next request will be available
      const oldestRequest = await db.execute(sql`
        SELECT request_timestamp
        FROM ${sql.identifier(RATE_LIMIT_TABLE)}
        ORDER BY request_timestamp ASC
        LIMIT 1
      `);
      
      if (oldestRequest.rows.length > 0) {
        const oldestTimestamp = new Date(oldestRequest.rows[0].request_timestamp);
        const nextAvailableTime = new Date(oldestTimestamp.getTime() + 24 * 60 * 60 * 1000);
        
        return {
          isRateLimited: true,
          requestsRemaining: 0,
          nextAvailableTimestamp: nextAvailableTime,
          message: `Rate limit exceeded. Next request available at ${nextAvailableTime.toISOString()}`
        };
      }
      
      return {
        isRateLimited: true,
        requestsRemaining: 0,
        nextAvailableTimestamp: null,
        message: 'Rate limit exceeded. Try again in 24 hours.'
      };
    }
    
    return {
      isRateLimited: false,
      requestsRemaining: remainingRequests,
      nextAvailableTimestamp: null,
      message: `${remainingRequests} requests remaining in the current 24-hour period`
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    
    // If there's an error checking the rate limit, assume we're not rate limited
    // but log a warning. This is safer than returning isRateLimited: true
    return {
      isRateLimited: false,
      requestsRemaining: 1, // Conservative estimate
      nextAvailableTimestamp: null,
      message: 'Error checking rate limit. Proceeding with caution.'
    };
  }
}

/**
 * Checks if we have enough remaining requests to perform a batch operation
 * @param requiredRequests Number of API calls required for the operation
 * @returns RateLimitStatus object with rate limit information
 */
export async function checkBatchRateLimit(requiredRequests: number): Promise<RateLimitStatus> {
  const status = await checkRateLimit();
  
  if (status.requestsRemaining < requiredRequests) {
    return {
      ...status,
      isRateLimited: true,
      message: `Insufficient remaining requests. Need ${requiredRequests}, but only have ${status.requestsRemaining}.`
    };
  }
  
  return status;
}