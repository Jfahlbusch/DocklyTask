'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Settings, 
  Users, 
  Shield, 
  Database, 
  Palette,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Building2,
  Key,
  Image as ImageIcon,
  Cloud,
  Monitor,
  Download,
  Upload,
  CheckSquare
} from 'lucide-react';
import TaskStatusForm from '@/components/forms/TaskStatusForm';
import { TeamForm } from '@/components/forms/TeamForm';
import { TeamList } from '@/components/TeamList';
import { Team } from '@/lib/types';
import CustomerProfileSchemaEditor from '@/components/admin/CustomerProfileSchemaEditor';
import CustomerTableColumnsEditor from '@/components/admin/CustomerTableColumnsEditor';
import TaskFieldsManager from '@/components/admin/TaskFieldsManager';
import PipedriveIntegration from '@/components/admin/PipedriveIntegration';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  customerId?: string;
  customer?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
  mainContact?: string;
  info?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskStatus {
  id: string;
  name: string;
  label: string;
  description?: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RolePermission {
  id: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  resource: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface AppConfiguration {
  id: string;
  appName: string;
  appLogo?: string;
  appFavicon?: string;
  primaryColor: string;
  secondaryColor: string;
  mode: 'DEMO' | 'PRODUCTIVE';
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfiguration | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab state from URL parameters
  const initialTab = searchParams.get('tab') || 'application';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  // Status form states
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | undefined>(undefined);
  
  // Team form states
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersRes, customersRes, statusesRes, permissionsRes, configRes, teamsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/customers'),
        fetch('/api/task-statuses'),
        fetch('/api/role-permissions'),
        fetch('/api/app-configuration'),
        fetch('/api/teams'),
      ]);

      const [usersData, customersData, statusesData, permissionsData, configData, teamsData] = await Promise.all([
        usersRes.ok ? usersRes.json() : [],
        customersRes.ok ? customersRes.json() : [],
        statusesRes.ok ? statusesRes.json() : [],
        permissionsRes.ok ? permissionsRes.json() : [],
        configRes.ok ? configRes.json() : null,
        teamsRes.ok ? teamsRes.json() : [],
      ]);

      setUsers(usersData);
      setCustomers(customersData);
      setStatuses(statusesData);
      setPermissions(permissionsData);
      setAppConfig(configData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'USER': return 'bg-green-100 text-green-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  // Status management handlers
  const handleStatusEdit = (status: TaskStatus) => {
    setEditingStatus(status);
    setShowStatusForm(true);
  };

  const handleStatusDelete = async (statusId: string) => {
    if (!confirm('Möchten Sie diesen Status wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/task-statuses/${statusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete status');
      }

      setStatuses(prev => prev.filter(s => s.id !== statusId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete status');
      console.error('Error deleting status:', err);
    }
  };

  const handleStatusSubmit = async (data: any) => {
    try {
      if (editingStatus) {
        // Update existing status
        const response = await fetch(`/api/task-statuses/${editingStatus.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }

        const updatedStatus = await response.json();
        setStatuses(prev => prev.map(s => s.id === editingStatus.id ? updatedStatus : s));
      } else {
        // Create new status
        const response = await fetch('/api/task-statuses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create status');
        }

        const newStatus = await response.json();
        setStatuses(prev => [...prev, newStatus]);
      }
      
      setShowStatusForm(false);
      setEditingStatus(undefined);
    } catch (error) {
      console.error('Error saving status:', error);
      throw error;
    }
  };

  const handleStatusCancel = () => {
    setShowStatusForm(false);
    setEditingStatus(undefined);
  };

  // Team management handlers
  const handleTeamEdit = (team: Team) => {
    setEditingTeam(team);
    setShowTeamForm(true);
  };

  const handleTeamDelete = async (teamId: string) => {
    if (!confirm('Möchten Sie dieses Team wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete team');
      }

      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
      console.error('Error deleting team:', err);
    }
  };

  const handleTeamSubmit = async (data: any) => {
    try {
      if (editingTeam) {
        // Update existing team
        const response = await fetch(`/api/teams/${editingTeam.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update team');
        }

        const updatedTeam = await response.json();
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? updatedTeam : t));
      } else {
        // Create new team
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create team');
        }

        const newTeam = await response.json();
        setTeams(prev => [...prev, newTeam]);
      }
      
      setShowTeamForm(false);
      setEditingTeam(undefined);
    } catch (error) {
      console.error('Error saving team:', error);
      throw error;
    }
  };

  const handleTeamCancel = () => {
    setShowTeamForm(false);
    setEditingTeam(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Admin-Daten...</p>
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
                  document.dispatchEvent(new CustomEvent('refetch:admin'));
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
            <h1 className="text-3xl font-bold">Admin Einstellungen</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Benutzer, Berechtigungen und Systemeinstellungen.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="application">Anwendung</TabsTrigger>
            <TabsTrigger value="users">Benutzer</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
            <TabsTrigger value="statuses">Status</TabsTrigger>
            <TabsTrigger value="task-fields">Aufgabenfelder</TabsTrigger>
            <TabsTrigger value="integrations">Integrationen</TabsTrigger>
            <TabsTrigger value="services">Dienste</TabsTrigger>
            <TabsTrigger value="appearance">Erscheinungsbild</TabsTrigger>
            <TabsTrigger value="customer-profile">Kundensteckbrief</TabsTrigger>
          </TabsList>

          {/* Application Mode */}
          <TabsContent value="application">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Anwendungseinstellungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Anwendungsmodus</h3>
                      <p className="text-gray-600">
                        Wählen Sie zwischen Demo- und Produktivmodus
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${
                        appConfig?.mode === 'DEMO' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        Demo
                      </span>
                      <Switch
                        checked={appConfig?.mode === 'PRODUCTIVE'}
                        onCheckedChange={(checked) => {
                          // TODO: Implement mode change
                          console.log('Change mode to:', checked ? 'PRODUCTIVE' : 'DEMO');
                        }}
                      />
                      <span className={`text-sm font-medium ${
                        appConfig?.mode === 'PRODUCTIVE' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        Produktiv
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl mb-2">🎭</div>
                          <h4 className="font-semibold mb-1">Demo-Modus</h4>
                          <p className="text-sm text-gray-600">
                            Für Präsentationen und Tests. Alle Daten werden lokal gespeichert.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl mb-2">🚀</div>
                          <h4 className="font-semibold mb-1">Produktivmodus</h4>
                          <p className="text-sm text-gray-600">
                            Für den produktiven Einsatz. Daten werden in der Datenbank gespeichert.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Benutzerverwaltung
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Benutzer suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Benutzer einladen
                    </Button>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Benutzer hinzufügen
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-sm font-medium">
                                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{user.name || 'Unbekannt'}</div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                {user.phone}
                              </div>
                            )}
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.customer ? (
                            <div className="flex items-center text-sm">
                              <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                              {user.customer.name}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString('de-DE')}
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Details anzeigen
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'Keine Benutzer gefunden.' : 'Noch keine Benutzer vorhanden.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management */}
          <TabsContent value="teams">
            <TeamList />
          </TabsContent>

          <TabsContent value="customer-profile">
            <div className="space-y-6">
              <CustomerTableColumnsEditor />
              <CustomerProfileSchemaEditor />
            </div>
          </TabsContent>

          {/* Role Permissions */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Rollenberechtigungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Definieren Sie Lese-, Schreib- und Löschberechtigungen für verschiedene Benutzerrollen.
                  </p>

                  <Accordion type="single" collapsible className="w-full">
                    {['ADMIN', 'MANAGER', 'USER', 'VIEWER'].map((role) => (
                      <AccordionItem key={role} value={role}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center space-x-3">
                            <Badge className={getRoleColor(role)}>
                              {role}
                            </Badge>
                            <span>Berechtigungen für {role}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {['tasks', 'projects', 'customers', 'products', 'categories', 'templates', 'admin'].map((resource) => {
                              const permission = permissions.find(p => p.role === role && p.resource === resource);
                              return (
                                <div key={resource} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <div className="font-medium capitalize">{resource}</div>
                                    <div className="text-sm text-gray-600">
                                      {resource === 'tasks' && 'Aufgabenmanagement'}
                                      {resource === 'projects' && 'Projektmanagement'}
                                      {resource === 'customers' && 'Kundenmanagement'}
                                      {resource === 'products' && 'Produktmanagement'}
                                      {resource === 'categories' && 'Kategoriemangement'}
                                      {resource === 'templates' && 'Vorlagenmanagement'}
                                      {resource === 'admin' && 'Administration'}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm">Lesen</span>
                                      <Switch
                                        checked={permission?.canRead || false}
                                        onCheckedChange={(checked) => {
                                          // TODO: Update permission
                                          console.log(`Update ${role} ${resource} read:`, checked);
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm">Schreiben</span>
                                      <Switch
                                        checked={permission?.canWrite || false}
                                        onCheckedChange={(checked) => {
                                          // TODO: Update permission
                                          console.log(`Update ${role} ${resource} write:`, checked);
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm">Löschen</span>
                                      <Switch
                                        checked={permission?.canDelete || false}
                                        onCheckedChange={(checked) => {
                                          // TODO: Update permission
                                          console.log(`Update ${role} ${resource} delete:`, checked);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Management */}
          <TabsContent value="statuses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Aufgaben-Status
                  </CardTitle>
                  <Button onClick={() => setShowStatusForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Neuer Status
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Verwalten Sie die verschiedenen Status für Aufgaben. Diese Status werden in der Kanban-Ansicht und im Dashboard verwendet.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statuses.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <Badge className={`${item.color} mb-2`}>
                              {item.name}
                            </Badge>
                            <h4 className="font-semibold mb-1">{item.label}</h4>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStatusEdit(item)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Bearbeiten
                              </Button>
                              {item.name !== 'PENDING' && item.name !== 'IN_PROGRESS' && item.name !== 'COMPLETED' && item.name !== 'CANCELLED' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleStatusDelete(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Löschen
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Hinweis</h4>
                    <p className="text-sm text-blue-800">
                      Sie können jetzt benutzerdefinierte Status hinzufügen, bearbeiten und löschen. Die Standard-Status (Ausstehend, In Bearbeitung, Abgeschlossen, Abgebrochen) können nicht gelöscht werden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Fields Configuration */}
          <TabsContent value="task-fields">
            <TaskFieldsManager />
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <PipedriveIntegration />
          </TabsContent>

          {/* Service Configurations */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Dienstkonfigurationen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-gray-600">
                    Konfigurieren Sie externe Dienste und Integrationen.
                  </p>

                  {/* GIPHY Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <ImageIcon className="h-5 w-5 mr-2" />
                        GIPHY
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">API Key</label>
                          <Input
                            placeholder="NEXT_PUBLIC_GIPHY_API_KEY oder lokaler API Key"
                            defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('giphyApiKey') || '') : ''}
                            onChange={(e) => {
                              if (typeof window !== 'undefined') {
                                const v = e.target.value.trim();
                                if (v) localStorage.setItem('giphyApiKey', v); else localStorage.removeItem('giphyApiKey');
                              }
                            }}
                            type="password"
                          />
                          <p className="text-xs text-gray-500 mt-1">Wird lokal im Browser gespeichert. Falls eine Umgebungsvariable gesetzt ist, hat diese Vorrang.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keycloak Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Key className="h-5 w-5 mr-2" />
                        Keycloak Authentication
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Server URL</label>
                          <Input placeholder="https://keycloak.example.com" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Realm</label>
                          <Input placeholder="taskwise" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Client ID</label>
                          <Input placeholder="taskwise-frontend" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Client Secret</label>
                          <Input type="password" placeholder="••••••••" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button>Speichern</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scaleway S3 Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Cloud className="h-5 w-5 mr-2" />
                        Scaleway S3 Storage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Access Key</label>
                          <Input placeholder="SCWXXXXXXXXXXXXXXXXX" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Secret Key</label>
                          <Input type="password" placeholder="••••••••" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bucket Name</label>
                          <Input placeholder="taskwise-storage" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Region</label>
                          <Input placeholder="fr-par-1" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button>Speichern</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PostgreSQL Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Database className="h-5 w-5 mr-2" />
                        PostgreSQL Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Host</label>
                          <Input placeholder="localhost" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Port</label>
                          <Input placeholder="5432" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Database</label>
                          <Input placeholder="taskwise" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Username</label>
                          <Input placeholder="postgres" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Password</label>
                          <Input type="password" placeholder="••••••••" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button>Speichern</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Erscheinungsbild anpassen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-gray-600">
                    Passen Sie das Erscheinungsbild der Anwendung an Ihre Bedürfnisse an.
                  </p>

                  {/* App Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Anwendungsinformationen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">App Name</label>
                          <Input 
                            defaultValue={appConfig?.appName || 'TaskWise'}
                            placeholder="TaskWise"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">App Version</label>
                          <Input placeholder="1.0.0" defaultValue="1.0.0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Logo and Favicon */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Logo und Favicon</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">App Logo</label>
                          <div className="mt-2">
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Logo hochladen</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Upload className="h-4 w-4 mr-2" />
                              Hochladen
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Favicon</label>
                          <div className="mt-2">
                            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <Upload className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Favicon</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Upload className="h-4 w-4 mr-2" />
                              Hochladen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Color Scheme */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Farbschema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">Primärfarbe</label>
                          <div className="mt-2 flex items-center space-x-3">
                            <input
                              type="color"
                              defaultValue={appConfig?.primaryColor || '#3b82f6'}
                              className="w-12 h-12 rounded border"
                            />
                            <Input 
                              defaultValue={appConfig?.primaryColor || '#3b82f6'}
                              placeholder="#3b82f6"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Sekundärfarbe</label>
                          <div className="mt-2 flex items-center space-x-3">
                            <input
                              type="color"
                              defaultValue={appConfig?.secondaryColor || '#64748b'}
                              className="w-12 h-12 rounded border"
                            />
                            <Input 
                              defaultValue={appConfig?.secondaryColor || '#64748b'}
                              placeholder="#64748b"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-3">Vorschau</h4>
                        <div className="flex space-x-4">
                          <div className="text-center">
                            <div 
                              className="w-16 h-16 rounded-lg mb-2"
                              style={{ backgroundColor: appConfig?.primaryColor || '#3b82f6' }}
                            ></div>
                            <span className="text-xs">Primär</span>
                          </div>
                          <div className="text-center">
                            <div 
                              className="w-16 h-16 rounded-lg mb-2"
                              style={{ backgroundColor: appConfig?.secondaryColor || '#64748b' }}
                            ></div>
                            <span className="text-xs">Sekundär</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Theme Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Theme-Vorschau</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-3">Hellmodus</h4>
                          <div className="border rounded-lg p-4 bg-white">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: appConfig?.primaryColor || '#3b82f6' }}
                                ></div>
                                <span className="text-sm">Primäre Farbe</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: appConfig?.secondaryColor || '#64748b' }}
                                ></div>
                                <span className="text-sm">Sekundäre Farbe</span>
                              </div>
                              <Button 
                                className="w-full"
                                style={{ backgroundColor: appConfig?.primaryColor || '#3b82f6' }}
                              >
                                Primärer Button
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-3">Dunkelmodus</h4>
                          <div className="border rounded-lg p-4 bg-gray-900">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: appConfig?.primaryColor || '#3b82f6' }}
                                ></div>
                                <span className="text-sm text-white">Primäre Farbe</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: appConfig?.secondaryColor || '#64748b' }}
                                ></div>
                                <span className="text-sm text-white">Sekundäre Farbe</span>
                              </div>
                              <Button 
                                className="w-full"
                                style={{ backgroundColor: appConfig?.primaryColor || '#3b82f6' }}
                              >
                                Primärer Button
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button>Änderungen speichern</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Form */}
        <TaskStatusForm
          status={editingStatus}
          onSubmit={handleStatusSubmit}
          onCancel={handleStatusCancel}
          open={showStatusForm}
          onOpenChange={setShowStatusForm}
        />
        
        {/* Team Form */}
        <TeamForm
          team={editingTeam}
          onSuccess={() => {
            setShowTeamForm(false);
            setEditingTeam(undefined);
          }}
          open={showTeamForm}
          onOpenChange={setShowTeamForm}
        />
      </div>
  );
}