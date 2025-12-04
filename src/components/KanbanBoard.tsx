'use client';

import { useState } from 'react';
import type React from 'react';
import { Task, Project, Customer, User, Category, Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import DropdownSelect from '@/components/ui/DropdownSelect';
import QuickUserFilter from '@/components/shared/QuickUserFilter';
import SubtaskForm from '@/components/forms/SubtaskForm';
import SectionHeader from '@/components/shared/SectionHeader';
import TaskMetaChips from '@/components/shared/TaskMetaChips';
import SubtaskList from '@/components/shared/SubtaskList';
import { 
  CalendarDays, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  GripVertical,
  
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: (Task & {
    project?: Project;
    customer?: Customer;
    category?: Category;
    assignee?: User;
    createdBy?: User;
    taskStatus?: any;
    subtasks: any[];
    attachments: any[];
    comments: any[];
    products?: any[];
  })[];
  users: User[];
  projects: Project[];
  customers: Customer[];
  categories: Category[];
  products: Product[];
  taskStatuses: any[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskTitleClick: (task: Task) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onSubtaskAdd: (taskId: string, data: any) => void;
  currentUser: any;
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'pending', title: 'Ausstehend', status: 'PENDING', color: 'bg-gray-100 text-gray-800' },
  { id: 'in-progress', title: 'In Bearbeitung', status: 'IN_PROGRESS', color: 'bg-blue-100 text-blue-800' },
  { id: 'completed', title: 'Abgeschlossen', status: 'COMPLETED', color: 'bg-green-100 text-green-800' },
  { id: 'cancelled', title: 'Abgebrochen', status: 'CANCELLED', color: 'bg-red-100 text-red-800' },
];

interface KanbanCardProps {
  task: Task & {
    project?: Project;
    customer?: Customer;
    category?: Category;
    assignee?: User;
    createdBy?: User;
    taskStatus?: any;
    subtasks: any[];
    attachments: any[];
    comments: any[];
    products?: any[];
  };
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskTitleClick: (task: Task) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onSubtaskAdd: (taskId: string, data: any) => void;
  currentUser: any;
  users: User[];
  defaultExpanded?: boolean;
}

function KanbanCard({ task, onTaskUpdate, onTaskDelete, onTaskEdit, onTaskTitleClick, onSubtaskUpdate, onSubtaskAdd, currentUser, users, defaultExpanded }: KanbanCardProps) {
  // Debug: Log task data to verify ID is available
  // console.debug('KanbanCard task data:', { id: task.id, taskNumber: task.taskNumber, title: task.title });

  const [expanded, setExpanded] = useState<boolean>(() => !!defaultExpanded);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  
  // Local state for subtask statuses - use database status if available
  const [subtaskStatuses, setSubtaskStatuses] = useState<Record<string, string>>(() => {
    const initialStatuses: Record<string, string> = {};
    task.subtasks.forEach((subtask: any) => {
      // Use the status from database if available, otherwise default to PENDING
      initialStatuses[subtask.id] = subtask.status || 'PENDING';
    });
    return initialStatuses;
  });

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800'
  };

  const completedSubtasks = task.subtasks.filter((st: any) => (st.status || 'PENDING') === 'COMPLETED').length;
  const totalSubtasks = task.subtasks.length;

  const handleStatusChange = async (newStatusId: string) => {
    try {
      await onTaskUpdate(task.id, { statusId: newStatusId });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubtaskToggle = async (subtaskId: string, currentStatus: string) => {
    // Toggle the local status state
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setSubtaskStatuses(prev => ({
      ...prev,
      [subtaskId]: newStatus
    }));
    
    // Call the parent component's update function
    onSubtaskUpdate(subtaskId, { status: newStatus });
  };

  const handleSubtaskAdd = async (data: any) => {
    try {
      const payload = {
        ...data,
        assigneeId: data.assigneeId || undefined,
        teamId: data.teamId || undefined,
      };
      await onSubtaskAdd(task.id, payload);
      setShowSubtaskForm(false);
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  return (
    <Card className="mb-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-move group border-transparent hover:border-primary/20">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 flex-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-1 group-hover:text-muted-foreground transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-muted-foreground">#{task.taskNumber ?? '—'}</div>
              <h3 
                className={`mt-0 leading-tight font-medium text-sm ${(task.taskStatus?.name === 'COMPLETED' || task.status === 'COMPLETED') ? 'line-through text-muted-foreground' : ''} cursor-pointer hover:text-primary transition-colors`}
                onClick={() => onTaskTitleClick(task)}
              >
                {task.title}
              </h3>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onTaskDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        
        {task.description && (
          <div
            className="prose prose-sm prose-p:mt-1 prose-p:mb-1 text-gray-700 mb-1 max-w-none line-clamp-2 break-words [&>*:first-child]:mt-0"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          <TaskMetaChips
            priority={task.priority}
            categoryName={task.category?.name}
            assigneeName={task.assignee?.name}
            attachmentCount={task.attachments?.length}
            commentCount={task.comments?.length}
            dueDate={task.dueDate}
          />
          {/* Produkte anzeigen */}
          {task.products && task.products.length > 0 && (
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-gray-400" />
              {task.products.slice(0, 2).map((tp: any) => (
                <Badge key={tp.id || tp.productId} variant="outline" className="text-[10px] px-1 py-0">
                  {tp.product?.icon && <span className="mr-0.5">{tp.product.icon}</span>}
                  {tp.product?.name?.slice(0, 10) || 'Produkt'}
                </Badge>
              ))}
              {task.products.length > 2 && (
                <span className="text-[10px] text-gray-400">+{task.products.length - 2}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            </div>
          )}
          
          {task.project && (
            <div className="text-xs text-gray-400 truncate">
              {task.project.name}
            </div>
          )}
        </div>

        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs w-full"
          >
            {expanded ? 'Details ausblenden' : 'Details anzeigen'}
          </Button>
          
          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Unteraufgaben - immer anzeigen mit Plus-Button wenn leer */}
              <div>
                <SectionHeader
                  title="Unteraufgaben"
                  actionLabel="Hinzufügen"
                  onActionClick={() => setShowSubtaskForm(true)}
                  actionIcon={<Plus className="h-3 w-3 mr-1" />}
                  className="mb-2"
                />
                <SubtaskList
                  subtasks={task.subtasks as any}
                  statusMap={subtaskStatuses}
                  onToggle={(id, current) => handleSubtaskToggle(id, current)}
                />
              </div>

              {/* Subtask Form - Dialog Version */}
              <SubtaskForm
                taskId={task.id}
                onSubmit={handleSubtaskAdd}
                onCancel={() => setShowSubtaskForm(false)}
                open={showSubtaskForm}
                onOpenChange={setShowSubtaskForm}
                users={users}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KanbanBoard({ 
  tasks, 
  users, 
  projects, 
  customers, 
  categories,
  products, 
  taskStatuses,
  onTaskUpdate, 
  onTaskDelete, 
  onTaskEdit, 
  onTaskTitleClick,
  onSubtaskUpdate,
  onSubtaskAdd,
  currentUser 
}: KanbanBoardProps) {
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'assignee' | 'project'>('status');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const getInitials = (raw?: string) => {
    const value = (raw || '').trim();
    if (!value) return '?';
    const emailIdx = value.indexOf('@');
    const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    const letters = base.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    return (letters || base[0] || '?').toUpperCase();
  };
  
  // Debug: Log initial data
      // console.debug('KanbanBoard initialized:', { tasksCount: tasks.length, usersCount: users.length, projectsCount: projects.length, taskStatusesCount: taskStatuses.length });
  
  // Filter states
  const [filters, setFilters] = useState({
    assigneeId: 'all',
    status: 'all',
    priority: 'all',
    categoryId: 'all',
    customerId: 'all',
    productId: 'all',
    dueDate: 'all',
    showCompleted: false  // Back to default
  });
  
  const [filterAccordionOpen, setFilterAccordionOpen] = useState(false);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.assigneeId !== 'all') {
      const selectedId = filters.assigneeId as string;
      const isTaskAssignee = task.assigneeId === selectedId;
      const isSubtaskAssignee = Array.isArray(task.subtasks) && task.subtasks.some((st: any) => st?.assigneeId === selectedId);
      if (!isTaskAssignee && !isSubtaskAssignee) return false;
    }
    
    // Status filter - handle both ID and name matching
    if (filters.status !== 'all') {
      const statusMatch = task.statusId === filters.status || 
                         task.status === filters.status ||
                         (task.taskStatus && task.taskStatus.id === filters.status);
      if (!statusMatch) return false;
    }
    
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.categoryId !== 'all' && task.categoryId !== filters.categoryId) return false;
    if (filters.customerId !== 'all' && task.customerId !== filters.customerId) return false;
    
    // Product filter
    if (filters.productId !== 'all') {
      const hasProduct = Array.isArray(task.products) && task.products.some((tp: any) => tp.productId === filters.productId || tp.product?.id === filters.productId);
      if (!hasProduct) return false;
    }
    
    // Completed tasks filter
    const isCompleted = task.taskStatus?.name === 'COMPLETED' || task.status === 'COMPLETED';
    if (!filters.showCompleted && isCompleted) return false;
    
    if (filters.dueDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = task.dueDate ? new Date(task.dueDate) : null;
      
      if (!taskDate) return false;
      
      switch (filters.dueDate) {
        case 'overdue':
          if (taskDate >= today) return false;
          break;
        case 'today':
          if (taskDate.toDateString() !== today.toDateString()) return false;
          break;
        case 'upcoming':
          if (taskDate <= today) return false;
          break;
      }
    }
    
    return true;
  });

  const getColumns = () => {
    // console.debug('getColumns called:', { groupBy, taskStatusesCount: taskStatuses.length });
    
    switch (groupBy) {
      case 'status':
        const statusColumns = taskStatuses
          .filter(status => status.isActive)
          .sort((a, b) => a.order - b.order)
          .map(status => ({
            id: status.id, // This is the status ID that matches task.statusId
            title: status.label,
            status: status.name, // This is the status name (PENDING, IN_PROGRESS, etc.)
            color: status.color || 'bg-gray-100 text-gray-800'
          }));
        return statusColumns;
      case 'priority':
        const priorityColumns = [
          { id: 'URGENT', title: 'Dringend', status: 'URGENT', color: 'bg-red-100 text-red-800' },
          { id: 'HIGH', title: 'Hoch', status: 'HIGH', color: 'bg-orange-100 text-orange-800' },
          { id: 'MEDIUM', title: 'Mittel', status: 'MEDIUM', color: 'bg-yellow-100 text-yellow-800' },
          { id: 'LOW', title: 'Niedrig', status: 'LOW', color: 'bg-gray-100 text-gray-800' },
        ];
        return priorityColumns;
      case 'assignee':
        const assigneeColumns = users.map(user => ({
          id: user.id, // This is the user ID that matches task.assigneeId
          title: user.name || 'Unbekannt',
          status: user.id, // For assignee, status field contains the user ID
          color: 'bg-blue-100 text-blue-800'
        }));
        return assigneeColumns;
      case 'project':
        const projectColumns = projects.map(project => ({
          id: project.id, // This is the project ID that matches task.projectId
          title: project.name,
          status: project.id, // For project, status field contains the project ID
          color: 'bg-purple-100 text-purple-800'
        }));
        return projectColumns;
      default:
        const defaultColumns = taskStatuses
          .filter(status => status.isActive)
          .sort((a, b) => a.order - b.order)
          .map(status => ({
            id: status.id,
            title: status.label,
            status: status.name,
            color: status.color || 'bg-gray-100 text-gray-800'
          }));
        return defaultColumns;
    }
  };

  const getTasksForColumn = (column: KanbanColumn) => {
    // console.debug('getTasksForColumn called:', { columnId: column.id, columnTitle: column.title, columnStatus: column.status, groupBy });
    
    let tasks = filteredTasks.filter(task => {
      // console.debug('Filtering task:', { taskId: task.id, taskTitle: task.title, taskStatusId: task.statusId, taskStatus: task.status, taskPriority: task.priority, taskAssigneeId: task.assigneeId, taskProjectId: task.projectId });
      
      switch (groupBy) {
        case 'status':
          // For status grouping, we need to match by status ID
          const matches = task.statusId === column.id;
          return matches;
        case 'priority':
          // For priority grouping, match by priority value
          return task.priority === column.status;
        case 'assignee':
          // For assignee grouping, match by assignee ID
          return task.assigneeId === column.id;
        case 'project':
          // For project grouping, match by project ID
          return task.projectId === column.id;
        default:
          return false;
      }
    });
    
    // console.debug('Filtered tasks count:', tasks.length);
    
    // Sort tasks by priority with consistent ordering
    const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'undefined': 0 };
    tasks.sort((a, b) => {
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      // Sort by priority (descending) - higher priority first
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // If same priority, sort by due date (ascending) - earlier dates first
      if (a.dueDate && b.dueDate) {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      } else if (a.dueDate && !b.dueDate) {
        return -1; // Tasks with due dates come first
      } else if (!a.dueDate && b.dueDate) {
        return 1; // Tasks with due dates come first
      }
      
      // If no due date or same due date, sort by creation date (newest first)
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return createdB - createdA;
    });
    
    return tasks;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedTask) {
      console.warn('No task being dragged');
      return;
    }
    
    try {
      const updateData: Partial<Task> = {};
      
      // Find the column to get the correct status value
      const targetColumn = columns.find(col => col.id === targetColumnId);
      
      if (!targetColumn) {
        console.error('Target column not found:', targetColumnId);
        return;
      }
      
      // console.debug('Drop event:', { draggedTask, targetColumnId, targetColumn: { id: targetColumn.id, title: targetColumn.title, status: targetColumn.status }, groupBy });
      
      switch (groupBy) {
        case 'status':
          // For status, we need to update the statusId field
          // The targetColumnId is the status ID from taskStatuses
          updateData.statusId = targetColumnId;
          // console.debug('Status update:', { statusId: targetColumnId });
          break;
        case 'priority':
          // For priority, we need to update the priority field
          // The targetColumn.status contains the priority value (URGENT, HIGH, etc.)
          const priorityValue = targetColumn.status;
          // console.debug('Priority update:', { priorityValue });
          
          // Validate the priority value
          const validPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
          if (!validPriorities.includes(priorityValue)) {
            console.error('Invalid priority value:', priorityValue);
            return;
          }
          
          updateData.priority = priorityValue;
          break;
        case 'assignee':
          // For assignee, we need to update the assigneeId field
          // The targetColumnId is the user ID
          updateData.assigneeId = targetColumnId;
          // console.debug('Assignee update:', { assigneeId: targetColumnId });
          break;
        case 'project':
          // For project, we need to update the projectId field
          // The targetColumnId is the project ID
          updateData.projectId = targetColumnId;
          // console.debug('Project update:', { projectId: targetColumnId });
          break;
        default:
          console.error('Unknown groupBy value:', groupBy);
          return;
      }
      
      // console.debug('Final update data:', updateData);
      
      // Validate that we have something to update
      if (Object.keys(updateData).length === 0) {
        console.warn('No update data generated');
        return;
      }
      
      await onTaskUpdate(draggedTask, updateData);
      setDraggedTask(null);
      
    } catch (error) {
      console.error('Error in handleDrop:', error);
      // Re-throw the error so the caller can handle it
      throw error;
    }
  };

  const columns = getColumns();
  const currentUserId = (currentUser as any)?.id || users[0]?.id;

  return (
    <div className="space-y-4">
      {/* Quick Filter - Employees */}
      <QuickUserFilter
        users={users}
        value={filters.assigneeId as string}
        onChange={(v) => handleFilterChange('assigneeId', v)}
      />

      {/* Global Filters */}
      <Card>
        <CardHeader>
          <Accordion type="single" collapsible value={filterAccordionOpen ? "filters" : ""}>
            <AccordionItem value="filters" className="border-0">
              <AccordionTrigger 
                className="hover:no-underline py-2"
                onClick={() => setFilterAccordionOpen(!filterAccordionOpen)}
              >
                <CardTitle className="text-lg">Globale Filter</CardTitle>
              </AccordionTrigger>
              <AccordionContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {taskStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priorität</label>
              <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Prioritäten</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Kategorie</label>
              <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Kunde</label>
              <Select value={filters.customerId} onValueChange={(value) => handleFilterChange('customerId', value)}>
                <SelectTrigger>
                  <SelectValue />
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

            <div>
              <label className="text-sm font-medium mb-2 block">Produkt</label>
              <Select value={filters.productId} onValueChange={(value) => handleFilterChange('productId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Produkte</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.icon && <span className="mr-1">{product.icon}</span>}
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fälligkeitsdatum</label>
              <Select value={filters.dueDate} onValueChange={(value) => handleFilterChange('dueDate', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Daten</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                  <SelectItem value="today">Heute</SelectItem>
                  <SelectItem value="upcoming">Bevorstehend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Optionen</label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCompleted"
                  checked={filters.showCompleted}
                  onCheckedChange={(checked) => handleFilterChange('showCompleted', checked as boolean)}
                />
                <label htmlFor="showCompleted" className="text-sm">
                  Abgeschlossene Aufgaben anzeigen
                </label>
              </div>
            </div>
          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardHeader>
      </Card>

      {/* Grouping Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Gruppieren nach:</span>
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priorität</SelectItem>
                  <SelectItem value="assignee">Zuständig</SelectItem>
                  <SelectItem value="project">Projekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              {filteredTasks.length} von {tasks.length} Aufgaben
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="flex space-x-4 min-w-max" style={{ minWidth: 'fit-content' }}>
          {columns.map((column) => {
            const columnTasks = getTasksForColumn(column);
            
            return (
              <div key={column.id} className="flex flex-col h-full w-80 flex-shrink-0">
                {/* Column Header */}
                <div className="mb-3 flex items-center gap-2 px-1">
                  <div className={`w-3 h-3 rounded-full ${column.color.split(' ')[0]}`} />
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs px-2">
                    {columnTasks.length}
                  </Badge>
                </div>
                
                <div 
                  className="flex-1 min-h-[400px] p-3 bg-muted/30 rounded-2xl overflow-y-auto border border-border/50 scrollbar-thin"
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(e, column.id).catch(error => {
                      console.error('Failed to handle drop:', error);
                    });
                  }}
                >
                  {columnTasks.map((task, index) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      style={{ 
                        animationDelay: `${index * 0.05}s`,
                      }}
                      className="animate-in fade-in-0 slide-in-from-bottom-2"
                    >
                      <KanbanCard
                        task={task}
                        onTaskUpdate={onTaskUpdate}
                        onTaskDelete={onTaskDelete}
                        onTaskEdit={onTaskEdit}
                        onTaskTitleClick={onTaskTitleClick}
                        onSubtaskUpdate={onSubtaskUpdate}
                        onSubtaskAdd={onSubtaskAdd}
                        currentUser={currentUser}
                        users={users}
                        defaultExpanded={Array.isArray(task.subtasks) ? task.subtasks.some((st: any) => currentUserId && st?.assigneeId === currentUserId) : false}
                      />
                    </div>
                  ))}
                  
                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-muted-foreground text-sm py-12">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Package className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <p>Keine Aufgaben</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}