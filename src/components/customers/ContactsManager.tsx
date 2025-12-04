'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  Building,
  FileText,
  Tags,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  X,
  Calendar,
  Globe,
  Linkedin,
} from 'lucide-react';
import { ContactData, ContactSubfield, FieldDef } from '@/lib/customer-profile-types';
import { loadCustomerProfileSchema } from './CustomerProfileFieldRenderer';

interface Contact extends ContactData {
  id?: string;
  pipedriveId?: string;
  pipedriveSyncedAt?: string;
  metadata?: string;
}

interface ContactsManagerProps {
  customerId: string;
  /** Kontakte aus der Datenbank (Pipedrive-Sync) */
  syncedContacts?: Contact[];
  /** Kontakte aus dem Kundenprofil (manuell gepflegt) */
  profileContacts?: Contact[];
  /** Callback zum Speichern von Profil-Kontakten */
  onSaveProfileContacts?: (contacts: Contact[]) => Promise<void>;
  /** Callback zum Neu-Laden der Daten */
  onRefresh?: () => void;
}

// Standard-Subfelder falls keine im Schema definiert sind
const DEFAULT_CONTACT_SUBFIELDS: ContactSubfield[] = [
  { type: 'firstName', label: 'Vorname', enabled: true },
  { type: 'lastName', label: 'Nachname', enabled: true },
  { type: 'email', label: 'E-Mail', enabled: true },
  { type: 'phone', label: 'Telefon', enabled: true },
  { type: 'position', label: 'Position', enabled: true },
  { type: 'department', label: 'Abteilung', enabled: true },
  { 
    type: 'contactFor', 
    label: 'AP für:', 
    enabled: true, 
    multiple: true,
    // Optionen passend zu Pipedrive - value = label für einfache Synchronisation
    options: [
      { value: 'BackPlan', label: 'BackPlan' },
      { value: 'Webshop', label: 'Webshop' },
      { value: 'Allgemein', label: 'Allgemein' },
      { value: 'Technik', label: 'Technik' },
      { value: 'Support', label: 'Support' },
    ]
  },
  { type: 'notes', label: 'Notizen', enabled: true },
];

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  notes: '',
  contactFor: [],
};

export default function ContactsManager({
  customerId,
  syncedContacts = [],
  profileContacts = [],
  onSaveProfileContacts,
  onRefresh,
}: ContactsManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<(Contact & { source: string }) | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contactSubfields, setContactSubfields] = useState<ContactSubfield[]>(DEFAULT_CONTACT_SUBFIELDS);

  // Lade die konfigurierten Contact-Subfelder aus dem Schema
  useEffect(() => {
    const schema = loadCustomerProfileSchema();
    // Finde das Contact-Feld im Schema
    const contactField = schema.find((f: FieldDef) => f.type === 'contact');
    if (contactField?.contactSubfields && contactField.contactSubfields.length > 0) {
      setContactSubfields(contactField.contactSubfields);
    }
  }, []);

  // Alle Kontakte zusammenführen - profileContacts direkt verwenden
  // Bei Pipedrive-Kontakten: metadata JSON parsen und Felder extrahieren
  const allContacts = [
    ...syncedContacts.map(c => {
      let parsedMetadata: Record<string, unknown> = {};
      if (c.metadata && typeof c.metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(c.metadata);
        } catch (e) {
          // Ignore parse errors
        }
      }
      return {
        ...c,
        // Extrahiere contactFor aus metadata falls vorhanden
        contactFor: parsedMetadata.contactFor as string[] || c.contactFor || [],
        department: parsedMetadata.department as string || c.department,
        notes: parsedMetadata.notes as string || c.notes,
        source: 'pipedrive' as const,
      };
    }),
    ...profileContacts.map((c, i) => ({ ...c, source: 'profile' as const, profileIndex: i })),
  ];

  // Nur aktivierte Subfelder
  const enabledSubfields = contactSubfields.filter(sf => sf.enabled);

  const handleAddContact = () => {
    setEditingContact({ ...emptyContact });
    setEditingIndex(null);
    setEditDialogOpen(true);
  };

  const handleViewContact = (contact: Contact & { source: string }) => {
    setViewingContact(contact);
    setDetailDialogOpen(true);
  };

  const handleEditContact = (contact: Contact & { source: string; profileIndex?: number }) => {
    if (contact.source === 'profile' && contact.profileIndex !== undefined) {
      setEditingContact({ ...contact });
      setEditingIndex(contact.profileIndex);
      setDetailDialogOpen(false);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteContact = async (contact: Contact & { source: string; profileIndex?: number }) => {
    if (contact.source !== 'profile' || contact.profileIndex === undefined) return;
    
    if (!confirm('Möchten Sie diesen Ansprechpartner wirklich löschen?')) return;

    const newContacts = profileContacts.filter((_, i) => i !== contact.profileIndex);
    setDetailDialogOpen(false);
    
    if (onSaveProfileContacts) {
      setIsSaving(true);
      try {
        await onSaveProfileContacts(newContacts);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;

    let newContacts: Contact[];
    if (editingIndex !== null) {
      newContacts = profileContacts.map((c, i) => 
        i === editingIndex ? editingContact : c
      );
    } else {
      newContacts = [...profileContacts, editingContact];
    }

    setEditDialogOpen(false);
    setEditingContact(null);
    setEditingIndex(null);

    if (onSaveProfileContacts) {
      setIsSaving(true);
      try {
        await onSaveProfileContacts(newContacts);
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const updateEditingField = (field: string, value: any) => {
    if (!editingContact) return;
    setEditingContact({ ...editingContact, [field]: value });
  };

  const getFieldKey = (sf: ContactSubfield) => 
    sf.type === 'custom' && sf.customKey ? sf.customKey : sf.type;

  const getFieldValue = (contact: Contact, sf: ContactSubfield) => {
    const key = getFieldKey(sf);
    return (contact as any)[key];
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.firstName || contact.lastName) {
      return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    }
    return contact.email || 'Unbenannt';
  };

  const getInitials = (contact: Contact) => {
    const first = contact.firstName?.charAt(0) || contact.email?.charAt(0) || '?';
    const last = contact.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  // Hilfsfunktion: Löst Dropdown-Werte in ihre Labels auf
  const getDropdownLabel = (value: string, sf: ContactSubfield): string => {
    if (!sf.options || sf.options.length === 0) return value;
    const option = sf.options.find(o => o.value === value);
    return option?.label || value;
  };

  // Hilfsfunktion: Löst mehrere Dropdown-Werte in ihre Labels auf
  const getDropdownLabels = (values: string[], sf: ContactSubfield): string[] => {
    if (!sf.options || sf.options.length === 0) return values;
    return values.map(v => {
      const option = sf.options?.find(o => o.value === v);
      return option?.label || v;
    });
  };

  // Finde ein Subfield nach Typ oder customKey
  const findSubfield = (typeOrKey: string): ContactSubfield | undefined => {
    return contactSubfields.find(sf => 
      sf.type === typeOrKey || 
      (sf.type === 'custom' && sf.customKey === typeOrKey)
    );
  };

  // Icon für Feldtyp
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'position': return <Briefcase className="h-4 w-4" />;
      case 'department': return <Building className="h-4 w-4" />;
      case 'notes': return <FileText className="h-4 w-4" />;
      case 'contactFor': return <Tags className="h-4 w-4" />;
      default: return null;
    }
  };

  // Render ein Formularfeld basierend auf dem Subfield-Typ
  const renderFormField = (sf: ContactSubfield) => {
    const fieldKey = getFieldKey(sf);
    const value = editingContact ? (editingContact as any)[fieldKey] : '';

    // Dropdown / Multi-Select für contactFor oder custom dropdowns
    if (sf.type === 'contactFor' || (sf.type === 'custom' && sf.inputType === 'dropdown')) {
      const options = sf.options || [];
      const currentValue = Array.isArray(value) ? value : [];
      
      return (
        <div key={fieldKey} className="space-y-2">
          <Label>{sf.label}</Label>
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
              {options.map(opt => {
                const isSelected = currentValue.includes(opt.value);
                return (
                  <Badge
                    key={opt.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newValue = isSelected
                        ? currentValue.filter((v: string) => v !== opt.value)
                        : [...currentValue, opt.value];
                      updateEditingField(fieldKey, newValue);
                    }}
                  >
                    {opt.label}
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <Input
              value={currentValue.join(', ')}
              onChange={(e) => updateEditingField(
                fieldKey,
                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              )}
              placeholder="Kommagetrennte Werte..."
            />
          )}
        </div>
      );
    }

    // Textarea für Notizen
    if (sf.type === 'notes' || (sf.type === 'custom' && sf.inputType === 'textarea')) {
      return (
        <div key={fieldKey} className="space-y-2 col-span-2">
          <Label>{sf.label}</Label>
          <Textarea
            value={value || ''}
            onChange={(e) => updateEditingField(fieldKey, e.target.value)}
            rows={3}
          />
        </div>
      );
    }

    // Date input
    if (sf.type === 'custom' && sf.inputType === 'date') {
      return (
        <div key={fieldKey} className="space-y-2">
          <Label>{sf.label}</Label>
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateEditingField(fieldKey, e.target.value)}
          />
        </div>
      );
    }

    // Number input
    if (sf.type === 'custom' && sf.inputType === 'number') {
      return (
        <div key={fieldKey} className="space-y-2">
          <Label>{sf.label}</Label>
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateEditingField(fieldKey, e.target.value)}
          />
        </div>
      );
    }

    // Default: Text input
    const inputType = sf.type === 'email' ? 'email' : sf.type === 'phone' ? 'tel' : 'text';
    return (
      <div key={fieldKey} className="space-y-2">
        <Label>{sf.label}</Label>
        <Input
          type={inputType}
          value={value || ''}
          onChange={(e) => updateEditingField(fieldKey, e.target.value)}
        />
      </div>
    );
  };

  // Render ein Anzeigefeld im Detail-Dialog
  const renderDetailField = (sf: ContactSubfield, contact: Contact) => {
    const value = getFieldValue(contact, sf);
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    const icon = getFieldIcon(sf.type);
    
    // Array-Werte (contactFor)
    if (Array.isArray(value)) {
      // Optionen-Labels auflösen falls vorhanden
      const displayValues = sf.options 
        ? value.map(v => sf.options?.find(o => o.value === v)?.label || v)
        : value;
      
      return (
        <div key={getFieldKey(sf)} className="flex items-start gap-3 py-2">
          <div className="text-gray-400 mt-0.5">{icon || <Tags className="h-4 w-4" />}</div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{sf.label}</div>
            <div className="flex flex-wrap gap-1">
              {displayValues.map((v, i) => (
                <Badge key={i} variant="secondary">{v}</Badge>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // E-Mail als Link
    if (sf.type === 'email') {
      return (
        <div key={getFieldKey(sf)} className="flex items-start gap-3 py-2">
          <div className="text-gray-400 mt-0.5">{icon}</div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{sf.label}</div>
            <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>
          </div>
        </div>
      );
    }

    // Telefon als Link
    if (sf.type === 'phone') {
      return (
        <div key={getFieldKey(sf)} className="flex items-start gap-3 py-2">
          <div className="text-gray-400 mt-0.5">{icon}</div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{sf.label}</div>
            <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>
          </div>
        </div>
      );
    }

    // Standard-Anzeige
    return (
      <div key={getFieldKey(sf)} className="flex items-start gap-3 py-2">
        <div className="text-gray-400 mt-0.5">{icon || <FileText className="h-4 w-4" />}</div>
        <div>
          <div className="text-xs text-gray-500 mb-1">{sf.label}</div>
          <div className="text-gray-900 whitespace-pre-wrap">{value}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <UserCircle className="h-5 w-5 mr-2" />
              Ansprechpartner
              {allContacts.length > 0 && (
                <Badge variant="secondary" className="ml-2">{allContacts.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={handleAddContact} disabled={isSaving}>
              <Plus className="h-4 w-4 mr-1" />
              Hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Noch keine Ansprechpartner vorhanden.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleAddContact}>
                <Plus className="h-4 w-4 mr-1" />
                Ersten Ansprechpartner hinzufügen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContacts.map((contact, index) => (
                <div
                  key={contact.id || `profile-${contact.profileIndex}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow relative group cursor-pointer"
                  onClick={() => handleViewContact(contact)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className={`font-semibold ${
                        contact.source === 'pipedrive' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {getInitials(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {getContactDisplayName(contact)}
                      </p>
                      
                      {contact.position && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Briefcase className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{contact.position}</span>
                        </div>
                      )}
                      
                      {contact.email && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate text-blue-600">{contact.email}</span>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="text-blue-600">{contact.phone}</span>
                        </div>
                      )}

                      {/* AP für: - immer anzeigen mit Labels aus Optionen */}
                      {(() => {
                        const contactForSubfield = findSubfield('contactFor');
                        const contactForLabels = contact.contactFor && contact.contactFor.length > 0 && contactForSubfield
                          ? getDropdownLabels(contact.contactFor, contactForSubfield)
                          : [];
                        return (
                          <div className="flex items-start text-sm text-gray-600 mt-2">
                            <Tags className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              <span className="text-gray-500 text-xs mr-1">AP für:</span>
                              {contactForLabels.length > 0 ? (
                                contactForLabels.map((label, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {label}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs italic">nicht zugewiesen</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mt-2 flex items-center gap-2">
                        {contact.source === 'pipedrive' && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            Pipedrive
                          </Badge>
                        )}
                        {contact.source === 'profile' && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            Manuell
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Aktions-Menü */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {contact.source === 'profile' && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact); }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </>
                        )}
                        {contact.source === 'pipedrive' && contact.pipedriveId && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://app.pipedrive.com/person/${contact.pipedriveId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              In Pipedrive öffnen
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail-Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          {viewingContact && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className={`text-xl font-semibold ${
                      viewingContact.source === 'pipedrive' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {getInitials(viewingContact)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {getContactDisplayName(viewingContact)}
                    </DialogTitle>
                    <div className="mt-1">
                      {viewingContact.source === 'pipedrive' && (
                        <Badge variant="outline" className="text-xs bg-green-50">Pipedrive</Badge>
                      )}
                      {viewingContact.source === 'profile' && (
                        <Badge variant="outline" className="text-xs bg-blue-50">Manuell</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="divide-y mt-4">
                {enabledSubfields
                  .filter(sf => sf.type !== 'firstName' && sf.type !== 'lastName')
                  .map(sf => renderDetailField(sf, viewingContact))}
              </div>

              <DialogFooter className="mt-6">
                {viewingContact.source === 'profile' && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDeleteContact(viewingContact as any)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </Button>
                    <Button onClick={() => handleEditContact(viewingContact as any)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </Button>
                  </>
                )}
                {viewingContact.source === 'pipedrive' && viewingContact.pipedriveId && (
                  <Button asChild>
                    <a
                      href={`https://app.pipedrive.com/person/${viewingContact.pipedriveId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      In Pipedrive öffnen
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Schließen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bearbeitungs-Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}
            </DialogTitle>
          </DialogHeader>
          
          {editingContact && (
            <div className="grid grid-cols-2 gap-4 py-4">
              {enabledSubfields.map(sf => renderFormField(sf))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveContact} disabled={isSaving}>
              {isSaving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
