'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User, Mail, Phone } from 'lucide-react';
import { ProfileSection, CUSTOMER_PROFILE_SECTIONS_STORAGE_KEY, DEFAULT_PROFILE_SECTIONS } from '@/lib/customer-profile-types';

// Diese Typen müssen mit CustomerProfileSchemaEditor synchron sein
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'link' | 'dropdown' | 'richtext' | 'contact';

export interface DropdownOption {
  value: string;
  label: string;
}

export type ContactSubfieldType = 'firstName' | 'lastName' | 'email' | 'phone' | 'position' | 'department' | 'notes' | 'contactFor' | 'custom';

export type CustomSubfieldInputType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown';

export interface ContactSubfieldOption {
  value: string;
  label: string;
}

export interface ContactSubfield {
  type: ContactSubfieldType;
  label: string;
  enabled: boolean;
  required?: boolean;
  /** Optionen für Dropdown-Unterfelder (z.B. contactFor) */
  options?: ContactSubfieldOption[];
  /** Erlaubt Mehrfachauswahl bei Dropdown-Unterfeldern */
  multiple?: boolean;
  /** Für benutzerdefinierte Felder: der Input-Typ */
  inputType?: CustomSubfieldInputType;
  /** Für benutzerdefinierte Felder: eindeutiger Schlüssel */
  customKey?: string;
}

export interface ContactData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  notes?: string;
  /** Zuständigkeitsbereiche des Ansprechpartners (AP für:) */
  contactFor?: string[];
  /** Benutzerdefinierte Felder (Key-Value-Paare) */
  [key: string]: string | string[] | number | undefined;
}

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  sectionId?: string;
  options?: DropdownOption[];
  multiple?: boolean;
  defaultValue?: string | string[];
  contactSubfields?: ContactSubfield[];
}

const STORAGE_KEY = 'taskwise:customerProfileSchema';
const SECTIONS_STORAGE_KEY = CUSTOMER_PROFILE_SECTIONS_STORAGE_KEY;

/**
 * Lädt die Kundensteckbrief-Bereiche aus dem LocalStorage
 */
export function loadCustomerProfileSections(): ProfileSection[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SECTIONS_STORAGE_KEY) : null;
    if (!raw) return DEFAULT_PROFILE_SECTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PROFILE_SECTIONS;
  } catch {
    return DEFAULT_PROFILE_SECTIONS;
  }
}

/**
 * Lädt das Kundensteckbrief-Schema aus dem LocalStorage
 */
export function loadCustomerProfileSchema(): FieldDef[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Holt einen Wert aus einem verschachtelten Objekt via Dot-Notation
 * z.B. getNestedValue(obj, 'keyFacts.general') => obj.keyFacts.general
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Rendert einen einzelnen Feldwert basierend auf dem Feldtyp
 */
interface FieldValueRendererProps {
  field: FieldDef;
  value: any;
  customer: any;
}

export function FieldValueRenderer({ field, value, customer }: FieldValueRendererProps) {
  // Fallback auf profile-Daten, wenn der direkte Wert nicht vorhanden ist
  const resolvedValue = value ?? getNestedValue(customer?.profile, field.key);
  
  if (resolvedValue === undefined || resolvedValue === null || resolvedValue === '') {
    return <span className="text-gray-400">—</span>;
  }

  switch (field.type) {
    case 'text':
      return <p className="text-gray-700 break-words">{resolvedValue}</p>;
    
    case 'textarea':
      return <p className="text-gray-700 break-words whitespace-pre-wrap">{resolvedValue}</p>;
    
    case 'richtext':
      // Rich-Text-Inhalt als HTML rendern
      return (
        <div 
          className="text-gray-700 prose prose-sm max-w-none break-words [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: resolvedValue }}
        />
      );
    
    case 'number':
      return <p className="text-gray-700">{typeof resolvedValue === 'number' ? resolvedValue.toLocaleString('de-DE') : resolvedValue}</p>;
    
    case 'date':
      try {
        const date = new Date(resolvedValue);
        return <p className="text-gray-700">{date.toLocaleDateString('de-DE')}</p>;
      } catch {
        return <p className="text-gray-700">{resolvedValue}</p>;
      }
    
    case 'boolean':
      return (
        <Badge variant={resolvedValue ? 'default' : 'secondary'}>
          {resolvedValue ? 'Ja' : 'Nein'}
        </Badge>
      );
    
    case 'link':
      if (typeof resolvedValue === 'string' && resolvedValue.startsWith('http')) {
        return (
          <a 
            href={resolvedValue} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 break-all"
          >
            {resolvedValue}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        );
      }
      return <p className="text-gray-700 break-words">{resolvedValue}</p>;
    
    case 'dropdown':
      // Dropdown-Wert in Label auflösen
      // Sucht sowohl nach Value als auch nach Label (case-insensitive für Pipedrive-Sync)
      const renderDropdownValue = (val: string) => {
        if (!field.options || field.options.length === 0) return val;
        
        // Erst nach exaktem Value suchen
        let option = field.options.find(opt => opt.value === val);
        
        // Falls nicht gefunden, nach Label suchen (für Pipedrive-Sync wo Labels gespeichert werden)
        if (!option) {
          option = field.options.find(opt => 
            opt.label.toLowerCase() === String(val).toLowerCase()
          );
        }
        
        // Falls immer noch nicht gefunden, nach partiellem Match suchen
        if (!option) {
          option = field.options.find(opt => 
            opt.label.toLowerCase().includes(String(val).toLowerCase()) ||
            String(val).toLowerCase().includes(opt.label.toLowerCase())
          );
        }
        
        return option?.label || val;
      };

      if (field.multiple && Array.isArray(resolvedValue)) {
        // Mehrfachauswahl: Alle Werte als Badges anzeigen
        return (
          <div className="flex flex-wrap gap-1">
            {resolvedValue.map((val: string, idx: number) => (
              <Badge key={idx} variant="outline">
                {renderDropdownValue(val)}
              </Badge>
            ))}
          </div>
        );
      } else {
        // Einzelauswahl
        const displayValue = Array.isArray(resolvedValue) ? resolvedValue[0] : resolvedValue;
        return (
          <Badge variant="outline">
            {renderDropdownValue(displayValue)}
          </Badge>
        );
      }
    
    case 'contact':
      // Ansprechpartner-Daten rendern
      const renderContact = (contact: ContactData, index?: number) => {
        const enabledSubfields = field.contactSubfields?.filter(sf => sf.enabled) || [];
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
        
        // Hilfsfunktion um Dropdown-Labels aufzulösen
        const getDropdownLabels = (values: string[] | undefined, subfield: typeof enabledSubfields[0]) => {
          if (!values || values.length === 0) return null;
          return values.map(val => {
            const option = subfield.options?.find(opt => opt.value === val);
            return option?.label || val;
          });
        };
        
        // "AP für:" Labels
        const contactForField = enabledSubfields.find(sf => sf.type === 'contactFor');
        const contactForLabels = contactForField ? getDropdownLabels(contact.contactFor, contactForField) : null;
        
        // Benutzerdefinierte Felder sammeln
        const customSubfields = enabledSubfields.filter(sf => sf.type === 'custom' && sf.customKey);
        
        return (
          <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
            {/* Name und Position */}
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {fullName && <p className="font-medium text-gray-900">{fullName}</p>}
                {contact.position && <p className="text-sm text-gray-600">{contact.position}</p>}
                {contact.department && <p className="text-xs text-gray-500">{contact.department}</p>}
              </div>
            </div>
            
            {/* AP für: Badges */}
            {contactForLabels && contactForLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-6">
                <span className="text-xs text-gray-500 mr-1">AP für:</span>
                {contactForLabels.map((label, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Kontaktdaten */}
            <div className="space-y-1 ml-6">
              {contact.email && enabledSubfields.some(sf => sf.type === 'email') && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-gray-400" />
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && enabledSubfields.some(sf => sf.type === 'phone') && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>
            
            {/* Benutzerdefinierte Felder */}
            {customSubfields.length > 0 && (
              <div className="space-y-1 ml-6 pt-1 border-t border-gray-200">
                {customSubfields.map(sf => {
                  const key = sf.customKey!;
                  const value = contact[key];
                  if (!value) return null;
                  
                  // Dropdown-Werte als Badges anzeigen
                  if (sf.inputType === 'dropdown' && Array.isArray(value)) {
                    const labels = getDropdownLabels(value as string[], sf);
                    if (!labels || labels.length === 0) return null;
                    return (
                      <div key={key} className="flex flex-wrap items-center gap-1">
                        <span className="text-xs text-gray-500">{sf.label}:</span>
                        {labels.map((label, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    );
                  }
                  
                  // Andere Werte als Text
                  return (
                    <div key={key} className="text-sm">
                      <span className="text-gray-500">{sf.label}:</span>{' '}
                      <span className="text-gray-700">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Notizen */}
            {contact.notes && enabledSubfields.some(sf => sf.type === 'notes') && (
              <p className="text-xs text-gray-500 ml-6 italic">{contact.notes}</p>
            )}
          </div>
        );
      };

      if (field.multiple && Array.isArray(resolvedValue)) {
        // Mehrere Ansprechpartner
        return (
          <div className="space-y-2">
            {resolvedValue.map((contact: ContactData, idx: number) => renderContact(contact, idx))}
          </div>
        );
      } else if (resolvedValue && typeof resolvedValue === 'object') {
        // Einzelner Ansprechpartner
        return renderContact(resolvedValue as ContactData);
      }
      return <span className="text-gray-400">—</span>;
    
    default:
      // Sichere Konvertierung zu String - Objekte werden als JSON dargestellt
      if (resolvedValue && typeof resolvedValue === 'object') {
        // Spezialfall: Kontaktdaten-Array
        if (Array.isArray(resolvedValue) && resolvedValue.length > 0 && resolvedValue[0]?.firstName !== undefined) {
          return (
            <div className="space-y-1">
              {resolvedValue.map((c: ContactData, idx: number) => (
                <p key={idx} className="text-gray-700 break-words">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                  {c.email && ` — ${c.email}`}
                  {c.phone && ` — ${c.phone}`}
                </p>
              ))}
            </div>
          );
        }
        return <p className="text-gray-700 break-words">{JSON.stringify(resolvedValue)}</p>;
      }
      return <p className="text-gray-700 break-words">{String(resolvedValue)}</p>;
  }
}

/**
 * Rendert ein komplettes Feld mit Label und Wert
 */
interface CustomerProfileFieldProps {
  field: FieldDef;
  customer: any;
  className?: string;
}

export function CustomerProfileField({ field, customer, className = '' }: CustomerProfileFieldProps) {
  // Zuerst im direkten customer-Objekt suchen, dann im profile
  let value = getNestedValue(customer, field.key);
  if (value === undefined) {
    value = getNestedValue(customer?.profile, field.key);
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-600">
        {field.label}
        {field.help && (
          <span className="ml-1 text-gray-400 font-normal" title={field.help}>
            (?)
          </span>
        )}
      </label>
      <FieldValueRenderer field={field} value={value} customer={customer} />
    </div>
  );
}

/**
 * Rendert alle Felder des Kundensteckbriefs basierend auf dem Schema
 */
interface CustomerProfileRendererProps {
  customer: any;
  schema?: FieldDef[];
  sections?: ProfileSection[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function CustomerProfileRenderer({ 
  customer, 
  schema, 
  sections: propSections,
  columns = 2,
  className = ''
}: CustomerProfileRendererProps) {
  const [loadedSchema, setLoadedSchema] = React.useState<FieldDef[]>([]);
  const [loadedSections, setLoadedSections] = React.useState<ProfileSection[]>([]);

  React.useEffect(() => {
    if (!schema) {
      const loaded = loadCustomerProfileSchema();
      setLoadedSchema(loaded);
    }
    if (!propSections) {
      const loadedSecs = loadCustomerProfileSections();
      setLoadedSections(loadedSecs);
    }
  }, [schema, propSections]);

  const allFields = schema || loadedSchema;
  const sections = propSections || loadedSections;
  
  // Filtere Contact-Felder und das alte mainContactDetails aus - 
  // Ansprechpartner werden separat in der Ansprechpartner-Karte verwaltet
  const fields = allFields.filter(field => 
    field.type !== 'contact' && field.key !== 'mainContactDetails'
  );

  if (fields.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        Keine Felder für den Kundensteckbrief konfiguriert. 
        Bitte konfigurieren Sie die Felder im Admin-Bereich.
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  // Bereiche sortieren nach order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // Felder nach Bereichen gruppieren
  const fieldsBySection = React.useMemo(() => {
    const grouped: Map<string | undefined, FieldDef[]> = new Map();
    
    // Initialisiere mit allen Bereichen (auch leere)
    grouped.set(undefined, []); // Felder ohne Bereich
    sortedSections.forEach(sec => grouped.set(sec.id, []));
    
    // Felder zuordnen
    fields.forEach(field => {
      const sectionId = field.sectionId;
      if (!grouped.has(sectionId)) {
        grouped.set(sectionId, []);
      }
      grouped.get(sectionId)!.push(field);
    });
    
    return grouped;
  }, [fields, sortedSections]);

  // Prüfen ob überhaupt Bereiche verwendet werden
  const hasSectionsWithFields = sortedSections.some(sec => 
    (fieldsBySection.get(sec.id) || []).length > 0
  );

  // Wenn keine Bereiche verwendet werden, einfache Darstellung
  if (!hasSectionsWithFields || sortedSections.length === 0) {
    return (
      <div className={`grid ${gridCols[columns]} gap-6 ${className}`}>
        {fields.map((field) => (
          <CustomerProfileField 
            key={field.id} 
            field={field} 
            customer={customer}
          />
        ))}
      </div>
    );
  }

  // Darstellung mit Bereichen
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Felder ohne Bereich zuerst (falls vorhanden) */}
      {(fieldsBySection.get(undefined) || []).length > 0 && (
        <div>
          <div className={`grid ${gridCols[columns]} gap-6`}>
            {(fieldsBySection.get(undefined) || []).map((field) => (
              <CustomerProfileField 
                key={field.id} 
                field={field} 
                customer={customer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bereiche mit Überschriften */}
      {sortedSections.map((section) => {
        const sectionFields = fieldsBySection.get(section.id) || [];
        if (sectionFields.length === 0) return null;

        return (
          <div key={section.id}>
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              {section.description && (
                <p className="text-sm text-gray-500 mt-1">{section.description}</p>
              )}
            </div>
            <div className={`grid ${gridCols[columns]} gap-6`}>
              {sectionFields.map((field) => (
                <CustomerProfileField 
                  key={field.id} 
                  field={field} 
                  customer={customer}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CustomerProfileRenderer;

