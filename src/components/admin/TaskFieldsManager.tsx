'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Lock,
  Type,
  AlignLeft,
  FileText,
  Hash,
  Calendar,
  Clock,
  List,
  CheckSquare,
  User,
  Building2,
  FolderKanban,
  Users,
  Tag,
  Package,
  Shield,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Archive,
  ArchiveRestore,
  ChevronRight
} from 'lucide-react';

interface TaskFieldSection {
  id: string;
  name: string;
  description?: string | null;
  isCollapsed: boolean;
  position: number;
  fields?: TaskFieldConfig[];
}

interface TaskFieldConfig {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  visibleForRoles?: string | null;
  isSystem: boolean;
  isArchived: boolean;
  position: number;
  width: number;
  placeholder?: string;
  defaultValue?: string;
  options?: string;
  sectionId?: string | null;
  section?: TaskFieldSection | null;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Text (einzeilig)', icon: Type },
  { value: 'TEXTAREA', label: 'Textbereich (mehrzeilig)', icon: AlignLeft },
  { value: 'RICHTEXT', label: 'Rich-Text Editor', icon: FileText },
  { value: 'NUMBER', label: 'Zahl', icon: Hash },
  { value: 'DATE', label: 'Datum', icon: Calendar },
  { value: 'DATETIME', label: 'Datum & Uhrzeit', icon: Clock },
  { value: 'SELECT', label: 'Dropdown (Einzelauswahl)', icon: List },
  { value: 'MULTISELECT', label: 'Dropdown (Mehrfachauswahl)', icon: CheckSquare },
  { value: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare },
  { value: 'USER', label: 'Benutzer-Auswahl', icon: User },
  { value: 'CUSTOMER', label: 'Kunden-Auswahl', icon: Building2 },
  { value: 'PROJECT', label: 'Projekt-Auswahl', icon: FolderKanban },
  { value: 'TEAM', label: 'Team-Auswahl', icon: Users },
  { value: 'CATEGORY', label: 'Kategorie-Auswahl', icon: Tag },
  { value: 'PRODUCT', label: 'Produkt-Auswahl', icon: Package },
];

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'MANAGER', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'USER', label: 'Benutzer', color: 'bg-green-100 text-green-800' },
  { value: 'VIEWER', label: 'Betrachter', color: 'bg-gray-100 text-gray-800' },
];

const WIDTH_OPTIONS = [
  { value: 100, label: '100%', description: 'Volle Breite' },
  { value: 50, label: '50%', description: 'Halbe Breite' },
  { value: 33, label: '33%', description: 'Drittel' },
  { value: 25, label: '25%', description: 'Viertel' },
];

const getFieldTypeIcon = (fieldType: string) => {
  const option = FIELD_TYPE_OPTIONS.find(o => o.value === fieldType);
  if (option) {
    const Icon = option.icon;
    return <Icon className="h-4 w-4" />;
  }
  return <Type className="h-4 w-4" />;
};

const getFieldTypeLabel = (fieldType: string) => {
  return FIELD_TYPE_OPTIONS.find(o => o.value === fieldType)?.label || fieldType;
};

const parseRoles = (rolesJson: string | null | undefined): string[] => {
  if (!rolesJson) return [];
  try {
    return JSON.parse(rolesJson);
  } catch {
    return [];
  }
};

// Berechnet die Zeile für jedes Feld basierend auf Position und Breite
const calculateRows = (fields: TaskFieldConfig[]): Map<string, number> => {
  const rowMap = new Map<string, number>();
  let currentRow = 1;
  let currentRowWidth = 0;

  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  for (const field of sortedFields) {
    const fieldWidth = field.width || 100;
    
    // Wenn das Feld nicht in die aktuelle Zeile passt, neue Zeile beginnen
    if (currentRowWidth + fieldWidth > 100) {
      currentRow++;
      currentRowWidth = 0;
    }
    
    rowMap.set(field.id, currentRow);
    currentRowWidth += fieldWidth;
    
    // Wenn die Zeile voll ist, zur nächsten wechseln
    if (currentRowWidth >= 100) {
      currentRow++;
      currentRowWidth = 0;
    }
  }

  return rowMap;
};

export default function TaskFieldsManager() {
  const [fields, setFields] = useState<TaskFieldConfig[]>([]);
  const [sections, setSections] = useState<TaskFieldSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<TaskFieldConfig | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Section dialog state
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskFieldSection | null>(null);
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    description: '',
    isCollapsed: false,
  });
  
  const [formData, setFormData] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'TEXT',
    isRequired: false,
    visibleForRoles: [] as string[],
    width: 100,
    placeholder: '',
    defaultValue: '',
    options: '',
    sectionId: '' as string | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFields();
    fetchSections();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await fetch('/api/admin/task-fields');
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
      toast({
        title: 'Fehler',
        description: 'Feldkonfigurationen konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSections = async () => {
    try {
      const response = await fetch('/api/admin/task-sections');
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const visibleForRolesJson = formData.visibleForRoles.length > 0 
        ? JSON.stringify(formData.visibleForRoles) 
        : null;

      if (editingField) {
        // Update existing field
        const response = await fetch(`/api/admin/task-fields/${editingField.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: formData.label,
            isRequired: formData.isRequired,
            visibleForRoles: visibleForRolesJson,
            width: formData.width,
            placeholder: formData.placeholder || null,
            defaultValue: formData.defaultValue || null,
            options: formData.options || null,
          }),
        });

        if (response.ok) {
          toast({
            title: 'Erfolg',
            description: 'Feld wurde aktualisiert',
          });
          fetchFields();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update field');
        }
      } else {
        // Create new field
        const response = await fetch('/api/admin/task-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            visibleForRoles: visibleForRolesJson,
          }),
        });

        if (response.ok) {
          toast({
            title: 'Erfolg',
            description: 'Neues Feld wurde erstellt',
          });
          fetchFields();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create field');
        }
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRoles = async (field: TaskFieldConfig, selectedRoles: string[]) => {
    try {
      const visibleForRolesJson = selectedRoles.length > 0 
        ? JSON.stringify(selectedRoles) 
        : null;

      const response = await fetch(`/api/admin/task-fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleForRoles: visibleForRolesJson }),
      });

      if (response.ok) {
        setFields(fields.map(f => 
          f.id === field.id ? { ...f, visibleForRoles: visibleForRolesJson } : f
        ));
        toast({
          title: 'Erfolg',
          description: 'Sichtbarkeit wurde aktualisiert',
        });
      }
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Fehler',
        description: 'Sichtbarkeit konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateWidth = async (field: TaskFieldConfig, width: number) => {
    try {
      const response = await fetch(`/api/admin/task-fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width }),
      });

      if (response.ok) {
        setFields(fields.map(f => 
          f.id === field.id ? { ...f, width } : f
        ));
        toast({
          title: 'Erfolg',
          description: `Breite auf ${width}% geändert`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update width');
      }
    } catch (error: any) {
      console.error('Error updating width:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Breite konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (field: TaskFieldConfig, archive: boolean) => {
    try {
      const response = await fetch(`/api/admin/task-fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archive }),
      });

      if (response.ok) {
        setFields(fields.map(f => 
          f.id === field.id ? { ...f, isArchived: archive } : f
        ));
        toast({
          title: 'Erfolg',
          description: archive 
            ? `"${field.label}" wurde archiviert` 
            : `"${field.label}" wurde wiederhergestellt`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive field');
      }
    } catch (error: any) {
      console.error('Error archiving field:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Feld konnte nicht archiviert werden',
        variant: 'destructive',
      });
    }
  };

  const handleMoveField = async (field: TaskFieldConfig, direction: 'up' | 'down') => {
    const activeFields = fields.filter(f => !f.isArchived);
    const sortedFields = [...activeFields].sort((a, b) => a.position - b.position);
    const currentIndex = sortedFields.findIndex(f => f.id === field.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedFields.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherField = sortedFields[swapIndex];

    // Positionen tauschen
    const updates = [
      { id: field.id, position: otherField.position },
      { id: otherField.id, position: field.position },
    ];

    try {
      const response = await fetch('/api/admin/task-fields', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchFields();
      }
    } catch (error) {
      console.error('Error moving field:', error);
    }
  };

  const handleToggleRequired = async (field: TaskFieldConfig) => {
    try {
      const response = await fetch(`/api/admin/task-fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRequired: !field.isRequired }),
      });

      if (response.ok) {
        setFields(fields.map(f => 
          f.id === field.id ? { ...f, isRequired: !f.isRequired } : f
        ));
      }
    } catch (error) {
      console.error('Error toggling required:', error);
    }
  };

  const handleDelete = async (field: TaskFieldConfig) => {
    try {
      const response = await fetch(`/api/admin/task-fields/${field.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'Feld wurde gelöscht',
        });
        fetchFields();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete field');
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Section handlers
  const handleSectionSubmit = async () => {
    try {
      const url = editingSection 
        ? `/api/admin/task-sections/${editingSection.id}`
        : '/api/admin/task-sections';
      
      const response = await fetch(url, {
        method: editingSection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionFormData),
      });

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: editingSection ? 'Bereich wurde aktualisiert' : 'Bereich wurde erstellt',
        });
        setIsSectionDialogOpen(false);
        setEditingSection(null);
        setSectionFormData({ name: '', description: '', isCollapsed: false });
        fetchSections();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save section');
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSectionDelete = async (section: TaskFieldSection) => {
    try {
      const response = await fetch(`/api/admin/task-sections/${section.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'Bereich wurde gelöscht',
        });
        fetchSections();
        fetchFields(); // Refresh fields as sectionId will be set to null
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete section');
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSectionEdit = (section: TaskFieldSection) => {
    setEditingSection(section);
    setSectionFormData({
      name: section.name,
      description: section.description || '',
      isCollapsed: section.isCollapsed,
    });
    setIsSectionDialogOpen(true);
  };

  const handleFieldSectionChange = async (fieldId: string, sectionId: string | null) => {
    try {
      const response = await fetch(`/api/admin/task-fields/${fieldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: sectionId || null }),
      });

      if (response.ok) {
        fetchFields();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update field section');
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (field: TaskFieldConfig) => {
    setEditingField(field);
    setFormData({
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      visibleForRoles: parseRoles(field.visibleForRoles),
      width: field.width || 100,
      placeholder: field.placeholder || '',
      defaultValue: field.defaultValue || '',
      options: field.options || '',
      sectionId: field.sectionId || null,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingField(null);
    setFormData({
      fieldKey: '',
      label: '',
      fieldType: 'TEXT',
      isRequired: false,
      visibleForRoles: [],
      width: 100,
      placeholder: '',
      defaultValue: '',
      options: '',
      sectionId: null,
    });
  };

  const openNewFieldDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      visibleForRoles: prev.visibleForRoles.includes(role)
        ? prev.visibleForRoles.filter(r => r !== role)
        : [...prev.visibleForRoles, role]
    }));
  };

  // Aktive und archivierte Felder trennen
  const activeFields = fields.filter(f => !f.isArchived);
  const archivedFields = fields.filter(f => f.isArchived);

  // Zeilen berechnen nur für aktive Felder
  const rowMap = calculateRows(activeFields);
  const sortedActiveFields = [...activeFields].sort((a, b) => a.position - b.position);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bereiche verwalten */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Bereiche verwalten
              </CardTitle>
              <CardDescription>
                Gruppieren Sie Aufgabenfelder in Bereiche (nur im Formular sichtbar, nicht in der Detailansicht)
              </CardDescription>
            </div>
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingSection(null);
                    setSectionFormData({ name: '', description: '', isCollapsed: false });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Bereich
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSection ? 'Bereich bearbeiten' : 'Neuen Bereich erstellen'}
                  </DialogTitle>
                  <DialogDescription>
                    Bereiche gruppieren Felder visuell im Aufgabenformular
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sectionName">Name</Label>
                    <Input
                      id="sectionName"
                      value={sectionFormData.name}
                      onChange={(e) => setSectionFormData({ ...sectionFormData, name: e.target.value })}
                      placeholder="z.B. Allgemeine Informationen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sectionDescription">Beschreibung (optional)</Label>
                    <Input
                      id="sectionDescription"
                      value={sectionFormData.description}
                      onChange={(e) => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                      placeholder="Kurze Beschreibung des Bereichs"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sectionCollapsed"
                      checked={sectionFormData.isCollapsed}
                      onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, isCollapsed: checked })}
                    />
                    <Label htmlFor="sectionCollapsed">Standardmäßig eingeklappt</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSectionSubmit} disabled={!sectionFormData.name.trim()}>
                    {editingSection ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Bereiche erstellt. Erstellen Sie Bereiche, um Felder zu gruppieren.
            </p>
          ) : (
            <div className="space-y-2">
              {sections.map((section) => (
                <div 
                  key={section.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{section.name}</div>
                    {section.description && (
                      <div className="text-sm text-muted-foreground">{section.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Position: {section.position + 1}
                      </Badge>
                      {section.isCollapsed && (
                        <Badge variant="secondary" className="text-xs">Eingeklappt</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {fields.filter(f => f.sectionId === section.id).length} Felder
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSectionEdit(section)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Bereich löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Der Bereich &quot;{section.name}&quot; wird gelöscht. Die Felder in diesem Bereich werden nicht gelöscht, sondern nur aus dem Bereich entfernt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSectionDelete(section)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Felder verwalten */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Aufgabenfelder verwalten
              </CardTitle>
              <CardDescription>
                Konfigurieren Sie Felder, Reihenfolge, Breite und Rollen-Sichtbarkeit
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewFieldDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Feld
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingField ? 'Feld bearbeiten' : 'Neues Feld erstellen'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingField 
                      ? 'Bearbeiten Sie die Einstellungen dieses Feldes'
                      : 'Erstellen Sie ein neues benutzerdefiniertes Feld für Aufgaben'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!editingField && (
                    <div className="space-y-2">
                      <Label htmlFor="fieldKey">Feld-Schlüssel</Label>
                      <Input
                        id="fieldKey"
                        value={formData.fieldKey}
                        onChange={(e) => setFormData({ ...formData, fieldKey: e.target.value })}
                        placeholder="z.B. customField1"
                        pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
                      />
                      <p className="text-xs text-muted-foreground">
                        Interner Name (nur Buchstaben, Zahlen und Unterstriche)
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="label">Anzeigename</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="z.B. Zusätzliche Info"
                    />
                  </div>
                  {!editingField && (
                    <div className="space-y-2">
                      <Label htmlFor="fieldType">Feldtyp</Label>
                      <Select
                        value={formData.fieldType}
                        onValueChange={(value) => setFormData({ ...formData, fieldType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Feldtyp wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className="h-4 w-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="width">Breite</Label>
                    <Select
                      value={String(formData.width)}
                      onValueChange={(value) => setFormData({ ...formData, width: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Breite wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {WIDTH_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            <div className="flex items-center gap-2">
                              <Columns className="h-4 w-4" />
                              {option.label} - {option.description}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Felder unter 100% teilen sich eine Zeile mit dem nächsten Feld
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placeholder">Platzhalter</Label>
                    <Input
                      id="placeholder"
                      value={formData.placeholder}
                      onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                      placeholder="Platzhaltertext..."
                    />
                  </div>
                  {(formData.fieldType === 'SELECT' || formData.fieldType === 'MULTISELECT') && (
                    <div className="space-y-2">
                      <Label htmlFor="options">Optionen (JSON-Array)</Label>
                      <Input
                        id="options"
                        value={formData.options}
                        onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                        placeholder='["Option 1", "Option 2", "Option 3"]'
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: ["Option 1", "Option 2", ...]
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Sichtbar für Rollen</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((role) => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role.value}`}
                            checked={formData.visibleForRoles.includes(role.value)}
                            onCheckedChange={() => toggleRole(role.value)}
                          />
                          <label
                            htmlFor={`role-${role.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keine Auswahl = für alle Rollen sichtbar
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isRequired">Pflichtfeld</Label>
                    <Switch
                      id="isRequired"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingField ? 'Speichern' : 'Erstellen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Sortierung</TableHead>
                <TableHead className="w-[60px] text-center">Zeile</TableHead>
                <TableHead>Feldname</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="w-[120px]">Bereich</TableHead>
                <TableHead className="w-[100px] text-center">Breite</TableHead>
                <TableHead className="text-center">Pflicht</TableHead>
                <TableHead>Sichtbar für</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActiveFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveField(field, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveField(field, 'down')}
                        disabled={index === sortedActiveFields.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {rowMap.get(field.id) || '?'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {field.isSystem && (
                        <span title="Systemfeld"><Lock className="h-3 w-3 text-muted-foreground" /></span>
                      )}
                      <span className="font-medium">{field.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {field.fieldKey}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFieldTypeIcon(field.fieldType)}
                      <span className="text-sm text-muted-foreground">
                        {getFieldTypeLabel(field.fieldType)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={field.sectionId || 'none'}
                      onValueChange={(value) => handleFieldSectionChange(field.id, value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Kein Bereich" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Bereich</SelectItem>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <WidthSelector
                      field={field}
                      onUpdate={handleUpdateWidth}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={field.isRequired}
                      onCheckedChange={() => handleToggleRequired(field)}
                      disabled={field.fieldKey === 'title'}
                    />
                  </TableCell>
                  <TableCell>
                    <RoleSelector
                      field={field}
                      onUpdate={handleUpdateRoles}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(field)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(field, true)}
                        title="Archivieren"
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      {!field.isSystem && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Löschen">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Feld löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sind Sie sicher, dass Sie das Feld "{field.label}" löschen möchten?
                                Alle zugehörigen Werte werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(field)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {activeFields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Keine aktiven Feldkonfigurationen gefunden. Klicken Sie auf "Neues Feld", um zu beginnen.
            </div>
          )}

          {/* Formular-Vorschau */}
          {activeFields.length > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Formular-Vorschau (Zeilen-Layout)</h4>
              <div className="space-y-2">
                {Array.from(new Set(Array.from(rowMap.values()))).sort((a, b) => a - b).map(rowNum => {
                  const rowFields = sortedActiveFields.filter(f => rowMap.get(f.id) === rowNum);
                  return (
                    <div key={rowNum} className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground w-12">Zeile {rowNum}:</span>
                      <div className="flex-1 flex gap-2">
                        {rowFields.map(f => (
                          <div 
                            key={f.id}
                            className="bg-background border rounded px-2 py-1 text-xs"
                            style={{ width: `${f.width || 100}%`, minWidth: 0 }}
                          >
                            <span className="truncate block">{f.label}</span>
                            <span className="text-muted-foreground">{f.width || 100}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archivierte Felder */}
      {archivedFields.length > 0 && (
        <Card>
          <Collapsible open={showArchived} onOpenChange={setShowArchived}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Archivierte Felder</CardTitle>
                    <Badge variant="secondary">{archivedFields.length}</Badge>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showArchived ? 'rotate-90' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feldname</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedFields.map((field) => (
                      <TableRow key={field.id} className="opacity-60">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {field.isSystem && (
                              <span title="Systemfeld"><Lock className="h-3 w-3 text-muted-foreground" /></span>
                            )}
                            <span className="font-medium">{field.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {field.fieldKey}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFieldTypeIcon(field.fieldType)}
                            <span className="text-sm text-muted-foreground">
                              {getFieldTypeLabel(field.fieldType)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(field, false)}
                              title="Wiederherstellen"
                              className="text-green-600 hover:text-green-700"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            {!field.isSystem && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Endgültig löschen">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Feld endgültig löschen?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sind Sie sicher, dass Sie das archivierte Feld "{field.label}" endgültig löschen möchten?
                                      Alle zugehörigen Werte werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(field)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Endgültig löschen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}

// Komponente für die Breiten-Auswahl in der Tabelle
function WidthSelector({ 
  field, 
  onUpdate 
}: { 
  field: TaskFieldConfig; 
  onUpdate: (field: TaskFieldConfig, width: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentWidth = field.width || 100;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-7 px-2 font-mono text-xs min-w-[60px]"
        >
          {currentWidth}%
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="center">
        <div className="space-y-1">
          {WIDTH_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={currentWidth === option.value ? "secondary" : "ghost"}
              className="w-full justify-start text-xs h-8"
              onClick={() => {
                onUpdate(field, option.value);
                setOpen(false);
              }}
            >
              <Columns className="h-3 w-3 mr-2" />
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Komponente für die Rollen-Auswahl in der Tabelle
function RoleSelector({ 
  field, 
  onUpdate 
}: { 
  field: TaskFieldConfig; 
  onUpdate: (field: TaskFieldConfig, roles: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentRoles = parseRoles(field.visibleForRoles);

  const toggleRole = (role: string) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    onUpdate(field, newRoles);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto p-1 justify-start font-normal"
          disabled={field.fieldKey === 'title'}
        >
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            {currentRoles.length === 0 ? (
              <Badge variant="outline" className="text-xs">Alle</Badge>
            ) : (
              <div className="flex flex-wrap gap-1">
                {currentRoles.slice(0, 2).map(role => {
                  const roleConfig = ROLES.find(r => r.value === role);
                  return (
                    <Badge key={role} className={`text-xs ${roleConfig?.color || 'bg-gray-100'}`}>
                      {roleConfig?.label || role}
                    </Badge>
                  );
                })}
                {currentRoles.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{currentRoles.length - 2}</Badge>
                )}
              </div>
            )}
            <ChevronDown className="h-3 w-3 ml-1" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Sichtbar für:</p>
          {ROLES.map((role) => (
            <div key={role.value} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${field.id}-role-${role.value}`}
                checked={currentRoles.includes(role.value)}
                onCheckedChange={() => toggleRole(role.value)}
              />
              <label
                htmlFor={`field-${field.id}-role-${role.value}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {role.label}
              </label>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            Keine Auswahl = für alle sichtbar
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
