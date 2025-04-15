import { AxiosError, AxiosInstance, AxiosResponse, default as axios } from 'axios';

export class GuestyAPIClient {
  private accessToken: string | null = null;
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

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
  }

  private async _ensureTokenValid(): Promise<void> {
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
      // Changed from '/api/v2/oauth2/token' to '/oauth2/token' to match the correct auth URL
      const response = await axios.post('https://open-api.guesty.com/oauth2/token', {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read write'
      });

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

        console.log(`[${timestamp}] GuestyClient: Attempting API call to ${endpoint}`);
        const response = await this.axios.request({
          method,
          url: endpoint,
          data,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
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
}

export const guestyClient = new GuestyAPIClient();