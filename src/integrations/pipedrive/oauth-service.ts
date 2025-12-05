/**
 * Pipedrive OAuth Service
 * 
 * Handles the OAuth 2.0 flow for Pipedrive integration:
 * - Authorization URL generation
 * - Token exchange
 * - Token refresh
 * - Connection management
 */

import { db } from '@/lib/db';
import { PipedriveClient } from './client';
import {
  IntegrationConnection,
  PIPEDRIVE_OAUTH_URL,
  DEFAULT_SYNC_CONFIG,
} from '../types';
import { randomBytes, createHmac } from 'crypto';

interface PipedriveOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get OAuth configuration from database or environment variables
 */
export async function getPipedriveOAuthConfigAsync(tenantId: string): Promise<PipedriveOAuthConfig> {
  // First, try to get from database
  const dbConfig = await db.integrationConfig.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (dbConfig?.clientId && dbConfig?.clientSecret && dbConfig?.isEnabled) {
    const redirectUri = dbConfig.redirectUri || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/pipedrive/callback`;
    return {
      clientId: dbConfig.clientId,
      clientSecret: dbConfig.clientSecret,
      redirectUri,
    };
  }

  // Fallback to environment variables
  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
  const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/pipedrive/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('NOT_CONFIGURED');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Get OAuth configuration from environment variables (sync version - deprecated, use async)
 */
export function getPipedriveOAuthConfig(): PipedriveOAuthConfig {
  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
  const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/pipedrive/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('NOT_CONFIGURED');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Save integration configuration to database
 */
export async function saveIntegrationConfig(
  tenantId: string,
  config: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    isEnabled: boolean;
  }
): Promise<void> {
  await db.integrationConfig.upsert({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
    create: {
      tenantId,
      integrationType: 'pipedrive',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      isEnabled: config.isEnabled,
    },
    update: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      isEnabled: config.isEnabled,
    },
  });
}

/**
 * Get integration configuration from database
 */
export async function getIntegrationConfig(tenantId: string): Promise<{
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isEnabled: boolean;
  hasEnvConfig: boolean;
} | null> {
  const dbConfig = await db.integrationConfig.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  const hasEnvConfig = !!(process.env.PIPEDRIVE_CLIENT_ID && process.env.PIPEDRIVE_CLIENT_SECRET);

  if (!dbConfig) {
    return {
      isEnabled: hasEnvConfig,
      hasEnvConfig,
    };
  }

  return {
    clientId: dbConfig.clientId || undefined,
    // Don't return the actual secret, just indicate if it's set
    clientSecret: dbConfig.clientSecret ? '••••••••' : undefined,
    redirectUri: dbConfig.redirectUri || undefined,
    isEnabled: dbConfig.isEnabled,
    hasEnvConfig,
  };
}

/**
 * Generates the Pipedrive OAuth authorization URL
 */
export async function getAuthorizationUrl(tenantId: string): Promise<string> {
  const { clientId, redirectUri } = await getPipedriveOAuthConfigAsync(tenantId);
  
  // Generate a CSRF token (state)
  const state = generateState(tenantId);
  
  // Store state in a temp store (in production, use Redis or similar)
  storeState(state, tenantId);
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return `${PIPEDRIVE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handles the OAuth callback and exchanges the code for tokens
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<IntegrationConnection> {
  // Validate state and get tenantId
  const tenantId = validateAndGetTenant(state);
  if (!tenantId) {
    throw new Error('Invalid or expired state parameter');
  }

  const { clientId, clientSecret, redirectUri } = await getPipedriveOAuthConfigAsync(tenantId);

  // Exchange code for tokens
  const tokenResponse = await PipedriveClient.exchangeCodeForTokens(
    code,
    redirectUri,
    clientId,
    clientSecret
  );

  // Get company info
  const client = new PipedriveClient({
    accessToken: tokenResponse.access_token,
    apiDomain: tokenResponse.api_domain,
  });

  const userInfo = await client.getCurrentUser();

  // Calculate token expiration
  const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Check if connection already exists
  const existingConnection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (existingConnection) {
    // Update existing connection
    const updated = await db.integrationConnection.update({
      where: { id: existingConnection.id },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt,
        apiDomain: tokenResponse.api_domain,
        companyId: userInfo.data.company_id?.toString(),
        companyName: userInfo.data.company_name,
        isActive: true,
        lastSyncError: null,
      },
    });

    return connectionToType(updated);
  }

  // Create new connection
  const connection = await db.integrationConnection.create({
    data: {
      tenantId,
      integrationType: 'pipedrive',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt,
      apiDomain: tokenResponse.api_domain,
      companyId: userInfo.data.company_id?.toString(),
      companyName: userInfo.data.company_name,
      isActive: true,
      fieldMapping: '{}',
      syncConfig: JSON.stringify(DEFAULT_SYNC_CONFIG),
    },
  });

  return connectionToType(connection);
}

/**
 * Refreshes the access token if it's about to expire
 */
export async function ensureValidToken(
  connection: IntegrationConnection
): Promise<IntegrationConnection> {
  // Check if token expires within 5 minutes
  const expiresIn = connection.tokenExpiresAt.getTime() - Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresIn > fiveMinutes) {
    return connection;
  }

  // Refresh the token
  const { clientId, clientSecret } = await getPipedriveOAuthConfigAsync(connection.tenantId);

  const tokenResponse = await PipedriveClient.refreshAccessToken(
    connection.refreshToken,
    clientId,
    clientSecret
  );

  const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Update connection in database
  const updated = await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt,
      apiDomain: tokenResponse.api_domain,
    },
  });

  return connectionToType(updated);
}

/**
 * Disconnects the Pipedrive integration
 */
export async function disconnect(tenantId: string): Promise<void> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    throw new Error('No Pipedrive connection found');
  }

  // Delete the connection (this will cascade delete sync logs)
  await db.integrationConnection.delete({
    where: { id: connection.id },
  });
}

/**
 * Gets the current connection status
 */
export async function getConnectionStatus(tenantId: string): Promise<{
  connected: boolean;
  companyName?: string;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  isActive?: boolean;
} | null> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    return { connected: false };
  }

  return {
    connected: true,
    companyName: connection.companyName || undefined,
    lastSyncAt: connection.lastSyncAt || undefined,
    lastSyncStatus: connection.lastSyncStatus || undefined,
    isActive: connection.isActive,
  };
}

/**
 * Gets the connection for a tenant
 */
export async function getConnection(tenantId: string): Promise<IntegrationConnection | null> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    return null;
  }

  return connectionToType(connection);
}

/**
 * Updates the organization field mapping configuration
 * Updates both fieldMapping (for UI display) and syncConfig.customFieldMapping (for sync logic)
 */
export async function updateFieldMapping(
  tenantId: string,
  mapping: Record<string, string>
): Promise<void> {
  // Get current connection to merge with existing syncConfig
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    throw new Error('No Pipedrive connection found');
  }

  // Parse current syncConfig and update customFieldMapping
  const currentConfig = JSON.parse(connection.syncConfig || '{}');
  const newConfig = { 
    ...DEFAULT_SYNC_CONFIG, 
    ...currentConfig, 
    customFieldMapping: mapping  // Sync the field mapping to syncConfig
  };

  await db.integrationConnection.update({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
    data: {
      fieldMapping: JSON.stringify(mapping),
      syncConfig: JSON.stringify(newConfig),
    },
  });
}

/**
 * Updates the person field mapping configuration
 */
export async function updatePersonFieldMapping(
  tenantId: string,
  mapping: Record<string, string>
): Promise<void> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    throw new Error('No Pipedrive connection found');
  }

  const currentConfig = JSON.parse(connection.syncConfig || '{}');
  const newConfig = { ...DEFAULT_SYNC_CONFIG, ...currentConfig, personFieldMapping: mapping };

  await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      syncConfig: JSON.stringify(newConfig),
    },
  });
}

/**
 * Updates advanced field mapping (with composite field support)
 */
export async function updateAdvancedFieldMapping(
  tenantId: string,
  advancedMapping?: {
    simple: Record<string, string>;
    composite: Array<{
      appField: string;
      sourceFields: Array<{ key: string; order: number }>;
      separator?: string;
    }>;
  },
  advancedPersonMapping?: {
    simple: Record<string, string>;
    composite: Array<{
      appField: string;
      sourceFields: Array<{ key: string; order: number }>;
      separator?: string;
    }>;
  }
): Promise<void> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    throw new Error('No Pipedrive connection found');
  }

  const currentConfig = JSON.parse(connection.syncConfig || '{}');
  const newConfig = { ...DEFAULT_SYNC_CONFIG, ...currentConfig };

  // Update organization advanced mapping
  if (advancedMapping) {
    newConfig.advancedFieldMapping = advancedMapping;
    // Also update the simple customFieldMapping for backwards compatibility
    newConfig.customFieldMapping = advancedMapping.simple;
  }

  // Update person advanced mapping
  if (advancedPersonMapping) {
    newConfig.advancedPersonFieldMapping = advancedPersonMapping;
    // Also update the simple personFieldMapping for backwards compatibility
    newConfig.personFieldMapping = advancedPersonMapping.simple;
  }

  // Update fieldMapping too for display purposes
  const fieldMappingUpdate = advancedMapping 
    ? JSON.stringify(advancedMapping.simple) 
    : connection.fieldMapping;

  await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      fieldMapping: fieldMappingUpdate,
      syncConfig: JSON.stringify(newConfig),
    },
  });
}

/**
 * Updates the sync configuration
 */
export async function updateSyncConfig(
  tenantId: string,
  config: Partial<typeof DEFAULT_SYNC_CONFIG>
): Promise<void> {
  const connection = await db.integrationConnection.findUnique({
    where: {
      tenantId_integrationType: {
        tenantId,
        integrationType: 'pipedrive',
      },
    },
  });

  if (!connection) {
    throw new Error('No Pipedrive connection found');
  }

  const currentConfig = JSON.parse(connection.syncConfig || '{}');
  const newConfig = { ...DEFAULT_SYNC_CONFIG, ...currentConfig, ...config };

  await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      syncConfig: JSON.stringify(newConfig),
    },
  });
}

// =====================================
// STATE MANAGEMENT (HMAC-signed, no server-side storage needed)
// =====================================

// Secret key for HMAC signing - use NEXTAUTH_SECRET or fallback
function getStateSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.PIPEDRIVE_STATE_SECRET || 'pipedrive-oauth-state-secret-change-me';
  return secret;
}

/**
 * Generate a signed state parameter that encodes tenantId and timestamp
 * Format: base64(tenantId:timestamp:nonce):signature
 */
function generateState(tenantId: string): string {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${tenantId}:${timestamp}:${nonce}`;
  
  // Create HMAC signature
  const hmac = createHmac('sha256', getStateSecret());
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  // Encode payload as base64 to avoid issues with special characters
  const encodedPayload = Buffer.from(payload).toString('base64url');
  
  return `${encodedPayload}.${signature}`;
}

/**
 * Store state - no-op since we use signed tokens
 */
function storeState(_state: string, _tenantId: string): void {
  // No storage needed - state is self-contained and signed
}

/**
 * Validate state signature and extract tenantId
 * Returns null if invalid or expired (10 minutes)
 */
function validateAndGetTenant(state: string): string | null {
  try {
    const [encodedPayload, signature] = state.split('.');
    
    if (!encodedPayload || !signature) {
      console.error('Invalid state format');
      return null;
    }
    
    // Decode payload
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    
    // Verify signature
    const hmac = createHmac('sha256', getStateSecret());
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('Invalid state signature');
      return null;
    }
    
    // Parse payload
    const [tenantId, timestamp, _nonce] = payload.split(':');
    
    if (!tenantId || !timestamp) {
      console.error('Invalid state payload');
      return null;
    }
    
    // Check expiration (10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    const stateTime = parseInt(timestamp, 10);
    
    if (Date.now() - stateTime > tenMinutes) {
      console.error('State expired');
      return null;
    }
    
    return tenantId;
  } catch (error) {
    console.error('Error validating state:', error);
    return null;
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

// Type guard and converter for database model to our type
function connectionToType(dbConnection: {
  id: string;
  tenantId: string;
  integrationType: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  apiDomain: string | null;
  companyId: string | null;
  companyName: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  fieldMapping: string;
  syncConfig: string;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationConnection {
  // Helper to ensure Date objects are properly parsed
  // SQLite stores DateTime as integers (milliseconds), so we need to convert them
  const ensureDate = (value: Date | number | null | undefined): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    return undefined;
  };

  return {
    id: dbConnection.id,
    tenantId: dbConnection.tenantId,
    integrationType: dbConnection.integrationType as 'pipedrive' | 'salesforce' | 'hubspot',
    accessToken: dbConnection.accessToken,
    refreshToken: dbConnection.refreshToken,
    tokenExpiresAt: ensureDate(dbConnection.tokenExpiresAt) || new Date(),
    apiDomain: dbConnection.apiDomain || undefined,
    companyId: dbConnection.companyId || undefined,
    companyName: dbConnection.companyName || undefined,
    isActive: dbConnection.isActive,
    lastSyncAt: ensureDate(dbConnection.lastSyncAt),
    lastSyncStatus: (dbConnection.lastSyncStatus as 'success' | 'partial' | 'failed') || undefined,
    lastSyncError: dbConnection.lastSyncError || undefined,
    fieldMapping: JSON.parse(dbConnection.fieldMapping || '{}'),
    syncConfig: JSON.parse(dbConnection.syncConfig || '{}'),
    createdAt: ensureDate(dbConnection.createdAt) || new Date(),
    updatedAt: ensureDate(dbConnection.updatedAt) || new Date(),
  };
}

