'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Schema für echte Subtasks (mit assigneeId, teamId)
const subtaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  taskId: z.string(),
});

// Schema für Template-Subtasks (jetzt mit assigneeId und teamId)
const templateSubtaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  parentTaskId: z.string(),
  templateId: z.string(),
});

type SubtaskFormInput = z.input<typeof subtaskSchema>;
type SubtaskFormOutput = z.output<typeof subtaskSchema>;
type TemplateSubtaskFormInput = z.input<typeof templateSubtaskSchema>;
type TemplateSubtaskFormOutput = z.output<typeof templateSubtaskSchema>;

// Mode: 'task' für echte Aufgaben, 'template' für Projektvorlagen
type FormMode = 'task' | 'template';

interface SubtaskFormProps {
  taskId: string; // Bei mode='task': taskId, bei mode='template': parentTaskId (TemplateTask)
  templateId?: string; // Nur bei mode='template': die Template-ID
  mode?: FormMode;
  onSubmit: (data: SubtaskFormOutput | TemplateSubtaskFormOutput) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users?: any[];
  teams?: any[];
  editingSubtask?: any;
}

export default function SubtaskForm({ 
  taskId, 
  templateId,
  mode = 'task',
  onSubmit, 
  onCancel, 
  open, 
  onOpenChange,
  users = [],
  teams = [],
  editingSubtask = null
}: SubtaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const isTemplateMode = mode === 'template';

  // Für task-mode nutzen wir das normale Schema
  const form = useForm<SubtaskFormInput>({
    resolver: zodResolver(subtaskSchema),
    defaultValues: {
      title: editingSubtask?.title || '',
      description: editingSubtask?.description || '',
      priority: editingSubtask?.priority || 'MEDIUM',
      assigneeId: editingSubtask?.assigneeId || undefined,
      teamId: editingSubtask?.teamId || undefined,
      taskId: taskId,
    },
  });

  // Wenn eine bestehende Unteraufgabe bearbeitet wird, Werte in das Formular laden
  useEffect(() => {
    if (open) {
      form.reset({
        title: editingSubtask?.title || '',
        description: editingSubtask?.description || '',
        priority: editingSubtask?.priority || 'MEDIUM',
        assigneeId: editingSubtask?.assigneeId || undefined,
        teamId: editingSubtask?.teamId || undefined,
        taskId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSubtask, taskId, open]);

  const handleSubmit = async (data: SubtaskFormInput) => {
    setIsSubmitting(true);
    try {
      if (isTemplateMode) {
        // Template-Modus: Erstelle TemplateTask mit parentTaskId
        if (!templateId) {
          throw new Error('templateId ist erforderlich im Template-Modus');
        }
        
        const templateData = {
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          parentTaskId: taskId, // taskId ist hier die parentTaskId
          templateId: templateId,
          assigneeId: data.assigneeId || null,
          teamId: data.teamId || null,
        };
        
        console.log('Creating template subtask:', templateData);
        
        const response = await fetch('/api/template-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Fehler beim Erstellen der Template-Unteraufgabe');
        }
        
        const newSubtask = await response.json();
        await onSubmit(newSubtask);
        toast({ title: 'Erfolg', description: 'Unteraufgabe wurde erstellt' });
      } else {
        // Task-Modus: Normales Verhalten
        const parsed: SubtaskFormOutput = subtaskSchema.parse(data);
        await onSubmit(parsed);
      }
      
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting subtask:', error);
      toast({ title: 'Fehler', description: error.message || 'Fehler beim Erstellen', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingSubtask ? 'Unteraufgabe bearbeiten' : 'Neue Unteraufgabe erstellen'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel *</FormLabel>
                  <FormControl>
                    <Input placeholder="Unteraufgaben-Titel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beschreibung der Unteraufgabe" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorität</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Priorität wählen" />
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

            {/* Status entfernt */}

            {/* Assignee und Team - jetzt auch im Template-Modus verfügbar */}
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zugewiesen an</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Person wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users && users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-users" disabled>
                          Keine Benutzer verfügbar
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Team wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams && teams.length > 0 ? (
                        teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teams" disabled>
                          Keine Teams verfügbar
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gespeichert...' : (editingSubtask ? 'Speichern' : 'Erstellen')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}