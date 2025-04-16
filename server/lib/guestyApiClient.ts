import { AxiosError, AxiosInstance, AxiosResponse, default as axios } from 'axios';

export class GuestyAPIClient {
  accessToken: string | null = null; // Changed from private to public for temporary access
  private tokenExpiry: Date | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseURL: string;
  private readonly axios: AxiosInstance;

  constructor() {
    console.log(`[${new Date().toISOString()}] GuestyAPIClient: Initializing client`);
    this.clientId = process.env.GUESTY_CLIENT_ID || '';
    this.clientSecret = process.env.GUESTY_CLIENT_SECRET || '';
    this.baseURL = 'https://open-api.guesty.com/v1';  // Changed from '/api/v2' to '/v1' to match endpoint paths
    
    // Temporary hardcoded token to avoid rate limits during development
    // This should be removed in production
    this.accessToken = "dev-temp-token";
    this.tokenExpiry = new Date(Date.now() + 86400000); // 24 hours from now

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
  }

  // Changed from private to public for temporary access
  public async _ensureTokenValid(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: _ensureTokenValid called`);

    if (!this.accessToken || !this.tokenExpiry) {
      console.log(`[${timestamp}] GuestyClient: No token exists, getting new token`);
      await this._getNewAccessToken();
      return;
    }

    // Check if token expires in next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (this.tokenExpiry < fiveMinutesFromNow) {
      console.log(`[${timestamp}] GuestyClient: Token expiring soon, refreshing`);
      await this._getNewAccessToken();
    } else {
      console.log(`[${timestamp}] GuestyClient: Existing token is valid until ${this.tokenExpiry.toISOString()}`);
    }
  }

  private async _getNewAccessToken(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: _getNewAccessToken called`);

    try {
      // Try using application/x-www-form-urlencoded content type instead of JSON
      // This is a common content type for OAuth token requests
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      // Don't set a scope parameter for Guesty OAuth - it seems to have a custom scope system
      // Leaving out the scope parameter allows the client to use its default scopes

      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      console.log(`[${timestamp}] GuestyClient: Sending token request with headers:`, JSON.stringify(headers));
      console.log(`[${timestamp}] GuestyClient: Sending token request with params:`, params.toString());
      
      const response = await axios.post(
        'https://open-api.guesty.com/oauth2/token', 
        params,
        { headers }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
      console.log(`[${timestamp}] GuestyClient: Successfully obtained new token, expires at ${this.tokenExpiry.toISOString()}`);
    } catch (error) {
      console.error(`[${timestamp}] GuestyClient: ERROR in _getNewAccessToken:`, error);
      throw error;
    }
  }

  public isTokenPotentiallyValid(): boolean {
    const timestamp = new Date().toISOString();
    const isValid = !!this.accessToken && !!this.tokenExpiry && this.tokenExpiry > new Date();
    console.log(`[${timestamp}] GuestyClient: Token validity check - ${isValid}`);
    return isValid;
  }

  public async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    maxRetries = 3,
    initialWaitTime = 1000
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: makeRequest called for ${method} ${endpoint}`);

    let currentRetry = 0;

    while (true) {
      try {
        await this._ensureTokenValid();

        // Prepare headers object for logging
        const requestHeaders = {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        console.log(`[${timestamp}] GuestyClient: Preparing request ${method} ${endpoint}`);
        console.log(`[${timestamp}] GuestyClient: Sending Headers ->`, JSON.stringify(requestHeaders));
        
        if (data) {
          console.log(`[${timestamp}] GuestyClient: Sending Data ->`, typeof data === 'object' ? JSON.stringify(data) : data);
        }

        console.log(`[${timestamp}] GuestyClient: Attempting API call to ${endpoint}`);
        const response = await this.axios.request({
          method,
          url: endpoint,
          data,
          headers: requestHeaders
        });

        console.log(`[${timestamp}] GuestyClient: Request successful for ${method} ${endpoint}`);
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 429 && currentRetry < maxRetries) {
            currentRetry++;
            const waitTime = initialWaitTime * Math.pow(2, currentRetry - 1);
            console.warn(`[${timestamp}] GuestyClient: Caught 429 (Retry ${currentRetry}/${maxRetries}). Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          console.error(`[${timestamp}] GuestyClient: HTTP Error in makeRequest:`, error.response?.status, error.response?.data);
        } else {
          console.error(`[${timestamp}] GuestyClient: Network/Other Error in makeRequest:`, error);
        }
        throw error;
      }
    }
  }

  public async healthCheck(): Promise<{ success: boolean; message: string }> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: Performing health check`);

    try {
      await this.makeRequest('GET', '/listings', { params: { limit: 1 } });  // Changed from '/v1/listings' to '/listings' since baseURL already includes '/v1'
      console.log(`[${timestamp}] GuestyClient: Health check successful`);
      return { success: true, message: 'Guesty API is healthy' };
    } catch (error) {
      console.error(`[${timestamp}] GuestyClient: Health check failed:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  public async getUserInfo() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: Getting user info`);
    return this.makeRequest('GET', '/me');
  }

  /**
   * Get properties from Guesty API with pagination support
   * @param params Query parameters for the request
   */
  public async getProperties(params: {
    limit?: number;
    skip?: number;
    [key: string]: any;
  } = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: Getting properties with params:`, JSON.stringify(params));
    return this.makeRequest('GET', '/listings', { params });
  }

  /**
   * Get reservations from Guesty API with pagination support
   * @param params Query parameters for the request
   */
  public async getReservations(params: {
    limit?: number;
    skip?: number;
    checkIn?: { $gte?: string; $lte?: string };
    checkOut?: { $gte?: string; $lte?: string };
    [key: string]: any;
  } = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GuestyClient: Getting reservations with params:`, JSON.stringify(params));
    return this.makeRequest('GET', '/reservations', { params });
  }
}

export const guestyClient = new GuestyAPIClient();