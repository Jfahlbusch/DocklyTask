'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Download, Upload, GripVertical, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import { ProfileSection, DEFAULT_PROFILE_SECTIONS, CUSTOMER_PROFILE_SECTIONS_STORAGE_KEY } from '@/lib/customer-profile-types';

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'link' | 'dropdown' | 'richtext' | 'contact';

interface DropdownOption {
  value: string;
  label: string;
}

// Verfügbare Unterfelder für Ansprechpartner
// 'custom' für benutzerdefinierte Felder mit klassischen Typen
type ContactSubfieldType = 'firstName' | 'lastName' | 'email' | 'phone' | 'position' | 'department' | 'notes' | 'contactFor' | 'custom';

// Klassische Feldtypen für benutzerdefinierte Contact-Unterfelder
type CustomSubfieldInputType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown';

interface ContactSubfieldOption {
  value: string;
  label: string;
}

interface ContactSubfield {
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

const AVAILABLE_CONTACT_SUBFIELDS: { type: ContactSubfieldType; defaultLabel: string; isDropdown?: boolean; defaultOptions?: ContactSubfieldOption[] }[] = [
  { type: 'firstName', defaultLabel: 'Vorname' },
  { type: 'lastName', defaultLabel: 'Nachname' },
  { type: 'email', defaultLabel: 'E-Mail' },
  { type: 'phone', defaultLabel: 'Telefon' },
  { type: 'position', defaultLabel: 'Position' },
  { type: 'department', defaultLabel: 'Abteilung' },
  { type: 'notes', defaultLabel: 'Notizen' },
  { 
    type: 'contactFor', 
    defaultLabel: 'AP für:', 
    isDropdown: true,
    defaultOptions: [
      // Optionen passend zu Pipedrive - value = label für einfache Synchronisation
      { value: 'BackPlan', label: 'BackPlan' },
      { value: 'Webshop', label: 'Webshop' },
      { value: 'Allgemein', label: 'Allgemein' },
      { value: 'Technik', label: 'Technik' },
      { value: 'Support', label: 'Support' },
    ]
  },
];

/**
 * Migriert bestehende Contact-Felder um fehlende Standard-Subfelder hinzuzufügen
 */
function migrateContactSubfields(fields: FieldDef[]): FieldDef[] {
  return fields.map(field => {
    if (field.type !== 'contact') return field;
    
    // Prüfen welche Standard-Subfelder fehlen
    const existingTypes = new Set((field.contactSubfields || []).map(sf => sf.type));
    const missingSubfields: ContactSubfield[] = [];
    
    for (const availableSf of AVAILABLE_CONTACT_SUBFIELDS) {
      if (!existingTypes.has(availableSf.type)) {
        missingSubfields.push({
          type: availableSf.type,
          label: availableSf.defaultLabel,
          enabled: false, // Neue Felder sind standardmäßig deaktiviert
          required: false,
          ...(availableSf.isDropdown ? { 
            options: availableSf.defaultOptions || [],
            multiple: true
          } : {})
        });
      }
    }
    
    if (missingSubfields.length > 0) {
      return {
        ...field,
        contactSubfields: [...(field.contactSubfields || []), ...missingSubfields]
      };
    }
    
    return field;
  });
}

interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  // Bereichszuordnung
  sectionId?: string;
  // Dropdown-spezifische Optionen
  options?: DropdownOption[];
  multiple?: boolean; // Mehrfachauswahl erlauben (auch für Contact = mehrere Ansprechpartner)
  defaultValue?: string | string[]; // Standardwert(e)
  // Contact-spezifische Optionen
  contactSubfields?: ContactSubfield[];
}

const STORAGE_KEY = 'taskwise:customerProfileSchema';
const SECTIONS_STORAGE_KEY = CUSTOMER_PROFILE_SECTIONS_STORAGE_KEY;

const DEFAULT_FIELDS: FieldDef[] = [
  { id: 'df_firm', key: 'firm', label: 'Firmierung', type: 'text' },
  { id: 'df_main', key: 'mainContactDetails', label: 'Ansprechpartner (Hauptkontakt)', type: 'textarea' },
  { id: 'df_pm', key: 'accountManager', label: 'PM / Kundenberater', type: 'text' },
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

function loadSchema(): FieldDef[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const fields = Array.isArray(parsed) ? parsed : [];
    // Migration: Fehlende Subfelder zu Contact-Feldern hinzufügen
    return migrateContactSubfields(fields);
  } catch {
    return [];
  }
}

function saveSchema(fields: FieldDef[]) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    }
  } catch {}
}

function loadSections(): ProfileSection[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SECTIONS_STORAGE_KEY) : null;
    if (!raw) return DEFAULT_PROFILE_SECTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PROFILE_SECTIONS;
  } catch {
    return DEFAULT_PROFILE_SECTIONS;
  }
}

function saveSections(sections: ProfileSection[]) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
    }
  } catch {}
}

export default function CustomerProfileSchemaEditor() {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [importJson, setImportJson] = useState<string>('');
  const [newSectionName, setNewSectionName] = useState<string>('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>('');

  useEffect(() => {
    const existing = loadSchema();
    if (!existing || existing.length === 0) {
      setFields(DEFAULT_FIELDS);
    } else {
      setFields(existing);
    }
    
    // Bereiche laden
    const existingSections = loadSections();
    setSections(existingSections);
  }, []);

  useEffect(() => {
    saveSchema(fields);
  }, [fields]);

  useEffect(() => {
    saveSections(sections);
  }, [sections]);

  // Bereich hinzufügen
  const addSection = () => {
    if (!newSectionName.trim()) return;
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) : -1;
    const newSection: ProfileSection = {
      id: `sec_${Date.now()}`,
      name: newSectionName.trim(),
      order: maxOrder + 1,
    };
    setSections(prev => [...prev, newSection]);
    setNewSectionName('');
  };

  // Bereich löschen
  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    // Felder aus diesem Bereich entfernen (sectionId auf undefined setzen)
    setFields(prev => prev.map(f => f.sectionId === sectionId ? { ...f, sectionId: undefined } : f));
  };

  // Bereich umbenennen
  const updateSectionName = (sectionId: string, newName: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  // Bereich nach oben verschieben
  const moveSectionUp = (sectionId: string) => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const idx = sortedSections.findIndex(s => s.id === sectionId);
    if (idx <= 0) return;
    
    // Tausche die Order-Werte
    const current = sortedSections[idx];
    const prev = sortedSections[idx - 1];
    setSections(sections.map(s => {
      if (s.id === current.id) return { ...s, order: prev.order };
      if (s.id === prev.id) return { ...s, order: current.order };
      return s;
    }));
  };

  // Bereich nach unten verschieben
  const moveSectionDown = (sectionId: string) => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const idx = sortedSections.findIndex(s => s.id === sectionId);
    if (idx < 0 || idx >= sortedSections.length - 1) return;
    
    // Tausche die Order-Werte
    const current = sortedSections[idx];
    const next = sortedSections[idx + 1];
    setSections(sections.map(s => {
      if (s.id === current.id) return { ...s, order: next.order };
      if (s.id === next.id) return { ...s, order: current.order };
      return s;
    }));
  };

  // Sortierte Bereiche für die Anzeige
  const sortedSections = useMemo(() => 
    [...sections].sort((a, b) => a.order - b.order),
    [sections]
  );

  const addField = () => {
    const id = `f_${Date.now()}`;
    setFields(prev => [...prev, { id, key: '', label: '', type: 'text' }]);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<FieldDef>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const exportJson = useMemo(() => JSON.stringify(fields, null, 2), [fields]);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed)) setFields(parsed);
    } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Kundensteckbrief – Felder konfigurieren</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              // Fehlende Standardfelder hinzufügen (Merge nach key)
              setFields(prev => {
                const byKey = new Map(prev.map(f => [f.key, f] as const));
                const merged = [...prev];
                for (const d of DEFAULT_FIELDS) {
                  if (!byKey.has(d.key)) merged.push({ ...d, id: `m_${d.id}_${Date.now()}` });
                }
                return merged;
              });
            }}>
              Standardfelder hinzufügen
            </Button>
            <Button size="sm" onClick={addField}>
              <Plus className="h-4 w-4 mr-2" /> Feld hinzufügen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Definieren Sie Felder, die im Kundensteckbrief angezeigt werden. Schlüssel greifen primär auf <code>customer.profile[key]</code> zu (Dot-Pfade erlaubt). Für systemische Felder wie Firmierung kann ein eigener Key genutzt und im Profil hinterlegt werden.
        </div>

        {/* Bereichsverwaltung */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Bereiche verwalten</h3>
            </div>
            <Badge variant="outline">{sections.length} Bereiche</Badge>
          </div>
          
          <p className="text-sm text-slate-600">
            Organisieren Sie die Steckbrief-Felder in Bereiche. Die Reihenfolge hier bestimmt die Anzeige im Kundensteckbrief.
          </p>

          {/* Bereich hinzufügen */}
          <div className="flex items-center gap-2">
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Neuer Bereich..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSection();
                }
              }}
            />
            <Button onClick={addSection} size="sm" disabled={!newSectionName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Hinzufügen
            </Button>
          </div>

          {/* Liste der Bereiche */}
          <div className="space-y-2">
            {sortedSections.map((section, idx) => (
              <div
                key={section.id}
                className="flex items-center gap-2 bg-white rounded border p-2"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
                
                {editingSectionId === section.id ? (
                  <Input
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateSectionName(section.id, editingSectionName);
                      } else if (e.key === 'Escape') {
                        setEditingSectionId(null);
                        setEditingSectionName('');
                      }
                    }}
                    onBlur={() => {
                      if (editingSectionName.trim()) {
                        updateSectionName(section.id, editingSectionName);
                      } else {
                        setEditingSectionId(null);
                        setEditingSectionName('');
                      }
                    }}
                  />
                ) : (
                  <span
                    className="flex-1 font-medium cursor-pointer hover:text-blue-600"
                    onDoubleClick={() => {
                      setEditingSectionId(section.id);
                      setEditingSectionName(section.name);
                    }}
                  >
                    {section.name}
                  </span>
                )}
                
                <Badge variant="secondary" className="text-xs">
                  {fields.filter(f => f.sectionId === section.id).length} Felder
                </Badge>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveSectionUp(section.id)}
                    disabled={idx === 0}
                    title="Nach oben"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveSectionDown(section.id)}
                    disabled={idx === sortedSections.length - 1}
                    title="Nach unten"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={() => removeSection(section.id)}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Noch keine Bereiche definiert. Fügen Sie einen Bereich hinzu, um Felder zu gruppieren.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {fields.length === 0 && (
            <div className="text-sm text-gray-500">Noch keine Felder definiert.</div>
          )}
          {fields.map((f) => (
            <div key={f.id} className="border rounded p-2 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600">Label</label>
                  <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="z. B. Firmierung" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600">Schlüssel (key)</label>
                  <Input value={f.key} onChange={(e) => updateField(f.id, { key: e.target.value })} placeholder="z. B. name oder keyFacts.general" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600">Bereich</label>
                  <Select 
                    value={f.sectionId || '__none__'} 
                    onValueChange={(v) => updateField(f.id, { sectionId: v === '__none__' ? undefined : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Kein Bereich" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-gray-500">Kein Bereich</span>
                      </SelectItem>
                      {sortedSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600">Typ</label>
                  <Select value={f.type} onValueChange={(v: any) => {
                    const updates: Partial<FieldDef> = { type: v as FieldType };
                    if (v === 'dropdown' && !f.options) {
                      updates.options = [];
                    }
                    if (v === 'contact' && !f.contactSubfields) {
                      // Standard-Unterfelder initialisieren
                      updates.contactSubfields = AVAILABLE_CONTACT_SUBFIELDS.map(sf => ({
                        type: sf.type,
                        label: sf.defaultLabel,
                        enabled: ['firstName', 'lastName', 'email', 'phone'].includes(sf.type),
                        required: false,
                        ...(sf.isDropdown ? { 
                          options: sf.defaultOptions || [],
                          multiple: true  // AP für: standardmäßig mit Mehrfachauswahl
                        } : {})
                      }));
                    }
                    updateField(f.id, updates);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Mehrzeilig</SelectItem>
                      <SelectItem value="richtext">Rich-Text</SelectItem>
                      <SelectItem value="number">Zahl</SelectItem>
                      <SelectItem value="date">Datum</SelectItem>
                      <SelectItem value="boolean">Ja/Nein</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="contact">Ansprechpartner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-gray-600">Hinweis (optional)</label>
                  <Input value={f.help || ''} onChange={(e) => updateField(f.id, { help: e.target.value })} placeholder="Erläuterung zum Feld" />
                </div>
                <div className="md:col-span-1 flex items-end justify-end pb-1">
                  <Button variant="ghost" size="icon" onClick={() => removeField(f.id)} title="Löschen">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
              
              {/* Ansprechpartner-Unterfelder Editor */}
              {f.type === 'contact' && (
                <div className="bg-blue-50 rounded p-3 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium text-blue-700">Ansprechpartner-Felder</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={f.multiple || false}
                          onChange={(e) => updateField(f.id, { multiple: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Mehrere Ansprechpartner
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          const customKey = `custom_${Date.now()}`;
                          const newSubfield: ContactSubfield = {
                            type: 'custom',
                            label: 'Neues Feld',
                            enabled: true,
                            customKey,
                            inputType: 'text',
                          };
                          updateField(f.id, { 
                            contactSubfields: [...(f.contactSubfields || []), newSubfield] 
                          });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Eigenes Feld
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-blue-600 mb-2">
                    Wählen Sie die Unterfelder, die für diesen Ansprechpartner verfügbar sein sollen:
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(f.contactSubfields || []).map((sf, sfIdx) => {
                      const availableSf = AVAILABLE_CONTACT_SUBFIELDS.find(a => a.type === sf.type);
                      const isDropdownSubfield = availableSf?.isDropdown || (sf.type === 'custom' && sf.inputType === 'dropdown');
                      const isCustomField = sf.type === 'custom';
                      
                      return (
                        <div key={isCustomField ? sf.customKey : sf.type} className={`flex flex-col gap-2 bg-white rounded p-2 border ${isDropdownSubfield || isCustomField ? 'md:col-span-3' : ''}`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sf.enabled}
                              onChange={(e) => {
                                const newSubfields = [...(f.contactSubfields || [])];
                                newSubfields[sfIdx] = { ...sf, enabled: e.target.checked };
                                updateField(f.id, { contactSubfields: newSubfields });
                              }}
                              className="rounded border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <Input
                                className="h-7 text-xs"
                                value={sf.label}
                                onChange={(e) => {
                                  const newSubfields = [...(f.contactSubfields || [])];
                                  newSubfields[sfIdx] = { ...sf, label: e.target.value };
                                  updateField(f.id, { contactSubfields: newSubfields });
                                }}
                                placeholder={availableSf?.defaultLabel || 'Feldname'}
                              />
                            </div>
                            
                            {/* Typ-Auswahl für benutzerdefinierte Felder */}
                            {isCustomField && (
                              <Select 
                                value={sf.inputType || 'text'} 
                                onValueChange={(v) => {
                                  const newSubfields = [...(f.contactSubfields || [])];
                                  newSubfields[sfIdx] = { 
                                    ...sf, 
                                    inputType: v as CustomSubfieldInputType,
                                    // Bei Dropdown: Optionen initialisieren falls nicht vorhanden
                                    ...(v === 'dropdown' && !sf.options ? { options: [], multiple: true } : {})
                                  };
                                  updateField(f.id, { contactSubfields: newSubfields });
                                }}
                              >
                                <SelectTrigger className="w-28 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="textarea">Mehrzeilig</SelectItem>
                                  <SelectItem value="number">Zahl</SelectItem>
                                  <SelectItem value="date">Datum</SelectItem>
                                  <SelectItem value="dropdown">Dropdown</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            
                            {!isCustomField && isDropdownSubfield && (
                              <Badge variant="outline" className="text-xs">Dropdown</Badge>
                            )}
                            
                            {isCustomField && (
                              <Badge variant="secondary" className="text-xs">Eigenes Feld</Badge>
                            )}
                            
                            {/* Löschen-Button für benutzerdefinierte Felder */}
                            {isCustomField && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const newSubfields = (f.contactSubfields || []).filter((_, i) => i !== sfIdx);
                                  updateField(f.id, { contactSubfields: newSubfields });
                                }}
                                title="Feld löschen"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Optionen-Editor für Dropdown-Subfelder (z.B. AP für: oder eigene Dropdowns) */}
                          {isDropdownSubfield && sf.enabled && (
                            <div className="ml-6 space-y-2 border-l-2 border-blue-200 pl-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Auswahloptionen:</span>
                                <div className="flex items-center gap-2">
                                  {isCustomField && (
                                    <label className="flex items-center gap-1 text-xs text-gray-600">
                                      <input
                                        type="checkbox"
                                        checked={sf.multiple !== false}
                                        onChange={(e) => {
                                          const newSubfields = [...(f.contactSubfields || [])];
                                          newSubfields[sfIdx] = { ...sf, multiple: e.target.checked };
                                          updateField(f.id, { contactSubfields: newSubfields });
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      Mehrfachauswahl
                                    </label>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={() => {
                                      const newSubfields = [...(f.contactSubfields || [])];
                                      const currentOptions = sf.options || [];
                                      newSubfields[sfIdx] = { 
                                        ...sf, 
                                        options: [...currentOptions, { value: `opt_${Date.now()}`, label: '' }]
                                      };
                                      updateField(f.id, { contactSubfields: newSubfields });
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Option
                                  </Button>
                                </div>
                              </div>
                              
                              {(!sf.options || sf.options.length === 0) && (
                                <div className="text-xs text-gray-500 italic">Keine Optionen definiert.</div>
                              )}
                              
                              <div className="space-y-1">
                                {(sf.options || []).map((opt, optIdx) => (
                                  <div key={`${isCustomField ? sf.customKey : sf.type}-opt-${optIdx}`} className="flex items-center gap-2">
                                    <Input
                                      className="flex-1 h-6 text-xs"
                                      value={opt.label}
                                      onChange={(e) => {
                                        const newSubfields = [...(f.contactSubfields || [])];
                                        const newOptions = [...(sf.options || [])];
                                        newOptions[optIdx] = { ...opt, label: e.target.value };
                                        newSubfields[sfIdx] = { ...sf, options: newOptions };
                                        updateField(f.id, { contactSubfields: newSubfields });
                                      }}
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <Input
                                      className="w-24 h-6 text-xs"
                                      value={opt.value}
                                      onChange={(e) => {
                                        const newSubfields = [...(f.contactSubfields || [])];
                                        const newOptions = [...(sf.options || [])];
                                        newOptions[optIdx] = { ...opt, value: e.target.value };
                                        newSubfields[sfIdx] = { ...sf, options: newOptions };
                                        updateField(f.id, { contactSubfields: newSubfields });
                                      }}
                                      placeholder="Wert"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        const newSubfields = [...(f.contactSubfields || [])];
                                        const newOptions = (sf.options || []).filter((_, i) => i !== optIdx);
                                        newSubfields[sfIdx] = { ...sf, options: newOptions };
                                        updateField(f.id, { contactSubfields: newSubfields });
                                      }}
                                      title="Option löschen"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Dropdown-Optionen Editor */}
              {f.type === 'dropdown' && (
                <div className="bg-gray-50 rounded p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Dropdown-Optionen</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={f.multiple || false}
                          onChange={(e) => updateField(f.id, { multiple: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Mehrfachauswahl
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newOption: DropdownOption = { value: `opt_${Date.now()}`, label: '' };
                          updateField(f.id, { options: [...(f.options || []), newOption] });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Option
                      </Button>
                    </div>
                  </div>
                  
                  {(!f.options || f.options.length === 0) && (
                    <div className="text-xs text-gray-500 italic">Keine Optionen definiert. Fügen Sie mindestens eine Option hinzu.</div>
                  )}
                  
                  <div className="space-y-2">
                    {(f.options || []).map((opt, optIdx) => (
                      <div key={`${f.id}-opt-${optIdx}`} className="flex items-center gap-2">
                        <Input
                          className="flex-1 h-8 text-sm"
                          value={opt.label}
                          onChange={(e) => {
                            const newOptions = [...(f.options || [])];
                            newOptions[optIdx] = { ...opt, label: e.target.value };
                            updateField(f.id, { options: newOptions });
                          }}
                          placeholder={`Option ${optIdx + 1}`}
                        />
                        <Input
                          className="w-32 h-8 text-sm"
                          value={opt.value}
                          onChange={(e) => {
                            const newOptions = [...(f.options || [])];
                            newOptions[optIdx] = { ...opt, value: e.target.value };
                            updateField(f.id, { options: newOptions });
                          }}
                          placeholder="Wert (key)"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const newOptions = (f.options || []).filter((_, i) => i !== optIdx);
                            updateField(f.id, { options: newOptions });
                          }}
                          title="Option löschen"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {f.options && f.options.length > 0 && (
                    <div className="pt-2 border-t">
                      <label className="text-xs text-gray-600">Standardwert</label>
                      <Select
                        value={Array.isArray(f.defaultValue) ? f.defaultValue[0] || '__none__' : f.defaultValue || '__none__'}
                        onValueChange={(v) => updateField(f.id, { defaultValue: v === '__none__' ? undefined : (f.multiple ? [v] : v) })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Kein Standardwert" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Kein Standardwert</SelectItem>
                          {(f.options || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label || opt.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Export</div>
              <Badge variant="outline">JSON</Badge>
            </div>
            <Textarea className="min-h-[160px]" value={exportJson} readOnly />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Import</div>
              <Badge variant="outline">JSON</Badge>
            </div>
            <Textarea className="min-h-[160px]" value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder="Schema-JSON hier einfügen" />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" /> Importieren
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportJson(exportJson)}>
                <Download className="h-4 w-4 mr-2" /> In Import kopieren
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


