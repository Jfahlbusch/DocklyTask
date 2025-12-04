/**
 * Integrations Module
 * 
 * Zentrale Export-Datei für alle Integration-bezogenen Module.
 * Dieses Modul ist erweiterbar für zukünftige Integrationen (Salesforce, HubSpot, etc.)
 */

// Types
export * from './types';

// Pipedrive
export { PipedriveClient, paginateApi, withRetry } from './pipedrive/client';
export { PipedriveSyncService } from './pipedrive/sync-service';
export {
  getAuthorizationUrl,
  handleOAuthCallback,
  ensureValidToken,
  disconnect,
  getConnectionStatus,
  getConnection,
  updateFieldMapping,
  updateSyncConfig,
  getPipedriveOAuthConfig,
  getPipedriveOAuthConfigAsync,
  saveIntegrationConfig,
  getIntegrationConfig,
} from './pipedrive/oauth-service';

