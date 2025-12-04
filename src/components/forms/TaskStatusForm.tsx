'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const taskStatusSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(50, 'Name darf maximal 50 Zeichen lang sein'),
  label: z.string().min(1, 'Label ist erforderlich').max(50, 'Label darf maximal 50 Zeichen lang sein'),
  description: z.string().optional(),
  color: z.string().min(1, 'Farbe ist erforderlich'),
  order: z.number().min(0, 'Reihenfolge muss mindestens 0 sein'),
  isActive: z.boolean(),
});

type TaskStatusFormData = z.infer<typeof taskStatusSchema>;

interface TaskStatusFormProps {
  status?: {
    id: string;
    name: string;
    label: string;
    description?: string;
    color: string;
    order: number;
    isActive: boolean;
  };
  onSubmit: (data: TaskStatusFormData) => Promise<void>;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorOptions = [
  { value: 'bg-gray-100 text-gray-800', label: 'Grau', preview: 'bg-gray-100 text-gray-800' },
  { value: 'bg-blue-100 text-blue-800', label: 'Blau', preview: 'bg-blue-100 text-blue-800' },
  { value: 'bg-green-100 text-green-800', label: 'Grün', preview: 'bg-green-100 text-green-800' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Gelb', preview: 'bg-yellow-100 text-yellow-800' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange', preview: 'bg-orange-100 text-orange-800' },
  { value: 'bg-red-100 text-red-800', label: 'Rot', preview: 'bg-red-100 text-red-800' },
  { value: 'bg-purple-100 text-purple-800', label: 'Lila', preview: 'bg-purple-100 text-purple-800' },
  { value: 'bg-pink-100 text-pink-800', label: 'Pink', preview: 'bg-pink-100 text-pink-800' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo', preview: 'bg-indigo-100 text-indigo-800' },
];

export default function TaskStatusForm({ status, onSubmit, onCancel, open, onOpenChange }: TaskStatusFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskStatusFormData>({
    resolver: zodResolver(taskStatusSchema),
    defaultValues: {
      name: status?.name || '',
      label: status?.label || '',
      description: status?.description || '',
      color: status?.color || 'bg-gray-100 text-gray-800',
      order: status?.order || 0,
      isActive: status?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (status) {
      form.reset({
        name: status.name,
        label: status.label,
        description: status.description || '',
        color: status.color,
        order: status.order,
        isActive: status.isActive,
      });
    } else {
      form.reset({
        name: '',
        label: '',
        description: '',
        color: 'bg-gray-100 text-gray-800',
        order: 0,
        isActive: true,
      });
    }
  }, [status, form]);

  const handleSubmit = async (data: TaskStatusFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {status ? 'Status bearbeiten' : 'Neuen Status erstellen'}
          </DialogTitle>
          <DialogDescription>
            {status 
              ? 'Ändern Sie die Details des Status.'
              : 'Erstellen Sie einen neuen Status für Aufgaben.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (intern)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="z.B. IN_REVIEW" 
                      {...field} 
                      disabled={status && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status.name)}
                    />
                  </FormControl>
                  <FormMessage />
                  {status && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status.name) && (
                    <p className="text-sm text-gray-500">
                      Der Name der Standard-Status kann nicht geändert werden.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (angezeigt)</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. In Prüfung" {...field} />
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
                      placeholder="Beschreibung des Status..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farbe</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Farbe auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${color.preview}`}>
                              {color.label}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reihenfolge</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Aktiv</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Status in der Anwendung verfügbar machen
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gespeichert...' : status ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}