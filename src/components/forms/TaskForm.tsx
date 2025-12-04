'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MultiDropdownSelect from '@/components/ui/MultiDropdownSelect';
import { renderProductIcon } from '@/components/shared/ProductIcon';
import { CalendarIcon, Package, ChevronDown, ChevronRight, Plus, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DropdownSelect from '@/components/ui/DropdownSelect';
import SubtaskForm from '@/components/forms/SubtaskForm';
import SubtaskList from '@/components/shared/SubtaskList';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';

const taskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  statusId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFieldSection {
  id: string;
  name: string;
  description?: string | null;
  isCollapsed: boolean;
  position: number;
}

interface TaskFieldConfig {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  visibleForRoles?: string | null;
  isArchived: boolean;
  position: number;
  width: number;
  placeholder?: string;
  defaultValue?: string;
  options?: string;
  sectionId?: string | null;
  section?: TaskFieldSection | null;
}

// Mode: 'task' für echte Aufgaben, 'template' für Projektvorlagen
type FormMode = 'task' | 'template';

interface TaskFormProps {
  task?: any;
  customers: any[];
  projects: any[];
  categories: any[];
  users: any[];
  teams: any[];
  products: any[];
  taskStatuses: any[];
  onSubmit: (data: TaskFormData | TemplateTaskFormData) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Template-spezifische Props
  mode?: FormMode;
  templateId?: string; // Pflicht bei mode='template'
  parentTaskId?: string; // Optional: für Unteraufgaben im Template-Modus
  onTemplateTaskCreated?: () => void; // Callback nach Erstellung einer Template-Aufgabe
  // Vorauswahl Props
  defaultCustomerId?: string; // Optional: Kunde vorausgewählt
}

// Datenstruktur für Template-Aufgaben
interface TemplateTaskFormData {
  title: string;
  description?: string;
  priority: string;
  templateId: string;
  parentTaskId?: string;
}

// Helper: Parse roles from JSON string
const parseRoles = (rolesJson: string | null | undefined): string[] => {
  if (!rolesJson) return [];
  try {
    return JSON.parse(rolesJson);
  } catch {
    return [];
  }
};

// Helper: Check if field is visible for current user role
const isFieldVisibleForRole = (field: TaskFieldConfig, userRole: string): boolean => {
  if (!field.isVisible || field.isArchived) return false;
  
  const visibleRoles = parseRoles(field.visibleForRoles);
  // If no roles specified, field is visible for all
  if (visibleRoles.length === 0) return true;
  
  // Map user role to field role format
  const roleMap: Record<string, string> = {
    'ADMIN': 'ADMIN',
    'MANAGER': 'MANAGER',
    'USER': 'USER',
    'VIEWER': 'VIEWER',
  };
  
  const mappedRole = roleMap[userRole] || userRole;
  return visibleRoles.includes(mappedRole);
};


export default function TaskForm({ 
  task, 
  customers, 
  projects, 
  categories, 
  users, 
  teams,
  products,
  taskStatuses,
  onSubmit, 
  onCancel, 
  open, 
  onOpenChange,
  // Template-spezifische Props
  mode = 'task',
  templateId,
  parentTaskId,
  onTemplateTaskCreated,
  // Vorauswahl Props
  defaultCustomerId,
}: TaskFormProps) {
  const isTemplateMode = mode === 'template';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldConfigs, setFieldConfigs] = useState<TaskFieldConfig[]>([]);
  const [sections, setSections] = useState<TaskFieldSection[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const permissions = useUserPermissions();
  const { toast } = useToast();
  
  // Subtasks state
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  
  // Priority colors for subtasks
  const priorityColors = { 
    LOW: 'bg-gray-100 text-gray-800', 
    MEDIUM: 'bg-yellow-100 text-yellow-800', 
    HIGH: 'bg-orange-100 text-orange-800', 
    URGENT: 'bg-red-100 text-red-800' 
  } as const;
  
  // Helper function for user initials
  const getInitials = (raw: string | undefined | null) => {
    const value = (raw || '').trim();
    if (!value) return '?';
    const emailIdx = value.indexOf('@');
    const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
    const bySpace = base.split(/\s+/).filter(Boolean);
    if (bySpace.length >= 2) return (bySpace[0][0] + bySpace[bySpace.length - 1][0]).toUpperCase();
    return base.slice(0, 2).toUpperCase();
  };
  
  // Determine user role from permissions
  const userRole = permissions.isAdmin ? 'ADMIN' 
    : permissions.isManager ? 'MANAGER'
    : permissions.isViewer ? 'VIEWER'
    : 'USER';
  
  // Load field configurations and sections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, sectionsRes] = await Promise.all([
          fetch('/api/admin/task-fields'),
          fetch('/api/admin/task-sections'),
        ]);
        
        if (fieldsRes.ok) {
          const data = await fieldsRes.json();
          setFieldConfigs(data);
        }
        
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData);
          // Initialize open state for sections
          const initialOpenState: Record<string, boolean> = {};
          sectionsData.forEach((s: TaskFieldSection) => {
            initialOpenState[s.id] = !s.isCollapsed;
          });
          setOpenSections(initialOpenState);
        }
      } catch (error) {
        console.error('Error fetching field configs:', error);
      } finally {
        setLoadingFields(false);
      }
    };
    
    if (open) {
      fetchData();
    }
  }, [open]);
  
  // Load subtasks when editing an existing task
  useEffect(() => {
    const fetchSubtasks = async () => {
      if (!task?.id || !open) return;
      
      try {
        if (isTemplateMode) {
          // Im Template-Modus: Unteraufgaben sind TemplateTasks mit parentTaskId
          // Diese werden bereits im task.subtasks Objekt mitgeliefert
          if (task.subtasks) {
            setSubtasks(task.subtasks);
          }
        } else {
          // Im Task-Modus: Lade echte SubTasks über die API
          const response = await fetch(`/api/tasks/${task.id}/subtasks`);
          if (response.ok) {
            const data = await response.json();
            setSubtasks(data);
          }
        }
      } catch (error) {
        console.error('Error fetching subtasks:', error);
      }
    };
    
    if (task?.id && open) {
      fetchSubtasks();
      // Also load from task if available
      if (task.subtasks) {
        setSubtasks(task.subtasks);
      }
    } else {
      setSubtasks([]);
    }
  }, [task?.id, open, isTemplateMode]);
  
  // Subtask handlers
  const handleSubtaskAdd = async (data: any) => {
    // Use taskId from data (passed from SubtaskForm) or from task prop
    const taskId = data.taskId || task?.id;
    
    if (!taskId) {
      console.error('No task ID available. task:', task, 'data.taskId:', data.taskId);
      toast({ title: 'Fehler', description: 'Keine Aufgaben-ID vorhanden', variant: 'destructive' });
      return;
    }
    
    try {
      if (isTemplateMode) {
        // Im Template-Modus: SubtaskForm hat die Unteraufgabe bereits erstellt und übergibt sie mit ID
        // Wir müssen sie nur noch zum lokalen State hinzufügen und den Callback aufrufen
        if (data.id) {
          // Unteraufgabe wurde bereits von SubtaskForm erstellt
          setSubtasks(prev => [...prev, data]);
          setShowSubtaskForm(false);
          onTemplateTaskCreated?.();
        } else {
          // Fallback: Falls keine ID vorhanden, selbst erstellen (sollte nicht vorkommen)
          if (!templateId) {
            throw new Error('templateId ist erforderlich im Template-Modus');
          }
          
          const templateData = {
            title: data.title,
            description: data.description || undefined,
            priority: data.priority || 'MEDIUM',
            parentTaskId: taskId,
            templateId: templateId,
          };
          
          console.log('Creating template subtask (fallback):', templateData);
          
          const response = await fetch('/api/template-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData),
          });
          
          if (response.ok) {
            const newSubtask = await response.json();
            setSubtasks(prev => [...prev, newSubtask]);
            setShowSubtaskForm(false);
            toast({ title: 'Erfolg', description: 'Unteraufgabe wurde erstellt' });
            onTemplateTaskCreated?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', response.status, errorData);
            throw new Error(errorData.error || 'Fehler beim Erstellen der Template-Unteraufgabe');
          }
        }
      } else {
        // Im Task-Modus: Erstelle echte SubTask
        console.log('Creating subtask for task:', taskId);
        const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            description: data.description || undefined,
            priority: data.priority || 'MEDIUM',
            assigneeId: data.assigneeId || undefined,
            teamId: data.teamId || undefined,
          }),
        });
        
        if (response.ok) {
          const newSubtask = await response.json();
          setSubtasks(prev => [...prev, newSubtask]);
          setShowSubtaskForm(false);
          toast({ title: 'Erfolg', description: 'Unteraufgabe wurde erstellt' });
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, JSON.stringify(errorData, null, 2));
          if (errorData.debug) {
            console.error('Debug info:', errorData.debug);
          }
          throw new Error(errorData.error || 'Failed to create subtask');
        }
      }
    } catch (error: any) {
      console.error('Error creating subtask:', error);
      toast({ title: 'Fehler', description: error.message || 'Unteraufgabe konnte nicht erstellt werden', variant: 'destructive' });
    }
  };
  
  const handleSubtaskEdit = async (data: any) => {
    if (!editingSubtask?.id) return;
    try {
      const response = await fetch(`/api/subtasks/${editingSubtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const updatedSubtask = await response.json();
        setSubtasks(prev => prev.map(st => st.id === editingSubtask.id ? updatedSubtask : st));
        setShowSubtaskForm(false);
        setEditingSubtask(null);
        toast({ title: 'Erfolg', description: 'Unteraufgabe wurde aktualisiert' });
      } else {
        throw new Error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast({ title: 'Fehler', description: 'Unteraufgabe konnte nicht aktualisiert werden', variant: 'destructive' });
    }
  };
  
  const handleSubtaskDelete = async (subtaskId: string) => {
    if (!confirm('Unteraufgabe wirklich löschen?')) return;
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
        toast({ title: 'Erfolg', description: 'Unteraufgabe wurde gelöscht' });
      } else {
        throw new Error('Failed to delete subtask');
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast({ title: 'Fehler', description: 'Unteraufgabe konnte nicht gelöscht werden', variant: 'destructive' });
    }
  };
  
  const handleSubtaskToggleStatus = async (subtask: any) => {
    const newStatus = subtask.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const response = await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        setSubtasks(prev => prev.map(st => st.id === subtask.id ? { ...st, status: newStatus } : st));
      }
    } catch (error) {
      console.error('Error toggling subtask status:', error);
    }
  };
  
  const handleSubtaskPriorityChange = async (subtaskId: string, priority: string) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      
      if (response.ok) {
        setSubtasks(prev => prev.map(st => st.id === subtaskId ? { ...st, priority } : st));
      }
    } catch (error) {
      console.error('Error updating subtask priority:', error);
    }
  };
  
  const handleSubtaskAssigneeChange = async (subtaskId: string, assigneeId: string) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      });
      
      if (response.ok) {
        const found = users.find(u => u.id === assigneeId);
        setSubtasks(prev => prev.map(st => st.id === subtaskId ? { ...st, assigneeId, assignee: found } : st));
      }
    } catch (error) {
      console.error('Error updating subtask assignee:', error);
    }
  };
  
  const handleSubtaskTeamChange = async (subtaskId: string, teamId: string) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      
      if (response.ok) {
        const found = teams.find(t => t.id === teamId);
        setSubtasks(prev => prev.map(st => st.id === subtaskId ? { ...st, teamId, team: found } : st));
      }
    } catch (error) {
      console.error('Error updating subtask team:', error);
    }
  };
  
  // Extract current product IDs from task
  const getProductIdsFromTask = (t: any) => {
    if (!t?.products) return [];
    return t.products.map((tp: any) => tp.productId || tp.product?.id).filter(Boolean);
  };

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'MEDIUM',
      startDate: task?.startDate ? new Date(task.startDate) : undefined,
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      customerId: task?.customerId || defaultCustomerId || '',
      projectId: task?.projectId || '',
      categoryId: task?.categoryId || '',
      assigneeId: task?.assigneeId || '',
      teamId: task?.teamId || '',
      statusId: task?.statusId || '',
      productIds: getProductIdsFromTask(task),
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        startDate: task.startDate ? new Date(task.startDate) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        customerId: task.customerId || '',
        projectId: task.projectId || '',
        categoryId: task.categoryId || '',
        assigneeId: task.assigneeId || '',
        teamId: task.teamId || '',
        statusId: task.statusId || '',
        productIds: getProductIdsFromTask(task),
      });
    } else {
      form.reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        startDate: undefined,
        dueDate: undefined,
        customerId: defaultCustomerId || '',
        projectId: '',
        categoryId: '',
        assigneeId: '',
        teamId: '',
        statusId: '',
        productIds: [],
      });
    }
  }, [task, form, defaultCustomerId]);

  const handleSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      // Convert dates to Date objects for proper typing
      const submitData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        productIds: data.productIds || [],
      };
      
      await onSubmit(submitData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Product multi-select helpers
  const selectedProductIds = form.watch('productIds') || [];
  
  const handleProductsChange = (newProductIds: string[]) => {
    form.setValue('productIds', newProductIds);
  };

  // Default fallback fields if no config loaded
  const defaultFields: TaskFieldConfig[] = [
    { id: 'fallback-title', fieldKey: 'title', label: 'Titel', fieldType: 'TEXT', isRequired: true, isVisible: true, isArchived: false, position: 0, width: 100 },
    { id: 'fallback-description', fieldKey: 'description', label: 'Beschreibung', fieldType: 'RICHTEXT', isRequired: false, isVisible: true, isArchived: false, position: 1, width: 100 },
    { id: 'fallback-products', fieldKey: 'products', label: 'Produkte', fieldType: 'PRODUCT', isRequired: false, isVisible: true, isArchived: false, position: 2, width: 100 },
    { id: 'fallback-priority', fieldKey: 'priority', label: 'Priorität', fieldType: 'SELECT', isRequired: true, isVisible: true, isArchived: false, position: 3, width: 50 },
    { id: 'fallback-status', fieldKey: 'status', label: 'Status', fieldType: 'SELECT', isRequired: true, isVisible: true, isArchived: false, position: 4, width: 50 },
    { id: 'fallback-customer', fieldKey: 'customer', label: 'Kunde', fieldType: 'CUSTOMER', isRequired: false, isVisible: true, isArchived: false, position: 5, width: 50 },
    { id: 'fallback-assignee', fieldKey: 'assignee', label: 'Zugewiesen an', fieldType: 'USER', isRequired: false, isVisible: true, isArchived: false, position: 6, width: 50 },
    { id: 'fallback-team', fieldKey: 'team', label: 'Team', fieldType: 'TEAM', isRequired: false, isVisible: true, isArchived: false, position: 7, width: 50 },
    { id: 'fallback-project', fieldKey: 'project', label: 'Projekt', fieldType: 'PROJECT', isRequired: false, isVisible: true, isArchived: false, position: 8, width: 50 },
    { id: 'fallback-category', fieldKey: 'category', label: 'Kategorie', fieldType: 'CATEGORY', isRequired: false, isVisible: true, isArchived: false, position: 9, width: 50 },
    { id: 'fallback-startDate', fieldKey: 'startDate', label: 'Startdatum', fieldType: 'DATE', isRequired: false, isVisible: true, isArchived: false, position: 10, width: 50 },
    { id: 'fallback-dueDate', fieldKey: 'dueDate', label: 'Fälligkeitsdatum', fieldType: 'DATE', isRequired: false, isVisible: true, isArchived: false, position: 11, width: 50 },
  ];

  // Filter and sort visible fields (use fallback if no config)
  // Im Template-Modus werden jetzt ALLE Felder angezeigt (wie bei echten Aufgaben)
  const visibleFields = useMemo(() => {
    const fieldsToUse = fieldConfigs.length > 0 ? fieldConfigs : defaultFields;
    return fieldsToUse
      .filter(field => isFieldVisibleForRole(field, userRole))
      .sort((a, b) => a.position - b.position);
  }, [fieldConfigs, userRole]);

  // Helper: Convert width percentage to grid column span
  const getColSpan = (width: number): string => {
    if (width >= 100) return 'col-span-4';
    if (width >= 75) return 'col-span-3';
    if (width >= 50) return 'col-span-2';
    return 'col-span-1'; // 25% or less
  };

  // Render a single field based on its configuration
  const renderField = (field: TaskFieldConfig) => {
    const fieldKey = field.fieldKey;
    const width = field.width || 100;
    const isRequired = field.isRequired;
    const placeholder = field.placeholder || '';
    const colSpan = getColSpan(width);

    switch (fieldKey) {
      case 'title':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="title"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <FormControl>
                  <Input placeholder={placeholder || 'Aufgabentitel'} {...formField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'description':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="description"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <FormControl>
                  <FixedRichTextEditor
                    value={formField.value || ''}
                    onChange={formField.onChange}
                    placeholder={placeholder || 'Aufgabenbeschreibung (Rich-Text)'}
                    className="min-h-[180px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'products':
        return (
          <FormItem key={field.id} className={colSpan}>
            <FormLabel className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {field.label} {isRequired && '*'}
            </FormLabel>
            <MultiDropdownSelect
              items={products.map((p) => ({
                id: p.id,
                label: p.name,
                icon: renderProductIcon(p.icon, "w-4 h-4"),
              }))}
              selectedIds={selectedProductIds}
              onSelectionChange={handleProductsChange}
              icon={<Package className="h-3 w-3 text-gray-500" />}
              emptyLabel="Produkte wählen"
              placeholder="Produkt suchen..."
              buttonClassName="w-full justify-start px-3 py-2 text-sm font-normal border rounded-md cursor-pointer hover:bg-accent"
            />
          </FormItem>
        );

      case 'priority':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="priority"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Priorität wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">Niedrig</SelectItem>
                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                    <SelectItem value="HIGH">Hoch</SelectItem>
                    <SelectItem value="URGENT">Dringend</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'status':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="statusId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Status wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'customer':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="customerId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Kunde wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'assignee':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="assigneeId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Benutzer wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'team':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="teamId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Team wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: team.color }}
                          ></div>
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'project':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="projectId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Projekt wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'category':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="categoryId"
            render={({ field: formField }) => (
              <FormItem className={colSpan}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || 'Kategorie wählen'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'startDate':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="startDate"
            render={({ field: formField }) => (
              <FormItem className={`flex flex-col ${colSpan}`}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                      >
                        {formField.value ? (
                          format(formField.value, "PPP", { locale: de })
                        ) : (
                          <span>{placeholder || 'Datum wählen'}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value}
                      onSelect={formField.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'dueDate':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name="dueDate"
            render={({ field: formField }) => (
              <FormItem className={`flex flex-col ${colSpan}`}>
                <FormLabel>
                  {field.label} {isRequired && '*'}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                      >
                        {formField.value ? (
                          format(formField.value, "PPP", { locale: de })
                        ) : (
                          <span>{placeholder || 'Datum wählen'}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value}
                      onSelect={formField.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        // Custom fields - could be extended later
        return null;
    }
  };

  if (loadingFields) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {isTemplateMode 
                ? (task ? 'Vorlagen-Aufgabe bearbeiten' : (parentTaskId ? 'Unteraufgabe zur Vorlage hinzufügen' : 'Neue Vorlagen-Aufgabe'))
                : (task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isTemplateMode 
              ? (task ? 'Vorlagen-Aufgabe bearbeiten' : (parentTaskId ? 'Unteraufgabe zur Vorlage hinzufügen' : 'Neue Vorlagen-Aufgabe'))
              : (task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 pb-4">
                {/* Felder ohne Bereich */}
                {(() => {
                  const fieldsWithoutSection = visibleFields.filter(f => !f.sectionId);
                  if (fieldsWithoutSection.length > 0) {
                    return (
                      <div className="grid grid-cols-4 gap-4">
                        {fieldsWithoutSection.map(field => renderField(field))}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Felder nach Bereichen gruppiert */}
                {sections
                  .sort((a, b) => a.position - b.position)
                  .map((section) => {
                    const sectionFields = visibleFields.filter(f => f.sectionId === section.id);
                    if (sectionFields.length === 0) return null;
                    
                    const isOpen = openSections[section.id] ?? !section.isCollapsed;
                    
                    return (
                      <Collapsible
                        key={section.id}
                        open={isOpen}
                        onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [section.id]: open }))}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">{section.name}</span>
                                {section.description && (
                                  <span className="text-sm text-muted-foreground">
                                    — {section.description}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {sectionFields.length} Feld{sectionFields.length !== 1 ? 'er' : ''}
                              </span>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4 pt-0 grid grid-cols-4 gap-4">
                              {sectionFields.map(field => renderField(field))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
              </div>
              
              {/* Unteraufgaben - nur beim Bearbeiten einer bestehenden Aufgabe */}
              {task?.id && (
                <Card className="mt-6">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Unteraufgaben ({subtasks.length})</CardTitle>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setEditingSubtask(null);
                          setShowSubtaskForm(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Hinzufügen
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-[200px] overflow-y-auto">
                      <SubtaskList
                        subtasks={subtasks}
                        statusMap={subtasks.reduce((acc, st) => ({ ...acc, [st.id]: st.status }), {})}
                        onToggle={isTemplateMode ? undefined : (id, status) => {
                          const subtask = subtasks.find(s => s.id === id);
                          if (subtask) handleSubtaskToggleStatus(subtask);
                        }}
                        onEdit={(subtask) => {
                          setEditingSubtask(subtask);
                          setShowSubtaskForm(true);
                        }}
                        onDelete={handleSubtaskDelete}
                        users={users}
                        teams={teams}
                        onPriorityChange={(id, priority) => handleSubtaskPriorityChange(id, priority)}
                        onAssigneeChange={(id, userId) => handleSubtaskAssigneeChange(id, userId)}
                        onTeamChange={(id, teamId) => handleSubtaskTeamChange(id, teamId)}
                        mode={isTemplateMode ? 'template' : 'task'}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </ScrollArea>
            
            {/* SubtaskForm Dialog */}
            {task?.id && (
              <SubtaskForm
                taskId={task.id}
                templateId={templateId}
                mode={isTemplateMode ? 'template' : 'task'}
                onSubmit={editingSubtask ? handleSubtaskEdit : handleSubtaskAdd}
                onCancel={() => {
                  setShowSubtaskForm(false);
                  setEditingSubtask(null);
                }}
                open={showSubtaskForm}
                onOpenChange={(open) => {
                  setShowSubtaskForm(open);
                  if (!open) setEditingSubtask(null);
                }}
                users={users}
                teams={teams}
                editingSubtask={editingSubtask}
              />
            )}

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gespeichert...' : task ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
