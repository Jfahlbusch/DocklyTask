'use client';

import { useState, useEffect } from 'react';
import CustomerForm from '@/components/forms/CustomerForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Building2,
  Phone,
  Settings2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  loadDefaultColumns, 
  DEFAULT_COLUMNS_STORAGE_KEY,
  SYSTEM_DEFAULT_COLUMNS 
} from '@/components/admin/CustomerTableColumnsEditor';
import { 
  loadCustomerProfileSchema, 
  getNestedValue,
  type FieldDef,
  type DropdownOption,
} from '@/components/customers/CustomerProfileFieldRenderer';

/**
 * Hilfsfunktion: Löst einen Dropdown-Wert in sein Label auf
 * Sucht sowohl nach Value als auch nach Label (case-insensitive für Pipedrive-Sync)
 */
function getDropdownDisplayValue(value: unknown, options: DropdownOption[] | undefined): string {
  if (!value) return '-';
  const strValue = String(value);
  
  if (!options || options.length === 0) return strValue;
  
  // Erst nach exaktem Value suchen
  let option = options.find(opt => opt.value === strValue);
  
  // Falls nicht gefunden, nach Label suchen (case-insensitive)
  if (!option) {
    option = options.find(opt => 
      opt.label.toLowerCase() === strValue.toLowerCase()
    );
  }
  
  // Falls immer noch nicht gefunden, nach partiellem Match suchen
  if (!option) {
    option = options.find(opt => 
      opt.label.toLowerCase().includes(strValue.toLowerCase()) ||
      strValue.toLowerCase().includes(opt.label.toLowerCase())
    );
  }
  
  return option?.label || strValue;
}

/**
 * Hilfsfunktion: Holt den Wert eines Schema-Felds und löst Dropdown-Labels auf
 */
function getSchemaFieldValue(customer: Customer, fieldKey: string, schema: FieldDef[]): string {
  const value = getNestedValue(customer.profile, fieldKey);
  if (!value) return '-';
  
  const field = schema.find(f => f.key === fieldKey);
  
  // Wenn es ein Dropdown-Feld ist, Label auflösen
  if (field?.type === 'dropdown' && field.options) {
    if (Array.isArray(value)) {
      return value.map(v => getDropdownDisplayValue(v, field.options)).join(', ');
    }
    return getDropdownDisplayValue(value, field.options);
  }
  
  // Für Arrays (wie productCategories)
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  return String(value);
}

interface ContactData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  notes?: string;
}

interface CustomerProfile {
  firm?: string;
  mainContactDetails?: string;
  accountManager?: string;
  erp?: string;
  branchCount?: number;
  initialBranches?: string;
  countryRegion?: string;
  accessCredentials?: string;
  customerStatus?: string;
  productCategories?: string[];
  // Strukturierte Ansprechpartner
  contacts?: ContactData | ContactData[];
  keyFacts?: {
    general?: string;
    branches?: string;
    returns?: string;
    backplan?: string;
    assortment?: string;
    cakeplan?: string;
    special?: string;
  };
  documents?: {
    assortmentExcel?: string;
    transferPlan?: string;
    samples?: string;
  };
  [key: string]: unknown;
}

interface Customer {
  id: string;
  name: string;
  tenantId?: string;
  mainContact?: string;
  info?: string;
  profile?: CustomerProfile;
  createdAt: string;
  updatedAt: string;
  totalProjects: number;
  activeProjects: number;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  }>;
  // Ansprechpartner aus Pipedrive-Synchronisation
  contacts?: Array<{
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
  }>;
}

// Spalten-Definition
interface ColumnDef {
  id: string;
  label: string;
  category: 'basis' | 'steckbrief' | 'keyfacts' | 'dokumente';
  getValue: (customer: Customer) => React.ReactNode;
  minWidth?: string;
}

const USER_COLUMNS_STORAGE_KEY = 'taskwise:customerTableColumns:user';

// Alle verfügbaren Spalten
const ALL_COLUMNS: ColumnDef[] = [
  // Basis-Spalten
  {
    id: 'name',
    label: 'Name',
    category: 'basis',
    getValue: (c) => (
      <Link href={`/customers/${c.id}`} className="font-medium text-blue-600 hover:text-blue-800">
        {c.name}
      </Link>
    ),
  },
  {
    id: 'mainContact',
    label: 'Ansprechpartner',
    category: 'basis',
    minWidth: '200px',
    getValue: (c) => {
      // Funktion um alle Contact-Namen aus einem Objekt zu extrahieren
      const extractAllContactNames = (obj: any): string[] => {
        if (!obj || typeof obj !== 'object') return [];
        
        // Prüfe ob es ein Array von Kontakten ist
        if (Array.isArray(obj)) {
          return obj
            .map(contact => {
              if (contact && (contact.firstName || contact.lastName)) {
                return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
              }
              return '';
            })
            .filter(Boolean);
        }
        
        // Prüfe ob es ein einzelnes ContactData-Objekt ist (hat firstName oder lastName)
        if (obj.firstName || obj.lastName) {
          const name = [obj.firstName, obj.lastName].filter(Boolean).join(' ');
          return name ? [name] : [];
        }
        
        return [];
      };
      
      let contactNames: string[] = [];
      
      // PRIORITÄT 1: Ansprechpartner aus der contacts-Beziehung (Pipedrive Sync)
      if (c.contacts && c.contacts.length > 0) {
        contactNames = c.contacts.map(contact => {
          if (contact.firstName || contact.lastName) {
            return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
          }
          return contact.name;
        }).filter(Boolean);
      }
      
      // PRIORITÄT 2: Lade das Schema und finde alle Contact-Felder aus dem Profile
      if (contactNames.length === 0) {
        const schema = loadCustomerProfileSchema();
        const contactFields = schema.filter(f => f.type === 'contact');
        
        // Versuche aus den definierten Contact-Feldern die Namen zu extrahieren
        if (c.profile && contactFields.length > 0) {
          for (const field of contactFields) {
            const value = getNestedValue(c.profile, field.key);
            const names = extractAllContactNames(value);
            if (names.length > 0) {
              contactNames = [...contactNames, ...names];
            }
          }
        }
      }
      
      // PRIORITÄT 3: Falls nicht über Schema gefunden, durchsuche das Profile direkt
      if (contactNames.length === 0 && c.profile) {
        // Bekannte Keys für Kontakte prüfen
        const possibleContactKeys = ['contacts', 'contact', 'ansprechpartner', 'hauptkontakt', 'mainContact'];
        
        for (const key of possibleContactKeys) {
          const value = c.profile[key];
          const names = extractAllContactNames(value);
          if (names.length > 0) {
            contactNames = names;
            break;
          }
        }
        
        // Falls immer noch nicht gefunden, durchsuche alle Werte im Profile
        if (contactNames.length === 0) {
          for (const [, value] of Object.entries(c.profile)) {
            const names = extractAllContactNames(value);
            if (names.length > 0) {
              contactNames = names;
              break;
            }
          }
        }
      }
      
      // PRIORITÄT 4: Fallback auf mainContact oder accountManager
      if (contactNames.length === 0) {
        const fallback = c.mainContact || c.profile?.accountManager;
        if (fallback) {
          contactNames = [fallback];
        }
      }
      
      // Keine Kontakte gefunden
      if (contactNames.length === 0) {
        return <span className="text-gray-400">-</span>;
      }
      
      // Zeige alle Ansprechpartner
      return (
        <div className="flex flex-col gap-1">
          {contactNames.map((name, index) => {
            const initial = name.charAt(0).toUpperCase();
            return (
              <div key={index} className="flex items-center space-x-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[150px]">{name}</span>
              </div>
            );
          })}
        </div>
      );
    },
  },
  {
    id: 'totalProjects',
    label: 'Projekte (Gesamt)',
    category: 'basis',
    getValue: (c) => <Badge variant="outline">{c.totalProjects}</Badge>,
  },
  {
    id: 'activeProjects',
    label: 'Projekte (Aktiv)',
    category: 'basis',
    getValue: (c) => (
      <Badge variant={c.activeProjects > 0 ? 'default' : 'secondary'}>{c.activeProjects}</Badge>
    ),
  },
  // Steckbrief-Spalten
  {
    id: 'firm',
    label: 'Firmierung',
    category: 'steckbrief',
    getValue: (c) => <span className="truncate max-w-[150px] block">{c.profile?.firm || '-'}</span>,
  },
  {
    id: 'accountManager',
    label: 'PM / Kundenberater',
    category: 'steckbrief',
    getValue: (c) => c.profile?.accountManager || '-',
  },
  {
    id: 'erp',
    label: 'Warenwirtschaft',
    category: 'steckbrief',
    getValue: (c) => {
      const schema = loadCustomerProfileSchema();
      return getSchemaFieldValue(c, 'erp', schema);
    },
  },
  {
    id: 'branchCount',
    label: 'Anzahl Filialen',
    category: 'steckbrief',
    getValue: (c) => c.profile?.branchCount !== undefined ? c.profile.branchCount : '-',
  },
  {
    id: 'initialBranches',
    label: 'Startfilialen',
    category: 'steckbrief',
    getValue: (c) => c.profile?.initialBranches || '-',
  },
  {
    id: 'countryRegion',
    label: 'Land / Region',
    category: 'steckbrief',
    getValue: (c) => c.profile?.countryRegion || '-',
  },
  {
    id: 'customerStatus',
    label: 'Kundenstatus',
    category: 'steckbrief',
    getValue: (c) => {
      const status = c.profile?.customerStatus;
      if (!status) return '-';
      
      // Standard-Status-Map für Badge-Varianten
      const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        prospect: 'outline',
        onboarding: 'secondary',
        active: 'default',
        paused: 'outline',
        churned: 'destructive',
      };
      
      // Lade Schema für Label-Auflösung
      const schema = loadCustomerProfileSchema();
      const displayLabel = getSchemaFieldValue(c, 'customerStatus', schema);
      
      // Versuche die Variante aus dem Standard-Map oder aus dem Schema-Value zu ermitteln
      const variant = statusVariants[status] || statusVariants[displayLabel.toLowerCase()] || 'outline';
      
      return <Badge variant={variant}>{displayLabel !== '-' ? displayLabel : status}</Badge>;
    },
  },
  {
    id: 'productCategories',
    label: 'Produkte/Module',
    category: 'steckbrief',
    getValue: (c) => {
      const cats = c.profile?.productCategories;
      if (!cats || cats.length === 0) return '-';
      
      // Lade Schema für Label-Auflösung
      const schema = loadCustomerProfileSchema();
      const field = schema.find(f => f.key === 'productCategories');
      
      return (
        <div className="flex flex-wrap gap-1">
          {cats.map((cat, i) => {
            const label = field?.options ? getDropdownDisplayValue(cat, field.options) : cat;
            return <Badge key={i} variant="outline" className="text-xs">{label}</Badge>;
          })}
        </div>
      );
    },
    minWidth: '200px',
  },
  {
    id: 'mainContactDetails',
    label: 'Kontaktdetails',
    category: 'steckbrief',
    getValue: (c) => (
      <span className="text-xs whitespace-pre-wrap max-w-[200px] block truncate" title={c.profile?.mainContactDetails}>
        {c.profile?.mainContactDetails?.split('\n')[0] || '-'}
      </span>
    ),
  },
  {
    id: 'accessCredentials',
    label: 'Zugangsdaten',
    category: 'steckbrief',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[150px] block" title={c.profile?.accessCredentials}>
        {c.profile?.accessCredentials ? '••••••••' : '-'}
      </span>
    ),
  },
  // Key Facts
  {
    id: 'keyFacts.general',
    label: 'Allgemeine Key Facts',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.general}>
        {c.profile?.keyFacts?.general?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.general?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
    minWidth: '200px',
  },
  {
    id: 'keyFacts.branches',
    label: 'Filial-Infos',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.branches}>
        {c.profile?.keyFacts?.branches?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.branches?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
    minWidth: '200px',
  },
  {
    id: 'keyFacts.returns',
    label: 'Retouren',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.returns}>
        {c.profile?.keyFacts?.returns?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.returns?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
  },
  {
    id: 'keyFacts.backplan',
    label: 'BackPlan',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.backplan}>
        {c.profile?.keyFacts?.backplan?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.backplan?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
  },
  {
    id: 'keyFacts.assortment',
    label: 'Warengruppen/Artikel',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.assortment}>
        {c.profile?.keyFacts?.assortment?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.assortment?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
  },
  {
    id: 'keyFacts.cakeplan',
    label: 'Kuchenplan/Saison',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.cakeplan}>
        {c.profile?.keyFacts?.cakeplan?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.cakeplan?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
  },
  {
    id: 'keyFacts.special',
    label: 'Besonderheiten',
    category: 'keyfacts',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[200px] block" title={c.profile?.keyFacts?.special}>
        {c.profile?.keyFacts?.special?.slice(0, 50) || '-'}{(c.profile?.keyFacts?.special?.length || 0) > 50 ? '...' : ''}
      </span>
    ),
  },
  // Dokumente
  {
    id: 'documents.assortmentExcel',
    label: 'Warengruppen-Excel',
    category: 'dokumente',
    getValue: (c) => {
      const url = c.profile?.documents?.assortmentExcel;
      if (!url) return '-';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          <span className="text-xs">Öffnen</span>
        </a>
      );
    },
  },
  {
    id: 'documents.transferPlan',
    label: 'Übertragungsplan',
    category: 'dokumente',
    getValue: (c) => {
      const url = c.profile?.documents?.transferPlan;
      if (!url) return '-';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          <span className="text-xs">Öffnen</span>
        </a>
      );
    },
  },
  {
    id: 'documents.samples',
    label: 'Beispieldokumente',
    category: 'dokumente',
    getValue: (c) => (
      <span className="text-xs truncate max-w-[150px] block" title={c.profile?.documents?.samples}>
        {c.profile?.documents?.samples || '-'}
      </span>
    ),
  },
];

// Standard sichtbare Spalten werden aus Admin-Einstellungen geladen

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(SYSTEM_DEFAULT_COLUMNS);

  // Spaltenauswahl aus LocalStorage laden (Benutzer-Einstellungen überschreiben Admin-Standard)
  useEffect(() => {
    // Zuerst: Admin-Standard laden
    const adminDefault = loadDefaultColumns();
    
    // Dann: Benutzer-spezifische Einstellungen prüfen
    const userSaved = localStorage.getItem(USER_COLUMNS_STORAGE_KEY);
    if (userSaved) {
      try {
        const parsed = JSON.parse(userSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(parsed);
          return;
        }
      } catch {
        // Ignorieren, wenn ungültig
      }
    }
    
    // Fallback auf Admin-Standard
    setVisibleColumns(adminDefault);
  }, []);

  // Lausche auf Änderungen der Admin-Einstellungen
  useEffect(() => {
    const handleAdminChange = (event: CustomEvent<string[]>) => {
      // Nur übernehmen wenn der User keine eigenen Einstellungen hat
      const userSaved = localStorage.getItem(USER_COLUMNS_STORAGE_KEY);
      if (!userSaved) {
        setVisibleColumns(event.detail);
      }
    };
    
    window.addEventListener('customerTableColumnsChanged', handleAdminChange as EventListener);
    return () => {
      window.removeEventListener('customerTableColumnsChanged', handleAdminChange as EventListener);
    };
  }, []);

  // Spaltenauswahl in LocalStorage speichern (Benutzer-spezifisch)
  const updateVisibleColumns = (columns: string[]) => {
    setVisibleColumns(columns);
    localStorage.setItem(USER_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  };

  const toggleColumn = (columnId: string) => {
    const newColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    updateVisibleColumns(newColumns);
  };

  const resetColumns = () => {
    // Benutzer-Einstellungen löschen, Admin-Standard verwenden
    localStorage.removeItem(USER_COLUMNS_STORAGE_KEY);
    setVisibleColumns(loadDefaultColumns());
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mainContact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.profile?.firm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.profile?.accountManager?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (customerId: string) => {
    if (!confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      console.error('Error deleting customer:', err);
    }
  };

  const handleCustomerEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleCustomerSubmit = async (data: any) => {
    try {
      if (editingCustomer) {
        const response = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update customer');

        const updatedCustomer = await response.json();
        setCustomers(prev => prev.map(c => 
          c.id === editingCustomer.id ? updatedCustomer : c
        ));
      } else {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to create customer');

        const newCustomer = await response.json();
        setCustomers(prev => [newCustomer, ...prev]);
      }
      
      setShowCustomerForm(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleCustomerCancel = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  // Aktive Spalten in der Reihenfolge der Definition
  const activeColumns = ALL_COLUMNS.filter(col => visibleColumns.includes(col.id));

  // Gruppiere Spalten nach Kategorie
  const columnsByCategory = {
    basis: ALL_COLUMNS.filter(c => c.category === 'basis'),
    steckbrief: ALL_COLUMNS.filter(c => c.category === 'steckbrief'),
    keyfacts: ALL_COLUMNS.filter(c => c.category === 'keyfacts'),
    dokumente: ALL_COLUMNS.filter(c => c.category === 'dokumente'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Kunden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Fehler</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchCustomers}>Erneut versuchen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kunden</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Kunden und deren Projekte.
          </p>
        </div>
        <Button onClick={() => setShowCustomerForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gesamte Kunden</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktive Projekte</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.activeProjects, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gesamtprojekte</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.totalProjects, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Kundenliste</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Kunden suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Spaltenauswahl */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Spalten ({activeColumns.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Sichtbare Spalten</h4>
                      <Button variant="ghost" size="sm" onClick={resetColumns}>
                        Zurücksetzen
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {/* Basis-Spalten */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Basis</h5>
                          <div className="space-y-2">
                            {columnsByCategory.basis.map(col => (
                              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={visibleColumns.includes(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                />
                                <span className="text-sm">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Steckbrief-Spalten */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Steckbrief</h5>
                          <div className="space-y-2">
                            {columnsByCategory.steckbrief.map(col => (
                              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={visibleColumns.includes(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                />
                                <span className="text-sm">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Key Facts Spalten */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Key Facts</h5>
                          <div className="space-y-2">
                            {columnsByCategory.keyfacts.map(col => (
                              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={visibleColumns.includes(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                />
                                <span className="text-sm">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Dokumente Spalten */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Dokumente</h5>
                          <div className="space-y-2">
                            {columnsByCategory.dokumente.map(col => (
                              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={visibleColumns.includes(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                />
                                <span className="text-sm">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeColumns.map(col => (
                      <TableHead 
                        key={col.id} 
                        style={{ minWidth: col.minWidth || '100px' }}
                        className="whitespace-nowrap"
                      >
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px] sticky right-0 bg-background">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      {activeColumns.map(col => (
                        <TableCell key={col.id} className="whitespace-nowrap">
                          {col.getValue(customer)}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/customers/${customer.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Details anzeigen
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCustomerEdit(customer)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(customer.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Keine Kunden gefunden.' : 'Noch keine Kunden vorhanden.'}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerForm
        customer={editingCustomer}
        onSubmit={handleCustomerSubmit}
        onCancel={handleCustomerCancel}
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
      />
    </div>
  );
}
