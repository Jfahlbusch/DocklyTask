'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, Project, Customer, User as UserType, Category, Team, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import CommentForm from '@/components/forms/CommentForm';
import CommentsSection from '@/components/shared/CommentsSection';
import TaskDetailView from '@/components/shared/TaskDetailView';
import SubtaskForm from '@/components/forms/SubtaskForm';
import AttachmentForm from '@/components/forms/AttachmentForm';
import TaskInternalChat from '@/components/TaskInternalChat';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import DropdownSelect from '@/components/ui/DropdownSelect';
import QuickUserFilter from '@/components/shared/QuickUserFilter';
import { CalendarDays, User as UserIcon, MoreHorizontal, Edit, Trash2, CheckSquare, Square, Plus, ChevronDown, Paperclip } from 'lucide-react';
import SectionHeader from '@/components/shared/SectionHeader';
import TaskMetaChips from '@/components/shared/TaskMetaChips';
import SubtaskList from '@/components/shared/SubtaskList';

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
  }
`;

interface TaskItemProps {
  task: Task & {
    project?: Project;
    customer?: Customer;
    category?: Category;
    assignee?: UserType;
    team?: Team;
    createdBy?: UserType;
    taskStatus?: any;
    subtasks: any[];
    attachments: any[];
    comments: any[];
  };
  taskStatuses: any[];
  users: UserType[];
  teams: Team[];
  projects: Project[];
  customers: Customer[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onSubtaskAdd: (taskId: string, data: any) => void;
  onSubtaskDelete: (subtaskId: string) => void;
  onCommentAdd: (taskId: string, content: string) => void;
  onCommentUpdate: (commentId: string, content: string) => void;
  onCommentDelete: (commentId: string) => void;
  onAttachmentAdd: (taskId: string, file: File) => void;
  onAttachmentDelete: (attachmentId: string) => void;
  onCommentAttachmentAdd: (commentId: string, file: File) => void;
  onCommentAttachmentDelete: (attachmentId: string) => void;
  currentUser: any;
}

function TaskItem({ task, taskStatuses, users, teams, projects, customers, onTaskUpdate, onTaskDelete, onTaskEdit, onSubtaskUpdate, onSubtaskAdd, onSubtaskDelete, onCommentAdd, onCommentUpdate, onCommentDelete, onAttachmentAdd, onAttachmentDelete, onCommentAttachmentAdd, onCommentAttachmentDelete, currentUser }: TaskItemProps) {
  // Debug: Log task data to verify ID is available
  console.log('TaskItem task data:', { id: task.id, taskNumber: task.taskNumber, title: task.title, fullTask: task });

  return (
    <div className="mb-6">
      <TaskDetailView
        renderMode="inline"
        task={task as any}
        taskStatuses={taskStatuses as any}
        users={users as any}
        teams={teams as any}
        projects={projects as any}
        customers={customers as any}
        onTaskUpdate={onTaskUpdate}
        onTaskDelete={onTaskDelete}
        onTaskEdit={onTaskEdit}
        onSubtaskUpdate={onSubtaskUpdate}
        onSubtaskAdd={async (taskId, data) => onSubtaskAdd(taskId, data)}
        onSubtaskDelete={onSubtaskDelete}
        onCommentAdd={onCommentAdd}
        onCommentUpdate={onCommentUpdate}
        onCommentDelete={onCommentDelete}
        onAttachmentAdd={async (taskId, file) => onAttachmentAdd(taskId, file)}
        onAttachmentDelete={async (attachmentId) => onAttachmentDelete(attachmentId)}
        onCommentAttachmentAdd={async (commentId, file) => onCommentAttachmentAdd(commentId, file)}
        onCommentAttachmentDelete={async (attachmentId) => onCommentAttachmentDelete(attachmentId)}
                  currentUser={currentUser}
        refreshData={async () => {}}
        onInlineShowDetailsClick={(t) => {
          try {
            const tn = (t as any)?.taskNumber;
            if (tn) {
              window.open(`/ticket/${tn}`, '_blank', 'noopener');
            } else {
              window.open(`/?view=kanban&taskId=${t.id}`,'_blank','noopener');
            }
          } catch {}
        }}
                />
              </div>
  );
}

interface DashboardProps {
  tasks: (Task & {
    project?: Project;
    customer?: Customer;
    category?: Category;
    assignee?: UserType;
    team?: Team;
    createdBy?: UserType;
    taskStatus?: any;
    subtasks: any[];
    attachments: any[];
    comments: any[];
    products?: any[];
  })[];
  users: UserType[];
  teams: Team[];
  projects: Project[];
  customers: Customer[];
  categories: Category[];
  products: Product[];
  taskStatuses: any[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onSubtaskAdd: (taskId: string, data: any) => void;
  onSubtaskDelete: (subtaskId: string) => void;
  onCommentAdd: (taskId: string, content: string) => void;
  onCommentUpdate: (commentId: string, content: string) => void;
  onCommentDelete: (commentId: string) => void;
  onAttachmentAdd: (taskId: string, file: File) => void;
  onAttachmentDelete: (attachmentId: string) => void;
  onCommentAttachmentAdd: (commentId: string, file: File) => void;
  onCommentAttachmentDelete: (attachmentId: string) => void;
  currentUser: any;
}

// Inject custom scrollbar styles
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = customScrollbarStyles;
  document.head.appendChild(style);
}

export default function Dashboard({
  tasks,
  users,
  teams,
  projects,
  customers,
  categories,
  products,
  taskStatuses,
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit,
  onSubtaskUpdate,
  onSubtaskAdd,
  onSubtaskDelete,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onAttachmentAdd,
  onAttachmentDelete,
  onCommentAttachmentAdd,
  onCommentAttachmentDelete,
  currentUser
}: DashboardProps) {
  const [filters, setFilters] = useState({
    assigneeId: 'all',
    status: 'all',
    priority: 'all',
    categoryId: 'all',
    customerId: 'all',
    productId: 'all',
    dueDate: 'all',
    showCompleted: false
  });

  // State for accordion open/close
  const [taskAccordionOpen, setTaskAccordionOpen] = useState(true);
  const [filterAccordionOpen, setFilterAccordionOpen] = useState(false);

  // Group tasks by project
  const groupedTasks = tasks.reduce((acc, task) => {
    const projectKey = task.projectId || 'unassigned';
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: task.project,
        tasks: []
      };
    }
    acc[projectKey].tasks.push(task);
    return acc;
  }, {} as Record<string, { project?: Project; tasks: typeof tasks }>);

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
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.categoryId !== 'all' && task.categoryId !== filters.categoryId) return false;
    if (filters.customerId !== 'all' && task.customerId !== filters.customerId) return false;
    
    // Product filter
    if (filters.productId !== 'all') {
      const hasProduct = Array.isArray(task.products) && task.products.some((tp: any) => tp.productId === filters.productId || tp.product?.id === filters.productId);
      if (!hasProduct) return false;
    }
    
    if (!filters.showCompleted && task.status === 'COMPLETED') return false;
    
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

  return (
    <div className="space-y-6">
      {/* Quick Filter - Employees (shared component) */}
      <QuickUserFilter
        users={users as any}
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
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
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCompleted"
                  checked={filters.showCompleted}
                  onCheckedChange={(checked) => handleFilterChange('showCompleted', checked as boolean)}
                />
                <label htmlFor="showCompleted" className="text-sm">
                  Show Completed Tasks
                </label>
              </div>
            </div>
          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardHeader>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Aufgaben ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedTasks).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Aufgaben gefunden</p>
          ) : (
            <Accordion 
              type="multiple" 
              className="w-full"
              value={taskAccordionOpen ? Object.keys(groupedTasks).filter(key => {
                const group = groupedTasks[key];
                const projectTasks = group.tasks.filter(task => 
                  filteredTasks.some(ft => ft.id === task.id)
                );
                return projectTasks.length > 0;
              }) : []}
              onValueChange={(value) => setTaskAccordionOpen(value.length > 0)}
            >
              {Object.entries(groupedTasks).map(([projectKey, group]) => {
                const projectTasks = group.tasks.filter(task => 
                  filteredTasks.some(ft => ft.id === task.id)
                );
                
                if (projectTasks.length === 0) return null;

                return (
                  <AccordionItem key={projectKey} value={projectKey}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {group.project?.name || 'Nicht zugeordnete Aufgaben'}
                          </span>
                          {group.project && (
                            <Badge variant="outline">
                              {group.project.status}
                            </Badge>
                          )}
                          {group.project?.goLiveDate && (
                            <span className="text-sm text-gray-500">
                              Go-Live: {new Date(group.project.goLiveDate).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {projectTasks.length} Aufgaben
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2">
                        {projectTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            taskStatuses={taskStatuses}
                            users={users}
                            teams={teams}
                            projects={projects}
                            customers={customers}
                            onTaskUpdate={onTaskUpdate}
                            onTaskDelete={onTaskDelete}
                            onTaskEdit={onTaskEdit}
                            onSubtaskUpdate={onSubtaskUpdate}
                            onSubtaskAdd={onSubtaskAdd}
                             onSubtaskDelete={onSubtaskDelete}
                            onCommentAdd={onCommentAdd}
                            onCommentUpdate={onCommentUpdate}
                            onCommentDelete={onCommentDelete}
                            onAttachmentAdd={onAttachmentAdd}
                            onAttachmentDelete={onAttachmentDelete}
                            onCommentAttachmentAdd={onCommentAttachmentAdd}
                            onCommentAttachmentDelete={onCommentAttachmentDelete}
                            currentUser={currentUser}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}