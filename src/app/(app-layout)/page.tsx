'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTaskContext } from '@/hooks/useTaskContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import Dashboard from '@/components/Dashboard';
import KanbanBoard from '@/components/KanbanBoard';
import TaskForm from '@/components/forms/TaskForm';
import TaskDetailPopup from '@/components/TaskDetailPopup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, LayoutList, KanbanSquare, Sparkles } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem, SpinLoader } from '@/components/motion';

export default function HomePage() {
  const {
    tasks,
    users,
    teams,
    projects,
    customers,
    categories,
    taskStatuses,
    products,
    loading,
    error,
    updateTask,
    deleteTask,
    addTask,
    updateSubtask,
    addSubtask,
    addComment,
    updateComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
    addCommentAttachment,
    deleteCommentAttachment,
    deleteSubtask,
    refreshData,
  } = useTaskContext();

  const { canRead, isAdmin, isManager } = useUserPermissions();
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTaskForPopup, setSelectedTaskForPopup] = useState<any>(null);
  const [showTaskDetailPopup, setShowTaskDetailPopup] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');

  // Helper: URL-Query anpassen
  const setQueryParams = (patch: Record<string, string | null>) => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') sp.delete(k); else sp.set(k, v);
    });
    const qs = sp.toString();
    router.replace(qs ? `/?${qs}` : '/');
  };

  // Öffnen per URL: /?view=kanban&taskId=... oder /?view=kanban&taskNo=123
  useEffect(() => {
    const view = (searchParams?.get('view') || '').toLowerCase();
    const taskId = searchParams?.get('taskId') || '';
    const taskNo = searchParams?.get('taskNo');
    if (view === 'kanban') {
      setActiveTab('kanban');
      if (tasks.length > 0) {
        const t = taskNo
          ? tasks.find(t => String((t as any).taskNumber) === String(taskNo))
          : tasks.find(t => t.id === taskId);
        if (t) {
          setSelectedTaskForPopup(t);
          setShowTaskDetailPopup(true);
        }
      }
    }
  }, [searchParams, tasks]);

  const handleTaskEdit = (task: any) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskTitleClick = (task: any) => {
    setSelectedTaskForPopup(task);
    setShowTaskDetailPopup(true);
    const no = (task as any)?.taskNumber;
    if (no != null) setQueryParams({ view: 'kanban', taskNo: String(no), taskId: null });
    else setQueryParams({ view: 'kanban', taskId: task.id, taskNo: null });
  };

  const handleTaskSubmit = async (data: any) => {
    try {
      if (editingTask) {
        // Update existing task
        await updateTask(editingTask.id, {
          ...data,
          productIds: data.productIds || [],
        });
      } else {
        // Create new task
        const taskData = {
          ...data,
          // ensure FKs are undefined, not empty strings
          customerId: data.customerId || undefined,
          projectId: data.projectId || undefined,
          categoryId: data.categoryId || undefined,
          assigneeId: data.assigneeId || undefined,
          teamId: data.teamId || undefined,
          statusId: data.statusId || undefined,
          productIds: data.productIds || [],
          createdById: users[0]?.id || data.createdById,
        };
        await addTask(taskData);
      }
      
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleSubtaskUpdate = async (subtaskId: string, updates: any) => {
    try {
      await updateSubtask(subtaskId, updates);
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleCommentAdd = async (taskId: string, content: string) => {
    try {
      await addComment({
        content,
        taskId,
        userId: users[0]?.id || '', // Using first user as current user for demo
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSubtaskAdd = async (taskId: string, data: any) => {
    try {
      const created = await addSubtask({
        ...data,
        taskId,
      });
      return created;
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  const handleSubtaskDelete = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleAttachmentAdd = async (taskId: string, file: File) => {
    try {
      await addAttachment({ taskId, file });
    } catch (error) {
      console.error('Error adding attachment:', error);
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId);
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleCommentUpdate = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, { content });
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleCommentAttachmentAdd = async (commentId: string, file: File) => {
    try {
      await addCommentAttachment({ commentId, file });
    } catch (error) {
      console.error('Error adding comment attachment:', error);
    }
  };

  const handleCommentAttachmentDelete = async (attachmentId: string) => {
    try {
      await deleteCommentAttachment(attachmentId);
    } catch (error) {
      console.error('Error deleting comment attachment:', error);
    }
  };

  const handleTaskCancel = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FadeIn>
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto shadow-glow">
                <SpinLoader className="w-10 h-10" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">Lade Aufgaben...</p>
              <p className="text-sm text-muted-foreground">Einen Moment bitte</p>
            </div>
          </div>
        </FadeIn>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FadeIn>
          <Card variant="elevated" className="w-full max-w-md border-destructive/20">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center mx-auto">
                  <span className="text-4xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-destructive mb-2">Fehler aufgetreten</h2>
                  <p className="text-muted-foreground mb-6">{error}</p>
                </div>
                <Button 
                  onClick={() => refreshData()}
                  className="shadow-glow"
                >
                  Erneut versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground ml-13">
              Willkommen zurück! Hier sind Ihre aktuellen Aufgaben.
            </p>
          </div>
          <Button 
            onClick={() => setShowTaskForm(true)}
            className="shadow-glow sm:w-auto w-full group"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
            Neue Aufgabe
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); if (v === 'kanban') { setQueryParams({ view: 'kanban' }); } else { setQueryParams({ view: 'list', taskId: null, taskNo: null }); } }} className="space-y-6">
          <TabsList className="bg-muted/50 p-1.5 rounded-xl h-auto">
            <TabsTrigger 
              value="list" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 transition-all"
            >
              <LayoutList className="h-4 w-4" />
              Listenansicht
            </TabsTrigger>
            <TabsTrigger 
              value="kanban" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 transition-all"
            >
              <KanbanSquare className="h-4 w-4" />
              Kanban-Ansicht
            </TabsTrigger>
          </TabsList>

        <TabsContent value="list">
          <Dashboard
            tasks={tasks}
            users={users}
            teams={teams}
            projects={projects}
            customers={customers}
            categories={categories}
            products={products}
            taskStatuses={taskStatuses}
            onTaskUpdate={updateTask}
            onTaskDelete={deleteTask}
            onTaskEdit={handleTaskEdit}
            onSubtaskUpdate={handleSubtaskUpdate}
            onSubtaskAdd={handleSubtaskAdd}
            onSubtaskDelete={handleSubtaskDelete}
            onCommentAdd={handleCommentAdd}
            onCommentUpdate={handleCommentUpdate}
            onCommentDelete={handleCommentDelete}
            onAttachmentAdd={handleAttachmentAdd}
            onAttachmentDelete={handleAttachmentDelete}
            onCommentAttachmentAdd={handleCommentAttachmentAdd}
            onCommentAttachmentDelete={handleCommentAttachmentDelete}
            currentUser={users[0]} // Using first user as current user for demo
          />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanBoard
            tasks={tasks}
            users={users}
            projects={projects}
            customers={customers}
            categories={categories}
            products={products}
            taskStatuses={taskStatuses}
            onTaskUpdate={updateTask}
            onTaskDelete={deleteTask}
            onTaskEdit={handleTaskEdit}
            onTaskTitleClick={handleTaskTitleClick}
            onSubtaskUpdate={handleSubtaskUpdate}
            onSubtaskAdd={handleSubtaskAdd}
            currentUser={users[0]} // Using first user as current user for demo
          />
        </TabsContent>
        </Tabs>
      </FadeIn>

      <TaskForm
        task={editingTask}
        customers={customers}
        projects={projects}
        categories={categories}
        users={users}
        teams={teams}
        products={products}
        taskStatuses={taskStatuses}
        onSubmit={handleTaskSubmit}
        onCancel={handleTaskCancel}
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
      />

      {/* Task Detail Popup */}
      {selectedTaskForPopup && (
        <TaskDetailPopup
          task={selectedTaskForPopup}
          taskStatuses={taskStatuses}
          projects={projects}
          customers={customers}
          onTaskUpdate={updateTask}
          onTaskDelete={deleteTask}
          onTaskEdit={handleTaskEdit}
          onSubtaskUpdate={handleSubtaskUpdate}
          onSubtaskAdd={handleSubtaskAdd}
              onSubtaskDelete={handleSubtaskDelete}
          onCommentAdd={handleCommentAdd}
          onCommentUpdate={handleCommentUpdate}
          onCommentDelete={handleCommentDelete}
          onAttachmentAdd={handleAttachmentAdd}
          onAttachmentDelete={handleAttachmentDelete}
          onCommentAttachmentAdd={handleCommentAttachmentAdd}
          onCommentAttachmentDelete={handleCommentAttachmentDelete}
          currentUser={users[0]} // Using first user as current user for demo
          users={users}
          teams={teams}
          refreshData={refreshData}
          open={showTaskDetailPopup}
          onOpenChange={(open) => { setShowTaskDetailPopup(open); if (!open) { setQueryParams({ view: 'kanban', taskId: null, taskNo: null }); } }}
        />
      )}
    </div>
  );
}
