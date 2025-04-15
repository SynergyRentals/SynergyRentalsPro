import axios, { AxiosError, Method } from 'axios';

const GUESTY_BASE_URL = 'https://open-api.guesty.com/v1';
const TOKEN_URL = 'https://login.guesty.com/oauth2/aus1p8qrh53CcQTI95d7/v1/token';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

interface TokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope: string;
}

class GuestyAPIClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null; // Store as timestamp (ms)

  constructor() {
    this.clientId = process.env.GUESTY_CLIENT_ID || '';
    this.clientSecret = process.env.GUESTY_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.error('Guesty Client ID or Secret not found in environment variables.');
      throw new Error('Guesty credentials are required.');
    }
    console.log("GuestyAPIClient initialized.");
  }

  private async _getNewAccessToken(): Promise<void> {
    console.log("Attempting to retrieve new Guesty access token...");
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'open-api');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await axios.post<TokenResponse>(TOKEN_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokenData = response.data;
      if (!tokenData.access_token || typeof tokenData.expires_in !== 'number') {
        throw new Error('Invalid token data received from Guesty.');
      }

      this.accessToken = tokenData.access_token;
      // Calculate expiry timestamp in milliseconds
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
      console.log(`Successfully retrieved new Guesty token. Expires in ${tokenData.expires_in}s.`);

    } catch (error) {
      console.error("Error retrieving Guesty access token:", error instanceof AxiosError ? error.response?.data || error.message : error);
      // Reset token state on failure
      this.accessToken = null;
      this.tokenExpiresAt = null;
      throw new Error(`Failed to retrieve Guesty access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async _ensureTokenValid(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || this.tokenExpiresAt < (Date.now() + TOKEN_EXPIRY_BUFFER_MS)) {
      console.log("Guesty token missing, invalid, or nearing expiration. Refreshing...");
      await this._getNewAccessToken();
    } else {
      console.debug("Existing Guesty token is valid.");
    }
  }

  async makeRequest<T = any>(
    method: Method,
    endpoint: string,
    options?: { params?: Record<string, any>; data?: Record<string, any>; maxRetries?: number }
  ): Promise<T> {
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      throw new Error("Endpoint must start with '/'");
    }

    const maxRetries = options?.maxRetries ?? 3;
    let currentRetry = 0;
    let baseBackoffTimeMs = 1000; // 1 second

    // eslint-disable-next-line no-constant-condition
    while (true) { // Loop handles retries
      try {
        await this._ensureTokenValid(); // Get/refresh token if needed

        const url = `${GUESTY_BASE_URL}${endpoint}`;
        console.debug(`Making Guesty API request: ${method} ${url}`);

        const response = await axios.request<T>({
          method,
          url,
          params: options?.params,
          data: options?.data,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        });

        console.debug(`Guesty API request successful: ${response.status}`);
        return response.data; // Success

      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          const status = error.response.status;
          // Check for rate limiting (429) and if retries are left
          if (status === 429 && currentRetry < maxRetries) {
            currentRetry++;
            let waitTimeMs = baseBackoffTimeMs;

            // Check for Retry-After header (value expected in seconds)
            const retryAfterHeader = error.response.headers['retry-after'];
            if (retryAfterHeader) {
              const retryAfterSeconds = parseInt(retryAfterHeader, 10);
              if (!isNaN(retryAfterSeconds)) {
                waitTimeMs = retryAfterSeconds * 1000;
                console.warn(`Guesty rate limit (429). Retrying after ${retryAfterSeconds}s (Retry ${currentRetry}/${maxRetries})...`);
              } else {
                console.warn(`Guesty rate limit (429). Invalid Retry-After header '${retryAfterHeader}'. Using backoff ${waitTimeMs}ms (Retry ${currentRetry}/${maxRetries})...`);
              }
            } else {
              console.warn(`Guesty rate limit (429). No Retry-After header. Using backoff ${waitTimeMs}ms (Retry ${currentRetry}/${maxRetries})...`);
            }

            // Add jitter (e.g., +/- 10-30% of wait time)
            const jitter = waitTimeMs * (Math.random() * 0.4 + 0.1); // 10% to 50%
            const finalWaitTime = Math.max(500, waitTimeMs + jitter); // Ensure minimum wait

            await new Promise(resolve => setTimeout(resolve, finalWaitTime));

            // Exponential backoff for next potential failure (if Retry-After wasn't used)
            if (!retryAfterHeader) {
              baseBackoffTimeMs *= 2;
            }
            continue; // Go to next iteration of the while loop to retry
          } else {
            // Non-429 error, or retries exhausted
            console.error(`Guesty API request failed: ${status} - ${error.response.data || error.message}`);
            // Special handling for 401 could force token refresh next time
            if (status === 401) {
              console.warn("Received 401 Unauthorized from Guesty. Invalidating token.");
              this.accessToken = null;
              this.tokenExpiresAt = null;
            }
            throw error; // Re-throw the error after logging
          }
        } else {
          // Network error or non-Axios error
          console.error(`Guesty API request failed: ${error instanceof Error ? error.message : String(error)}`);
          throw error; // Re-throw other errors
        }
      }
    } // End while loop
  }

  // Utility methods for our application
  async getProperties(params?: { limit?: number; skip?: number; fields?: string[] }): Promise<any> {
    const queryParams: Record<string, any> = { ...params };
    if (params?.fields) {
      queryParams.fields = params.fields.join(','); // Guesty expects comma-separated string
    }
    console.log("Requesting properties with params:", queryParams);
    return this.makeRequest('GET', '/properties', { params: queryParams });
  }

  async getReservations(params?: { 
    limit?: number; 
    skip?: number;
    checkIn?: { $gte?: string; $lte?: string };
    checkOut?: { $gte?: string; $lte?: string };
  }): Promise<any> {
    console.log("Requesting reservations with params:", params);
    return this.makeRequest('GET', '/reservations', { params });
  }

  async getUserInfo(): Promise<any> {
    return this.makeRequest('GET', '/users/me');
  }

  async healthCheck(): Promise<{ success: boolean; message: string }> {
    try {
      await axios.get(`${GUESTY_BASE_URL.replace('/v1', '')}/health`, {
        timeout: 5000
      });
      return {
        success: true,
        message: 'Guesty API domain is reachable'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Health check failed: ${errorMessage}`
      };
    }
  }
}

// Export a singleton instance (optional, but common)
export const guestyClient = new GuestyAPIClient();