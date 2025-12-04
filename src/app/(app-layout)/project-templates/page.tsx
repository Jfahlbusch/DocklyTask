'use client';

import { useState, useEffect } from 'react';
import ProjectTemplateForm from '@/components/forms/ProjectTemplateForm';
import TemplateTaskManager from '@/components/shared/TemplateTaskManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  FileText,
  Copy,
  Settings,
  ListTodo
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  products: Array<{
    product: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    parentTaskId?: string;
  }>;
}

export default function ProjectTemplatesPage() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; icon?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [managingTemplate, setManagingTemplate] = useState<ProjectTemplate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [templatesRes, productsRes] = await Promise.all([
        fetch('/api/project-templates'),
        fetch('/api/products'),
      ]);

      if (!templatesRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [templatesData, productsData] = await Promise.all([
        templatesRes.json(),
        productsRes.json(),
      ]);

      setTemplates(templatesData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (templateId: string) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/project-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      console.error('Error deleting template:', err);
    }
  };

  const handleTemplateEdit = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleTemplateSubmit = async (data: any) => {
    try {
      if (editingTemplate) {
        // Update existing template
        const response = await fetch(`/api/project-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update template');
        }

        const updatedTemplate = await response.json();
        setTemplates(prev => prev.map(t => 
          t.id === editingTemplate.id ? updatedTemplate : t
        ));
      } else {
        // Create new template
        const response = await fetch('/api/project-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create template');
        }

        const newTemplate = await response.json();
        setTemplates(prev => [newTemplate, ...prev]);
      }
      
      setShowTemplateForm(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleTemplateCancel = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
  };

  const handleManageTasks = (template: ProjectTemplate) => {
    setManagingTemplate(template);
    setShowTaskManager(true);
  };
  
  const handleTasksUpdated = () => {
    // Refresh the templates list to update task counts
    fetchData();
  };

  const getTaskCount = (tasks: ProjectTemplate['tasks']) => {
    const mainTasks = tasks.filter(task => !task.parentTaskId);
    const subTasks = tasks.filter(task => task.parentTaskId);
    return { main: mainTasks.length, sub: subTasks.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Vorlagen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Fehler</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => {
                if (typeof window !== 'undefined') {
                  document.dispatchEvent(new CustomEvent('refetch:project-templates'));
                }
              }}>
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projektvorlagen</h1>
            <p className="text-gray-600 mt-1">
              Erstellen und verwalten Sie Vorlagen für wiederkehrende Projekte.
            </p>
          </div>
          <Button onClick={() => setShowTemplateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Vorlagen</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ListTodo className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gesamtaufgaben</p>
                  <p className="text-2xl font-bold">
                    {templates.reduce((sum, t) => sum + t.tasks.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Copy className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Produkte</p>
                  <p className="text-2xl font-bold">
                    {templates.reduce((sum, t) => sum + t.products.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vorlagenliste</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Vorlagen suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Produkte</TableHead>
                  <TableHead>Aufgaben</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  const taskCount = getTaskCount(template.tasks);
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium">{template.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-gray-600">
                          {template.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.products.map((tp) => (
                            <Badge key={tp.product.id} variant="outline" className="text-xs">
                              {tp.product.icon} {tp.product.name}
                            </Badge>
                          ))}
                          {template.products.length === 0 && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{taskCount.main}</span> Hauptaufgaben
                          </div>
                          {taskCount.sub > 0 && (
                            <div className="text-xs text-gray-500">
                              {taskCount.sub} Unteraufgaben
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleManageTasks(template)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Aufgaben verwalten
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplizieren
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTemplateEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Keine Vorlagen gefunden.' : 'Noch keine Vorlagen vorhanden.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Vorlagen-Übersicht</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const taskCount = getTaskCount(template.tasks);
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{template.name}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageTasks(template)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Aufgaben verwalten
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplizieren
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTemplateEdit(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {template.description && (
                      <p className="text-gray-600 mb-4">{template.description}</p>
                    )}
                    
                    {/* Products */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Produkte:</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.products.map((tp) => (
                          <Badge key={tp.product.id} variant="outline" className="text-xs">
                            {tp.product.icon} {tp.product.name}
                          </Badge>
                        ))}
                        {template.products.length === 0 && (
                          <span className="text-gray-400 text-sm">Keine Produkte</span>
                        )}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Aufgaben:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Hauptaufgaben:</span>
                          <Badge variant="outline">{taskCount.main}</Badge>
                        </div>
                        {taskCount.sub > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Unteraufgaben:</span>
                            <Badge variant="outline">{taskCount.sub}</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task Preview */}
                    {template.tasks.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Aufgaben-Vorschau:</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {template.tasks
                            .filter(task => !task.parentTaskId)
                            .slice(0, 3)
                            .map((task) => {
                              const subtasks = template.tasks.filter(t => t.parentTaskId === task.id);
                              return (
                                <div key={task.id} className="text-sm p-2 bg-gray-50 rounded">
                                  <div className="font-medium">{task.title}</div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs mt-1 ${
                                      task.priority === 'HIGH' ? 'border-red-200 text-red-700' :
                                      task.priority === 'MEDIUM' ? 'border-yellow-200 text-yellow-700' :
                                      'border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    {task.priority}
                                  </Badge>
                                  {/* Subtasks */}
                                  {subtasks.length > 0 && (
                                    <div className="mt-2 ml-3 border-l-2 border-gray-200 pl-2 space-y-1">
                                      {subtasks.map((subtask) => (
                                        <div key={subtask.id} className="text-xs text-gray-600">
                                          {subtask.title}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {template.tasks.filter(task => !task.parentTaskId).length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{template.tasks.filter(task => !task.parentTaskId).length - 3} weitere Aufgaben
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleManageTasks(template)}>
                        <Settings className="h-4 w-4 mr-1" />
                        Aufgaben
                      </Button>
                      <Button size="sm">
                        <Copy className="h-4 w-4 mr-1" />
                        Projekt erstellen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Keine Vorlagen gefunden.' : 'Noch keine Vorlagen vorhanden.'}
            </div>
          )}
        </div>

        <ProjectTemplateForm
          template={editingTemplate}
          products={products}
          onSubmit={handleTemplateSubmit}
          onCancel={handleTemplateCancel}
          open={showTemplateForm}
          onOpenChange={setShowTemplateForm}
        />

        <TemplateTaskManager
          template={managingTemplate}
          open={showTaskManager}
          onOpenChange={(isOpen) => {
            setShowTaskManager(isOpen);
            if (!isOpen) setManagingTemplate(null);
          }}
          onTasksUpdated={handleTasksUpdated}
        />
      </div>
  );
}