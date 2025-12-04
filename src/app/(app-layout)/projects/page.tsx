'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Users,
  Target,
  Package,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/shared/CreateProjectDialog';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  goLiveDate?: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
  };
  products: Array<{
    product: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  assignees: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    role: string;
  }>;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [projectsRes, customersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/customers'),
      ]);

      if (!projectsRes.ok || !customersRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [projectsData, customersData] = await Promise.all([
        projectsRes.json(),
        customersRes.json(),
      ]);

      setProjects(projectsData);
      setCustomers(customersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || project.customerId === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (projectId: string, projectName?: string) => {
    const message = projectName 
      ? `Möchten Sie das Projekt "${projectName}" wirklich löschen?\n\nAlle zugehörigen Aufgaben werden ebenfalls gelöscht!`
      : 'Möchten Sie dieses Projekt wirklich löschen?\n\nAlle zugehörigen Aufgaben werden ebenfalls gelöscht!';
    
    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Projekt konnte nicht gelöscht werden');
      }

      // Seite komplett neu laden für aktuelle Daten
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Projekt konnte nicht gelöscht werden');
      console.error('Error deleting project:', err);
    }
  };

  // Group projects by go-live date for calendar view
  const projectsByDate = filteredProjects.reduce((acc, project) => {
    if (project.goLiveDate) {
      const date = new Date(project.goLiveDate).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(project);
    }
    return acc;
  }, {} as Record<string, Project[]>);

  const sortedDates = Object.keys(projectsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Projekte...</p>
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
                  document.dispatchEvent(new CustomEvent('refetch:projects'));
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
            <h1 className="text-3xl font-bold">Projekte</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Ihre Projekte und verfolgen Sie den Fortschritt.
            </p>
          </div>
          <Button onClick={() => setCreateProjectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neues Projekt
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gesamte Projekte</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Bearbeitung</p>
                  <p className="text-2xl font-bold">
                    {projects.filter(p => p.status === 'IN_PROGRESS').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktive Aufgaben</p>
                  <p className="text-2xl font-bold">
                    {projects.reduce((sum, p) => sum + (p.totalTasks - p.completedTasks), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Durchschnittl. Fortschritt</p>
                  <p className="text-2xl font-bold">
                    {projects.length > 0 
                      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Projektliste</CardTitle>
              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Liste
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Kalender
                  </Button>
                </div>

                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Projekte suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="PLANNING">Planung</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                  <SelectItem value="ON_HOLD">Pausiert</SelectItem>
                  <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
                  <SelectItem value="CANCELLED">Abgebrochen</SelectItem>
                </SelectContent>
              </Select>

              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kunde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              /* List View */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Go-Live</TableHead>
                    <TableHead>Tasks Progress</TableHead>
                    <TableHead>Assignee & Contact</TableHead>
                    <TableHead>Description & Products</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-wrap gap-1">
                            {project.products.map((pp) => (
                              <span key={pp.product.id} className="text-lg">
                                {pp.product.icon}
                              </span>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-sm text-gray-500">
                              {project.customer.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.goLiveDate ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(project.goLiveDate).toLocaleDateString('de-DE')}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{project.completedTasks}/{project.totalTasks} Aufgaben</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex -space-x-2">
                            {project.assignees.slice(0, 3).map((pa) => (
                              <Avatar key={pa.user.id} className="h-6 w-6 border-2 border-white">
                                <AvatarImage src={pa.user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {pa.user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {project.assignees.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                                +{project.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {project.description && (
                            <p className="text-sm text-gray-600 truncate">
                              {project.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {project.products.map((pp) => (
                              <Badge key={pp.product.id} variant="outline" className="text-xs">
                                {pp.product.name}
                              </Badge>
                            ))}
                          </div>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Details anzeigen
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(project.id, project.name)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Projekt löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              /* Calendar View */
              <div className="space-y-6">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <h3 className="text-lg font-semibold mb-4">
                      {new Date(date).toLocaleDateString('de-DE', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectsByDate[date].map((project) => (
                        <Card key={project.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{project.name}</h4>
                                  <p className="text-sm text-gray-600">{project.customer.name}</p>
                                </div>
                                <Badge className={getStatusColor(project.status)}>
                                  {project.status}
                                </Badge>
                              </div>

                              {project.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {project.description}
                                </p>
                              )}

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Fortschritt</span>
                                  <span>{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-2" />
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <div className="flex -space-x-2">
                                  {project.assignees.slice(0, 2).map((pa) => (
                                    <Avatar key={pa.user.id} className="h-6 w-6 border-2 border-white">
                                      <AvatarImage src={pa.user.avatar} />
                                      <AvatarFallback className="text-xs">
                                        {pa.user.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {project.assignees.length > 2 && (
                                    <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                                      +{project.assignees.length - 2}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center text-gray-500">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {project.totalTasks} Aufgaben
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
                
                {sortedDates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {filteredProjects.length === 0 
                      ? 'Keine Projekte gefunden.' 
                      : 'Keine Projekte mit Go-Live-Datum gefunden.'
                    }
                  </div>
                )}
              </div>
            )}

            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== 'all' || customerFilter !== 'all' 
                  ? 'Keine Projekte gefunden, die den Filterkriterien entsprechen.' 
                  : 'Noch keine Projekte vorhanden.'
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog zum Erstellen eines neuen Projekts */}
        <CreateProjectDialog
          open={createProjectDialogOpen}
          onOpenChange={setCreateProjectDialogOpen}
          onProjectCreated={() => fetchData()}
        />
      </div>
  );
}