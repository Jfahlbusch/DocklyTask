'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  ListTodo,
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskForm from '@/components/forms/TaskForm';
import { useTaskContext } from '@/hooks/useTaskContext';

interface TemplateTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  parentTaskId?: string;
  templateId: string;
  subtasks?: TemplateTask[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
}

interface TemplateTaskManagerProps {
  template: ProjectTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksUpdated?: () => void;
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Niedrig', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  MEDIUM: { label: 'Mittel', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  HIGH: { label: 'Hoch', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  URGENT: { label: 'Dringend', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function TemplateTaskManager({
  template,
  open,
  onOpenChange,
  onTasksUpdated,
}: TemplateTaskManagerProps) {
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Kontext-Daten für TaskForm (werden im Template-Modus nicht alle benötigt)
  const { 
    customers, 
    projects, 
    categories, 
    users, 
    teams, 
    products, 
    taskStatuses 
  } = useTaskContext();
  
  // Form state für Hauptaufgaben und Unteraufgaben (jetzt mit TaskForm)
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [parentTaskIdForNewSubtask, setParentTaskIdForNewSubtask] = useState<string | null>(null);
  
  // Delete confirmation state
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  
  // Expanded tasks state (for subtask display)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Fetch tasks when template changes
  useEffect(() => {
    if (open && template) {
      fetchTasks();
    }
  }, [open, template?.id]);

  const fetchTasks = async () => {
    if (!template) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/template-tasks?templateId=${template.id}`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Aufgaben');
      }
      const data = await response.json();
      setTasks(data);
      
      // Expand all main tasks by default
      const mainTaskIds = data.filter((t: TemplateTask) => !t.parentTaskId).map((t: TemplateTask) => t.id);
      setExpandedTasks(new Set(mainTaskIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const openTaskForm = (task?: TemplateTask, parentId?: string) => {
    setEditingTask(task || null);
    setParentTaskIdForNewSubtask(parentId || null);
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setParentTaskIdForNewSubtask(null);
  };

  const handleTaskSubmit = async (data: any) => {
    if (!template) return;
    
    try {
      const templateTaskData = {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        templateId: template.id,
        parentTaskId: parentTaskIdForNewSubtask || undefined,
      };
      
      if (editingTask) {
        // Update existing task
        const response = await fetch(`/api/template-tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            description: data.description || undefined,
            priority: data.priority,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Fehler beim Aktualisieren der Aufgabe');
        }
        toast({ title: 'Erfolg', description: 'Aufgabe wurde aktualisiert' });
      } else {
        // Create new task
        const response = await fetch('/api/template-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateTaskData),
        });
        
        if (!response.ok) {
          throw new Error('Fehler beim Erstellen der Aufgabe');
        }
        toast({ title: 'Erfolg', description: parentTaskIdForNewSubtask ? 'Unteraufgabe wurde erstellt' : 'Aufgabe wurde erstellt' });
      }
      
      await fetchTasks();
      closeTaskForm();
      onTasksUpdated?.();
    } catch (err) {
      console.error('Error saving task:', err);
      toast({ title: 'Fehler', description: 'Aufgabe konnte nicht gespeichert werden', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    
    try {
      const response = await fetch(`/api/template-tasks/${deleteTaskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Aufgabe');
      }
      
      await fetchTasks();
      setDeleteTaskId(null);
      onTasksUpdated?.();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Organize tasks into main tasks and subtasks
  const mainTasks = tasks.filter(t => !t.parentTaskId);
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parentTaskId === parentId);

  const renderTask = (task: TemplateTask, isSubtask = false) => {
    const subtasks = getSubtasks(task.id);
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

    return (
      <div key={task.id} className={`${isSubtask ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className={`hover:shadow-sm transition-shadow ${isSubtask ? 'bg-gray-50/50' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              {/* Expand/Collapse button for main tasks with subtasks */}
              {!isSubtask && hasSubtasks && (
                <button
                  onClick={() => toggleTaskExpanded(task.id)}
                  className="mt-1 p-0.5 rounded hover:bg-gray-100"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              )}
              
              {/* Drag handle placeholder */}
              <div className="mt-1 text-gray-300 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              
              {/* Task content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${priority.bgColor} ${priority.color} text-xs`}>
                      {priority.label}
                    </Badge>
                    
                    {hasSubtasks && (
                      <Badge variant="outline" className="text-xs">
                        {subtasks.length} Unteraufgabe{subtasks.length !== 1 ? 'n' : ''}
                      </Badge>
                    )}
                    
                    {/* Dropdown-Menü nur für Hauptaufgaben, nicht für Unteraufgaben */}
                    {!isSubtask && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openTaskForm(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteTaskId(task.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Render subtasks if expanded */}
        {isExpanded && subtasks.length > 0 && (
          <div className="mt-2 space-y-2">
            {subtasks.map(subtask => renderTask(subtask, true))}
          </div>
        )}
      </div>
    );
  };

  if (!template) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[85vw] min-w-[700px] max-w-[1000px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Aufgaben verwalten: {template.name}
            </DialogTitle>
            <DialogDescription>
              Definieren Sie hier alle Aufgaben, die bei Erstellung eines Projekts aus dieser Vorlage automatisch angelegt werden.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="text-sm text-gray-600">
              {mainTasks.length} Hauptaufgabe{mainTasks.length !== 1 ? 'n' : ''} 
              {tasks.length - mainTasks.length > 0 && (
                <span className="ml-1">
                  ({tasks.length - mainTasks.length} Unteraufgabe{tasks.length - mainTasks.length !== 1 ? 'n' : ''})
                </span>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={() => openTaskForm()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Aufgabe hinzufügen
            </Button>
          </div>

          <ScrollArea className="h-[50vh] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            ) : mainTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <ListTodo className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Keine Aufgaben vorhanden</p>
                <p className="text-sm mt-1">Fügen Sie Aufgaben hinzu, die bei Projekterstellung angelegt werden.</p>
                <Button 
                  className="mt-4"
                  onClick={() => openTaskForm()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Aufgabe hinzufügen
                </Button>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {mainTasks.map(task => renderTask(task))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TaskForm im Template-Modus */}
      {template && (
        <TaskForm
          task={editingTask ? {
            ...editingTask,
            status: 'PENDING',
            createdById: '',
          } : undefined}
          customers={customers}
          projects={projects}
          categories={categories}
          users={users}
          teams={teams}
          products={products}
          taskStatuses={taskStatuses}
          onSubmit={handleTaskSubmit}
          onCancel={closeTaskForm}
          open={showTaskForm}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeTaskForm();
          }}
          mode="template"
          templateId={template.id}
          parentTaskId={parentTaskIdForNewSubtask || undefined}
          onTemplateTaskCreated={() => {
            fetchTasks();
            onTasksUpdated?.();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Aufgabe wirklich löschen? 
              {getSubtasks(deleteTaskId || '').length > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Achtung: Alle Unteraufgaben werden ebenfalls gelöscht!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

