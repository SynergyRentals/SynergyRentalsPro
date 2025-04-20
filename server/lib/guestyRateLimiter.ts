/**
 * Guesty Rate Limiter Service
 * 
 * Implements a persistent rate limiting mechanism for Guesty API 
 * to respect their strict 5 requests per 24 hours limit.
 */
import { storage } from '../storage';
import { InsertGuestyRateLimit } from '@shared/schema';

const MAX_REQUESTS_PER_DAY = 5;

interface RateLimitStatus {
  isRateLimited: boolean;
  requestsRemaining: number;
  nextAvailableTimestamp: Date | null;
  message: string;
}

/**
 * Records an API request to the rate limit table
 * @param endpoint The API endpoint being called
 * @param requestType The HTTP method (GET, POST, etc)
 * @param responseStatus The HTTP status code from the response
 * @param responseData Optional response data to store
 * @returns The created rate limit record
 */
export async function recordApiRequest(
  endpoint: string,
  requestType: string,
  responseStatus: number,
  responseData?: any
): Promise<void> {
  const rateLimit: InsertGuestyRateLimit = {
    endpoint,
    requestType,
    requestTimestamp: new Date(),
    responseStatus,
    responseData: responseData ? JSON.stringify(responseData) : null
  };

  await storage.createGuestyRateLimit(rateLimit);
}

/**
 * Checks if we can make a request to Guesty API based on rate limits
 * @returns RateLimitStatus object with rate limit information
 */
export async function checkRateLimit(): Promise<RateLimitStatus> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const recentRequests = await storage.countGuestyRateLimitsInTimeRange(oneDayAgo, now);
  const requestsRemaining = Math.max(0, MAX_REQUESTS_PER_DAY - recentRequests);
  const isRateLimited = requestsRemaining === 0;
  
  let nextAvailableTimestamp: Date | null = null;
  let message = '';
  
  if (isRateLimited) {
    // If rate limited, find the oldest request to determine when we can make the next request
    const oldestRequests = await storage.getGuestyRateLimitsInTimeRange(
      oneDayAgo, 
      now
    );
    
    if (oldestRequests.length > 0) {
      const oldestRequest = oldestRequests[0];
      nextAvailableTimestamp = new Date(oldestRequest.requestTimestamp.getTime() + 24 * 60 * 60 * 1000);
      
      const timeUntilNextRequest = nextAvailableTimestamp.getTime() - Date.now();
      const hoursUntilNextRequest = Math.ceil(timeUntilNextRequest / (1000 * 60 * 60));
      
      message = `Rate limit exceeded. Next request available in approximately ${hoursUntilNextRequest} hours.`;
    } else {
      message = 'Rate limit exceeded. Unable to determine when next request will be available.';
    }
  } else {
    message = `${requestsRemaining} requests remaining in the current 24-hour period.`;
  }
  
  return {
    isRateLimited,
    requestsRemaining,
    nextAvailableTimestamp,
    message
  };
}

/**
 * Checks if we have enough remaining requests to perform a batch operation
 * @param requiredRequests Number of API calls required for the operation
 * @returns RateLimitStatus object with rate limit information
 */
export async function checkBatchRateLimit(requiredRequests: number): Promise<RateLimitStatus> {
  const baseStatus = await checkRateLimit();
  
  if (baseStatus.isRateLimited) {
    return baseStatus;
  }
  
  const haveEnoughRequests = baseStatus.requestsRemaining >= requiredRequests;
  
  if (!haveEnoughRequests) {
    return {
      isRateLimited: true,
      requestsRemaining: baseStatus.requestsRemaining,
      nextAvailableTimestamp: baseStatus.nextAvailableTimestamp,
      message: `Insufficient remaining API calls. Need ${requiredRequests}, but only have ${baseStatus.requestsRemaining}.`
    };
  }
  
  return {
    ...baseStatus,
    message: `Sufficient remaining API calls. Need ${requiredRequests}, have ${baseStatus.requestsRemaining}.`
  };
}