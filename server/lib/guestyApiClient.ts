/**
 * Guesty API Client
 * 
 * A client for interacting with the Guesty API with rate limiting built in.
 * This ensures we never exceed the 5 requests per 24 hours limit.
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { checkRateLimit, recordApiRequest } from './guestyRateLimiter';

// Constants
const GUESTY_API_BASE_URL = 'https://api.guesty.com/api/v2';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Rate limit error class
export class RateLimitError extends Error {
  public nextAvailableTimestamp: Date | null;
  public requestsRemaining: number;

  constructor(message: string, nextAvailableTimestamp: Date | null, requestsRemaining: number) {
    super(message);
    this.name = 'RateLimitError';
    this.nextAvailableTimestamp = nextAvailableTimestamp;
    this.requestsRemaining = requestsRemaining;
  }
}

// Authentication error class
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class GuestyApiClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: GUESTY_API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Set the API credentials
   */
  public setCredentials(apiKey: string, apiSecret: string): void {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  /**
   * Authenticates with the Guesty API to get an access token
   */
  private async authenticate(): Promise<void> {
    if (!this.apiKey || !this.apiSecret) {
      throw new AuthenticationError('API Key and Secret must be set before authenticating');
    }
    
    // Check if we have a valid token already
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }
    
    // Check rate limit before making the request
    const rateLimitStatus = await checkRateLimit();
    if (rateLimitStatus.isRateLimited) {
      throw new RateLimitError(
        rateLimitStatus.message,
        rateLimitStatus.nextAvailableTimestamp,
        rateLimitStatus.requestsRemaining
      );
    }
    
    try {
      const response = await axios.post('https://api.guesty.com/api/v2/authentication', {
        clientId: this.apiKey,
        clientSecret: this.apiSecret,
        grantType: 'client_credentials',
      });
      
      // Record the API request
      await recordApiRequest(
        '/authentication',
        'POST',
        response.status,
        { success: true }
      );
      
      if (response.data && response.data.token) {
        this.accessToken = response.data.token;
        
        // Token usually valid for 24 hours, but set expiry for 23 hours to be safe
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 23);
        this.tokenExpiry = expiryTime;
      } else {
        throw new AuthenticationError('Failed to obtain access token from Guesty API');
      }
    } catch (error: any) {
      // Record the API request even if it failed
      await recordApiRequest(
        '/authentication',
        'POST',
        error.response?.status || 0,
        { success: false, error: error.message }
      );
      
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      throw new AuthenticationError(`Authentication failed: ${error.message}`);
    }
  }
  
  /**
   * Makes a request to the Guesty API with rate limiting
   */
  public async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Check rate limit before making the request
    const rateLimitStatus = await checkRateLimit();
    if (rateLimitStatus.isRateLimited) {
      throw new RateLimitError(
        rateLimitStatus.message,
        rateLimitStatus.nextAvailableTimestamp,
        rateLimitStatus.requestsRemaining
      );
    }
    
    // Authenticate if needed
    await this.authenticate();
    
    // Set up the request
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method,
      url: endpoint,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    };
    
    if (data) {
      requestConfig.data = data;
    }
    
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request(requestConfig);
      
      // Record the API request
      await recordApiRequest(
        endpoint,
        method,
        response.status,
        { success: true }
      );
      
      return response.data;
    } catch (error: any) {
      // Record the API request even if it failed
      await recordApiRequest(
        endpoint,
        method,
        error.response?.status || 0,
        { success: false, error: error.message }
      );
      
      throw error;
    }
  }
  
  /**
   * Helper methods for common HTTP methods
   */
  public async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }
  
  public async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }
  
  public async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }
  
  public async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }
  
  /**
   * Get properties from Guesty API
   */
  public async getProperties(limit: number = 10, skip: number = 0, filters: any = {}): Promise<any> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    query.append('skip', skip.toString());
    
    if (Object.keys(filters).length > 0) {
      query.append('filters', JSON.stringify(filters));
    }
    
    return this.get<any>(`/listings?${query.toString()}`);
  }
  
  /**
   * Get reservations from Guesty API
   */
  public async getReservations(limit: number = 10, skip: number = 0, filters: any = {}): Promise<any> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    query.append('skip', skip.toString());
    
    if (Object.keys(filters).length > 0) {
      query.append('filters', JSON.stringify(filters));
    }
    
    return this.get<any>(`/reservations?${query.toString()}`);
  }
  
  /**
   * Get reservations for a specific property
   */
  public async getPropertyReservations(propertyId: string): Promise<any> {
    const filters = {
      listingIds: [propertyId]
    };
    
    return this.getReservations(100, 0, filters);
  }
}

// Export a singleton instance
export const guestyApiClient = new GuestyApiClient();

// Alias so files can import { guestyClient }
export const guestyClient = guestyApiClient;