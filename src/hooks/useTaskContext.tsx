'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Task, Project, Customer, User, Category, Team, TaskStatus, Product } from '@/lib/types';

interface TaskContextType {
  tasks: (Task & {
    project?: Project;
    customer?: Customer;
    category?: Category;
    assignee?: User;
    createdBy?: User;
    team?: Team;
    taskStatus?: TaskStatus;
    subtasks: any[];
    attachments: any[];
    comments: any[];
    products: any[];
  })[];
  users: User[];
  projects: Project[];
  customers: Customer[];
  categories: Category[];
  teams: Team[];
  taskStatuses: TaskStatus[];
  products: Product[];
  loading: boolean;
  error: string | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSubtask: (subtaskId: string, updates: any) => Promise<void>;
  addSubtask: (subtask: any) => Promise<any>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (comment: any) => Promise<void>;
  updateComment: (commentId: string, updates: any) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  addAttachment: (attachment: any) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  addCommentAttachment: (attachment: any) => Promise<void>;
  deleteCommentAttachment: (attachmentId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskContextType['tasks']>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        tasksRes,
        usersRes,
        projectsRes,
        customersRes,
        categoriesRes,
        teamsRes,
        taskStatusesRes,
        productsRes,
      ] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/users'),
        fetch('/api/projects'),
        fetch('/api/customers'),
        fetch('/api/categories'),
        fetch('/api/teams'),
        fetch('/api/task-statuses'),
        fetch('/api/products'),
      ]);

      // Parse JSON responses
      const [
        tasksData,
        usersData,
        projectsData,
        customersData,
        categoriesData,
        teamsData,
        taskStatusesData,
        productsData,
      ] = await Promise.all([
        tasksRes.json(),
        usersRes.json(),
        projectsRes.json(),
        customersRes.json(),
        categoriesRes.json(),
        teamsRes.json(),
        taskStatusesRes.json(),
        productsRes.json(),
      ]);

      // Validate that we received arrays (API might return error objects)
      if (!Array.isArray(tasksData)) {
        console.error('Tasks API returned non-array:', tasksData);
        throw new Error(tasksData?.error || 'Tasks API returned invalid data');
      }
      if (!Array.isArray(usersData)) {
        console.error('Users API returned non-array:', usersData);
        throw new Error(usersData?.error || 'Users API returned invalid data');
      }
      if (!Array.isArray(productsData)) {
        console.error('Products API returned non-array:', productsData);
        throw new Error(productsData?.error || 'Products API returned invalid data');
      }

      // Enrich tasks with related data
      const enrichedTasks = tasksData.map((task: any) => ({
        ...task,
        project: projectsData.find((p: Project) => p.id === task.projectId),
        customer: customersData.find((c: Customer) => c.id === task.customerId),
        category: categoriesData.find((c: Category) => c.id === task.categoryId),
        assignee: usersData.find((u: User) => u.id === task.assigneeId),
        createdBy: usersData.find((u: User) => u.id === task.createdById),
        team: teamsData.find((t: Team) => t.id === task.teamId),
        taskStatus: taskStatusesData.find((ts: TaskStatus) => ts.id === task.statusId),
        subtasks: (task.subtasks || []).map((subtask: any) => ({
          ...subtask,
          assignee: usersData.find((u: User) => u.id === subtask.assigneeId),
          team: teamsData.find((t: Team) => t.id === subtask.teamId),
        })),
        attachments: task.attachments || [],
        comments: task.comments || [],
        products: (task.products || []).map((tp: any) => ({
          ...tp,
          product: tp.product || productsData.find((p: Product) => p.id === tp.productId),
        })),
      }));

      setTasks(enrichedTasks);
      setUsers(usersData);
      setProjects(projectsData);
      setCustomers(customersData);
      setCategories(categoriesData);
      setTeams(teamsData);
      setTaskStatuses(taskStatusesData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight SWR-ähnliche Revalidierung eines einzelnen Tasks
  const revalidateTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) return; // stillschweigend überspringen
      const fresh = await res.json();
      const enriched = {
        ...fresh,
        project: projects.find(p => p.id === fresh.projectId),
        customer: customers.find(c => c.id === fresh.customerId),
        category: categories.find(c => c.id === fresh.categoryId),
        assignee: users.find(u => u.id === fresh.assigneeId),
        createdBy: users.find(u => u.id === fresh.createdById),
        team: teams.find(t => t.id === fresh.teamId),
        taskStatus: taskStatuses.find(ts => ts.id === fresh.statusId),
        subtasks: (fresh.subtasks || []).map((st: any) => ({
          ...st,
          assignee: users.find(u => u.id === st.assigneeId),
          team: teams.find(t => t.id === st.teamId),
        })),
        products: (fresh.products || []).map((tp: any) => ({
          ...tp,
          product: tp.product || products.find(p => p.id === tp.productId),
        })),
      } as any;
      setTasks(prev => prev.map(t => (t.id === taskId ? enriched : t)));
    } catch (e) {
      // keine harte Fehlermeldung nötig
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Normalize payload: empty strings for optional FKs -> '' allowed, server converts to null
      const normalized: any = { ...updates };
      const fkKeys = ['customerId','projectId','categoryId','assigneeId','teamId','statusId'];
      for (const k of fkKeys) {
        if (k in normalized && normalized[k] === undefined) delete normalized[k];
      }
      if ('startDate' in normalized && normalized.startDate === undefined) delete normalized.startDate;
      if ('dueDate' in normalized && normalized.dueDate === undefined) delete normalized.dueDate;

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const reason = err?.error || err?.details || response.statusText;
        throw new Error(`Failed to update task: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
      }

      const updatedTask = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                ...updatedTask,
                project: projects.find(p => p.id === updatedTask.projectId),
                customer: customers.find(c => c.id === updatedTask.customerId),
                category: categories.find(c => c.id === updatedTask.categoryId),
                assignee: users.find(u => u.id === updatedTask.assigneeId),
                createdBy: users.find(u => u.id === updatedTask.createdById),
                team: teams.find(t => t.id === updatedTask.teamId),
                taskStatus: taskStatuses.find(ts => ts.id === updatedTask.statusId),
                isCustomerVisible: (updatedTask as any).isCustomerVisible,
                products: (updatedTask.products || []).map((tp: any) => ({
                  ...tp,
                  product: tp.product || products.find(p => p.id === tp.productId),
                })),
              }
            : task
        )
      );
      // Hintergrund-Revalidierung, um serverseitige Ableitungen zu synchronisieren
      revalidateTask(taskId);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Normalize payload: convert empty strings to undefined for optional FKs
      const normalized: any = {
        ...taskData,
        customerId: (taskData as any).customerId || undefined,
        projectId: (taskData as any).projectId || undefined,
        categoryId: (taskData as any).categoryId || undefined,
        assigneeId: (taskData as any).assigneeId || undefined,
        teamId: (taskData as any).teamId || undefined,
        statusId: (taskData as any).statusId || undefined,
        productIds: (taskData as any).productIds || [],
        createdById: (taskData as any).createdById || users[0]?.id,
      };

      if (!normalized.createdById) {
        throw new Error('Kein gültiger Ersteller (createdById) vorhanden');
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const reason = err?.error || err?.details || response.statusText;
        throw new Error(`Failed to create task: ${reason}`);
      }

      const newTask = await response.json();
      const enrichedTask = {
        ...newTask,
        project: projects.find(p => p.id === newTask.projectId),
        customer: customers.find(c => c.id === newTask.customerId),
        category: categories.find(c => c.id === newTask.categoryId),
        assignee: users.find(u => u.id === newTask.assigneeId),
        createdBy: users.find(u => u.id === newTask.createdById),
        team: teams.find(t => t.id === newTask.teamId),
        taskStatus: taskStatuses.find(ts => ts.id === newTask.statusId),
        subtasks: [],
        attachments: [],
        comments: [],
        products: (newTask.products || []).map((tp: any) => ({
          ...tp,
          product: tp.product || products.find(p => p.id === tp.productId),
        })),
      };

      setTasks(prev => [...prev, enrichedTask]);
      // Hintergrund-Revalidierung dieses Tasks (inkl. evtl. serverseitiger Defaults)
      revalidateTask(enrichedTask.id);
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const updateSubtask = async (subtaskId: string, updates: any) => {
    try {
      const hostTask = tasks.find(t => t.subtasks?.some((st: any) => st.id === subtaskId));
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      const updatedSubtask = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.subtasks?.some((st: any) => st.id === subtaskId)
            ? {
                ...task,
                subtasks: task.subtasks.map((st: any) =>
                  st.id === subtaskId 
                    ? {
                        ...updatedSubtask,
                        assignee: users.find(u => u.id === updatedSubtask.assigneeId),
                        team: teams.find(t => t.id === updatedSubtask.teamId),
                      }
                    : st
                ),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error updating subtask:', err);
      throw err;
    }
  };

  const addSubtask = async (subtaskData: any) => {
    try {
      const response = await fetch('/api/subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subtaskData),
      });

      if (!response.ok) {
        throw new Error('Failed to create subtask');
      }

      const newSubtask = await response.json();
      setTasks(prev => {
        return prev.map(task => {
          if (task.id !== subtaskData.taskId) return task;
          const enriched = {
            ...newSubtask,
            assignee: users.find(u => u.id === newSubtask.assigneeId),
            team: teams.find(t => t.id === newSubtask.teamId),
          };
          return {
            ...task,
            subtasks: [...(task.subtasks || []), enriched],
          };
        });
      });
      // Nur den betroffenen Task nachziehen
      revalidateTask(subtaskData.taskId);
      return newSubtask;
    } catch (err) {
      console.error('Error creating subtask:', err);
      throw err;
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const hostTask = tasks.find(t => t.subtasks?.some((st: any) => st.id === subtaskId));
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      setTasks(prev =>
        prev.map(task =>
          task.subtasks?.some((st: any) => st.id === subtaskId)
            ? {
                ...task,
                subtasks: task.subtasks.filter((st: any) => st.id !== subtaskId),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error deleting subtask:', err);
      throw err;
    }
  };

  const addComment = async (commentData: any) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      const newComment = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.id === commentData.taskId
            ? {
                ...task,
                comments: [...(task.comments || []), newComment],
              }
            : task
        )
      );
      revalidateTask(commentData.taskId);
    } catch (err) {
      console.error('Error creating comment:', err);
      throw err;
    }
  };

  const updateComment = async (commentId: string, updates: any) => {
    try {
      const hostTask = tasks.find(t => t.comments?.some((c: any) => c.id === commentId));
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      const updatedComment = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.comments?.some((c: any) => c.id === commentId)
            ? {
                ...task,
                comments: task.comments.map((c: any) =>
                  c.id === commentId ? updatedComment : c
                ),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error updating comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const hostTask = tasks.find(t => t.comments?.some((c: any) => c.id === commentId));
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setTasks(prev =>
        prev.map(task =>
          task.comments?.some((c: any) => c.id === commentId)
            ? {
                ...task,
                comments: task.comments.filter((c: any) => c.id !== commentId),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  const addAttachment = async (attachmentData: { taskId: string; file: File }) => {
    try {
      const formData = new FormData();
      formData.append('taskId', attachmentData.taskId);
      formData.append('file', attachmentData.file);

      const response = await fetch('/api/task-attachments', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const reason = err?.error || response.statusText;
        throw new Error(`Failed to create attachment: ${reason}`);
      }

      const newAttachment = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.id === attachmentData.taskId
            ? {
                ...task,
                attachments: [...(task.attachments || []), newAttachment],
              }
            : task
        )
      );
      revalidateTask(attachmentData.taskId);
    } catch (err) {
      console.error('Error creating attachment:', err);
      throw err;
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const hostTask = tasks.find(t => t.attachments?.some((a: any) => a.id === attachmentId));
      const response = await fetch(`/api/task-attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      setTasks(prev =>
        prev.map(task =>
          task.attachments?.some((a: any) => a.id === attachmentId)
            ? {
                ...task,
                attachments: task.attachments.filter((a: any) => a.id !== attachmentId),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error deleting attachment:', err);
      throw err;
    }
  };

  const addCommentAttachment = async (attachmentData: any) => {
    try {
      const response = await fetch('/api/comment-attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachmentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create comment attachment');
      }

      const newAttachment = await response.json();
      setTasks(prev =>
        prev.map(task =>
          task.comments?.some((c: any) => c.id === attachmentData.commentId)
            ? {
                ...task,
                comments: task.comments.map((comment: any) =>
                  comment.id === attachmentData.commentId
                    ? {
                        ...comment,
                        attachments: [...(comment.attachments || []), newAttachment],
                      }
                    : comment
                ),
              }
            : task
        )
      );
      const host = tasks.find(t => t.comments?.some((c: any) => c.id === attachmentData.commentId));
      if (host) revalidateTask(host.id);
    } catch (err) {
      console.error('Error creating comment attachment:', err);
      throw err;
    }
  };

  const deleteCommentAttachment = async (attachmentId: string) => {
    try {
      const hostTask = tasks.find(t => t.comments?.some((c: any) => c.attachments?.some((a: any) => a.id === attachmentId)));
      const response = await fetch(`/api/comment-attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment attachment');
      }

      setTasks(prev =>
        prev.map(task =>
          task.comments?.some((c: any) =>
            c.attachments?.some((a: any) => a.id === attachmentId)
          )
            ? {
                ...task,
                comments: task.comments.map((comment: any) =>
                  comment.attachments?.some((a: any) => a.id === attachmentId)
                    ? {
                        ...comment,
                        attachments: (comment.attachments || []).filter(
                          (attachment: any) => attachment.id !== attachmentId
                        ),
                      }
                    : comment
                ),
              }
            : task
        )
      );
      if (hostTask) revalidateTask(hostTask.id);
    } catch (err) {
      console.error('Error deleting comment attachment:', err);
      throw err;
    }
  };

  const contextValue: TaskContextType = {
    tasks,
    users,
    projects,
    customers,
    categories,
    teams,
    taskStatuses,
    products,
    loading,
    error,
    updateTask,
    deleteTask,
    addTask,
    updateSubtask,
    addSubtask,
    deleteSubtask,
    addComment,
    updateComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
    addCommentAttachment,
    deleteCommentAttachment,
    refreshData: fetchData,
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext(): TaskContextType {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}