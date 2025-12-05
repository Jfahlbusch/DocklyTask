/**
 * Integration Types and Interfaces
 * 
 * Diese Datei enthält alle TypeScript-Definitionen für das Integration-System.
 * Das System ist erweiterbar für zukünftige Integrationen (Salesforce, HubSpot, etc.)
 */

// =====================================
// BASE INTEGRATION TYPES
// =====================================

export type IntegrationType = 'pipedrive' | 'salesforce' | 'hubspot';

export type SyncType = 'full' | 'incremental' | 'manual';

export type SyncStatus = 'running' | 'success' | 'partial' | 'failed';

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  integrationType: IntegrationType;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  apiDomain?: string;
  companyId?: string;
  companyName?: string;
  isActive: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: SyncStatus;
  lastSyncError?: string;
  fieldMapping: Record<string, string>;
  syncConfig: SyncConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Einfaches Mapping: Ein Pipedrive-Feld -> Ein App-Feld
 */
export type SimpleFieldMapping = Record<string, string>; // External key -> App field

/**
 * Zusammengesetztes Feld-Mapping: Mehrere Pipedrive-Felder -> Ein App-Feld
 * Ermöglicht z.B. Straßenname + Hausnummer zu kombinieren
 */
export interface CompositeFieldEntry {
  /** Das Zielfeld in der App */
  appField: string;
  /** Pipedrive-Quellfelder mit Reihenfolge */
  sourceFields: {
    /** Pipedrive-Feld-Schlüssel */
    key: string;
    /** Reihenfolge (0 = erstes) */
    order: number;
  }[];
  /** Trennzeichen zwischen den Werten (default: " ") */
  separator?: string;
}

/**
 * Erweiterte Feld-Zuordnung die sowohl einfache als auch zusammengesetzte Mappings unterstützt
 */
export interface AdvancedFieldMapping {
  /** Einfache 1:1 Mappings (Pipedrive-Key -> App-Feld) */
  simple: SimpleFieldMapping;
  /** Zusammengesetzte Mappings (mehrere Pipedrive-Felder -> ein App-Feld) */
  composite: CompositeFieldEntry[];
}

export interface SyncConfig {
  syncCustomFields: boolean;
  /** @deprecated Verwende advancedFieldMapping für neue Implementierungen */
  customFieldMapping: Record<string, string>; // External key -> App field (for organizations/customers)
  /** @deprecated Verwende advancedPersonFieldMapping für neue Implementierungen */
  personFieldMapping: Record<string, string>; // External key -> App field (for persons/contacts)
  /** Erweitertes Feld-Mapping für Organisationen (unterstützt zusammengesetzte Felder) */
  advancedFieldMapping?: AdvancedFieldMapping;
  /** Erweitertes Feld-Mapping für Personen (unterstützt zusammengesetzte Felder) */
  advancedPersonFieldMapping?: AdvancedFieldMapping;
  syncPersons: boolean;
  incrementalSync: boolean;
  autoSyncEnabled: boolean;
  autoSyncTime?: string; // HH:MM format
}

export interface SyncResult {
  success: boolean;
  syncType: SyncType;
  organizationsFetched: number;
  organizationsCreated: number;
  organizationsUpdated: number;
  personsFetched: number;
  personsCreated: number;
  personsUpdated: number;
  errors: SyncError[];
  startedAt: Date;
  completedAt: Date;
}

export interface SyncError {
  entityType: 'organization' | 'person';
  entityId: string | number;
  entityName?: string;
  error: string;
  timestamp: Date;
}

export interface SyncLog {
  id: string;
  connectionId: string;
  syncType: SyncType;
  startedAt: Date;
  completedAt?: Date;
  status: SyncStatus;
  organizationsFetched: number;
  organizationsCreated: number;
  organizationsUpdated: number;
  personsFetched: number;
  personsCreated: number;
  personsUpdated: number;
  errors: SyncError[];
}

export interface FieldSchema {
  id: string | number;
  key: string;
  name: string;
  fieldType: string;
  options?: Array<{
    id: number;
    label: string;
  }>;
}

// =====================================
// PIPEDRIVE SPECIFIC TYPES
// =====================================

export interface PipedriveOrganization {
  id: number;
  name: string;
  owner_id: number;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  add_time: string;
  update_time: string;
  visible_to: number;
  label_ids?: number[];
  // Custom fields als dynamische Keys
  [customFieldKey: string]: unknown;
}

export interface PipedrivePerson {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  org_id?: number;
  owner_id: number;
  emails?: Array<{
    value: string;
    primary: boolean;
    label: string;
  }>;
  phones?: Array<{
    value: string;
    primary: boolean;
    label: string;
  }>;
  job_title?: string;
  add_time: string;
  update_time: string;
  visible_to: number;
  label_ids?: number[];
  [customFieldKey: string]: unknown;
}

export interface PipedriveTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  api_domain: string;
}

export interface PipedriveApiResponse<T> {
  success: boolean;
  data: T;
  additional_data?: {
    next_cursor?: string;
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
    };
  };
}

export interface PipedriveOrganizationField {
  id: number;
  key: string;
  name: string;
  field_type: string;
  options?: Array<{
    id: number;
    label: string;
  }>;
}

export interface PipedrivePersonField {
  id: number;
  key: string;
  name: string;
  field_type: string;
  options?: Array<{
    id: number;
    label: string;
  }>;
}

// =====================================
// API REQUEST/RESPONSE TYPES
// =====================================

export interface IntegrationStatusResponse {
  connected: boolean;
  integrationType?: IntegrationType;
  companyName?: string;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  isActive?: boolean;
}

export interface FieldMappingRequest {
  mapping: Record<string, string>;
}

export interface SyncRequest {
  syncType: SyncType;
}

export interface SyncHistoryResponse {
  logs: SyncLog[];
  total: number;
}

// =====================================
// INTEGRATION SERVICE INTERFACE
// =====================================

export interface IIntegrationService {
  /**
   * Initiates OAuth flow and returns authorization URL
   */
  getAuthorizationUrl(tenantId: string): string;

  /**
   * Handles OAuth callback and exchanges code for tokens
   */
  handleCallback(code: string, state: string): Promise<IntegrationConnection>;

  /**
   * Disconnects the integration and removes stored credentials
   */
  disconnect(connectionId: string): Promise<void>;

  /**
   * Runs a sync operation
   */
  sync(connectionId: string, syncType: SyncType): Promise<SyncResult>;

  /**
   * Gets the field schema from the external service
   */
  getFieldSchema(): Promise<FieldSchema[]>;

  /**
   * Checks if the connection is still valid
   */
  validateConnection(connectionId: string): Promise<boolean>;

  /**
   * Refreshes the access token if needed
   */
  refreshToken(connection: IntegrationConnection): Promise<IntegrationConnection>;
}

// =====================================
// DEFAULT VALUES
// =====================================

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  syncCustomFields: true,
  customFieldMapping: {},
  personFieldMapping: {},
  syncPersons: true,
  incrementalSync: true,
  autoSyncEnabled: false,
  autoSyncTime: '02:00',
};

export const PIPEDRIVE_OAUTH_URL = 'https://oauth.pipedrive.com/oauth/authorize';
export const PIPEDRIVE_TOKEN_URL = 'https://oauth.pipedrive.com/oauth/token';

