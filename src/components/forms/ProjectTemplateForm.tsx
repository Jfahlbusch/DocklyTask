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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { renderProductIcon } from '@/components/shared/ProductIcon';

const projectTemplateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

type ProjectTemplateFormData = z.infer<typeof projectTemplateSchema>;

interface Product {
  id: string;
  name: string;
  icon?: string;
}

interface ProjectTemplateFormProps {
  template?: any;
  products: Product[];
  onSubmit: (data: ProjectTemplateFormData) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectTemplateForm({
  template,
  products,
  onSubmit,
  onCancel,
  open,
  onOpenChange,
}: ProjectTemplateFormProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const form = useForm<ProjectTemplateFormData>({
    resolver: zodResolver(projectTemplateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      productIds: template?.products?.map((tp: any) => tp.product.id) || [],
    },
  });

  useEffect(() => {
    if (template) {
      const productIds = template.products?.map((tp: any) => tp.product.id) || [];
      setSelectedProducts(productIds);
      form.reset({
        name: template.name,
        description: template.description || '',
        productIds,
      });
    } else {
      setSelectedProducts([]);
      form.reset({
        name: '',
        description: '',
        productIds: [],
      });
    }
  }, [template, form]);

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      const newSelection = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      
      form.setValue('productIds', newSelection);
      return newSelection;
    });
  };

  const handleSubmit = (data: ProjectTemplateFormData) => {
    onSubmit({
      ...data,
      productIds: selectedProducts,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Projektvorlage bearbeiten' : 'Neue Projektvorlage erstellen'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Bearbeiten Sie die Details der Projektvorlage.'
              : 'Erstellen Sie eine neue Vorlage für wiederkehrende Projekte.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Website Relaunch" {...field} />
                  </FormControl>
                  <FormDescription>
                    Ein eindeutiger Name für die Vorlage
                  </FormDescription>
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
                      placeholder="Beschreiben Sie den Zweck dieser Vorlage..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optionale Beschreibung der Vorlage
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Zugeordnete Produkte</FormLabel>
              <FormDescription className="mb-3">
                Wählen Sie Produkte aus, die mit dieser Vorlage verbunden sind
              </FormDescription>
              
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Keine Produkte verfügbar. Erstellen Sie zuerst Produkte.
                  </p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProductToggle(product.id)}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => {}}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {renderProductIcon(product.icon, "w-5 h-5")}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedProducts.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Ausgewählte Produkte:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProducts.map((productId) => {
                      const product = products.find(p => p.id === productId);
                      return product ? (
                        <Badge key={productId} variant="secondary" className="text-xs flex items-center gap-1">
                          {renderProductIcon(product.icon, "w-3 h-3")}
                          {product.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductToggle(productId);
                            }}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit">
                {template ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}