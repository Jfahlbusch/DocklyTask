'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Save, Loader2, Plus, Trash2, User } from 'lucide-react';
import { loadCustomerProfileSchema, getNestedValue, type FieldDef, type ContactData, type ContactSubfield, type ContactSubfieldOption } from '@/components/customers/CustomerProfileFieldRenderer';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import { Card, CardContent } from '@/components/ui/card';

interface CustomerProfileEditFormProps {
  customer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; profile: Record<string, any> }) => Promise<void>;
}

/**
 * Setzt einen Wert in einem verschachtelten Objekt via Dot-Notation
 */
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Flacht ein verschachteltes Objekt in Dot-Notation-Keys
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  
  return result;
}

/**
 * Erstellt das Default-Values-Objekt aus dem Customer und Schema
 */
function buildDefaultValues(customer: any, schema: FieldDef[]): Record<string, any> {
  const defaults: Record<string, any> = {
    name: customer?.name || '',
  };
  
  const flatProfile = customer?.profile ? flattenObject(customer.profile) : {};
  
  for (const field of schema) {
    // Zuerst im direkten customer-Objekt suchen, dann im flachen Profile
    let value = getNestedValue(customer, field.key);
    if (value === undefined) {
      value = flatProfile[field.key] ?? getNestedValue(customer?.profile, field.key);
    }
    
    // Setze Default-Wert basierend auf Feldtyp
    if (value !== undefined && value !== null) {
      defaults[field.key] = value;
    } else {
      switch (field.type) {
        case 'boolean':
          defaults[field.key] = false;
          break;
        case 'number':
          defaults[field.key] = '';
          break;
        case 'dropdown':
          defaults[field.key] = field.multiple ? [] : '';
          break;
        case 'contact':
          defaults[field.key] = field.multiple ? [] : {};
          break;
        default:
          defaults[field.key] = '';
      }
    }
  }
  
  return defaults;
}

/**
 * Baut das verschachtelte Profile-Objekt aus den flachen Form-Daten
 */
function buildProfileFromFormData(data: Record<string, any>, schema: FieldDef[]): Record<string, any> {
  const profile: Record<string, any> = {};
  
  for (const field of schema) {
    const value = data[field.key];
    if (value !== undefined && value !== '' && value !== null) {
      // Konvertiere Werte basierend auf Typ
      let convertedValue = value;
      if (field.type === 'number' && typeof value === 'string') {
        convertedValue = value === '' ? null : Number(value);
      }
      setNestedValue(profile, field.key, convertedValue);
    }
  }
  
  return profile;
}

/**
 * Rendert ein einzelnes Formularfeld basierend auf dem Feldtyp
 */
interface FormFieldRendererProps {
  field: FieldDef;
  control: any;
  errors: any;
}

function FormFieldRenderer({ field, control, errors }: FormFieldRendererProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: formField }) => (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.help && (
              <span className="ml-1 text-xs text-muted-foreground" title={field.help}>
                (?)
              </span>
            )}
          </Label>
          
          {field.type === 'text' && (
            <Input
              id={field.id}
              placeholder={field.label}
              {...formField}
              value={formField.value || ''}
            />
          )}
          
          {field.type === 'textarea' && (
            <Textarea
              id={field.id}
              placeholder={field.label}
              className="min-h-[80px]"
              {...formField}
              value={formField.value || ''}
            />
          )}
          
          {field.type === 'richtext' && (
            <FixedRichTextEditor
              value={formField.value || ''}
              onChange={formField.onChange}
              placeholder={field.label}
              className="min-h-[120px]"
            />
          )}
          
          {field.type === 'number' && (
            <Input
              id={field.id}
              type="number"
              placeholder={field.label}
              {...formField}
              value={formField.value || ''}
              onChange={(e) => formField.onChange(e.target.value)}
            />
          )}
          
          {field.type === 'date' && (
            <Input
              id={field.id}
              type="date"
              {...formField}
              value={formField.value ? new Date(formField.value).toISOString().split('T')[0] : ''}
            />
          )}
          
          {field.type === 'boolean' && (
            <div className="flex items-center space-x-2">
              <Switch
                id={field.id}
                checked={!!formField.value}
                onCheckedChange={formField.onChange}
              />
              <Label htmlFor={field.id} className="text-sm text-muted-foreground">
                {formField.value ? 'Ja' : 'Nein'}
              </Label>
            </div>
          )}
          
          {field.type === 'link' && (
            <Input
              id={field.id}
              type="url"
              placeholder="https://..."
              {...formField}
              value={formField.value || ''}
            />
          )}
          
          {field.type === 'dropdown' && !field.multiple && (
            <Select
              value={formField.value || ''}
              onValueChange={formField.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={`${field.label} auswählen...`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {field.type === 'dropdown' && field.multiple && (
            <MultiSelect
              options={field.options || []}
              value={Array.isArray(formField.value) ? formField.value : []}
              onChange={formField.onChange}
              placeholder={`${field.label} auswählen...`}
            />
          )}
          
          {field.type === 'contact' && (
            <ContactFieldEditor
              field={field}
              value={formField.value}
              onChange={formField.onChange}
            />
          )}
          
          {errors[field.key] && (
            <p className="text-sm text-destructive">{errors[field.key]?.message}</p>
          )}
        </div>
      )}
    />
  );
}

/**
 * Einfache Multi-Select Komponente
 */
interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function MultiSelect({ options, value, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  
  return (
    <div className="space-y-2">
      <Select open={open} onOpenChange={setOpen}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {value.length > 0 ? `${value.length} ausgewählt` : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
              onClick={(e) => {
                e.preventDefault();
                handleSelect(opt.value);
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </SelectContent>
      </Select>
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="text-xs">
                {opt?.label || v}
                <button
                  type="button"
                  onClick={() => handleSelect(v)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Editor für einen einzelnen Ansprechpartner
 */
interface SingleContactEditorProps {
  contact: ContactData;
  onChange: (contact: ContactData) => void;
  onRemove?: () => void;
  subfields: ContactSubfield[];
  index?: number;
}

/**
 * Multi-Select für Contact-Subfelder (z.B. AP für:)
 */
interface ContactSubfieldMultiSelectProps {
  options: ContactSubfieldOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function ContactSubfieldMultiSelect({ options, value, onChange, placeholder }: ContactSubfieldMultiSelectProps) {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  
  return (
    <div className="space-y-1">
      <Select open={open} onOpenChange={setOpen}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={placeholder}>
            {value.length > 0 ? `${value.length} ausgewählt` : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
              onClick={(e) => {
                e.preventDefault();
                handleSelect(opt.value);
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </SelectContent>
      </Select>
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="text-xs">
                {opt?.label || v}
                <button
                  type="button"
                  onClick={() => handleSelect(v)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SingleContactEditor({ contact, onChange, onRemove, subfields, index }: SingleContactEditorProps) {
  const enabledSubfields = subfields.filter(sf => sf.enabled);
  
  const updateField = (fieldKey: string, value: string | string[] | number) => {
    onChange({ ...contact, [fieldKey]: value });
  };
  
  // Bestimmt den Schlüssel für ein Subfeld (customKey für benutzerdefinierte Felder)
  const getFieldKey = (sf: ContactSubfield) => sf.type === 'custom' && sf.customKey ? sf.customKey : sf.type;
  
  // Prüfen ob ein Subfeld ein Dropdown ist (hat options)
  const isDropdownSubfield = (sf: ContactSubfield) => {
    if (sf.type === 'contactFor') return true;
    if (sf.type === 'custom' && sf.inputType === 'dropdown') return true;
    return sf.options && sf.options.length > 0;
  };
  
  // Bestimmt ob ein Feld die volle Breite haben soll
  const isFullWidth = (sf: ContactSubfield) => {
    if (sf.type === 'notes' || sf.type === 'contactFor') return true;
    if (sf.type === 'custom' && (sf.inputType === 'textarea' || sf.inputType === 'dropdown')) return true;
    return false;
  };
  
  return (
    <Card className="relative">
      <CardContent className="pt-4 pb-3">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Ansprechpartner entfernen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        {index !== undefined && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Ansprechpartner {index + 1}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enabledSubfields.map((sf) => {
            const fieldKey = getFieldKey(sf);
            const fieldValue = contact[fieldKey];
            
            return (
              <div key={sf.type === 'custom' ? sf.customKey : sf.type} className={isFullWidth(sf) ? 'md:col-span-2' : ''}>
                <Label className="text-xs text-muted-foreground">{sf.label}</Label>
                
                {/* Textarea für notes und custom textarea */}
                {(sf.type === 'notes' || (sf.type === 'custom' && sf.inputType === 'textarea')) && (
                  <Textarea
                    value={String(fieldValue || '')}
                    onChange={(e) => updateField(fieldKey, e.target.value)}
                    placeholder={sf.label}
                    className="h-16 text-sm"
                  />
                )}
                
                {/* Dropdown / Multi-Select */}
                {isDropdownSubfield(sf) && sf.type !== 'notes' && (sf.type !== 'custom' || sf.inputType === 'dropdown') && (
                  <ContactSubfieldMultiSelect
                    options={sf.options || []}
                    value={Array.isArray(fieldValue) ? fieldValue as string[] : []}
                    onChange={(values) => updateField(fieldKey, values)}
                    placeholder={`${sf.label} auswählen...`}
                  />
                )}
                
                {/* Number-Input für custom number */}
                {sf.type === 'custom' && sf.inputType === 'number' && (
                  <Input
                    type="number"
                    value={fieldValue !== undefined ? String(fieldValue) : ''}
                    onChange={(e) => updateField(fieldKey, e.target.value ? Number(e.target.value) : '')}
                    placeholder={sf.label}
                    className="h-8 text-sm"
                  />
                )}
                
                {/* Date-Input für custom date */}
                {sf.type === 'custom' && sf.inputType === 'date' && (
                  <Input
                    type="date"
                    value={String(fieldValue || '')}
                    onChange={(e) => updateField(fieldKey, e.target.value)}
                    className="h-8 text-sm"
                  />
                )}
                
                {/* Text-Input für custom text */}
                {sf.type === 'custom' && sf.inputType === 'text' && (
                  <Input
                    type="text"
                    value={String(fieldValue || '')}
                    onChange={(e) => updateField(fieldKey, e.target.value)}
                    placeholder={sf.label}
                    className="h-8 text-sm"
                  />
                )}
                
                {/* Standard-Felder (nicht custom, nicht notes, nicht dropdown) */}
                {sf.type !== 'notes' && sf.type !== 'custom' && !isDropdownSubfield(sf) && (
                  <Input
                    type={sf.type === 'email' ? 'email' : sf.type === 'phone' ? 'tel' : 'text'}
                    value={String(fieldValue || '')}
                    onChange={(e) => updateField(fieldKey, e.target.value)}
                    placeholder={sf.label}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Editor für Ansprechpartner-Felder (einzeln oder mehrere)
 */
interface ContactFieldEditorProps {
  field: FieldDef;
  value: ContactData | ContactData[] | undefined;
  onChange: (value: ContactData | ContactData[]) => void;
}

function ContactFieldEditor({ field, value, onChange }: ContactFieldEditorProps) {
  const subfields = field.contactSubfields || [];
  
  if (field.multiple) {
    // Mehrere Ansprechpartner
    const contacts = Array.isArray(value) ? value : [];
    
    const addContact = () => {
      onChange([...contacts, {}]);
    };
    
    const updateContact = (index: number, contact: ContactData) => {
      const newContacts = [...contacts];
      newContacts[index] = contact;
      onChange(newContacts);
    };
    
    const removeContact = (index: number) => {
      onChange(contacts.filter((_, i) => i !== index));
    };
    
    return (
      <div className="space-y-3">
        {contacts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Keine Ansprechpartner hinzugefügt.</p>
        )}
        
        {contacts.map((contact, idx) => (
          <SingleContactEditor
            key={idx}
            contact={contact}
            onChange={(c) => updateContact(idx, c)}
            onRemove={() => removeContact(idx)}
            subfields={subfields}
            index={idx}
          />
        ))}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ansprechpartner hinzufügen
        </Button>
      </div>
    );
  } else {
    // Einzelner Ansprechpartner
    const contact = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
    
    return (
      <SingleContactEditor
        contact={contact}
        onChange={onChange}
        subfields={subfields}
      />
    );
  }
}

export default function CustomerProfileEditForm({
  customer,
  open,
  onOpenChange,
  onSave,
}: CustomerProfileEditFormProps) {
  const [schema, setSchema] = useState<FieldDef[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Lade Schema beim Mount - filtere Contact-Felder und mainContactDetails aus (werden separat verwaltet)
  useEffect(() => {
    const loadedSchema = loadCustomerProfileSchema();
    // Contact-Felder und das alte mainContactDetails werden in der separaten Ansprechpartner-Karte verwaltet
    const filteredSchema = loadedSchema.filter(field => 
      field.type !== 'contact' && field.key !== 'mainContactDetails'
    );
    setSchema(filteredSchema);
  }, []);
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: buildDefaultValues(customer, schema),
  });
  
  // Reset Form wenn Customer oder Schema sich ändert
  useEffect(() => {
    if (customer && schema.length > 0) {
      reset(buildDefaultValues(customer, schema));
    }
  }, [customer, schema, reset]);
  
  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const profile = buildProfileFromFormData(data, schema);
      await onSave({
        name: data.name || customer?.name,
        profile,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Wenn kein Schema vorhanden, zeige Hinweis
  if (schema.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kundensteckbrief bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground">
            <p>Kein Schema für den Kundensteckbrief konfiguriert.</p>
            <p className="text-sm mt-2">
              Bitte konfigurieren Sie zuerst die Felder im Admin-Bereich.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Kundensteckbrief bearbeiten</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 pb-4">
              {/* Kundenname */}
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name ist erforderlich' }}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Kundenname *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Kundenname"
                      {...field}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name?.message as string}</p>
                    )}
                  </div>
                )}
              />
              
              {/* Dynamische Schema-Felder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.map((field) => (
                  <div 
                    key={field.id} 
                    className={field.type === 'richtext' || field.type === 'textarea' ? 'md:col-span-2' : ''}
                  >
                    <FormFieldRenderer
                      field={field}
                      control={control}
                      errors={errors}
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

