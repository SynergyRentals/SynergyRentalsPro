/**
 * Guesty Rate Limiter Service
 * 
 * Implements a persistent rate limiting mechanism for Guesty API 
 * to respect their strict 5 requests per 24 hours limit.
 */
import { db } from "../db";
import { eq, gt, sql, asc } from "drizzle-orm";
import { guestyRateLimits, InsertGuestyRateLimit } from "../../shared/schema";

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
 * Note: This is no longer needed with Drizzle schema migrations,
 * but keeping it for backwards compatibility and as safety check
 */
export async function ensureRateLimitTableExists(): Promise<void> {
  try {
    // Check if the table exists using Drizzle
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${RATE_LIMIT_TABLE}
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log(`Rate limit table does not exist. It will be created via db:push command.`);
      // We no longer create the table here as it's defined in the Drizzle schema
    }
  } catch (error) {
    console.error('Error checking rate limit table:', error);
    // Don't throw, just log the error
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
    // Insert using Drizzle schema
    await db.insert(guestyRateLimits).values({
      endpoint: endpoint,
      requestTimestamp: new Date(),
      requestType: requestType,
      responseStatus: responseStatus,
      responseData: responseData || null
    });
    
    console.log(`[${new Date().toISOString()}] Recorded API request to ${endpoint}`);
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
    
    // Count using Drizzle schema
    const recentRequests = await db.select({ count: sql<number>`count(*)` })
      .from(guestyRateLimits)
      .where(gt(guestyRateLimits.requestTimestamp, oneDayAgo));
    
    const requestCount = recentRequests[0]?.count || 0;
    const MAX_REQUESTS_PER_DAY = 5;
    const remainingRequests = Math.max(0, MAX_REQUESTS_PER_DAY - requestCount);
    
    if (remainingRequests === 0) {
      // If rate limited, find out when the next request will be available
      const oldestRequests = await db.select()
        .from(guestyRateLimits)
        .orderBy(asc(guestyRateLimits.requestTimestamp))
        .limit(1);
      
      if (oldestRequests.length > 0) {
        const oldestTimestamp = oldestRequests[0].requestTimestamp;
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