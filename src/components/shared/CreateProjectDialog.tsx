'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FolderPlus, FileText, CheckCircle2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Projektvorlage mit Aufgaben-Anzahl
 */
interface ProjectTemplate {
  id: string;
  name: string;
  description?: string | null;
  taskCount: number;
  products?: Array<{
    id: string;
    name: string;
    icon?: string | null;
  }>;
}

/**
 * Kunde für Auswahl
 */
interface Customer {
  id: string;
  name: string;
}

/**
 * Props für CreateProjectDialog
 */
interface CreateProjectDialogProps {
  /** Ob der Dialog geöffnet ist */
  open: boolean;
  /** Callback wenn Dialog geschlossen wird */
  onOpenChange: (open: boolean) => void;
  /** ID des Kunden, für den das Projekt erstellt wird (optional - wenn nicht übergeben, wird Kundenauswahl angezeigt) */
  customerId?: string;
  /** Name des Kunden (für Anzeige) */
  customerName?: string;
  /** Callback nach erfolgreicher Projekterstellung */
  onProjectCreated?: (project: any) => void;
  /** Optionale zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * CreateProjectDialog - Wiederverwendbare Komponente zur Projekterstellung
 * 
 * Ermöglicht die Erstellung eines Projekts:
 * - Mit Vorlage: Lädt alle Aufgaben aus der Vorlage
 * - Ohne Vorlage: Erstellt ein leeres Projekt
 * 
 * Wird verwendet in:
 * - Kundenansicht (CustomerDetailClient)
 * - Projekte-Übersicht
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  onProjectCreated,
  className,
}: CreateProjectDialogProps) {
  // State
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [projectName, setProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine if we need customer selection
  const needsCustomerSelection = !initialCustomerId;

  // Load templates and customers when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates();
      if (needsCustomerSelection) {
        loadCustomers();
      } else {
        setLoadingCustomers(false);
        setSelectedCustomerId(initialCustomerId || '');
      }
      // Reset form state
      setSelectedTemplateId(null);
      setProjectName('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [open, needsCustomerSelection, initialCustomerId]);

  // Auto-set project name when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template && !projectName) {
        setProjectName(template.name);
      }
    }
  }, [selectedTemplateId, templates]);

  /**
   * Lädt verfügbare Projektvorlagen
   */
  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      setError(null);
      const response = await fetch('/api/projects/from-template');
      if (!response.ok) {
        throw new Error('Vorlagen konnten nicht geladen werden');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Vorlagen');
    } finally {
      setLoadingTemplates(false);
    }
  };

  /**
   * Lädt verfügbare Kunden
   */
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Kunden konnten nicht geladen werden');
      }
      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Kunden');
    } finally {
      setLoadingCustomers(false);
    }
  };

  /**
   * Erstellt das Projekt
   */
  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setError('Bitte geben Sie einen Projektnamen ein');
      return;
    }

    if (!selectedCustomerId) {
      setError('Bitte wählen Sie einen Kunden aus');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/projects/from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName.trim(),
          customerId: selectedCustomerId,
          templateId: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Projekt konnte nicht erstellt werden');
      }

      const result = await response.json();
      setSuccessMessage(result.message);

      // Callback aufrufen
      if (onProjectCreated) {
        onProjectCreated(result.project);
      }

      // Dialog nach kurzer Verzögerung schließen
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen des Projekts');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handler für Template-Auswahl
   */
  const handleTemplateSelect = (value: string) => {
    if (value === 'none') {
      setSelectedTemplateId(null);
      setProjectName('');
    } else {
      setSelectedTemplateId(value);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-[600px]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Neues Projekt erstellen
          </DialogTitle>
          <DialogDescription>
            {initialCustomerName
              ? `Erstellen Sie ein neues Projekt für ${initialCustomerName}.`
              : 'Erstellen Sie ein neues Projekt.'}
            {' '}Sie können eine Vorlage verwenden oder ein leeres Projekt anlegen.
          </DialogDescription>
        </DialogHeader>

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {!successMessage && (
          <div className="space-y-6 py-4">
            {/* Customer Selection (only if no customerId provided) */}
            {needsCustomerSelection && (
              <div className="space-y-2">
                <Label htmlFor="customer">Kunde *</Label>
                {loadingCustomers ? (
                  <div className="flex items-center space-x-2 p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Lade Kunden...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kunden auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {customer.name}
                          </div>
                        </SelectItem>
                      ))}
                      {customers.length === 0 && (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          Keine Kunden vorhanden
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="projectName">Projektname *</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="z.B. Website-Relaunch 2024"
                disabled={isSubmitting}
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Vorlage auswählen</Label>
              
              {loadingTemplates ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Lade Vorlagen...</span>
                </div>
              ) : (
                <RadioGroup
                  value={selectedTemplateId || 'none'}
                  onValueChange={handleTemplateSelect}
                  className="space-y-3"
                  disabled={isSubmitting}
                >
                  {/* Option: Keine Vorlage */}
                  <div
                    className={cn(
                      'flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all',
                      selectedTemplateId === null
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => !isSubmitting && handleTemplateSelect('none')}
                  >
                    <RadioGroupItem value="none" id="template-none" className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor="template-none"
                        className="font-medium cursor-pointer"
                      >
                        Ohne Vorlage
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Erstellt ein leeres Projekt ohne vordefinierte Aufgaben.
                      </p>
                    </div>
                  </div>

                  {/* Template Options */}
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        'flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all',
                        selectedTemplateId === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => !isSubmitting && handleTemplateSelect(template.id)}
                    >
                      <RadioGroupItem
                        value={template.id}
                        id={`template-${template.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <Label
                            htmlFor={`template-${template.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {template.name}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {template.taskCount} Aufgabe{template.taskCount !== 1 ? 'n' : ''}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {template.description}
                          </p>
                        )}
                        {template.products && template.products.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.products.map((product) => (
                              <Badge
                                key={product.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {product.icon && <span className="mr-1">{product.icon}</span>}
                                {product.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 && (
                    <p className="text-sm text-gray-500 p-4 text-center border border-dashed rounded-lg">
                      Keine Projektvorlagen vorhanden. Sie können ein Projekt ohne Vorlage erstellen.
                    </p>
                  )}
                </RadioGroup>
              )}
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{selectedTemplate.taskCount}</strong> Aufgabe
                  {selectedTemplate.taskCount !== 1 ? 'n' : ''} aus der Vorlage "
                  {selectedTemplate.name}" werden für das Projekt erstellt.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          {!successMessage && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !projectName.trim() || !selectedCustomerId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Erstelle...' : 'Projekt erstellen'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectDialog;

