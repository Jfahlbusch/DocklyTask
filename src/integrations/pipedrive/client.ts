/**
 * Pipedrive API Client
 * 
 * Handles all HTTP communication with the Pipedrive API v2
 */

import {
  PipedriveApiResponse,
  PipedriveOrganization,
  PipedrivePerson,
  PipedriveOrganizationField,
  PipedrivePersonField,
  PipedriveTokenResponse,
  PIPEDRIVE_TOKEN_URL,
} from '../types';

export interface PipedriveClientConfig {
  accessToken: string;
  apiDomain: string;
}

export interface FetchOptions {
  cursor?: string;
  limit?: number;
  updatedSince?: string;
  includeFields?: string;
  customFields?: string;
  sortBy?: 'id' | 'update_time' | 'add_time';
  sortDirection?: 'asc' | 'desc';
}

export class PipedriveClient {
  private accessToken: string;
  private apiDomain: string;

  constructor(config: PipedriveClientConfig) {
    this.accessToken = config.accessToken;
    this.apiDomain = config.apiDomain;
  }

  /**
   * Makes an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiDomain}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const error = new Error('RATE_LIMITED') as Error & { retryAfter?: number };
      error.retryAfter = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pipedrive API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fetches organizations from Pipedrive API v2
   */
  async getOrganizations(
    options: FetchOptions = {}
  ): Promise<PipedriveApiResponse<PipedriveOrganization[]>> {
    const params = new URLSearchParams();
    
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.updatedSince) params.set('updated_since', options.updatedSince);
    if (options.includeFields) params.set('include_fields', options.includeFields);
    if (options.customFields) params.set('custom_fields', options.customFields);
    if (options.sortBy) params.set('sort_by', options.sortBy);
    if (options.sortDirection) params.set('sort_direction', options.sortDirection);

    const queryString = params.toString();
    const endpoint = `/api/v2/organizations${queryString ? `?${queryString}` : ''}`;
    
    return this.request<PipedriveApiResponse<PipedriveOrganization[]>>(endpoint);
  }

  /**
   * Fetches a single organization by ID
   */
  async getOrganization(id: number): Promise<PipedriveApiResponse<PipedriveOrganization>> {
    return this.request<PipedriveApiResponse<PipedriveOrganization>>(
      `/api/v2/organizations/${id}`
    );
  }

  /**
   * Fetches persons from Pipedrive API v2
   */
  async getPersons(
    options: FetchOptions & { orgId?: number } = {}
  ): Promise<PipedriveApiResponse<PipedrivePerson[]>> {
    const params = new URLSearchParams();
    
    if (options.orgId) params.set('org_id', options.orgId.toString());
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.updatedSince) params.set('updated_since', options.updatedSince);
    if (options.includeFields) params.set('include_fields', options.includeFields);
    if (options.customFields) params.set('custom_fields', options.customFields);
    if (options.sortBy) params.set('sort_by', options.sortBy);
    if (options.sortDirection) params.set('sort_direction', options.sortDirection);

    const queryString = params.toString();
    const endpoint = `/api/v2/persons${queryString ? `?${queryString}` : ''}`;
    
    return this.request<PipedriveApiResponse<PipedrivePerson[]>>(endpoint);
  }

  /**
   * Fetches persons for a specific organization
   */
  async getPersonsByOrganization(
    orgId: number,
    options: FetchOptions = {}
  ): Promise<PipedriveApiResponse<PipedrivePerson[]>> {
    return this.getPersons({ ...options, orgId });
  }

  /**
   * Fetches organization field definitions (v1 API - still required)
   */
  async getOrganizationFields(): Promise<PipedriveApiResponse<PipedriveOrganizationField[]>> {
    return this.request<PipedriveApiResponse<PipedriveOrganizationField[]>>(
      '/v1/organizationFields'
    );
  }

  /**
   * Fetches person field definitions (v1 API)
   */
  async getPersonFields(): Promise<PipedriveApiResponse<PipedrivePersonField[]>> {
    return this.request<PipedriveApiResponse<PipedrivePersonField[]>>(
      '/v1/personFields'
    );
  }

  /**
   * Fetches current user info
   */
  async getCurrentUser(): Promise<PipedriveApiResponse<{ id: number; name: string; email: string; company_id: number; company_name: string }>> {
    return this.request('/v1/users/me');
  }

  /**
   * Updates the access token (after refresh)
   */
  updateAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  /**
   * Static method to exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<PipedriveTokenResponse> {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(PIPEDRIVE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Static method to refresh access token
   */
  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<PipedriveTokenResponse> {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(PIPEDRIVE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

/**
 * Async generator for paginating through API results
 */
export async function* paginateApi<T>(
  fetchFn: (cursor?: string) => Promise<PipedriveApiResponse<T[]>>
): AsyncGenerator<T> {
  let cursor: string | undefined;

  do {
    const response = await fetchFn(cursor);

    for (const item of response.data) {
      yield item;
    }

    cursor = response.additional_data?.next_cursor;
  } while (cursor);
}

/**
 * Retry wrapper for API calls with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; delayMs: number } = { maxRetries: 3, delayMs: 1000 }
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Rate Limited - wait and retry
      if (lastError.message === 'RATE_LIMITED') {
        const retryAfter = (error as Error & { retryAfter?: number }).retryAfter || 60;
        await sleep(retryAfter * 1000);
        continue;
      }

      // Other errors: exponential backoff
      if (attempt < options.maxRetries) {
        await sleep(options.delayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

