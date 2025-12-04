# Pipedrive Integration - Cursor Prompt-Anleitung

## ✅ Implementierungsstatus: ABGESCHLOSSEN

Die Pipedrive-Integration wurde vollständig implementiert. Folgende Komponenten sind verfügbar:

### Implementierte Features
- ✅ OAuth 2.0 Flow mit Token Refresh
- ✅ Organisations-Synchronisation als Kunden
- ✅ Personen-Synchronisation als Ansprechpartner
- ✅ Custom Fields Mapping
- ✅ Inkrementelle & vollständige Synchronisation
- ✅ Sync-Historie und Fehlerprotokollierung
- ✅ Admin-UI für Konfiguration

### Erforderliche Umgebungsvariablen
```bash
# Pipedrive OAuth Credentials (aus Developer Hub)
PIPEDRIVE_CLIENT_ID=your_client_id
PIPEDRIVE_CLIENT_SECRET=your_client_secret
PIPEDRIVE_REDIRECT_URI=http://localhost:3000/api/integrations/pipedrive/callback

# App URL für Redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Dateistruktur
```
src/integrations/
├── types.ts                     # TypeScript Interfaces
├── index.ts                     # Zentrale Exports
└── pipedrive/
    ├── client.ts               # API Client
    ├── oauth-service.ts        # OAuth Flow
    └── sync-service.ts         # Sync-Logik

src/app/api/integrations/pipedrive/
├── auth/route.ts               # OAuth starten
├── callback/route.ts           # OAuth Callback
├── status/route.ts             # Verbindungsstatus
├── disconnect/route.ts         # Trennen
├── fields/route.ts             # Pipedrive-Felder abrufen
├── field-mapping/route.ts      # Feld-Zuordnungen
├── sync/route.ts               # Sync starten
├── sync/history/route.ts       # Sync-Historie
└── sync-config/route.ts        # Sync-Einstellungen

src/components/admin/
└── PipedriveIntegration.tsx    # Admin UI Komponente
```

---

## Projektübersicht

Du baust eine Pipedrive-Integration für eine bestehende App. Die Integration soll:

1. **Organisationen** aus Pipedrive als **Kunden** in die App synchronisieren
2. **Personen** (Ansprechpartner) aus Pipedrive den jeweiligen Kunden zuordnen
3. **Custom Fields** der Organisationen mitsynchronisieren
4. Eine **tägliche automatische Synchronisation** sowie **manuelle Synchronisation** ermöglichen
5. **Pipedrive IDs** an Kunden und Ansprechpartnern speichern für wiederkehrende Synchronisierungen
6. Die Integration soll **erweiterbar** sein für zukünftige weitere Integrationen (z.B. Salesforce, HubSpot)

**Aktuelle Phase:** Nur Pipedrive → App (One-Way-Sync)
**Zukünftig geplant:** Bidirektionale Synchronisation

---

## 1. Pipedrive App Registrierung

### Developer Hub Setup

1. **Developer Sandbox Account** erstellen: https://developers.pipedrive.com/
2. In Pipedrive einloggen → **Profil Icon** → **Tools and Integrations** → **Developer Hub**
3. **"Create an app"** → **"Create private app"** auswählen (für interne Nutzung)

### App Konfiguration

```
App Name: [Dein App Name] Pipedrive Sync
OAuth Callback URL: https://[deine-domain.de]/api/integrations/pipedrive/callback
```

### Benötigte OAuth Scopes

```
- organizations:read     (Organisationen lesen)
- persons:read           (Personen/Ansprechpartner lesen)
- users:read             (Optional: Für Benutzerinformationen)
```

Nach dem Speichern erhältst du:
- **Client ID**
- **Client Secret**

Diese Werte sicher in Environment Variables speichern!

---

## 2. OAuth 2.0 Flow Implementation

### 2.1 Authorization URL

```
GET https://oauth.pipedrive.com/oauth/authorize
```

**Query Parameter:**
| Parameter | Required | Beschreibung |
|-----------|----------|--------------|
| client_id | Ja | Deine Client ID aus Developer Hub |
| redirect_uri | Ja | Deine Callback URL (muss exakt übereinstimmen!) |
| state | Empfohlen | CSRF-Token für Sicherheit |

**Beispiel:**
```
https://oauth.pipedrive.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://deine-domain.de/api/integrations/pipedrive/callback&state=random_csrf_token
```

### 2.2 Token Exchange (Callback)

Nach User-Autorisierung wird auf deine Callback URL redirected mit `?code=AUTH_CODE&state=STATE`

**Token Request:**
```
POST https://oauth.pipedrive.com/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)
```

**Body:**
```
grant_type=authorization_code
code=AUTH_CODE
redirect_uri=https://deine-domain.de/api/integrations/pipedrive/callback
```

**Response:**
```json
{
  "access_token": "v1u:...",
  "token_type": "bearer",
  "refresh_token": "v1r:...",
  "scope": "organizations:read,persons:read",
  "expires_in": 3600,
  "api_domain": "https://company-domain.pipedrive.com"
}
```

### 2.3 Token Refresh

Access Token läuft nach 60 Minuten ab. Refresh Token läuft nach 60 Tagen Inaktivität ab.

```
POST https://oauth.pipedrive.com/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)
```

**Body:**
```
grant_type=refresh_token
refresh_token=REFRESH_TOKEN
```

---

## 3. Pipedrive API Endpoints

### 3.1 Organisationen abrufen (API v2 - empfohlen)

```
GET https://{api_domain}/api/v2/organizations
Authorization: Bearer {access_token}
```

**Query Parameter:**
| Parameter | Beschreibung |
|-----------|--------------|
| limit | Max. Einträge (max 500, default 100) |
| cursor | Pagination cursor für nächste Seite |
| updated_since | Nur seit diesem Zeitpunkt aktualisierte (RFC3339: 2025-01-01T10:20:00Z) |
| updated_until | Nur bis zu diesem Zeitpunkt aktualisierte |
| include_fields | Zusätzliche Felder (z.B. `people_count,open_deals_count`) |
| custom_fields | Comma-separated Custom Field Keys |
| sort_by | `id`, `update_time`, `add_time` |
| sort_direction | `asc`, `desc` |

**Response Struktur:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Firma XYZ GmbH",
      "owner_id": 456,
      "address": {
        "street": "Musterstraße 1",
        "city": "Hamburg",
        "postal_code": "20095",
        "country": "Germany"
      },
      "add_time": "2024-01-15T10:30:00Z",
      "update_time": "2025-01-20T14:45:00Z",
      "visible_to": 3,
      "label_ids": [1, 2],
      "abc123def456...": "Custom Field Wert"
    }
  ],
  "additional_data": {
    "next_cursor": "eyJ..."
  }
}
```

### 3.2 Personen einer Organisation abrufen (API v2)

```
GET https://{api_domain}/api/v2/persons?org_id={organization_id}
Authorization: Bearer {access_token}
```

**Query Parameter:**
| Parameter | Beschreibung |
|-----------|--------------|
| org_id | Organisation ID (Filter) |
| limit | Max. Einträge (max 500) |
| cursor | Pagination cursor |
| updated_since | Nur seit diesem Zeitpunkt aktualisierte |
| include_fields | Zusätzliche Felder |
| custom_fields | Custom Field Keys |

**Response Struktur:**
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "name": "Max Mustermann",
      "org_id": 123,
      "owner_id": 456,
      "emails": [
        {"value": "max@firma.de", "primary": true, "label": "work"}
      ],
      "phones": [
        {"value": "+49 40 12345678", "primary": true, "label": "work"}
      ],
      "add_time": "2024-02-01T09:00:00Z",
      "update_time": "2025-01-18T11:30:00Z",
      "visible_to": 3,
      "label_ids": [3]
    }
  ],
  "additional_data": {
    "next_cursor": "eyJ..."
  }
}
```

### 3.3 Custom Fields Schema abrufen

Um Custom Field Keys zu verstehen:

```
GET https://{api_domain}/v1/organizationFields
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "key": "abc123def456ghi789...",
      "name": "Branche",
      "field_type": "enum",
      "options": [
        {"id": 1, "label": "IT"},
        {"id": 2, "label": "Handel"}
      ]
    },
    {
      "id": 12346,
      "key": "xyz789abc123...",
      "name": "Kundennummer",
      "field_type": "varchar"
    }
  ]
}
```

**Wichtig:** Custom Fields haben 40-Zeichen Hash-Keys, nicht lesbare Namen!

---

## 4. Datenbank Schema

### 4.1 Integration Connection Table

```sql
CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Integration Type (erweiterbar für andere Integrationen)
  integration_type VARCHAR(50) NOT NULL, -- 'pipedrive', 'salesforce', 'hubspot'
  
  -- OAuth Credentials (verschlüsselt speichern!)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Pipedrive-spezifisch
  api_domain VARCHAR(255), -- z.B. "https://company.pipedrive.com"
  company_id VARCHAR(100), -- Pipedrive Company ID
  company_name VARCHAR(255),
  
  -- Sync Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50), -- 'success', 'partial', 'failed'
  last_sync_error TEXT,
  
  -- Field Mapping Configuration (JSON)
  field_mapping JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, integration_type)
);
```

### 4.2 Kunden Tabelle (erweitern)

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pipedrive_id BIGINT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pipedrive_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_customers_pipedrive_id ON customers(pipedrive_id) WHERE pipedrive_id IS NOT NULL;
```

### 4.3 Ansprechpartner Tabelle (erweitern)

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pipedrive_id BIGINT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pipedrive_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_contacts_pipedrive_id ON contacts(pipedrive_id) WHERE pipedrive_id IS NOT NULL;
```

### 4.4 Sync Log Table

```sql
CREATE TABLE integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES integration_connections(id),
  
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  status VARCHAR(50) NOT NULL, -- 'running', 'success', 'partial', 'failed'
  
  -- Statistiken
  organizations_fetched INTEGER DEFAULT 0,
  organizations_created INTEGER DEFAULT 0,
  organizations_updated INTEGER DEFAULT 0,
  persons_fetched INTEGER DEFAULT 0,
  persons_created INTEGER DEFAULT 0,
  persons_updated INTEGER DEFAULT 0,
  
  errors JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Backend Architektur

### 5.1 Modulare Service-Struktur

```
/src
  /integrations
    /common
      IntegrationService.ts        # Base class für alle Integrationen
      TokenManager.ts              # Token Refresh Logic
      SyncScheduler.ts             # Cron Job Management
    /pipedrive
      PipedriveClient.ts           # API Client
      PipedriveOAuthService.ts     # OAuth Flow
      PipedriveSyncService.ts      # Sync Logic
      PipedriveFieldMapper.ts      # Field Mapping
      /types
        pipedrive.types.ts         # TypeScript Interfaces
    /salesforce                    # Später hinzufügen
    /hubspot                       # Später hinzufügen
```

### 5.2 TypeScript Interfaces

```typescript
// pipedrive.types.ts

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

export interface SyncConfig {
  syncCustomFields: boolean;
  customFieldMapping: Record<string, string>; // Pipedrive key -> App field
  syncPersons: boolean;
  incrementalSync: boolean; // Nur geänderte seit letztem Sync
}
```

### 5.3 API Endpoints

```typescript
// Routes für Pipedrive Integration

// OAuth Flow starten
GET  /api/integrations/pipedrive/auth
// → Redirect zu Pipedrive OAuth

// OAuth Callback
GET  /api/integrations/pipedrive/callback?code=...&state=...
// → Token Exchange, Connection speichern

// Connection Status
GET  /api/integrations/pipedrive/status
// → Aktuelle Verbindungsinfo

// Connection trennen
DELETE /api/integrations/pipedrive/disconnect

// Custom Fields abrufen (für Field Mapping UI)
GET  /api/integrations/pipedrive/fields
// → Liste der verfügbaren Pipedrive Fields

// Field Mapping speichern
PUT  /api/integrations/pipedrive/field-mapping
// Body: { mapping: {...} }

// Manuelle Synchronisation starten
POST /api/integrations/pipedrive/sync
// Body: { syncType: 'full' | 'incremental' }

// Sync Status/History
GET  /api/integrations/pipedrive/sync/history
// → Liste der letzten Syncs mit Status
```

---

## 6. Sync-Logik Implementation

### 6.1 Sync Service Pseudocode

```typescript
class PipedriveSyncService {
  
  async runSync(connectionId: string, syncType: 'full' | 'incremental' | 'manual') {
    const connection = await this.getConnection(connectionId);
    const log = await this.createSyncLog(connectionId, syncType);
    
    try {
      // 1. Token prüfen und ggf. refreshen
      const validToken = await this.tokenManager.ensureValidToken(connection);
      
      // 2. Custom Field Schema laden (für Mapping)
      const fieldSchema = await this.loadOrganizationFields(validToken);
      
      // 3. Organisationen synchronisieren
      let cursor: string | undefined;
      const updatedSince = syncType === 'incremental' 
        ? connection.last_sync_at 
        : undefined;
      
      do {
        const response = await this.fetchOrganizations(validToken, {
          cursor,
          updated_since: updatedSince,
          limit: 500
        });
        
        for (const org of response.data) {
          await this.syncOrganization(org, connection, fieldSchema);
          log.organizations_fetched++;
        }
        
        cursor = response.additional_data?.next_cursor;
      } while (cursor);
      
      // 4. Personen zu synchronisierten Organisationen laden
      if (connection.syncConfig.syncPersons) {
        await this.syncPersonsForCustomers(connection, log, updatedSince);
      }
      
      // 5. Sync abschließen
      await this.completeSyncLog(log, 'success');
      await this.updateConnectionLastSync(connection);
      
    } catch (error) {
      await this.completeSyncLog(log, 'failed', error);
      throw error;
    }
  }
  
  async syncOrganization(
    org: PipedriveOrganization, 
    connection: IntegrationConnection,
    fieldSchema: PipedriveOrganizationField[]
  ) {
    // Prüfen ob Kunde bereits existiert
    const existingCustomer = await this.findCustomerByPipedriveId(
      connection.tenant_id, 
      org.id
    );
    
    // Daten mappen
    const customerData = this.mapOrganizationToCustomer(org, connection.field_mapping, fieldSchema);
    
    if (existingCustomer) {
      // Update
      await this.updateCustomer(existingCustomer.id, customerData);
    } else {
      // Create
      await this.createCustomer({
        ...customerData,
        tenant_id: connection.tenant_id,
        pipedrive_id: org.id
      });
    }
  }
  
  mapOrganizationToCustomer(
    org: PipedriveOrganization,
    fieldMapping: Record<string, string>,
    fieldSchema: PipedriveOrganizationField[]
  ): Partial<Customer> {
    const customer: Partial<Customer> = {
      name: org.name,
      pipedrive_synced_at: new Date()
    };
    
    // Adresse mappen
    if (org.address) {
      customer.street = org.address.street;
      customer.city = org.address.city;
      customer.postal_code = org.address.postal_code;
      customer.country = org.address.country;
    }
    
    // Custom Fields mappen
    for (const [pipedriveKey, appField] of Object.entries(fieldMapping)) {
      if (org[pipedriveKey] !== undefined) {
        const field = fieldSchema.find(f => f.key === pipedriveKey);
        customer[appField] = this.transformFieldValue(org[pipedriveKey], field);
      }
    }
    
    return customer;
  }
}
```

### 6.2 Pagination Helper

```typescript
async function* paginateApi<T>(
  fetchFn: (cursor?: string) => Promise<PipedriveApiResponse<T[]>>,
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

// Verwendung:
for await (const org of paginateApi((cursor) => 
  client.getOrganizations({ cursor, limit: 500 })
)) {
  await processOrganization(org);
}
```

---

## 7. Scheduled Sync (Cron Job)

### 7.1 Täglicher Sync

```typescript
// Mit node-cron oder ähnlichem
import cron from 'node-cron';

// Täglich um 2:00 Uhr nachts
cron.schedule('0 2 * * *', async () => {
  const activeConnections = await getActiveIntegrationConnections('pipedrive');
  
  for (const connection of activeConnections) {
    try {
      await syncService.runSync(connection.id, 'incremental');
      console.log(`Sync completed for tenant ${connection.tenant_id}`);
    } catch (error) {
      console.error(`Sync failed for tenant ${connection.tenant_id}:`, error);
      await notifyAdmin(connection, error);
    }
  }
});
```

### 7.2 Queue-basierter Ansatz (für Skalierung)

```typescript
// Mit Bull oder ähnlicher Queue
import Queue from 'bull';

const syncQueue = new Queue('pipedrive-sync', redisConfig);

// Job Processor
syncQueue.process(async (job) => {
  const { connectionId, syncType } = job.data;
  await syncService.runSync(connectionId, syncType);
});

// Scheduler
cron.schedule('0 2 * * *', async () => {
  const connections = await getActiveIntegrationConnections('pipedrive');
  
  for (const connection of connections) {
    await syncQueue.add({
      connectionId: connection.id,
      syncType: 'incremental'
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }
    });
  }
});
```

---

## 8. Frontend Komponenten

### 8.1 Integration Settings Page

```
/settings/integrations
  └── PipedriveIntegration
        ├── ConnectionStatus (verbunden/getrennt)
        ├── ConnectButton → OAuth Flow starten
        ├── DisconnectButton
        ├── FieldMappingEditor
        │     ├── Pipedrive Fields Liste
        │     └── App Fields Dropdown Mapping
        ├── SyncSettings
        │     ├── Auto-Sync Toggle
        │     └── Sync-Zeit Auswahl
        ├── ManualSyncButton
        └── SyncHistory
              └── Liste der letzten Syncs mit Status
```

### 8.2 API Calls vom Frontend

```typescript
// Integration verbinden
const connectPipedrive = () => {
  window.location.href = '/api/integrations/pipedrive/auth';
};

// Status abrufen
const status = await fetch('/api/integrations/pipedrive/status').then(r => r.json());

// Trennen
await fetch('/api/integrations/pipedrive/disconnect', { method: 'DELETE' });

// Manuelle Sync
await fetch('/api/integrations/pipedrive/sync', {
  method: 'POST',
  body: JSON.stringify({ syncType: 'incremental' })
});
```

---

## 9. Error Handling & Monitoring

### 9.1 Retry-Logik für API Calls

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; delayMs: number }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Rate Limit? Warten und retry
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'] || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      
      // Token abgelaufen? Refresh und retry
      if (error.status === 401) {
        await refreshToken();
        continue;
      }
      
      // Andere Fehler: Exponential backoff
      if (attempt < options.maxRetries) {
        await sleep(options.delayMs * Math.pow(2, attempt));
      }
    }
  }
  
  throw lastError;
}
```

### 9.2 Rate Limiting beachten

Pipedrive hat Rate Limits basierend auf Plan:
- Die Zahlen in der API-Doku (z.B. "10") zeigen den "Cost" pro Request
- Limits werden pro Token gezählt

**Best Practices:**
- Bulk-Requests nutzen wo möglich
- Zwischen Requests kleine Pausen einbauen
- `429` Response Headers beachten

---

## 10. Security Checklist

- [ ] Access/Refresh Tokens verschlüsselt speichern (nicht plain text!)
- [ ] Client Secret niemals im Frontend exponieren
- [ ] State Parameter für CSRF-Schutz im OAuth Flow
- [ ] Callback URL validieren (muss exakt matchen)
- [ ] Token Refresh vor Ablauf implementieren
- [ ] Keine sensiblen Daten in Logs
- [ ] Rate Limiting für eigene API-Endpoints
- [ ] Tenant-Isolation sicherstellen (Multi-Tenancy)

---

## 11. Erweiterbarkeit für weitere Integrationen

### 11.1 Abstrakte Base Classes

```typescript
abstract class BaseIntegrationService {
  abstract connect(tenantId: string): Promise<string>; // Returns auth URL
  abstract handleCallback(code: string, state: string): Promise<Connection>;
  abstract disconnect(connectionId: string): Promise<void>;
  abstract sync(connectionId: string, type: SyncType): Promise<SyncResult>;
  abstract getFieldSchema(): Promise<FieldSchema[]>;
}

class PipedriveIntegrationService extends BaseIntegrationService {
  // Pipedrive-spezifische Implementation
}

// Später:
class SalesforceIntegrationService extends BaseIntegrationService {
  // Salesforce-spezifische Implementation
}
```

### 11.2 Integration Registry

```typescript
const integrations: Record<string, BaseIntegrationService> = {
  pipedrive: new PipedriveIntegrationService(),
  // salesforce: new SalesforceIntegrationService(),
  // hubspot: new HubspotIntegrationService(),
};

// Dynamischer Zugriff
const service = integrations[integrationType];
await service.sync(connectionId, 'incremental');
```

---

## 12. Test-Szenarien

1. **OAuth Flow:** Verbindung herstellen und Token speichern
2. **Token Refresh:** Automatischer Refresh bei abgelaufenem Token
3. **Full Sync:** Alle Organisationen und Personen synchronisieren
4. **Incremental Sync:** Nur geänderte Daten seit letztem Sync
5. **Error Recovery:** Verhalten bei API-Fehlern, Netzwerkproblemen
6. **Duplicate Handling:** Gleiche Organisation wird nicht doppelt angelegt
7. **Field Mapping:** Custom Fields korrekt übertragen
8. **Disconnect:** Verbindung trennen, Tokens löschen

---

## Zusammenfassung für den Entwickler

**Starte mit:**
1. Pipedrive Developer Account + App registrieren
2. Datenbank Schema erweitern (Tabellen anlegen)
3. OAuth Flow implementieren
4. API Client für Pipedrive bauen
5. Sync Service entwickeln
6. Cron Job für täglichen Sync einrichten
7. Frontend für Einstellungen bauen

**Beachte:**
- Pipedrive API v2 für Organizations/Persons nutzen (v1 deprecated)
- Custom Fields haben 40-Zeichen Hash-Keys
- Cursor-Pagination für große Datenmengen
- Token Refresh alle 60 Minuten nötig
- Refresh Token erneuert sich bei jedem Refresh (60 Tage Gültigkeit)
