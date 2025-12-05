/**
 * Typdefinitionen für das Kundensteckbrief-Schema
 * 
 * Diese Typen werden sowohl vom Admin-Editor (CustomerProfileSchemaEditor)
 * als auch vom Renderer (CustomerProfileFieldRenderer) verwendet.
 */

/**
 * Verfügbare Feldtypen für den Kundensteckbrief
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'link' | 'dropdown' | 'richtext' | 'contact';

/**
 * Ein Bereich/Abschnitt im Kundensteckbrief
 * Bereiche gruppieren mehrere Felder unter einer gemeinsamen Überschrift
 */
export interface ProfileSection {
  /** Eindeutige ID des Bereichs */
  id: string;
  /** Anzeigename des Bereichs (wird als Überschrift angezeigt) */
  name: string;
  /** Sortierreihenfolge (niedrigere Werte werden zuerst angezeigt) */
  order: number;
  /** Optional: Beschreibung des Bereichs */
  description?: string;
  /** Optional: Ist der Bereich standardmäßig eingeklappt? */
  collapsed?: boolean;
}

/**
 * Eine einzelne Option für Dropdown-Felder
 */
export interface DropdownOption {
  /** Technischer Wert (wird in der Datenbank gespeichert) */
  value: string;
  /** Anzeigename für den Benutzer */
  label: string;
}

/**
 * Verfügbare Unterfelder für Ansprechpartner
 * 'custom' für benutzerdefinierte Felder mit klassischen Typen
 */
export type ContactSubfieldType = 'firstName' | 'lastName' | 'email' | 'phone' | 'position' | 'department' | 'notes' | 'contactFor' | 'custom';

/**
 * Klassische Feldtypen für benutzerdefinierte Contact-Unterfelder
 */
export type CustomSubfieldInputType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown';

/**
 * Option für Contact-Subfeld-Dropdowns
 */
export interface ContactSubfieldOption {
  value: string;
  label: string;
}

/**
 * Konfiguration eines Ansprechpartner-Unterfelds
 */
export interface ContactSubfield {
  /** Typ des Unterfelds */
  type: ContactSubfieldType;
  /** Anzeigename */
  label: string;
  /** Ist das Feld aktiviert? */
  enabled: boolean;
  /** Ist das Feld erforderlich? */
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

/**
 * Datenstruktur eines Ansprechpartners
 */
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

/**
 * Definition eines einzelnen Feldes im Kundensteckbrief-Schema
 */
export interface FieldDef {
  /** Eindeutige ID des Feldes */
  id: string;
  /** Schlüssel/Pfad zum Wert im customer-Objekt (Dot-Notation erlaubt, z.B. 'keyFacts.general') */
  key: string;
  /** Anzeigename des Feldes */
  label: string;
  /** Feldtyp */
  type: FieldType;
  /** Optionaler Hilfetext/Tooltip */
  help?: string;
  
  // Bereichszuordnung
  /** ID des Bereichs, dem dieses Feld zugeordnet ist (optional) */
  sectionId?: string;
  
  // Dropdown-spezifische Eigenschaften
  /** Verfügbare Optionen für Dropdown-Felder */
  options?: DropdownOption[];
  /** Erlaubt Mehrfachauswahl (für Dropdown und Contact) */
  multiple?: boolean;
  /** Standardwert(e) für das Feld */
  defaultValue?: string | string[];
  
  // Contact-spezifische Eigenschaften
  /** Konfiguration der Unterfelder für Ansprechpartner */
  contactSubfields?: ContactSubfield[];
}

/**
 * LocalStorage-Key für das Kundensteckbrief-Schema
 */
export const CUSTOMER_PROFILE_STORAGE_KEY = 'taskwise:customerProfileSchema';

/**
 * LocalStorage-Key für die Kundensteckbrief-Bereiche
 */
export const CUSTOMER_PROFILE_SECTIONS_STORAGE_KEY = 'taskwise:customerProfileSections';

/**
 * Standard-Bereiche für den Kundensteckbrief
 */
export const DEFAULT_PROFILE_SECTIONS: ProfileSection[] = [
  { id: 'sec_general', name: 'Allgemein', order: 0, description: 'Allgemeine Kundeninformationen' },
  { id: 'sec_keyfacts', name: 'Key Facts', order: 1, description: 'Wichtige Informationen zum Kunden' },
  { id: 'sec_documents', name: 'Dokumente', order: 2, description: 'Verknüpfte Dokumente und Dateien' },
];

/**
 * Standard-Felder für den Kundensteckbrief
 */
export const DEFAULT_CUSTOMER_PROFILE_FIELDS: FieldDef[] = [
  { id: 'df_firm', key: 'firm', label: 'Firmierung', type: 'text' },
  { id: 'df_main', key: 'mainContactDetails', label: 'Ansprechpartner (Hauptkontakt)', type: 'textarea' },
  { id: 'df_pm', key: 'accountManager', label: 'PM / Kundenberater', type: 'text' },
  // Adressfelder (werden von Pipedrive synchronisiert)
  { id: 'df_street', key: 'street', label: 'Straße', type: 'text', sectionId: 'sec_general' },
  { id: 'df_postalCode', key: 'postalCode', label: 'PLZ', type: 'text', sectionId: 'sec_general' },
  { id: 'df_city', key: 'city', label: 'Stadt', type: 'text', sectionId: 'sec_general' },
  { id: 'df_country_addr', key: 'country', label: 'Land', type: 'text', sectionId: 'sec_general' },
  { id: 'df_erp', key: 'erp', label: 'Warenwirtschaft', type: 'text' },
  { id: 'df_branches', key: 'branchCount', label: 'Anzahl Filialen', type: 'number' },
  { id: 'df_initial', key: 'initialBranches', label: 'Startfilialen', type: 'text' },
  { id: 'df_country', key: 'countryRegion', label: 'Land / Bundesland / Kanton', type: 'text' },
  { id: 'df_access', key: 'accessCredentials', label: 'Zugangsdaten (WaWi/TeamViewer etc.)', type: 'textarea' },
  { id: 'df_kf_gen', key: 'keyFacts.general', label: 'Allgemeine Key Facts', type: 'textarea' },
  { id: 'df_kf_br', key: 'keyFacts.branches', label: 'Filial-Infos (Wochenende / Feiertage)', type: 'textarea' },
  { id: 'df_kf_ret', key: 'keyFacts.returns', label: 'Retouren', type: 'textarea' },
  { id: 'df_kf_bp', key: 'keyFacts.backplan', label: 'BackPlan – Berechnungstyp & Begründung', type: 'textarea' },
  { id: 'df_kf_as', key: 'keyFacts.assortment', label: 'Warengruppen / Artikel', type: 'textarea' },
  { id: 'df_kf_ck', key: 'keyFacts.cakeplan', label: 'Kuchenplan / Saisonartikel', type: 'textarea' },
  { id: 'df_kf_sp', key: 'keyFacts.special', label: 'Weitere Besonderheiten', type: 'textarea' },
  { id: 'df_doc_ass', key: 'documents.assortmentExcel', label: 'Warengruppen-Excel', type: 'link' },
  { id: 'df_doc_tr', key: 'documents.transferPlan', label: 'Übertragungsplan', type: 'link' },
  { id: 'df_doc_sm', key: 'documents.samples', label: 'Beispieldokumente', type: 'textarea' },
];

/**
 * Beispiel-Dropdown-Feld für Kundenstatus
 */
export const EXAMPLE_DROPDOWN_FIELD: FieldDef = {
  id: 'df_status',
  key: 'customerStatus',
  label: 'Kundenstatus',
  type: 'dropdown',
  help: 'Aktueller Status des Kunden im Onboarding-Prozess',
  options: [
    { value: 'prospect', label: 'Interessent' },
    { value: 'onboarding', label: 'Im Onboarding' },
    { value: 'active', label: 'Aktiver Kunde' },
    { value: 'paused', label: 'Pausiert' },
    { value: 'churned', label: 'Abgewandert' },
  ],
  multiple: false,
  defaultValue: 'prospect',
};

/**
 * Beispiel-Dropdown-Feld für Produktkategorien (Mehrfachauswahl)
 */
export const EXAMPLE_MULTI_DROPDOWN_FIELD: FieldDef = {
  id: 'df_products',
  key: 'productCategories',
  label: 'Produkte/Module',
  type: 'dropdown',
  help: 'Welche Produkte/Module nutzt der Kunde?',
  options: [
    { value: 'backplan', label: 'BackPlan' },
    { value: 'forecast', label: 'Forecast' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'mobile', label: 'Mobile App' },
    { value: 'api', label: 'API-Anbindung' },
  ],
  multiple: true,
  defaultValue: [],
};

