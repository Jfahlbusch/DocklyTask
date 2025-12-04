'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  RotateCcw, 
  Save,
  Table as TableIcon,
  Eye,
  EyeOff
} from 'lucide-react';

// Storage Key für die Standard-Spalten
export const DEFAULT_COLUMNS_STORAGE_KEY = 'taskwise:customerTableDefaultColumns';

// Spalten-Definition (synchron mit customers/page.tsx)
export interface ColumnOption {
  id: string;
  label: string;
  category: 'basis' | 'steckbrief' | 'keyfacts' | 'dokumente';
}

// Alle verfügbaren Spalten
export const ALL_COLUMN_OPTIONS: ColumnOption[] = [
  // Basis
  { id: 'name', label: 'Name', category: 'basis' },
  { id: 'mainContact', label: 'Hauptkontakt', category: 'basis' },
  { id: 'totalProjects', label: 'Projekte (Gesamt)', category: 'basis' },
  { id: 'activeProjects', label: 'Projekte (Aktiv)', category: 'basis' },
  // Steckbrief
  { id: 'firm', label: 'Firmierung', category: 'steckbrief' },
  { id: 'accountManager', label: 'PM / Kundenberater', category: 'steckbrief' },
  { id: 'erp', label: 'Warenwirtschaft', category: 'steckbrief' },
  { id: 'branchCount', label: 'Anzahl Filialen', category: 'steckbrief' },
  { id: 'initialBranches', label: 'Startfilialen', category: 'steckbrief' },
  { id: 'countryRegion', label: 'Land / Region', category: 'steckbrief' },
  { id: 'customerStatus', label: 'Kundenstatus', category: 'steckbrief' },
  { id: 'productCategories', label: 'Produkte/Module', category: 'steckbrief' },
  { id: 'mainContactDetails', label: 'Kontaktdetails', category: 'steckbrief' },
  { id: 'accessCredentials', label: 'Zugangsdaten', category: 'steckbrief' },
  // Key Facts
  { id: 'keyFacts.general', label: 'Allgemeine Key Facts', category: 'keyfacts' },
  { id: 'keyFacts.branches', label: 'Filial-Infos', category: 'keyfacts' },
  { id: 'keyFacts.returns', label: 'Retouren', category: 'keyfacts' },
  { id: 'keyFacts.backplan', label: 'BackPlan', category: 'keyfacts' },
  { id: 'keyFacts.assortment', label: 'Warengruppen/Artikel', category: 'keyfacts' },
  { id: 'keyFacts.cakeplan', label: 'Kuchenplan/Saison', category: 'keyfacts' },
  { id: 'keyFacts.special', label: 'Besonderheiten', category: 'keyfacts' },
  // Dokumente
  { id: 'documents.assortmentExcel', label: 'Warengruppen-Excel', category: 'dokumente' },
  { id: 'documents.transferPlan', label: 'Übertragungsplan', category: 'dokumente' },
  { id: 'documents.samples', label: 'Beispieldokumente', category: 'dokumente' },
];

// System-Standard (wird verwendet wenn nichts konfiguriert)
export const SYSTEM_DEFAULT_COLUMNS = ['name', 'mainContact', 'activeProjects', 'erp', 'branchCount'];

// Hilfsfunktion zum Laden der Standard-Spalten
export function loadDefaultColumns(): string[] {
  if (typeof window === 'undefined') return SYSTEM_DEFAULT_COLUMNS;
  try {
    const saved = localStorage.getItem(DEFAULT_COLUMNS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignorieren
  }
  return SYSTEM_DEFAULT_COLUMNS;
}

// Hilfsfunktion zum Speichern der Standard-Spalten
export function saveDefaultColumns(columns: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEFAULT_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
}

export default function CustomerTableColumnsEditor() {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(SYSTEM_DEFAULT_COLUMNS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  // Lade gespeicherte Einstellungen
  useEffect(() => {
    const loaded = loadDefaultColumns();
    setSelectedColumns(loaded);
  }, []);

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev => {
      const newSelection = prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId];
      setHasChanges(true);
      setSaved(false);
      return newSelection;
    });
  };

  const handleSave = () => {
    saveDefaultColumns(selectedColumns);
    setHasChanges(false);
    setSaved(true);
    // Event auslösen, damit andere Komponenten die Änderung mitbekommen
    window.dispatchEvent(new CustomEvent('customerTableColumnsChanged', { detail: selectedColumns }));
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSelectedColumns(SYSTEM_DEFAULT_COLUMNS);
    setHasChanges(true);
    setSaved(false);
  };

  const columnsByCategory = {
    basis: ALL_COLUMN_OPTIONS.filter(c => c.category === 'basis'),
    steckbrief: ALL_COLUMN_OPTIONS.filter(c => c.category === 'steckbrief'),
    keyfacts: ALL_COLUMN_OPTIONS.filter(c => c.category === 'keyfacts'),
    dokumente: ALL_COLUMN_OPTIONS.filter(c => c.category === 'dokumente'),
  };

  const categoryLabels = {
    basis: 'Basis-Informationen',
    steckbrief: 'Steckbrief-Felder',
    keyfacts: 'Key Facts',
    dokumente: 'Dokumente',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Standard-Spalten für Kundentabelle
            </CardTitle>
            <CardDescription className="mt-1">
              Wählen Sie die Spalten aus, die standardmäßig in der Kundenübersicht angezeigt werden sollen. 
              Benutzer können ihre persönliche Ansicht jederzeit anpassen.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasChanges}
              className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {saved ? 'Gespeichert!' : 'Speichern'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">
            {selectedColumns.length} Spalten ausgewählt
          </Badge>
          {hasChanges && (
            <Badge variant="secondary">Ungespeicherte Änderungen</Badge>
          )}
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {(Object.keys(columnsByCategory) as Array<keyof typeof columnsByCategory>).map(category => (
              <div key={category}>
                <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                  {categoryLabels[category]}
                  <Badge variant="outline" className="text-xs">
                    {columnsByCategory[category].filter(c => selectedColumns.includes(c.id)).length} / {columnsByCategory[category].length}
                  </Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {columnsByCategory[category].map(col => (
                    <label 
                      key={col.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedColumns.includes(col.id) 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Checkbox
                        checked={selectedColumns.includes(col.id)}
                        onCheckedChange={() => toggleColumn(col.id)}
                      />
                      <span className="text-sm flex-1">{col.label}</span>
                      {selectedColumns.includes(col.id) ? (
                        <Eye className="h-4 w-4 text-blue-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-300" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Vorschau der Standard-Ansicht:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedColumns.map(colId => {
              const col = ALL_COLUMN_OPTIONS.find(c => c.id === colId);
              return col ? (
                <Badge key={colId} variant="secondary">{col.label}</Badge>
              ) : null;
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
