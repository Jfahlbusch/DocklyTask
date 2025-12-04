/**
 * Pipedrive Sync Service
 * 
 * Handles synchronization of Organizations and Persons from Pipedrive to the app.
 */

import { db } from '@/lib/db';
import { PipedriveClient, paginateApi, withRetry } from './client';
import {
  IntegrationConnection,
  SyncType,
  SyncResult,
  SyncError,
  PipedriveOrganization,
  PipedrivePerson,
  PipedriveOrganizationField,
  PipedrivePersonField,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
} from '../types';

export class PipedriveSyncService {
  private client: PipedriveClient;
  private connection: IntegrationConnection;
  private syncConfig: SyncConfig;
  private errors: SyncError[] = [];

  constructor(connection: IntegrationConnection) {
    this.connection = connection;
    this.syncConfig = {
      ...DEFAULT_SYNC_CONFIG,
      ...(typeof connection.syncConfig === 'string' 
        ? JSON.parse(connection.syncConfig) 
        : connection.syncConfig)
    };
    
    if (!connection.apiDomain) {
      throw new Error('API domain is required for Pipedrive client');
    }

    this.client = new PipedriveClient({
      accessToken: connection.accessToken,
      apiDomain: connection.apiDomain,
    });
  }

  /**
   * Runs a full or incremental sync
   */
  async runSync(syncType: SyncType): Promise<SyncResult> {
    const startedAt = new Date();
    this.errors = [];

    const result: SyncResult = {
      success: true,
      syncType,
      organizationsFetched: 0,
      organizationsCreated: 0,
      organizationsUpdated: 0,
      personsFetched: 0,
      personsCreated: 0,
      personsUpdated: 0,
      errors: [],
      startedAt,
      completedAt: new Date(),
    };

    // Create sync log entry
    const syncLog = await db.integrationSyncLog.create({
      data: {
        connectionId: this.connection.id,
        syncType,
        status: 'running',
      },
    });

    try {
      // 1. Load organization field schema for custom field mapping
      const fieldSchema = await this.loadOrganizationFields();

      // 2. Determine sync window
      // Pipedrive API requires RFC3339 format without milliseconds
      let updatedSince: string | undefined;
      if (syncType === 'incremental' && this.connection.lastSyncAt) {
        // Ensure lastSyncAt is a proper Date object
        const lastSync = this.connection.lastSyncAt instanceof Date 
          ? this.connection.lastSyncAt 
          : new Date(this.connection.lastSyncAt as unknown as number);
        
        // Format without milliseconds: YYYY-MM-DDTHH:mm:ssZ
        updatedSince = lastSync.toISOString().replace(/\.\d{3}Z$/, 'Z');
        console.log('[Sync] Using updatedSince:', updatedSince);
      }

      // 3. Sync organizations
      const orgStats = await this.syncOrganizations(updatedSince, fieldSchema);
      result.organizationsFetched = orgStats.fetched;
      result.organizationsCreated = orgStats.created;
      result.organizationsUpdated = orgStats.updated;

      // 4. Sync persons if enabled
      if (this.syncConfig.syncPersons) {
        // Load person field schema for custom field mapping
        const personFieldSchema = await this.loadPersonFields();
        const personStats = await this.syncPersons(updatedSince, personFieldSchema);
        result.personsFetched = personStats.fetched;
        result.personsCreated = personStats.created;
        result.personsUpdated = personStats.updated;
      }

      // 5. Update sync log and connection
      result.errors = this.errors;
      result.success = this.errors.length === 0;
      result.completedAt = new Date();

      await db.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: result.success ? 'success' : 'partial',
          completedAt: result.completedAt,
          organizationsFetched: result.organizationsFetched,
          organizationsCreated: result.organizationsCreated,
          organizationsUpdated: result.organizationsUpdated,
          personsFetched: result.personsFetched,
          personsCreated: result.personsCreated,
          personsUpdated: result.personsUpdated,
          errors: JSON.stringify(result.errors),
        },
      });

      await db.integrationConnection.update({
        where: { id: this.connection.id },
        data: {
          lastSyncAt: result.completedAt,
          lastSyncStatus: result.success ? 'success' : 'partial',
          lastSyncError: result.errors.length > 0 
            ? result.errors[0].error 
            : null,
        },
      });

      return result;

    } catch (error) {
      // Handle fatal sync error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await db.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: JSON.stringify([{ 
            entityType: 'organization', 
            entityId: '', 
            error: errorMessage, 
            timestamp: new Date() 
          }]),
        },
      });

      await db.integrationConnection.update({
        where: { id: this.connection.id },
        data: {
          lastSyncStatus: 'failed',
          lastSyncError: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Loads organization field schema from Pipedrive
   */
  private async loadOrganizationFields(): Promise<PipedriveOrganizationField[]> {
    const response = await withRetry(() => this.client.getOrganizationFields());
    return response.data;
  }

  /**
   * Loads person field schema from Pipedrive
   */
  private async loadPersonFields(): Promise<PipedrivePersonField[]> {
    const response = await withRetry(() => this.client.getPersonFields());
    return response.data;
  }

  /**
   * Syncs organizations from Pipedrive
   */
  private async syncOrganizations(
    updatedSince: string | undefined,
    fieldSchema: PipedriveOrganizationField[]
  ): Promise<{ fetched: number; created: number; updated: number }> {
    let fetched = 0;
    let created = 0;
    let updated = 0;

    // Get custom field keys from mapping to include in API request
    // Filter out built-in fields that should not be requested as custom_fields
    const builtInFields = new Set([
      'name', 'owner_id', 'address', 'address_street', 'address_city', 
      'address_postal_code', 'address_country', 'address_locality',
      'address_subpremise', 'address_admin_area_level_1', 'address_admin_area_level_2',
      'address_formatted_address', 'cc_email', 'visible_to', 'label', 'people_count',
      'open_deals_count', 'closed_deals_count', 'won_deals_count', 'lost_deals_count'
    ]);
    
    const customFieldKeys = Object.keys(this.syncConfig.customFieldMapping || {})
      .filter(key => !builtInFields.has(key) && !key.startsWith('address_'))
      .join(',');
    console.log('[Sync] Requesting custom fields:', customFieldKeys || '(none - using only built-in fields)');

    const fetchOrganizations = (cursor?: string) =>
      withRetry(() => this.client.getOrganizations({
        cursor,
        limit: 500,
        updatedSince,
        sortBy: 'update_time',
        sortDirection: 'asc',
        // Request custom fields if mapping exists
        customFields: customFieldKeys || undefined,
      }));

    for await (const org of paginateApi(fetchOrganizations)) {
      fetched++;
      
      // Debug: Log first organization's structure
      if (fetched === 1) {
        console.log('[Sync] First organization data keys:', Object.keys(org));
        console.log('[Sync] First organization full data:', JSON.stringify(org, null, 2));
        console.log('[Sync] Custom field mapping:', this.syncConfig.customFieldMapping);
        
        // Check if custom fields are in a nested object
        const customFieldsObj = (org as { custom_fields?: Record<string, unknown> }).custom_fields;
        if (customFieldsObj) {
          console.log('[Sync] custom_fields object:', customFieldsObj);
        }
        
        // Log each mapped field value
        for (const [pipedriveKey] of Object.entries(this.syncConfig.customFieldMapping || {})) {
          const directValue = org[pipedriveKey];
          const customValue = customFieldsObj?.[pipedriveKey];
          console.log(`[Sync] Field "${pipedriveKey}": direct=${directValue}, custom_fields=${customValue}`);
        }
      }
      
      try {
        const isNew = await this.syncOrganization(org, fieldSchema);
        if (isNew) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        this.errors.push({
          entityType: 'organization',
          entityId: org.id,
          entityName: org.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return { fetched, created, updated };
  }

  /**
   * Syncs a single organization to the Customer model
   */
  private async syncOrganization(
    org: PipedriveOrganization,
    fieldSchema: PipedriveOrganizationField[]
  ): Promise<boolean> {
    // Check if customer already exists
    const existingCustomer = await db.customer.findFirst({
      where: {
        tenantId: this.connection.tenantId,
        pipedriveId: BigInt(org.id),
      },
    });

    // Map organization data to customer
    const customerData = this.mapOrganizationToCustomer(org, fieldSchema, existingCustomer?.info);

    if (existingCustomer) {
      // Update existing customer
      await db.customer.update({
        where: { id: existingCustomer.id },
        data: customerData,
      });
      return false;
    } else {
      // Create new customer
      await db.customer.create({
        data: {
          ...customerData,
          tenantId: this.connection.tenantId,
          pipedriveId: BigInt(org.id),
        },
      });
      return true;
    }
  }

  /**
   * Maps Pipedrive organization to Customer data
   * Merges new data with existing profile data to preserve manually entered fields
   */
  private mapOrganizationToCustomer(
    org: PipedriveOrganization,
    fieldSchema: PipedriveOrganizationField[],
    existingInfo?: string | null
  ): {
    name: string;
    mainContact?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    pipedriveSyncedAt: Date;
    info?: string;
  } {
    const customer: {
      name: string;
      mainContact?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      pipedriveSyncedAt: Date;
      info?: string;
    } = {
      name: org.name,
      pipedriveSyncedAt: new Date(),
    };

    // Map address fields from Pipedrive's built-in address object
    if (org.address) {
      console.log('[Sync] Organization address:', org.address);
      customer.street = org.address.street || undefined;
      customer.city = org.address.city || undefined;
      customer.postalCode = org.address.postal_code || undefined;
      customer.country = org.address.country || undefined;
    }
    
    // Also check for address as a formatted string (some Pipedrive setups)
    const addressString = org['address'] as string | undefined;
    if (typeof addressString === 'string' && addressString && !org.address?.street) {
      console.log('[Sync] Organization address as string:', addressString);
      // If address is a simple string and no structured address, store in street
      customer.street = addressString;
    }

    // Map custom fields if enabled
    if (this.syncConfig.syncCustomFields && this.syncConfig.customFieldMapping) {
      // Start with existing profile data to preserve manually entered fields
      let profileData: Record<string, unknown> = {};
      if (existingInfo) {
        try {
          profileData = JSON.parse(existingInfo);
        } catch {
          // If existing info is not valid JSON, start fresh
          profileData = {};
        }
      }
      
      // In Pipedrive API v2, custom fields might be in a separate 'custom_fields' object
      // or directly on the organization object (API v1 style)
      const customFieldsObj = (org as { custom_fields?: Record<string, unknown> }).custom_fields || {};
      
      for (const [pipedriveKey, appField] of Object.entries(this.syncConfig.customFieldMapping)) {
        // Try to get value from: 1) custom_fields object (v2), 2) direct property (v1), 3) address sub-object
        let fieldValue = customFieldsObj[pipedriveKey] ?? org[pipedriveKey];
        
        // Special handling for address fields
        if (fieldValue === undefined && pipedriveKey === 'address') {
          fieldValue = org.address;
        }
        if (fieldValue === undefined && pipedriveKey.startsWith('address_')) {
          const addressKey = pipedriveKey.replace('address_', '') as keyof typeof org.address;
          fieldValue = org.address?.[addressKey];
        }
        
        if (fieldValue !== undefined && fieldValue !== null) {
          const field = fieldSchema.find(f => f.key === pipedriveKey);
          const transformedValue = this.transformFieldValue(fieldValue, field);
          
          console.log(`[Sync] Mapping field: ${pipedriveKey} -> ${appField}, value:`, transformedValue);
          
          // Check if it's a direct field or a profile field
          if (appField.startsWith('profile.')) {
            // Profile field - store in nested structure
            const profileKey = appField.replace('profile.', '');
            this.setNestedValue(profileData, profileKey, transformedValue);
          } else if (appField === 'mainContact') {
            customer.mainContact = String(transformedValue);
          } else if (appField === 'street') {
            customer.street = String(transformedValue);
          } else if (appField === 'city') {
            customer.city = String(transformedValue);
          } else if (appField === 'postalCode') {
            customer.postalCode = String(transformedValue);
          } else if (appField === 'country') {
            customer.country = String(transformedValue);
          } else if (appField === 'info') {
            // Direct info field - store in profile
            profileData[appField] = transformedValue;
          } else {
            // Unknown field - store in profile
            profileData[appField] = transformedValue;
          }
        }
      }

      // Store merged profile data in info field as JSON
      if (Object.keys(profileData).length > 0) {
        customer.info = JSON.stringify(profileData);
        console.log('[Sync] Profile data to save:', profileData);
      }
    } else if (existingInfo) {
      // If custom field sync is disabled, preserve existing info
      customer.info = existingInfo;
    }

    return customer;
  }

  /**
   * Sets a nested value in an object using dot notation
   * e.g., setNestedValue(obj, 'keyFacts.general', 'value') => obj.keyFacts.general = 'value'
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Transforms a Pipedrive field value based on field type
   * Works for both organization and person fields
   */
  private transformFieldValue(
    value: unknown,
    field?: PipedriveOrganizationField | PipedrivePersonField
  ): unknown {
    if (!field) return value;

    switch (field.field_type) {
      case 'enum':
        // Map enum ID to label
        if (typeof value === 'number' && field.options) {
          const option = field.options.find(o => o.id === value);
          return option ? option.label : value;
        }
        return value;

      case 'set':
        // Multiple selection - can be array of IDs, single ID, or comma-separated string
        if (field.options) {
          // Normalize to array
          let ids: number[];
          if (Array.isArray(value)) {
            ids = value;
          } else if (typeof value === 'string' && value.includes(',')) {
            // Comma-separated string of IDs
            ids = value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          } else if (typeof value === 'number') {
            // Single ID
            ids = [value];
          } else if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            ids = isNaN(parsed) ? [] : [parsed];
          } else {
            return value;
          }
          
          // Map IDs to labels
          return ids.map(id => {
            const option = field.options!.find(o => o.id === id);
            return option ? option.label : String(id);
          });
        }
        return value;

      case 'date':
      case 'daterange':
        return value;

      case 'varchar':
      case 'text':
      case 'varchar_auto':
      case 'double':
      case 'monetary':
      case 'int':
      case 'phone':
      case 'address':
        return value;

      default:
        return value;
    }
  }

  /**
   * Syncs persons (contacts) from Pipedrive
   */
  private async syncPersons(
    updatedSince: string | undefined,
    fieldSchema: PipedrivePersonField[]
  ): Promise<{ fetched: number; created: number; updated: number }> {
    let fetched = 0;
    let created = 0;
    let updated = 0;

    // Get custom field keys from mapping to include in API request
    // Filter out built-in fields that should not be requested as custom_fields
    const builtInPersonFields = new Set([
      'name', 'first_name', 'last_name', 'email', 'phone', 'owner_id',
      'org_id', 'visible_to', 'label', 'picture_id', 'marketing_status'
    ]);
    
    const customFieldKeys = Object.keys(this.syncConfig.personFieldMapping || {})
      .filter(key => !builtInPersonFields.has(key))
      .join(',');
    
    const fetchPersons = (cursor?: string) =>
      withRetry(() => this.client.getPersons({
        cursor,
        limit: 500,
        updatedSince,
        sortBy: 'update_time',
        sortDirection: 'asc',
        // Request custom fields if mapping exists
        customFields: customFieldKeys || undefined,
      }));

    for await (const person of paginateApi(fetchPersons)) {
      fetched++;
      
      try {
        const isNew = await this.syncPerson(person, fieldSchema);
        if (isNew) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        this.errors.push({
          entityType: 'person',
          entityId: person.id,
          entityName: person.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return { fetched, created, updated };
  }

  /**
   * Syncs a single person to the Contact model
   */
  private async syncPerson(
    person: PipedrivePerson,
    fieldSchema: PipedrivePersonField[]
  ): Promise<boolean> {
    // Find the associated customer by Pipedrive org_id
    if (!person.org_id) {
      // Skip persons without an organization
      return false;
    }

    const customer = await db.customer.findFirst({
      where: {
        tenantId: this.connection.tenantId,
        pipedriveId: BigInt(person.org_id),
      },
    });

    if (!customer) {
      // Skip if customer doesn't exist yet
      return false;
    }

    // Check if contact already exists
    const existingContact = await db.contact.findFirst({
      where: {
        tenantId: this.connection.tenantId,
        pipedriveId: BigInt(person.id),
      },
    });

    // Map person data to contact (pass existing metadata to preserve manual entries)
    const contactData = this.mapPersonToContact(person, customer.id, fieldSchema, existingContact?.metadata);

    if (existingContact) {
      // Update existing contact
      await db.contact.update({
        where: { id: existingContact.id },
        data: contactData,
      });
      return false;
    } else {
      // Create new contact
      await db.contact.create({
        data: {
          ...contactData,
          tenantId: this.connection.tenantId,
          pipedriveId: BigInt(person.id),
        },
      });
      return true;
    }
  }

  /**
   * Maps Pipedrive person to Contact data
   * Merges new data with existing metadata to preserve manually entered fields
   */
  private mapPersonToContact(
    person: PipedrivePerson,
    customerId: string,
    fieldSchema: PipedrivePersonField[],
    existingMetadata?: string | null
  ): {
    customerId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
    metadata?: string;
    pipedriveSyncedAt: Date;
  } {
    // Get primary email
    const primaryEmail = person.emails?.find(e => e.primary)?.value 
      || person.emails?.[0]?.value;
    
    // Get primary phone
    const primaryPhone = person.phones?.find(p => p.primary)?.value 
      || person.phones?.[0]?.value;

    const contactData: {
      customerId: string;
      name: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
      metadata?: string;
      pipedriveSyncedAt: Date;
    } = {
      customerId,
      name: person.name,
      firstName: person.first_name || undefined,
      lastName: person.last_name || undefined,
      email: primaryEmail,
      phone: primaryPhone,
      position: person.job_title || undefined,
      pipedriveSyncedAt: new Date(),
    };

    // Map custom fields if enabled
    if (this.syncConfig.syncCustomFields && this.syncConfig.personFieldMapping) {
      // Start with existing metadata to preserve manually entered fields
      let metadataObj: Record<string, unknown> = {};
      if (existingMetadata) {
        try {
          metadataObj = JSON.parse(existingMetadata);
        } catch {
          // If existing metadata is not valid JSON, start fresh
          metadataObj = {};
        }
      }
      
      // In API v2, custom fields are in a separate custom_fields object
      const customFields = (person as { custom_fields?: Record<string, unknown> }).custom_fields || {};
      
      for (const [pipedriveKey, appField] of Object.entries(this.syncConfig.personFieldMapping)) {
        // Check both custom_fields (v2) and direct properties (v1)
        const fieldValue = customFields[pipedriveKey] ?? person[pipedriveKey];
        if (fieldValue !== undefined) {
          const field = fieldSchema.find(f => f.key === pipedriveKey);
          const transformedValue = this.transformFieldValue(fieldValue, field);
          
          // Check if it's a direct field or a metadata field
          if (appField.startsWith('metadata.')) {
            const metadataKey = appField.replace('metadata.', '');
            metadataObj[metadataKey] = transformedValue;
          } else if (appField === 'firstName') {
            contactData.firstName = String(transformedValue);
          } else if (appField === 'lastName') {
            contactData.lastName = String(transformedValue);
          } else if (appField === 'name') {
            contactData.name = String(transformedValue);
          } else if (appField === 'email') {
            contactData.email = String(transformedValue);
          } else if (appField === 'phone') {
            contactData.phone = String(transformedValue);
          } else if (appField === 'position') {
            contactData.position = String(transformedValue);
          } else {
            // Unknown field, store in metadata
            metadataObj[appField] = transformedValue;
          }
        }
      }

      // Store merged metadata in field as JSON
      if (Object.keys(metadataObj).length > 0) {
        contactData.metadata = JSON.stringify(metadataObj);
      }
    } else if (existingMetadata) {
      // If custom field sync is disabled, preserve existing metadata
      contactData.metadata = existingMetadata;
    }

    return contactData;
  }

  /**
   * Updates the client's access token (after refresh)
   */
  updateAccessToken(accessToken: string): void {
    this.client.updateAccessToken(accessToken);
  }
}

