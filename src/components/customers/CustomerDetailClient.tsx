'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard from '@/components/Dashboard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, ArrowLeft, Building2, Users, Calendar, MoreHorizontal, Plus, UserCircle } from 'lucide-react';
import { CreateProjectDialog } from '@/components/shared/CreateProjectDialog';
import TaskForm from '@/components/forms/TaskForm';
import { ProjectStatus, TaskPriority, UserRole } from '@/lib/types';
import { CustomerProfileRenderer, loadCustomerProfileSchema, type FieldDef } from './CustomerProfileFieldRenderer';
import CustomerProfileEditForm from '@/components/forms/CustomerProfileEditForm';
import ContactsManager from './ContactsManager';

interface CustomerDetailClientProps { customerId: string; }

export default function CustomerDetailClient({ customerId }: CustomerDetailClientProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileSchema, setProfileSchema] = useState<FieldDef[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Zusätzliche Daten für TaskForm
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allTaskStatuses, setAllTaskStatuses] = useState<any[]>([]);

  useEffect(() => {
    // Lade das dynamische Schema für den Kundensteckbrief
    const schema = loadCustomerProfileSchema();
    setProfileSchema(schema);
  }, []);

  useEffect(() => { fetchCustomer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customerId]);

  // Lade zusätzliche Daten für die TaskForm
  useEffect(() => {
    const fetchTaskFormData = async () => {
      try {
        const [usersRes, teamsRes, categoriesRes, productsRes, statusesRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/teams'),
          fetch('/api/categories'),
          fetch('/api/products'),
          fetch('/api/task-statuses'),
        ]);
        
        if (usersRes.ok) setAllUsers(await usersRes.json());
        if (teamsRes.ok) setAllTeams(await teamsRes.json());
        if (categoriesRes.ok) setAllCategories(await categoriesRes.json());
        if (productsRes.ok) setAllProducts(await productsRes.json());
        if (statusesRes.ok) setAllTaskStatuses(await statusesRes.json());
      } catch (e) {
        console.error('Error fetching task form data:', e);
      }
    };
    fetchTaskFormData();
  }, []);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) throw new Error('Failed to fetch customer');
      const data = await res.json();
      setCustomer(data);
    } catch (e: any) {
      setError(e?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diesen Kunden wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      router.push('/customers');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete customer');
    }
  };

  const handleSaveProfile = async (data: { name: string; profile: Record<string, any> }) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      // Aktualisiere die Kundendaten nach dem Speichern
      await fetchCustomer();
    } catch (e: any) {
      setError(e?.message || 'Failed to update customer');
      throw e; // Fehler weiterleiten, damit das Formular informiert wird
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Möchten Sie das Projekt "${projectName}" wirklich löschen?\n\nAlle zugehörigen Aufgaben werden ebenfalls gelöscht!`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Projekt konnte nicht gelöscht werden');
      }
      // Lokale State-Aktualisierung ohne Seiten-Neuladen
      setCustomer((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          projects: prev.projects.filter((p: any) => p.id !== projectId),
          // Auch Tasks aktualisieren, die zum Projekt gehörten
          tasks: prev.tasks.filter((t: any) => t.projectId !== projectId),
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht gelöscht werden');
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Status konnte nicht geändert werden');
      }
      // Lokale State-Aktualisierung ohne Seiten-Neuladen
      setCustomer((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          projects: prev.projects.map((p: any) =>
            p.id === projectId ? { ...p, status: newStatus } : p
          ),
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Status konnte nicht geändert werden');
    }
  };

  // Task-Formular Handler
  const handleTaskSubmit = async (data: any) => {
    try {
      if (editingTask) {
        // Task aktualisieren
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Aufgabe konnte nicht aktualisiert werden');
        const updatedTask = await res.json();
        
        // Lokale State-Aktualisierung
        setCustomer((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t),
          };
        });
      } else {
        // Neue Task erstellen - Kunde ist vorausgewählt
        const taskData = {
          ...data,
          customerId: customerId,
          createdById: allUsers[0]?.id || data.createdById,
        };
        
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Aufgabe konnte nicht erstellt werden');
        const newTask = await res.json();
        
        // Lokale State-Aktualisierung
        setCustomer((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: [...prev.tasks, newTask],
          };
        });
      }
      
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern der Aufgabe');
    }
  };

  const handleTaskCancel = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleTaskEdit = (task: any) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Kundendaten...</p>
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
              <Button onClick={() => window.location.reload()}>Erneut versuchen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Kunde nicht gefunden</h2>
              <Button asChild>
                <Link href="/customers">Zurück zur Kundenliste</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeProjects = customer.projects.filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-gray-600 mt-1">Kundendetails und Projekte</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 mr-2" /> Bearbeiten</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Löschen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Building2 className="h-5 w-5 mr-2" /> Kundensteckbrief</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="brief" className="border-0">
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left w-full">Details ein-/ausklappen</div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Dynamischer Kundensteckbrief basierend auf Schema */}
                {profileSchema.length > 0 ? (
                  <CustomerProfileRenderer 
                    customer={customer} 
                    schema={profileSchema}
                    columns={2}
                  />
                ) : (
                  /* Fallback: Statische Darstellung wenn kein Schema konfiguriert */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Firmierung</label>
                        <p className="text-lg font-semibold">{customer.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Ansprechpartner (Hauptkontakt)</label>
                        <p className="text-gray-700 break-words">
                          {(() => {
                            const contacts = customer.profile?.mainContactDetails;
                            if (Array.isArray(contacts) && contacts.length > 0) {
                              const c = contacts[0];
                              return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';
                            }
                            if (typeof contacts === 'string') return contacts;
                            return customer.mainContact || '—';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">PM / Kundenberater</label>
                        <p className="text-gray-700 break-words">{customer.profile?.accountManager || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Warenwirtschaft</label>
                        <p className="text-gray-700 break-words">{customer.profile?.erp || '—'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Anzahl Filialen</label>
                          <p className="text-gray-700">{customer.profile?.branchCount ?? '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Startfilialen</label>
                          <p className="text-gray-700 break-words">{customer.profile?.initialBranches || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Land / Bundesland / Kanton</label>
                        <p className="text-gray-700 break-words">{customer.profile?.countryRegion || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Zugangsdaten (WaWi/TeamViewer etc.)</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.accessCredentials || '—'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Allgemeine Key Facts</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.general || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Filial-Infos (Wochenende / Feiertage)</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.branches || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Retouren</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.returns || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">BackPlan – Berechnungstyp & Begründung</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.backplan || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Warengruppen / Artikel</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.assortment || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Kuchenplan / Saisonartikel</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.cakeplan || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Weitere Besonderheiten</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.keyFacts?.special || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Warengruppen-Excel</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.documents?.assortmentExcel || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Übertragungsplan</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.documents?.transferPlan || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Beispieldokumente (Lieferschein, Verkaufszahlen ...)</label>
                        <p className="text-gray-700 break-words whitespace-pre-wrap">{customer.profile?.documents?.samples || '—'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Erstellt am</label>
                          <p className="text-gray-700">{new Date(customer.createdAt).toLocaleDateString('de-DE')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Zuletzt aktualisiert</label>
                          <p className="text-gray-700">{new Date(customer.updatedAt).toLocaleDateString('de-DE')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Ansprechpartner-Management (manuell + Pipedrive) */}
      <ContactsManager
        customerId={customerId}
        syncedContacts={customer.contacts || []}
        profileContacts={customer.profile?.mainContactDetails || customer.profile?.contacts || []}
        onSaveProfileContacts={async (contacts) => {
          // Speichere Kontakte im Kundenprofil unter mainContactDetails
          const updatedProfile = {
            ...customer.profile,
            mainContactDetails: contacts,
          };
          await fetch(`/api/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: customer.name,
              profile: updatedProfile,
            }),
          });
          await fetchCustomer();
        }}
        onRefresh={fetchCustomer}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardContent className="p-6"><div className="flex items-center"><div className="p-2 bg-blue-100 rounded-lg"><Building2 className="h-6 w-6 text-blue-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Projekte</p><p className="text-2xl font-bold">{customer.projects.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><div className="p-2 bg-green-100 rounded-lg"><Calendar className="h-6 w-6 text-green-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Aktive Projekte</p><p className="text-2xl font-bold">{activeProjects.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><div className="p-2 bg-purple-100 rounded-lg"><Users className="h-6 w-6 text-purple-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Aufgaben</p><p className="text-2xl font-bold">{customer.tasks.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><div className="p-2 bg-teal-100 rounded-lg"><UserCircle className="h-6 w-6 text-teal-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Ansprechpartner</p><p className="text-2xl font-bold">{customer.contacts?.length || 0}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
          <TabsTrigger value="projects">Projekte</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Aufgabe
            </Button>
          </div>
          <Dashboard
            tasks={customer.tasks.map((task: any) => ({
              ...task,
              priority: task.priority as TaskPriority,
              project: task.project ? { ...task.project, status: 'PLANNING' as ProjectStatus, customerId: customer.id, createdAt: new Date(), updatedAt: new Date() } : undefined,
              category: task.category ? { ...task.category, createdAt: new Date(), updatedAt: new Date() } : undefined,
              assignee: task.assignee ? { ...task.assignee, role: 'USER' as UserRole, createdAt: new Date(), updatedAt: new Date() } : undefined,
              createdBy: task.createdBy ? { ...task.createdBy, role: 'USER' as UserRole, createdAt: new Date(), updatedAt: new Date() } : undefined,
              createdById: '', createdAt: new Date(), updatedAt: new Date(),
            }))}
            users={customer.users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role as UserRole, createdAt: new Date(), updatedAt: new Date() }))}
            teams={allTeams}
            projects={customer.projects.map((p: any) => ({ ...p, status: p.status as ProjectStatus, goLiveDate: p.goLiveDate ? new Date(p.goLiveDate) : undefined, customerId: customer.id, createdAt: new Date(), updatedAt: new Date() }))}
            customers={[{ ...customer, createdAt: new Date(customer.createdAt), updatedAt: new Date(customer.updatedAt) }]}
            categories={allCategories}
            products={allProducts}
            taskStatuses={allTaskStatuses}
            onTaskUpdate={() => {}}
            onTaskDelete={() => {}}
            onTaskEdit={handleTaskEdit}
            onSubtaskUpdate={() => {}}
            onSubtaskAdd={() => {}}
            onCommentAdd={() => {}}
            onCommentUpdate={() => {}}
            onCommentDelete={() => {}}
            onAttachmentAdd={() => {}}
            onAttachmentDelete={() => {}}
            onCommentAttachmentAdd={() => {}}
            onCommentAttachmentDelete={() => {}}
            currentUser={allUsers[0] || null}
          />
        </TabsContent>
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projekte</CardTitle>
                <Button onClick={() => setCreateProjectDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Projekt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer.projects.map((project: any) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        {project.description && (<p className="text-gray-600 mt-1">{project.description}</p>)}
                        <div className="flex items-center space-x-4 mt-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge 
                                variant={project.status === 'IN_PROGRESS' ? 'default' : 'secondary'}
                                className="cursor-pointer hover:opacity-80"
                              >
                                {project.status === 'PLANNING' && 'Planung'}
                                {project.status === 'IN_PROGRESS' && 'In Bearbeitung'}
                                {project.status === 'ON_HOLD' && 'Pausiert'}
                                {project.status === 'COMPLETED' && 'Abgeschlossen'}
                                {project.status === 'CANCELLED' && 'Abgebrochen'}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project.id, 'PLANNING')}>
                                Planung
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project.id, 'IN_PROGRESS')}>
                                In Bearbeitung
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project.id, 'ON_HOLD')}>
                                Pausiert
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project.id, 'COMPLETED')}>
                                Abgeschlossen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project.id, 'CANCELLED')}>
                                Abgebrochen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {project.goLiveDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" /> Go-Live: {new Date(project.goLiveDate).toLocaleDateString('de-DE')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
                          <span className="text-sm text-gray-600">Team:</span>
                          {project.assignees.map((pa: any) => (
                            <Avatar key={pa.user.id} className="h-6 w-6"><AvatarImage src={pa.user.avatar} /><AvatarFallback className="text-xs">{pa.user.name.charAt(0)}</AvatarFallback></Avatar>
                          ))}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Projekt löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {customer.projects.length === 0 && (<div className="text-center py-8 text-gray-500">Noch keine Projekte für diesen Kunden vorhanden.</div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>Zugeordnete Benutzer</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customer.users.map((user: any) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        {user.phone && (<p className="text-xs text-gray-500">{user.phone}</p>)}
                        <Badge variant="outline" className="text-xs mt-1">{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {customer.users.length === 0 && (<div className="col-span-full text-center py-8 text-gray-500">Noch keine Benutzer diesem Kunden zugeordnet.</div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bearbeitungsdialog für den Kundensteckbrief */}
      <CustomerProfileEditForm
        customer={customer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveProfile}
      />

      {/* Dialog zum Erstellen eines neuen Projekts */}
      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        customerId={customerId}
        customerName={customer.name}
        onProjectCreated={() => fetchCustomer()}
      />

      {/* Task-Formular Dialog */}
      <TaskForm
        task={editingTask}
        customers={[{ ...customer, createdAt: new Date(customer.createdAt), updatedAt: new Date(customer.updatedAt) }]}
        projects={customer.projects.map((p: any) => ({ 
          ...p, 
          status: p.status as ProjectStatus, 
          goLiveDate: p.goLiveDate ? new Date(p.goLiveDate) : undefined, 
          customerId: customer.id, 
          createdAt: new Date(), 
          updatedAt: new Date() 
        }))}
        categories={allCategories}
        users={allUsers}
        teams={allTeams}
        products={allProducts}
        taskStatuses={allTaskStatuses}
        onSubmit={handleTaskSubmit}
        onCancel={handleTaskCancel}
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        defaultCustomerId={customerId}
      />
    </div>
  );
}


