'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Link2,
  Link2Off,
  RefreshCw,
  Settings2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Users,
  ArrowRight,
  History,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  User,
  Plus,
  RefreshCcw,
  Trash2,
  GripVertical,
  Combine,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ConnectionStatus {
  connected: boolean;
  companyName?: string;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  isActive?: boolean;
}

interface IntegrationConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isEnabled: boolean;
  hasEnvConfig: boolean;
  defaultRedirectUri?: string;
}

interface CompositeFieldEntry {
  appField: string;
  sourceFields: {
    key: string;
    order: number;
  }[];
  separator?: string;
}

interface AdvancedFieldMapping {
  simple: Record<string, string>;
  composite: CompositeFieldEntry[];
}

interface SyncConfig {
  syncCustomFields: boolean;
  customFieldMapping: Record<string, string>;
  advancedFieldMapping?: AdvancedFieldMapping;
  advancedPersonFieldMapping?: AdvancedFieldMapping;
  syncPersons: boolean;
  incrementalSync: boolean;
  autoSyncEnabled: boolean;
  autoSyncTime: string;
}

interface SyncLog {
  id: string;
  syncType: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  organizationsFetched: number;
  organizationsCreated: number;
  organizationsUpdated: number;
  personsFetched: number;
  personsCreated: number;
  personsUpdated: number;
  errors: Array<{ error: string }>;
}

interface SyncedCustomer {
  id: string;
  name: string;
  pipedriveId: string;
  pipedriveSyncedAt: string;
  mainContact?: string;
  city?: string;
  action: 'created' | 'updated';
}

interface SyncedContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  pipedriveId: string;
  pipedriveSyncedAt: string;
  action: 'created' | 'updated';
  customer?: {
    id: string;
    name: string;
  };
}

interface SyncDetails {
  syncLog: SyncLog;
  customers: SyncedCustomer[];
  contacts: SyncedContact[];
}

interface PipedriveField {
  id: number;
  key: string;
  name: string;
  field_type: string;
}

// Basis-Felder für Kunden (direkt auf Customer-Modell)
const BASE_CUSTOMER_FIELDS = [
  { key: 'mainContact', label: 'Hauptansprechpartner (Basis)', category: 'Basis' },
  { key: 'info', label: 'Zusatzinformationen', category: 'Basis' },
  { key: 'street', label: 'Straße', category: 'Adresse' },
  { key: 'city', label: 'Stadt', category: 'Adresse' },
  { key: 'postalCode', label: 'PLZ', category: 'Adresse' },
  { key: 'country', label: 'Land', category: 'Adresse' },
];

// Hilfsfunktion: Lädt alle Kundenfelder aus dem Schema
function loadAllCustomerFields(): { key: string; label: string; category: string }[] {
  // Basis-Felder
  const allFields = [...BASE_CUSTOMER_FIELDS];
  
  // Lade Schema aus localStorage
  const STORAGE_KEY = 'taskwise:customerProfileSchema';
  let schemaFields: any[] = [];
  
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        schemaFields = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading customer profile schema:', e);
    }
  }
  
  // Default Sections für Kategorisierung
  const DEFAULT_SECTIONS: Record<string, string> = {
    'basis': 'Steckbrief',
    'keyfacts': 'Key Facts',
    'documents': 'Dokumente',
  };
  
  // Konvertiere Schema-Felder zu Mapping-Feldern
  for (const field of schemaFields) {
    // Überspringe Contact-Felder (werden separat gemappt)
    if (field.type === 'contact') continue;
    
    // Bestimme die Kategorie
    let category = 'Steckbrief';
    if (field.sectionId) {
      category = DEFAULT_SECTIONS[field.sectionId] || field.sectionId;
    }
    
    // Erstelle den Pfad für das Feld
    const key = `profile.${field.key}`;
    
    allFields.push({
      key,
      label: field.label,
      category,
    });
  }
  
  // Falls keine Schema-Felder vorhanden, füge Standard-Felder hinzu
  if (schemaFields.length === 0) {
    // Standard Steckbrief-Felder
    const defaultSteckbriefFields = [
      { key: 'profile.firm', label: 'Firmierung', category: 'Steckbrief' },
      { key: 'profile.accountManager', label: 'PM / Kundenberater', category: 'Steckbrief' },
      { key: 'profile.erp', label: 'Warenwirtschaft', category: 'Steckbrief' },
      { key: 'profile.branchCount', label: 'Anzahl Filialen', category: 'Steckbrief' },
      { key: 'profile.initialBranches', label: 'Startfilialen', category: 'Steckbrief' },
      { key: 'profile.countryRegion', label: 'Land / Bundesland / Kanton', category: 'Steckbrief' },
      { key: 'profile.accessCredentials', label: 'Zugangsdaten (WaWi/TeamViewer etc.)', category: 'Steckbrief' },
      { key: 'profile.customerStatus', label: 'Kundenstatus', category: 'Steckbrief' },
      { key: 'profile.productCategories', label: 'Produkte/Module', category: 'Steckbrief' },
    ];
    
    const defaultKeyFactsFields = [
      { key: 'profile.keyFacts.general', label: 'Allgemeine Key Facts', category: 'Key Facts' },
      { key: 'profile.keyFacts.branches', label: 'Filial-Infos (Wochenende/Feiertage)', category: 'Key Facts' },
      { key: 'profile.keyFacts.returns', label: 'Retouren', category: 'Key Facts' },
      { key: 'profile.keyFacts.backplan', label: 'BackPlan – Berechnungstyp & Begründung', category: 'Key Facts' },
      { key: 'profile.keyFacts.assortment', label: 'Warengruppen / Artikel', category: 'Key Facts' },
      { key: 'profile.keyFacts.cakeplan', label: 'Kuchenplan / Saisonartikel', category: 'Key Facts' },
      { key: 'profile.keyFacts.special', label: 'Weitere Besonderheiten', category: 'Key Facts' },
    ];
    
    const defaultDocumentsFields = [
      { key: 'profile.documents.assortmentExcel', label: 'Warengruppen-Excel', category: 'Dokumente' },
      { key: 'profile.documents.transferPlan', label: 'Übertragungsplan', category: 'Dokumente' },
      { key: 'profile.documents.samples', label: 'Beispieldokumente', category: 'Dokumente' },
    ];
    
    allFields.push(...defaultSteckbriefFields, ...defaultKeyFactsFields, ...defaultDocumentsFields);
  }
  
  return allFields;
}

// Felder für Kontakte/Ansprechpartner - Alle verfügbaren Felder
const APP_CONTACT_FIELDS = [
  // Basis-Felder (direkt auf Contact-Modell)
  { key: 'firstName', label: 'Vorname', category: 'Basis' },
  { key: 'lastName', label: 'Nachname', category: 'Basis' },
  { key: 'name', label: 'Vollständiger Name', category: 'Basis' },
  { key: 'email', label: 'E-Mail', category: 'Basis' },
  { key: 'phone', label: 'Telefon', category: 'Basis' },
  { key: 'position', label: 'Position/Jobtitel', category: 'Basis' },
  
  // Erweiterte Felder (in metadata gespeichert)
  { key: 'metadata.department', label: 'Abteilung', category: 'Erweitert' },
  { key: 'metadata.notes', label: 'Notizen', category: 'Erweitert' },
  { key: 'metadata.contactFor', label: 'Zuständig für (AP für:)', category: 'Erweitert' },
  { key: 'metadata.salutation', label: 'Anrede', category: 'Erweitert' },
  { key: 'metadata.title', label: 'Titel (Dr., Prof., etc.)', category: 'Erweitert' },
  { key: 'metadata.mobile', label: 'Mobiltelefon', category: 'Erweitert' },
  { key: 'metadata.fax', label: 'Fax', category: 'Erweitert' },
  { key: 'metadata.website', label: 'Website', category: 'Erweitert' },
  { key: 'metadata.linkedIn', label: 'LinkedIn', category: 'Erweitert' },
  { key: 'metadata.xing', label: 'XING', category: 'Erweitert' },
  { key: 'metadata.birthday', label: 'Geburtstag', category: 'Erweitert' },
  
  // Adress-Felder
  { key: 'metadata.street', label: 'Straße', category: 'Adresse' },
  { key: 'metadata.city', label: 'Stadt', category: 'Adresse' },
  { key: 'metadata.postalCode', label: 'PLZ', category: 'Adresse' },
  { key: 'metadata.country', label: 'Land', category: 'Adresse' },
  
  // Benutzerdefinierte Felder
  { key: 'metadata.custom1', label: 'Benutzerdefiniert 1', category: 'Benutzerdefiniert' },
  { key: 'metadata.custom2', label: 'Benutzerdefiniert 2', category: 'Benutzerdefiniert' },
  { key: 'metadata.custom3', label: 'Benutzerdefiniert 3', category: 'Benutzerdefiniert' },
  { key: 'metadata.custom4', label: 'Benutzerdefiniert 4', category: 'Benutzerdefiniert' },
  { key: 'metadata.custom5', label: 'Benutzerdefiniert 5', category: 'Benutzerdefiniert' },
];

export default function PipedriveIntegration() {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [fields, setFields] = useState<{ organizationFields: PipedriveField[]; personFields: PipedriveField[] } | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [personFieldMapping, setPersonFieldMapping] = useState<Record<string, string>>({});
  const [compositeFieldMapping, setCompositeFieldMapping] = useState<CompositeFieldEntry[]>([]);
  const [compositePersonFieldMapping, setCompositePersonFieldMapping] = useState<CompositeFieldEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [fieldMappingTab, setFieldMappingTab] = useState<'organizations' | 'persons'>('organizations');
  const [fieldMappingMode, setFieldMappingMode] = useState<'simple' | 'composite'>('simple');
  
  // Sync Details State
  const [expandedSyncId, setExpandedSyncId] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<SyncDetails | null>(null);
  const [loadingSyncDetails, setLoadingSyncDetails] = useState(false);
  
  // Dynamisch geladene Kundenfelder aus dem Steckbrief-Schema
  const [appCustomerFields, setAppCustomerFields] = useState<{ key: string; label: string; category: string }[]>([]);
  
  // Lade Kundenfelder beim Mount
  useEffect(() => {
    setAppCustomerFields(loadAllCustomerFields());
  }, []);
  
  // Configuration state
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch integration configuration
      const configRes = await fetch('/api/integrations/pipedrive/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setIntegrationConfig(configData);
        setConfigForm({
          clientId: configData.clientId || '',
          clientSecret: '',
          redirectUri: configData.redirectUri || configData.defaultRedirectUri || '',
        });
      }

      // Fetch connection status
      const statusRes = await fetch('/api/integrations/pipedrive/status');
      const statusData = await statusRes.json();
      setStatus(statusData);

      if (statusData.connected) {
        // Fetch sync config
        const configRes = await fetch('/api/integrations/pipedrive/sync-config');
        if (configRes.ok) {
          const configData = await configRes.json();
          setSyncConfig(configData);
        }

        // Fetch field mapping (organization and person)
        const mappingRes = await fetch('/api/integrations/pipedrive/field-mapping');
        if (mappingRes.ok) {
          const mappingData = await mappingRes.json();
          // Simple mappings
          setFieldMapping(mappingData.advancedMapping?.simple || mappingData.organizationMapping || mappingData.mapping || {});
          setPersonFieldMapping(mappingData.advancedPersonMapping?.simple || mappingData.personMapping || {});
          // Composite mappings
          setCompositeFieldMapping(mappingData.advancedMapping?.composite || []);
          setCompositePersonFieldMapping(mappingData.advancedPersonMapping?.composite || []);
        }

        // Fetch Pipedrive fields
        const fieldsRes = await fetch('/api/integrations/pipedrive/fields');
        if (fieldsRes.ok) {
          const fieldsData = await fieldsRes.json();
          setFields(fieldsData);
        }

        // Fetch sync history
        const historyRes = await fetch('/api/integrations/pipedrive/sync/history?limit=5');
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setSyncHistory(historyData.logs);
        }
      }
    } catch (error) {
      console.error('Error fetching Pipedrive data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save configuration
  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);

      const res = await fetch('/api/integrations/pipedrive/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: configForm.clientId,
          clientSecret: configForm.clientSecret,
          redirectUri: configForm.redirectUri || undefined,
          isEnabled: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Konfiguration konnte nicht gespeichert werden');
      }

      toast({
        title: 'Gespeichert',
        description: 'Pipedrive-Konfiguration wurde gespeichert.',
      });

      // Refresh data
      await fetchData();
      setShowConfig(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Connect to Pipedrive
  const handleConnect = () => {
    window.location.href = '/api/integrations/pipedrive/auth';
  };

  // Disconnect from Pipedrive
  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/integrations/pipedrive/disconnect', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Trennen fehlgeschlagen');
      }

      setStatus({ connected: false });
      setSyncConfig(null);
      setFields(null);
      setSyncHistory([]);
      setFieldMapping({});
      setPersonFieldMapping({});

      toast({
        title: 'Getrennt',
        description: 'Pipedrive-Integration wurde getrennt.',
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Integration konnte nicht getrennt werden.',
        variant: 'destructive',
      });
    }
  };

  // Run sync
  const handleSync = async (syncType: 'full' | 'incremental') => {
    try {
      setIsSyncing(true);

      const res = await fetch('/api/integrations/pipedrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync fehlgeschlagen');
      }

      toast({
        title: 'Synchronisation abgeschlossen',
        description: `${data.statistics.organizations.created} Kunden erstellt, ${data.statistics.organizations.updated} aktualisiert.`,
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      toast({
        title: 'Sync-Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Update sync config
  const handleUpdateSyncConfig = async (updates: Partial<SyncConfig>) => {
    try {
      const newConfig = { ...syncConfig, ...updates };
      
      const res = await fetch('/api/integrations/pipedrive/sync-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Konfiguration konnte nicht gespeichert werden');
      }

      setSyncConfig(newConfig as SyncConfig);
      
      toast({
        title: 'Gespeichert',
        description: 'Einstellungen wurden aktualisiert.',
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  // Update field mapping (both organization and person)
  const handleSaveFieldMapping = async () => {
    try {
      const res = await fetch('/api/integrations/pipedrive/field-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationMapping: fieldMapping,
          personMapping: personFieldMapping,
          advancedMapping: {
            simple: fieldMapping,
            composite: compositeFieldMapping,
          },
          advancedPersonMapping: {
            simple: personFieldMapping,
            composite: compositePersonFieldMapping,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Mapping konnte nicht gespeichert werden');
      }

      toast({
        title: 'Gespeichert',
        description: 'Feld-Zuordnungen wurden aktualisiert.',
      });
      
      setShowFieldMapping(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Feld-Zuordnungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  // Add a new composite field mapping
  const handleAddCompositeMapping = (isOrganization: boolean) => {
    const newEntry: CompositeFieldEntry = {
      appField: '',
      sourceFields: [],
      separator: ' ',
    };
    
    if (isOrganization) {
      setCompositeFieldMapping([...compositeFieldMapping, newEntry]);
    } else {
      setCompositePersonFieldMapping([...compositePersonFieldMapping, newEntry]);
    }
  };

  // Update a composite field mapping
  const handleUpdateCompositeMapping = (
    index: number, 
    updates: Partial<CompositeFieldEntry>,
    isOrganization: boolean
  ) => {
    if (isOrganization) {
      const updated = [...compositeFieldMapping];
      updated[index] = { ...updated[index], ...updates };
      setCompositeFieldMapping(updated);
    } else {
      const updated = [...compositePersonFieldMapping];
      updated[index] = { ...updated[index], ...updates };
      setCompositePersonFieldMapping(updated);
    }
  };

  // Remove a composite field mapping
  const handleRemoveCompositeMapping = (index: number, isOrganization: boolean) => {
    if (isOrganization) {
      setCompositeFieldMapping(compositeFieldMapping.filter((_, i) => i !== index));
    } else {
      setCompositePersonFieldMapping(compositePersonFieldMapping.filter((_, i) => i !== index));
    }
  };

  // Add source field to composite mapping
  const handleAddSourceField = (compositeIndex: number, pipedriveKey: string, isOrganization: boolean) => {
    const mapping = isOrganization ? compositeFieldMapping : compositePersonFieldMapping;
    const composite = mapping[compositeIndex];
    
    // Check if already added
    if (composite.sourceFields.some(sf => sf.key === pipedriveKey)) return;
    
    const newSourceField = {
      key: pipedriveKey,
      order: composite.sourceFields.length,
    };
    
    handleUpdateCompositeMapping(
      compositeIndex, 
      { sourceFields: [...composite.sourceFields, newSourceField] },
      isOrganization
    );
  };

  // Remove source field from composite mapping
  const handleRemoveSourceField = (compositeIndex: number, sourceFieldKey: string, isOrganization: boolean) => {
    const mapping = isOrganization ? compositeFieldMapping : compositePersonFieldMapping;
    const composite = mapping[compositeIndex];
    
    const updatedSourceFields = composite.sourceFields
      .filter(sf => sf.key !== sourceFieldKey)
      .map((sf, idx) => ({ ...sf, order: idx })); // Reorder
    
    handleUpdateCompositeMapping(
      compositeIndex, 
      { sourceFields: updatedSourceFields },
      isOrganization
    );
  };

  // Move source field up/down in order
  const handleMoveSourceField = (
    compositeIndex: number, 
    sourceFieldKey: string, 
    direction: 'up' | 'down',
    isOrganization: boolean
  ) => {
    const mapping = isOrganization ? compositeFieldMapping : compositePersonFieldMapping;
    const composite = mapping[compositeIndex];
    
    const currentIndex = composite.sourceFields.findIndex(sf => sf.key === sourceFieldKey);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= composite.sourceFields.length) return;
    
    const updatedSourceFields = [...composite.sourceFields];
    [updatedSourceFields[currentIndex], updatedSourceFields[newIndex]] = 
      [updatedSourceFields[newIndex], updatedSourceFields[currentIndex]];
    
    // Update order values
    updatedSourceFields.forEach((sf, idx) => { sf.order = idx; });
    
    handleUpdateCompositeMapping(
      compositeIndex, 
      { sourceFields: updatedSourceFields },
      isOrganization
    );
  };

  // Load sync details
  const loadSyncDetails = async (syncLogId: string) => {
    if (expandedSyncId === syncLogId) {
      // Collapse if already expanded
      setExpandedSyncId(null);
      setSyncDetails(null);
      return;
    }

    try {
      setLoadingSyncDetails(true);
      setExpandedSyncId(syncLogId);

      const res = await fetch(`/api/integrations/pipedrive/sync/${syncLogId}`);
      if (!res.ok) {
        throw new Error('Failed to load sync details');
      }

      const data = await res.json();
      setSyncDetails(data);
    } catch (error) {
      console.error('Error loading sync details:', error);
      toast({
        title: 'Fehler',
        description: 'Sync-Details konnten nicht geladen werden.',
        variant: 'destructive',
      });
      setExpandedSyncId(null);
    } finally {
      setLoadingSyncDetails(false);
    }
  };

  // Status badge helper
  const getStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Erfolgreich</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Teilweise</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Fehlgeschlagen</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Läuft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <CardTitle>Pipedrive</CardTitle>
                <CardDescription>
                  Synchronisiere Organisationen als Kunden und Personen als Ansprechpartner
                </CardDescription>
              </div>
            </div>
            {status?.connected ? (
              <Badge className="bg-green-100 text-green-800">
                <Link2 className="h-3 w-3 mr-1" />
                Verbunden
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">
                <Link2Off className="h-3 w-3 mr-1" />
                Nicht verbunden
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!status?.connected ? (
            <div className="space-y-6">
              {/* Configuration Section */}
              {(!integrationConfig?.isEnabled && !integrationConfig?.hasEnvConfig) || showConfig ? (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Settings2 className="h-5 w-5 mr-2" />
                      Pipedrive-Konfiguration
                    </CardTitle>
                    <CardDescription>
                      Geben Sie Ihre Pipedrive OAuth-Credentials ein. Diese erhalten Sie im{' '}
                      <a 
                        href="https://developers.pipedrive.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Pipedrive Developer Hub
                      </a>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Client ID *</Label>
                        <Input
                          id="clientId"
                          placeholder="Ihre Pipedrive Client ID"
                          value={configForm.clientId}
                          onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientSecret">Client Secret *</Label>
                        <Input
                          id="clientSecret"
                          type="password"
                          placeholder={integrationConfig?.clientSecret || 'Ihr Pipedrive Client Secret'}
                          value={configForm.clientSecret}
                          onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                        />
                        {integrationConfig?.clientSecret && (
                          <p className="text-xs text-gray-500">Leer lassen, um den bestehenden Wert zu behalten</p>
                        )}
                      </div>
                    </div>
<div className="space-y-2">
                        <Label htmlFor="redirectUri">Redirect URI (Callback URL)</Label>
                        <Input
                          id="redirectUri"
                          placeholder="Callback URL für Pipedrive OAuth"
                          value={configForm.redirectUri || integrationConfig?.defaultRedirectUri || ''}
                          onChange={(e) => setConfigForm({ ...configForm, redirectUri: e.target.value })}
                        />
                      <p className="text-xs text-gray-500">
                        Diese URL muss exakt in Ihrer Pipedrive-App konfiguriert sein.
                        {integrationConfig?.defaultRedirectUri && (
                          <><br/>Standard: <code className="bg-gray-100 px-1 rounded">{integrationConfig.defaultRedirectUri}</code></>
                        )}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      {showConfig && (
                        <Button variant="outline" onClick={() => setShowConfig(false)}>
                          Abbrechen
                        </Button>
                      )}
                      <Button 
                        onClick={handleSaveConfig} 
                        disabled={!configForm.clientId || (!configForm.clientSecret && !integrationConfig?.clientSecret) || isSavingConfig}
                      >
                        {isSavingConfig ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Konfiguration speichern
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Connect Section */}
              {(integrationConfig?.isEnabled || integrationConfig?.hasEnvConfig) && !showConfig && (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Link2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Mit Pipedrive verbinden</h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Verbinden Sie Ihren Pipedrive-Account, um Organisationen und Personen automatisch zu synchronisieren.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button onClick={handleConnect}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Jetzt verbinden
                    </Button>
                    <Button variant="outline" onClick={() => setShowConfig(true)}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      Konfiguration ändern
                    </Button>
                  </div>
                  {integrationConfig?.hasEnvConfig && (
                    <p className="text-xs text-gray-500 mt-4">
                      Konfiguration aus Umgebungsvariablen erkannt
                    </p>
                  )}
                </div>
              )}

              {/* Initial Setup - No config at all */}
              {!integrationConfig?.isEnabled && !integrationConfig?.hasEnvConfig && !showConfig && (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Settings2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Pipedrive einrichten</h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Konfigurieren Sie zuerst Ihre Pipedrive OAuth-Credentials, um die Integration zu nutzen.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connection Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Unternehmen</span>
                  </div>
                  <p className="font-medium">{status.companyName || 'Unbekannt'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Letzter Sync</span>
                  </div>
                  <p className="font-medium">
                    {status.lastSyncAt
                      ? formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true, locale: de })
                      : 'Noch nie'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Status</span>
                  </div>
                  {getStatusBadge(status.lastSyncStatus)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleSync('incremental')}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Jetzt synchronisieren
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSync('full')}
                  disabled={isSyncing}
                >
                  Vollständiger Sync
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFieldMapping(!showFieldMapping)}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Feld-Zuordnungen
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      <Link2Off className="h-4 w-4 mr-2" />
                      Trennen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Pipedrive trennen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Die Verbindung zu Pipedrive wird getrennt. Bereits synchronisierte Daten bleiben erhalten.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                        Trennen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      {status?.connected && syncConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="h-5 w-5 mr-2" />
              Synchronisations-Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ansprechpartner synchronisieren</Label>
                <p className="text-sm text-gray-600">Personen als Kontakte zu Kunden synchronisieren</p>
              </div>
              <Switch
                checked={syncConfig.syncPersons}
                onCheckedChange={(checked) => handleUpdateSyncConfig({ syncPersons: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Custom Fields synchronisieren</Label>
                <p className="text-sm text-gray-600">Benutzerdefinierte Felder aus Pipedrive übernehmen</p>
              </div>
              <Switch
                checked={syncConfig.syncCustomFields}
                onCheckedChange={(checked) => handleUpdateSyncConfig({ syncCustomFields: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Inkrementeller Sync</Label>
                <p className="text-sm text-gray-600">Nur geänderte Daten seit dem letzten Sync übertragen</p>
              </div>
              <Switch
                checked={syncConfig.incrementalSync}
                onCheckedChange={(checked) => handleUpdateSyncConfig({ incrementalSync: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Automatischer täglicher Sync</Label>
                <p className="text-sm text-gray-600">Automatische Synchronisation um {syncConfig.autoSyncTime || '02:00'} Uhr</p>
              </div>
              <div className="flex items-center space-x-3">
                {syncConfig.autoSyncEnabled && (
                  <Input
                    type="time"
                    value={syncConfig.autoSyncTime || '02:00'}
                    onChange={(e) => handleUpdateSyncConfig({ autoSyncTime: e.target.value })}
                    className="w-24"
                  />
                )}
                <Switch
                  checked={syncConfig.autoSyncEnabled}
                  onCheckedChange={(checked) => handleUpdateSyncConfig({ autoSyncEnabled: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Mapping */}
      {status?.connected && showFieldMapping && fields && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feld-Zuordnungen</CardTitle>
              <Button onClick={handleSaveFieldMapping}>Speichern</Button>
            </div>
            <CardDescription>
              Ordnen Sie Pipedrive-Felder den App-Feldern zu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs for Organization and Person Field Mapping */}
            <div className="flex border-b">
              <button
                onClick={() => setFieldMappingTab('organizations')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  fieldMappingTab === 'organizations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="h-4 w-4 inline-block mr-2" />
                Organisationen → Kunden
              </button>
              <button
                onClick={() => setFieldMappingTab('persons')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  fieldMappingTab === 'persons'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="h-4 w-4 inline-block mr-2" />
                Personen → Ansprechpartner
              </button>
            </div>

            {/* Mode Toggle: Simple vs Composite */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setFieldMappingMode('simple')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    fieldMappingMode === 'simple'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ArrowRight className="h-4 w-4 inline-block mr-1" />
                  Einfache Zuordnung
                </button>
                <button
                  onClick={() => setFieldMappingMode('composite')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    fieldMappingMode === 'composite'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Combine className="h-4 w-4 inline-block mr-1" />
                  Zusammengesetzte Felder
                </button>
              </div>
              {fieldMappingMode === 'composite' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddCompositeMapping(fieldMappingTab === 'organizations')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Neue Zusammenführung
                </Button>
              )}
            </div>

            {fieldMappingMode === 'composite' && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Zusammengesetzte Felder:</strong> Kombinieren Sie mehrere Pipedrive-Felder zu einem App-Feld.
                Ideal für z.B. Straßenname + Hausnummer → Straße.
              </div>
            )}

            {/* Organization Field Mapping - Simple Mode */}
            {fieldMappingTab === 'organizations' && fieldMappingMode === 'simple' && (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pipedrive-Feld (Organisation)</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>App-Feld (Kunde)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.organizationFields
                      .filter(f => !['id', 'name', 'add_time', 'update_time', 'visible_to'].includes(f.key))
                      .map((field) => (
                        <TableRow key={field.key}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{field.name}</p>
                              <p className="text-xs text-gray-500">{field.field_type} • {field.key.substring(0, 20)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={fieldMapping[field.key] || ''}
                              onValueChange={(value) => {
                                if (value === '_none_') {
                                  const newMapping = { ...fieldMapping };
                                  delete newMapping[field.key];
                                  setFieldMapping(newMapping);
                                } else {
                                  setFieldMapping({ ...fieldMapping, [field.key]: value });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Nicht zugeordnet" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none_">Nicht zugeordnet</SelectItem>
                                {/* Gruppierte Felder nach Kategorie - dynamisch aus Schema */}
                                {(() => {
                                  // Extrahiere alle einzigartigen Kategorien in gewünschter Reihenfolge
                                  const categoryOrder = ['Basis', 'Adresse', 'Steckbrief', 'Key Facts', 'Dokumente'];
                                  const allCategories = [...new Set(appCustomerFields.map(f => f.category))];
                                  const sortedCategories = [
                                    ...categoryOrder.filter(c => allCategories.includes(c)),
                                    ...allCategories.filter(c => !categoryOrder.includes(c))
                                  ];
                                  
                                  return sortedCategories.map((category) => {
                                    const categoryFields = appCustomerFields.filter(f => f.category === category);
                                    if (categoryFields.length === 0) return null;
                                    return (
                                      <React.Fragment key={category}>
                                        <SelectItem value={`_header_${category}`} disabled className="font-semibold text-gray-900 bg-gray-100">
                                          — {category} —
                                        </SelectItem>
                                        {categoryFields.map((appField) => (
                                          <SelectItem key={appField.key} value={appField.key}>
                                            {appField.label}
                                          </SelectItem>
                                        ))}
                                      </React.Fragment>
                                    );
                                  });
                                })()}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Organization Field Mapping - Composite Mode */}
            {fieldMappingTab === 'organizations' && fieldMappingMode === 'composite' && (
              <div className="space-y-4">
                {compositeFieldMapping.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <Combine className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Keine zusammengesetzten Felder konfiguriert.</p>
                    <p className="text-sm">Klicken Sie auf "Neue Zusammenführung" um zu beginnen.</p>
                  </div>
                ) : (
                  compositeFieldMapping.map((composite, compositeIdx) => (
                    <Card key={compositeIdx} className="border-2 border-blue-100">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Target App Field */}
                            <div className="flex items-center space-x-3">
                              <Label className="w-24 text-right flex-shrink-0">Zielfeld:</Label>
                              <Select
                                value={composite.appField || ''}
                                onValueChange={(value) => handleUpdateCompositeMapping(
                                  compositeIdx, 
                                  { appField: value },
                                  true
                                )}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="App-Feld auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const categoryOrder = ['Basis', 'Adresse', 'Steckbrief', 'Key Facts', 'Dokumente'];
                                    const allCategories = [...new Set(appCustomerFields.map(f => f.category))];
                                    const sortedCategories = [
                                      ...categoryOrder.filter(c => allCategories.includes(c)),
                                      ...allCategories.filter(c => !categoryOrder.includes(c))
                                    ];
                                    
                                    return sortedCategories.map((category) => {
                                      const categoryFields = appCustomerFields.filter(f => f.category === category);
                                      if (categoryFields.length === 0) return null;
                                      return (
                                        <React.Fragment key={category}>
                                          <SelectItem value={`_header_${category}`} disabled className="font-semibold text-gray-900 bg-gray-100">
                                            — {category} —
                                          </SelectItem>
                                          {categoryFields.map((appField) => (
                                            <SelectItem key={appField.key} value={appField.key}>
                                              {appField.label}
                                            </SelectItem>
                                          ))}
                                        </React.Fragment>
                                      );
                                    });
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Separator */}
                            <div className="flex items-center space-x-3">
                              <Label className="w-24 text-right flex-shrink-0">Trennzeichen:</Label>
                              <Input
                                value={composite.separator ?? ' '}
                                onChange={(e) => handleUpdateCompositeMapping(
                                  compositeIdx, 
                                  { separator: e.target.value },
                                  true
                                )}
                                className="w-24"
                                placeholder="Leerzeichen"
                              />
                              <span className="text-xs text-gray-500">
                                (Leerzeichen = Standard, leer = direkt verbinden)
                              </span>
                            </div>

                            {/* Source Fields */}
                            <div className="flex items-start space-x-3">
                              <Label className="w-24 text-right flex-shrink-0 pt-2">Quellfelder:</Label>
                              <div className="flex-1 space-y-2">
                                {composite.sourceFields.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">
                                    Noch keine Quellfelder ausgewählt
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {[...composite.sourceFields]
                                      .sort((a, b) => a.order - b.order)
                                      .map((source, idx) => {
                                        const fieldInfo = fields?.organizationFields.find(f => f.key === source.key);
                                        return (
                                          <div 
                                            key={source.key} 
                                            className="flex items-center space-x-2 bg-gray-50 p-2 rounded"
                                          >
                                            <GripVertical className="h-4 w-4 text-gray-400" />
                                            <Badge variant="outline" className="flex-1">
                                              <span className="font-mono text-xs mr-2">{idx + 1}.</span>
                                              {fieldInfo?.name || source.key}
                                            </Badge>
                                            <div className="flex items-center space-x-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveSourceField(compositeIdx, source.key, 'up', true)}
                                              >
                                                <ChevronUp className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                disabled={idx === composite.sourceFields.length - 1}
                                                onClick={() => handleMoveSourceField(compositeIdx, source.key, 'down', true)}
                                              >
                                                <ChevronDown className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                onClick={() => handleRemoveSourceField(compositeIdx, source.key, true)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}

                                {/* Add source field */}
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && value !== '_none_') {
                                      handleAddSourceField(compositeIdx, value, true);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="+ Pipedrive-Feld hinzufügen..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fields?.organizationFields
                                      .filter(f => !['id', 'name', 'add_time', 'update_time', 'visible_to'].includes(f.key))
                                      .filter(f => !composite.sourceFields.some(sf => sf.key === f.key))
                                      .map((field) => (
                                        <SelectItem key={field.key} value={field.key}>
                                          {field.name}
                                          <span className="text-xs text-gray-400 ml-2">({field.field_type})</span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveCompositeMapping(compositeIdx, true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Preview */}
                        {composite.sourceFields.length > 0 && (
                          <div className="bg-green-50 p-3 rounded text-sm">
                            <strong>Vorschau:</strong>{' '}
                            {[...composite.sourceFields]
                              .sort((a, b) => a.order - b.order)
                              .map(sf => fields?.organizationFields.find(f => f.key === sf.key)?.name || sf.key)
                              .join(` ${composite.separator ?? ' '} `)}
                            {' → '}
                            <Badge variant="outline">
                              {appCustomerFields.find(f => f.key === composite.appField)?.label || composite.appField || '(kein Zielfeld)'}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Person Field Mapping - Simple Mode */}
            {fieldMappingTab === 'persons' && fieldMappingMode === 'simple' && (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pipedrive-Feld (Person)</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>App-Feld (Ansprechpartner)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.personFields
                      ?.filter(f => !['id', 'name', 'first_name', 'last_name', 'add_time', 'update_time', 'visible_to', 'email', 'phone'].includes(f.key))
                      .map((field) => (
                        <TableRow key={field.key}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{field.name}</p>
                              <p className="text-xs text-gray-500">{field.field_type} • {field.key.substring(0, 20)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={personFieldMapping[field.key] || ''}
                              onValueChange={(value) => {
                                if (value === '_none_') {
                                  const newMapping = { ...personFieldMapping };
                                  delete newMapping[field.key];
                                  setPersonFieldMapping(newMapping);
                                } else {
                                  setPersonFieldMapping({ ...personFieldMapping, [field.key]: value });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Nicht zugeordnet" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none_">Nicht zugeordnet</SelectItem>
                                {/* Gruppierte Felder nach Kategorie */}
                                {['Basis', 'Erweitert', 'Adresse', 'Benutzerdefiniert'].map((category) => {
                                  const categoryFields = APP_CONTACT_FIELDS.filter(f => f.category === category);
                                  if (categoryFields.length === 0) return null;
                                  return (
                                    <React.Fragment key={category}>
                                      <SelectItem value={`_header_${category}`} disabled className="font-semibold text-gray-900 bg-gray-100">
                                        — {category} —
                                      </SelectItem>
                                      {categoryFields.map((appField) => (
                                        <SelectItem key={appField.key} value={appField.key}>
                                          {appField.label}
                                        </SelectItem>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!fields.personFields || fields.personFields.filter(f => !['id', 'name', 'first_name', 'last_name', 'add_time', 'update_time', 'visible_to', 'email', 'phone'].includes(f.key)).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                          Keine benutzerdefinierten Personen-Felder in Pipedrive gefunden.
                          <br />
                          <span className="text-sm">Standard-Felder (Name, E-Mail, Telefon, Position) werden automatisch synchronisiert.</span>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Person Field Mapping - Composite Mode */}
            {fieldMappingTab === 'persons' && fieldMappingMode === 'composite' && (
              <div className="space-y-4">
                {compositePersonFieldMapping.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <Combine className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Keine zusammengesetzten Felder für Ansprechpartner konfiguriert.</p>
                    <p className="text-sm">Klicken Sie auf "Neue Zusammenführung" um zu beginnen.</p>
                  </div>
                ) : (
                  compositePersonFieldMapping.map((composite, compositeIdx) => (
                    <Card key={compositeIdx} className="border-2 border-purple-100">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Target App Field */}
                            <div className="flex items-center space-x-3">
                              <Label className="w-24 text-right flex-shrink-0">Zielfeld:</Label>
                              <Select
                                value={composite.appField || ''}
                                onValueChange={(value) => handleUpdateCompositeMapping(
                                  compositeIdx, 
                                  { appField: value },
                                  false
                                )}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="App-Feld auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Basis', 'Erweitert', 'Adresse', 'Benutzerdefiniert'].map((category) => {
                                    const categoryFields = APP_CONTACT_FIELDS.filter(f => f.category === category);
                                    if (categoryFields.length === 0) return null;
                                    return (
                                      <React.Fragment key={category}>
                                        <SelectItem value={`_header_${category}`} disabled className="font-semibold text-gray-900 bg-gray-100">
                                          — {category} —
                                        </SelectItem>
                                        {categoryFields.map((appField) => (
                                          <SelectItem key={appField.key} value={appField.key}>
                                            {appField.label}
                                          </SelectItem>
                                        ))}
                                      </React.Fragment>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Separator */}
                            <div className="flex items-center space-x-3">
                              <Label className="w-24 text-right flex-shrink-0">Trennzeichen:</Label>
                              <Input
                                value={composite.separator ?? ' '}
                                onChange={(e) => handleUpdateCompositeMapping(
                                  compositeIdx, 
                                  { separator: e.target.value },
                                  false
                                )}
                                className="w-24"
                                placeholder="Leerzeichen"
                              />
                            </div>

                            {/* Source Fields */}
                            <div className="flex items-start space-x-3">
                              <Label className="w-24 text-right flex-shrink-0 pt-2">Quellfelder:</Label>
                              <div className="flex-1 space-y-2">
                                {composite.sourceFields.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">
                                    Noch keine Quellfelder ausgewählt
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {[...composite.sourceFields]
                                      .sort((a, b) => a.order - b.order)
                                      .map((source, idx) => {
                                        const fieldInfo = fields?.personFields?.find(f => f.key === source.key);
                                        return (
                                          <div 
                                            key={source.key} 
                                            className="flex items-center space-x-2 bg-gray-50 p-2 rounded"
                                          >
                                            <GripVertical className="h-4 w-4 text-gray-400" />
                                            <Badge variant="outline" className="flex-1">
                                              <span className="font-mono text-xs mr-2">{idx + 1}.</span>
                                              {fieldInfo?.name || source.key}
                                            </Badge>
                                            <div className="flex items-center space-x-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveSourceField(compositeIdx, source.key, 'up', false)}
                                              >
                                                <ChevronUp className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                disabled={idx === composite.sourceFields.length - 1}
                                                onClick={() => handleMoveSourceField(compositeIdx, source.key, 'down', false)}
                                              >
                                                <ChevronDown className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                onClick={() => handleRemoveSourceField(compositeIdx, source.key, false)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}

                                {/* Add source field */}
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && value !== '_none_') {
                                      handleAddSourceField(compositeIdx, value, false);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="+ Pipedrive-Feld hinzufügen..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fields?.personFields
                                      ?.filter(f => !['id', 'name', 'first_name', 'last_name', 'add_time', 'update_time', 'visible_to', 'email', 'phone'].includes(f.key))
                                      .filter(f => !composite.sourceFields.some(sf => sf.key === f.key))
                                      .map((field) => (
                                        <SelectItem key={field.key} value={field.key}>
                                          {field.name}
                                          <span className="text-xs text-gray-400 ml-2">({field.field_type})</span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveCompositeMapping(compositeIdx, false)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Preview */}
                        {composite.sourceFields.length > 0 && (
                          <div className="bg-purple-50 p-3 rounded text-sm">
                            <strong>Vorschau:</strong>{' '}
                            {[...composite.sourceFields]
                              .sort((a, b) => a.order - b.order)
                              .map(sf => fields?.personFields?.find(f => f.key === sf.key)?.name || sf.key)
                              .join(` ${composite.separator ?? ' '} `)}
                            {' → '}
                            <Badge variant="outline">
                              {APP_CONTACT_FIELDS.find(f => f.key === composite.appField)?.label || composite.appField || '(kein Zielfeld)'}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {status?.connected && syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Synchronisations-Verlauf
            </CardTitle>
            <CardDescription>
              Klicken Sie auf eine Zeile, um die synchronisierten Daten anzuzeigen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncHistory.map((log) => (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  {/* Sync Summary Row - Clickable */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => loadSyncDetails(log.id)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {expandedSyncId === log.id ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-[140px]">
                        <p className="font-medium text-sm">
                          {format(new Date(log.startedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.completedAt ? (
                            `Dauer: ${Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`
                          ) : (
                            'Läuft...'
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        {log.syncType === 'full' ? 'Vollständig' : 
                         log.syncType === 'incremental' ? 'Inkrementell' : 'Manuell'}
                      </Badge>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-green-600">+{log.organizationsCreated}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-blue-600">↻{log.organizationsUpdated}</span>
                        <span className="text-gray-400 text-xs">({log.organizationsFetched})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-green-600">+{log.personsCreated}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-blue-600">↻{log.personsUpdated}</span>
                        <span className="text-gray-400 text-xs">({log.personsFetched})</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSyncId === log.id && (
                    <div className="border-t bg-gray-50 p-4">
                      {loadingSyncDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                          <span className="text-gray-500">Lade Details...</span>
                        </div>
                      ) : syncDetails ? (
                        <div className="space-y-6">
                          {/* Errors if any */}
                          {syncDetails.syncLog.errors && syncDetails.syncLog.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-medium text-red-800 flex items-center mb-2">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Fehler während der Synchronisation
                              </h4>
                              <ul className="text-sm text-red-700 space-y-1">
                                {syncDetails.syncLog.errors.map((err, idx) => (
                                  <li key={idx}>• {typeof err === 'string' ? err : err.error}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Synced Customers */}
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center mb-3">
                              <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                              Synchronisierte Kunden ({syncDetails.customers.length})
                            </h4>
                            {syncDetails.customers.length > 0 ? (
                              <div className="bg-white rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead className="w-12"></TableHead>
                                      <TableHead>Kundenname</TableHead>
                                      <TableHead>Hauptkontakt</TableHead>
                                      <TableHead>Stadt</TableHead>
                                      <TableHead>Pipedrive ID</TableHead>
                                      <TableHead>Synchronisiert</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {syncDetails.customers.map((customer) => (
                                      <TableRow key={customer.id}>
                                        <TableCell>
                                          {customer.action === 'created' ? (
                                            <Badge className="bg-green-100 text-green-800 text-xs">
                                              <Plus className="h-3 w-3 mr-1" />
                                              Neu
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                              <RefreshCcw className="h-3 w-3 mr-1" />
                                              Aktualisiert
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell>{customer.mainContact || '—'}</TableCell>
                                        <TableCell>
                                          {customer.city ? (
                                            <span className="flex items-center text-gray-600">
                                              <MapPin className="h-3 w-3 mr-1" />
                                              {customer.city}
                                            </span>
                                          ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-xs font-mono">
                                          {customer.pipedriveId}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-xs">
                                          {format(new Date(customer.pipedriveSyncedAt), 'HH:mm:ss', { locale: de })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm bg-white rounded-lg border p-4 text-center">
                                Keine Kunden während dieser Synchronisation aktualisiert.
                              </p>
                            )}
                          </div>

                          {/* Synced Contacts */}
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center mb-3">
                              <Users className="h-4 w-4 mr-2 text-purple-600" />
                              Synchronisierte Ansprechpartner ({syncDetails.contacts.length})
                            </h4>
                            {syncDetails.contacts.length > 0 ? (
                              <div className="bg-white rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead className="w-12"></TableHead>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Position</TableHead>
                                      <TableHead>E-Mail</TableHead>
                                      <TableHead>Telefon</TableHead>
                                      <TableHead>Kunde</TableHead>
                                      <TableHead>Pipedrive ID</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {syncDetails.contacts.map((contact) => (
                                      <TableRow key={contact.id}>
                                        <TableCell>
                                          {contact.action === 'created' ? (
                                            <Badge className="bg-green-100 text-green-800 text-xs">
                                              <Plus className="h-3 w-3 mr-1" />
                                              Neu
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                              <RefreshCcw className="h-3 w-3 mr-1" />
                                              Aktualisiert
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          <span className="flex items-center">
                                            <User className="h-3 w-3 mr-2 text-gray-400" />
                                            {contact.name}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                          {contact.position || '—'}
                                        </TableCell>
                                        <TableCell>
                                          {contact.email ? (
                                            <span className="flex items-center text-gray-600">
                                              <Mail className="h-3 w-3 mr-1" />
                                              {contact.email}
                                            </span>
                                          ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                          {contact.phone ? (
                                            <span className="flex items-center text-gray-600">
                                              <Phone className="h-3 w-3 mr-1" />
                                              {contact.phone}
                                            </span>
                                          ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                          {contact.customer?.name || '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-xs font-mono">
                                          {contact.pipedriveId}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm bg-white rounded-lg border p-4 text-center">
                                Keine Ansprechpartner während dieser Synchronisation aktualisiert.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Keine Details verfügbar.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

