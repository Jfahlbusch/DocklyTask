'use client';

import { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '@/hooks/useTaskContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Task, Project, Customer, User as UserType, Category, Team } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import CommentForm from '@/components/forms/CommentForm';
import SubtaskForm from '@/components/forms/SubtaskForm';
import AttachmentForm from '@/components/forms/AttachmentForm';
import TaskInternalChat from '@/components/TaskInternalChat';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import DropdownSelect from '@/components/ui/DropdownSelect';
import DatePickerSelect from '@/components/ui/DatePickerSelect';
import UserSearchSelect from '@/components/ui/UserSearchSelect';
import { CalendarDays, User as UserIcon, MoreHorizontal, Edit, Trash2, Paperclip, MessageSquare, CheckSquare, Square, Plus, ChevronDown, X, Save, Lock, Unlock, Eye, EyeOff, Package } from 'lucide-react';
import { getSocket } from '@/lib/socketClient';
import MultiDropdownSelect from '@/components/ui/MultiDropdownSelect';
import { renderProductIcon } from '@/components/shared/ProductIcon';

type RenderMode = 'popup' | 'inline';

export interface TaskDetailViewProps {
  renderMode?: RenderMode;
  task: Task & { project?: Project; customer?: Customer; category?: Category; assignee?: UserType; team?: Team; createdBy?: UserType; taskStatus?: any; subtasks: any[]; attachments: any[]; comments: any[] };
  taskStatuses: any[];
  users: any[];
  teams: any[];
  projects?: Project[];
  customers?: Customer[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onSubtaskAdd: (taskId: string, data: any) => Promise<any>;
  onSubtaskDelete: (subtaskId: string) => void;
  onCommentAdd: (taskId: string, content: string) => void;
  onCommentUpdate: (commentId: string, content: string) => void;
  onCommentDelete: (commentId: string) => void;
  onAttachmentAdd: (taskId: string, file: File) => Promise<void>;
  onAttachmentDelete: (attachmentId: string) => Promise<void>;
  onCommentAttachmentAdd: (commentId: string, file: File) => Promise<void>;
  onCommentAttachmentDelete: (attachmentId: string) => Promise<void>;
  currentUser: any;
  refreshData: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultExpandAll?: boolean;
  onInlineShowDetailsClick?: (task: Task & { project?: Project; customer?: Customer }) => void;
}

export default function TaskDetailView(props: TaskDetailViewProps) {
  const {
    renderMode = 'popup',
    task,
    taskStatuses,
    users,
    teams,
    projects,
    customers,
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
    currentUser,
    refreshData,
    open,
    onOpenChange,
    onInlineShowDetailsClick,
  } = props;

  // Der gesamte innere Logik- und UI-Teil wird aus dem bisherigen Popup übernommen
  const { isAdmin, isManager } = useUserPermissions();
  const { tasks: allTasks, categories, products: allProducts } = useTaskContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(task.title || '');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState<string>(task.description || '');
  const statusMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const [statusMenuDropUp, setStatusMenuDropUp] = useState(false);
  const [statusMenuCoords, setStatusMenuCoords] = useState<{ left: number; top: number } | null>(null);
  const subtasksRef = useRef<HTMLDivElement>(null!);
  const attachmentsRef = useRef<HTMLDivElement>(null!);
  const chatRef = useRef<HTMLDivElement>(null!);
  const getInitials = (raw: string | undefined | null) => {
    const value = (raw || '').trim();
    if (!value) return '?';
    const emailIdx = value.indexOf('@');
    const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
    const bySpace = base.split(/\s+/).filter(Boolean);
    if (bySpace.length >= 2) return (bySpace[0][0] + bySpace[bySpace.length - 1][0]).toUpperCase();
    const bySeparators = base.split(/[._-]+/).filter(Boolean);
    if (bySeparators.length >= 2) return (bySeparators[0][0] + bySeparators[bySeparators.length - 1][0]).toUpperCase();
    const firstTwo = base.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    return (firstTwo || base[0]).toUpperCase();
  };
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  const [localSubtasks, setLocalSubtasks] = useState<any[]>(task.subtasks || []);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [currentTask, setCurrentTask] = useState({ ...(task as any), isCustomerVisible: (task as any).isCustomerVisible ?? false } as any);
  const [editingSubtaskTitleId, setEditingSubtaskTitleId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState<string>('');
  const [isSavingSubtaskTitle, setIsSavingSubtaskTitle] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState<boolean>(!!props.defaultExpandAll);
  // Inline: Standardmäßig zusammengeklappt, außer defaultExpandAll = true
  const [isInlineCollapsed, setIsInlineCollapsed] = useState<boolean>(props.renderMode === 'inline' ? !props.defaultExpandAll : false);
  const currentUserId = (currentUser as any)?.id || (users?.[0]?.id);
  const WATCH_KEY = currentUserId ? `taskwise:watchlist:${currentUserId}` : 'taskwise:watchlist';
  const readWatchList = (): string[] => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(WATCH_KEY) : null;
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const writeWatchList = (list: string[]) => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(WATCH_KEY, JSON.stringify(Array.from(new Set(list)))); } catch {}
  };
  const [isWatching, setIsWatching] = useState<boolean>(() => readWatchList().includes(task.id));
  useEffect(() => { setIsWatching(readWatchList().includes(task.id)); }, [task.id]);
  const toggleWatch = () => {
    const list = readWatchList();
    if (list.includes(task.id)) {
      writeWatchList(list.filter(id => id !== task.id));
      setIsWatching(false);
    } else {
      writeWatchList([...list, task.id]);
      setIsWatching(true);
    }
  };
  // Verwaltung weiterer Beobachter (global pro User in localStorage: taskwise:watchlist:<userId>)
  const readWatcherIdsForAllUsers = (): string[] => {
    const ids: string[] = [];
    try {
      (users || []).forEach((u: any) => {
        const key = `taskwise:watchlist:${u.id}`;
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        if (!raw) return;
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.includes(task.id)) ids.push(u.id);
      });
    } catch {}
    return ids;
  };
  const writeWatcherIdsForAllUsers = (nextUserIds: string[]) => {
    try {
      (users || []).forEach((u: any) => {
        const key = `taskwise:watchlist:${u.id}`;
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : '[]';
        let list: string[] = [];
        try { list = JSON.parse(raw || '[]'); } catch { list = []; }
        const set = new Set(list);
        if (nextUserIds.includes(u.id)) set.add(task.id); else set.delete(task.id);
        window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
      });
    } catch {}
  };
  const pushWatchNotification = (title: string, message: string) => {
    try {
      const ticketNumber: number | undefined = (currentTask as any)?.taskNumber;
      const href = ticketNumber ? `/?view=kanban&taskNo=${ticketNumber}` : '';
      const idStr = `watch-${currentTask.id}-${Date.now()}`;
      const allUsers = Array.isArray(users) ? users : [];
      const notifyTargets = allUsers.filter((u: any) => {
        const key = `taskwise:watchlist:${u.id}`;
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
          if (!raw) return false;
          const list = JSON.parse(raw);
          return Array.isArray(list) && list.includes(currentTask.id);
        } catch { return false; }
      });
      if (notifyTargets.length === 0 && !isWatching) return;
      const audience = notifyTargets.length > 0 ? notifyTargets : [{ id: currentUserId }];
      audience.forEach((u: any) => {
        window.dispatchEvent(new CustomEvent('notifications:push', { detail: { id: `${idStr}-${u.id}`, type: 'assignment', title, message, taskId: currentTask.id, href } }));
      });
    } catch {}
  };

  // --- Mention-Helfer (für Beschreibung) ---
  const normalizeToken = (value: string): string => (value || '').toLowerCase().replace(/[^a-z0-9äöüß]/gi, '');
  const stripHtmlToPlainText = (htmlOrText: string): string => {
    if (!htmlOrText) return '';
    try {
      const tmp = typeof window !== 'undefined' ? document.createElement('div') : null;
      if (!tmp) return htmlOrText;
      tmp.innerHTML = htmlOrText;
      const txt = tmp.textContent || tmp.innerText || '';
      return txt.replace(/\s+/g, ' ').trim();
    } catch {
      return htmlOrText;
    }
  };
  const extractMentionTokensFromHtml = (html: string): string[] => {
    const text = stripHtmlToPlainText(html) || '';
    const tokens = new Set<string>();
    const regex = /@([^\s@#.,;:!?()<>]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const token = normalizeToken(m[1]);
      if (token) tokens.add(token);
    }
    return Array.from(tokens);
  };
  const doesTokenMatchUser = (token: string, user: any): boolean => {
    const name = normalizeToken(user?.name || '');
    const firstName = normalizeToken(((user?.name || '').split(/\s+/)[0] || ''));
    const emailLocal = normalizeToken(((user?.email || '').split('@')[0] || ''));
    return token === firstName || token === emailLocal || (!!name && name.includes(token));
  };

  useEffect(() => {
    // Beim Wechsel des Modus: Inline standardmäßig eingeklappt, außer defaultExpandAll
    setIsInlineCollapsed(props.renderMode === 'inline' ? !props.defaultExpandAll : false);
    if (props.defaultExpandAll) setAttachmentsOpen(true);
  }, [props.renderMode, props.defaultExpandAll]);

  useEffect(() => {
    setCurrentTask(task);
    setLocalSubtasks(task.subtasks || []);
    setEditingTitle(task.title || '');
    setEditingDescription(task.description || '');
  }, [task]);

  // Realtime Kommentare
  useEffect(() => {
    const useRealtime = renderMode === 'popup' ? !!open : true;
    if (!useRealtime) return;
    if (!currentTask?.id) return;
    const socket = getSocket();
    socket.emit('comments:join', { taskId: currentTask.id });
    const onCreated = (payload: any) => {
      if (!payload || payload.taskId !== currentTask.id) return;
      setCurrentTask(prev => {
        const exists = (prev.comments || []).some((c: any) => c.id === payload.id);
        if (exists) return prev;
        return { ...prev, comments: [...(prev.comments || []), payload] };
      });
      // Watch: Neuer Kommentar
      try {
        const tn = (currentTask as any)?.taskNumber;
        pushWatchNotification('Neuer Kommentar', `Aufgabe "${currentTask.title}"${tn ? ` (Ticket #${tn})` : ''}: Neuer Kommentar von ${payload.user?.name || 'Nutzer'}`);
      } catch {}
    };
    const onUpdated = (payload: any) => {
      if (!payload || payload.taskId !== currentTask.id) return;
      setCurrentTask(prev => ({ ...prev, comments: (prev.comments || []).map((c: any) => (c.id === payload.id ? payload : c)) }));
    };
    const onDeleted = (payload: any) => {
      if (!payload || payload.taskId !== currentTask.id) return;
      setCurrentTask(prev => ({ ...prev, comments: (prev.comments || []).filter((c: any) => c.id !== payload.id) }));
    };
    socket.on('comments:created', onCreated);
    socket.on('comments:updated', onUpdated);
    socket.on('comments:deleted', onDeleted);
    return () => {
      try {
        socket.off('comments:created', onCreated);
        socket.off('comments:updated', onUpdated);
        socket.off('comments:deleted', onDeleted);
        socket.emit('comments:leave', { taskId: currentTask.id });
      } catch {}
    };
  }, [renderMode, open, currentTask?.id]);

  const priorityColors = { LOW: 'bg-muted text-muted-foreground', MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' } as const;
  const statusColors = { PENDING: 'bg-muted text-muted-foreground', IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' } as const;
  const getStatusColor = (status: string) => currentTask.taskStatus?.color || (statusColors as any)[status] || 'bg-muted text-muted-foreground';
  const totalSubtasks = localSubtasks.length;

  const handleStatusToggle = () => {
    const currentStatus = currentTask.taskStatus?.name || currentTask.status;
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const newStatusId = taskStatuses.find((s: any) => s.name === newStatus)?.id || currentTask.statusId;
    onTaskUpdate(currentTask.id, { statusId: newStatusId });
    const ticketNumber: number | undefined = (currentTask as any)?.taskNumber;
    pushWatchNotification('Status geändert', `Aufgabe "${currentTask.title}"${ticketNumber ? ` (Ticket #${ticketNumber})` : ''}: Status auf ${newStatus} gesetzt.`);
  };
  const handleStatusChange = async (newStatus: string) => { try { await onTaskUpdate(currentTask.id, { statusId: newStatus }); setShowStatusEdit(false); const tn = (currentTask as any)?.taskNumber; pushWatchNotification('Status geändert', `Aufgabe \"${currentTask.title}\"${tn ? ` (Ticket #${tn})` : ''}: Status aktualisiert.`);} catch (e) { console.error('Error updating status:', e); } };
  const handlePriorityChange = async (newPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => { try { await onTaskUpdate(currentTask.id, { priority: newPriority } as any); setCurrentTask(prev => ({ ...prev, priority: newPriority as unknown as Task['priority'] })); const tn = (currentTask as any)?.taskNumber; pushWatchNotification('Priorität geändert', `Aufgabe \"${currentTask.title}\"${tn ? ` (Ticket #${tn})` : ''}: Priorität auf ${newPriority} geändert.`);} catch (e) { console.error('Error updating priority:', e); } };
  const handleCategoryChange = async (categoryId: string) => { try { await onTaskUpdate(currentTask.id, { categoryId } as any); const found = categories.find((c: any) => c.id === categoryId) || null; setCurrentTask(prev => ({ ...prev, category: found as any, categoryId })); } catch (e) { console.error('Error updating category:', e); } };
  const handleTeamChange = async (teamId: string) => { try { await onTaskUpdate(currentTask.id, { teamId } as any); const found = teams.find((t: any) => t.id === teamId) || null; setCurrentTask(prev => ({ ...prev, team: found as any, teamId })); } catch (e) { console.error('Error updating team:', e); } };
  const handleProjectChange = async (projectId: string) => { try { await onTaskUpdate(currentTask.id, { projectId } as any); const found = (projects || []).find((p: any) => p.id === projectId) || null; setCurrentTask(prev => ({ ...prev, project: found as any, projectId })); } catch (e) { console.error('Error updating project:', e); } };
  const handleCustomerChange = async (customerId: string) => { try { await onTaskUpdate(currentTask.id, { customerId } as any); const found = (customers || []).find((c: any) => c.id === customerId) || null; setCurrentTask(prev => ({ ...prev, customer: found as any, customerId })); } catch (e) { console.error('Error updating customer:', e); } };
  const handleSubtaskEdit = (subtask: any) => { setEditingSubtask(subtask); setShowSubtaskForm(true); };
  const handleSubtaskAdd = async (data: any) => { try { const payload = { ...data, assigneeId: data.assigneeId || undefined, teamId: data.teamId || undefined }; const created = await onSubtaskAdd(currentTask.id, payload); if (created && created.id) { setLocalSubtasks(prev => [...prev, created]); } setShowSubtaskForm(false); } catch (error) { console.error('Error creating subtask:', error); } };
  const handleSubtaskEditSubmit = async (data: any) => { try { await onSubtaskUpdate(editingSubtask.id, data); setLocalSubtasks(prev => prev.map((st: any) => (st.id === editingSubtask.id ? { ...st, ...data } : st))); setShowSubtaskForm(false); setEditingSubtask(null); } catch (error) { console.error('Error updating subtask:', error); } };
  const handleSubtaskPriorityChange = async (subtaskId: string, nextPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => {
    try {
      await onSubtaskUpdate(subtaskId, { priority: nextPriority } as any);
      setLocalSubtasks(prev => prev.map((st: any) => (st.id === subtaskId ? { ...st, priority: nextPriority } : st)));
    } catch (e) {
      console.error('Error updating subtask priority:', e);
    }
  };
  const handleSubtaskAssigneeChange = async (subtaskId: string, userId: string) => {
    try {
      await onSubtaskUpdate(subtaskId, { assigneeId: userId } as any);
      const found = (users || []).find((u: any) => u.id === userId) || null;
      setLocalSubtasks(prev => prev.map((st: any) => (st.id === subtaskId ? { ...st, assigneeId: userId, assignee: found } : st)));
    } catch (e) {
      console.error('Error updating subtask assignee:', e);
    }
  };
  const handleSubtaskTeamChange = async (subtaskId: string, teamId: string) => {
    try {
      await onSubtaskUpdate(subtaskId, { teamId } as any);
      const found = (teams || []).find((t: any) => t.id === teamId) || null;
      setLocalSubtasks(prev => prev.map((st: any) => (st.id === subtaskId ? { ...st, teamId, team: found } : st)));
    } catch (e) {
      console.error('Error updating subtask team:', e);
    }
  };
  const handleCommentEdit = (comment: any) => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); };
  const handleCommentSave = async (commentId: string) => { try { await onCommentUpdate(commentId, editingCommentContent); setEditingCommentId(null); setEditingCommentContent(''); } catch (error) { console.error('Error saving comment:', error); } };
  const handleCommentCancel = () => { setEditingCommentId(null); setEditingCommentContent(''); };
  const handleCommentDeleteClick = async (commentId: string) => { if (!confirm('Möchten Sie diesen Kommentar wirklich löschen?')) return; try { await onCommentDelete(commentId); } catch (error) { console.error('Error deleting comment:', error); } };
  const handleAttachmentAddClick = async (file: File) => { try { await onAttachmentAdd(currentTask.id, file); } catch (error) { console.error('Error adding attachment:', error); } };
  const handleAttachmentDeleteClick = async (attachmentId: string) => { try { await onAttachmentDelete(attachmentId); } catch (error) { console.error('Error deleting attachment:', error); } };

  const commitTitleChange = async () => {
    if (isSavingTitle) return;
    const next = (editingTitle || '').trim();
    if (!next) { setEditingTitle(currentTask.title || ''); setIsEditingTitle(false); return; }
    if (next === currentTask.title) { setIsEditingTitle(false); return; }
    try { setIsSavingTitle(true); await onTaskUpdate(currentTask.id, { title: next }); setCurrentTask(prev => ({ ...prev, title: next })); } catch (err) { console.error('Error updating title:', err); } finally { setIsSavingTitle(false); setIsEditingTitle(false); }
  };

  const content = (
    <>
      <div className="w-full max-w-full max-h-full overflow-hidden overflow-x-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            className="text-xs font-mono text-muted-foreground mr-auto hover:text-primary"
            title="In neuem Fenster öffnen"
            onClick={() => {
              const tn = (currentTask as any)?.taskNumber;
              if (!tn) return;
              try { window.open(`/ticket/${tn}`, '_blank', 'noopener'); } catch {}
            }}
          >
            ID: <span className="font-bold">{currentTask.taskNumber ?? '—'}</span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title={isWatching ? 'Beobachten beendet' : 'Aufgabe beobachten'}
              onClick={toggleWatch}
            >
              {isWatching ? (<Eye className="h-4 w-4 text-emerald-600" />) : (<EyeOff className="h-4 w-4 text-muted-foreground" />)}
            </Button>
            {/* Weitere Beobachter verwalten */}
            <UserSearchSelect
              users={(users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar }))}
              selectedIds={readWatcherIdsForAllUsers()}
              onChange={(next) => writeWatcherIdsForAllUsers(next)}
              triggerLabel={<span>Beobachter</span>}
            />
            {(isAdmin || isManager) && (
              <Button
                variant="ghost"
                size="sm"
                title={currentTask.isCustomerVisible ? 'Für Kunden sichtbar (klicken zum Sperren)' : 'Für Kunden gesperrt (klicken zum Freigeben)'}
                onClick={async () => {
                  try {
                    const next = !currentTask.isCustomerVisible;
                    await onTaskUpdate(currentTask.id, { isCustomerVisible: next } as any);
                    setCurrentTask(prev => ({ ...prev, isCustomerVisible: next } as any));
                  } catch (e) {
                    console.error('Error toggling visibility:', e);
                  }
                }}
              >
                {currentTask.isCustomerVisible ? (
                  <Unlock className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskEdit(currentTask)}><Edit className="h-4 w-4 mr-2" />Bearbeiten</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTaskDelete(currentTask.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Löschen</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {renderMode === 'inline' && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={!isInlineCollapsed}
              onClick={() => {
                if (isInlineCollapsed && typeof onInlineShowDetailsClick === 'function') {
                  try { onInlineShowDetailsClick(currentTask as any); } catch {}
                  return;
                }
                setIsInlineCollapsed((v) => !v);
              }}
            >
              {isInlineCollapsed ? 'Details anzeigen' : 'Details ausblenden'}
            </Button>
          )}
          {renderMode === 'popup' && (
            <DialogClose asChild>
              <Button variant="ghost" size="sm" aria-label="Schließen"><X className="h-4 w-4" /></Button>
            </DialogClose>
          )}
        </div>

        <div className={`flex-1 min-h-0 space-y-4 w-full min-w-0 overflow-x-hidden ${renderMode === 'popup' ? 'overflow-y-auto pr-1' : ''}`}>
          {/* Task Header */}
          <Card className="w-full overflow-x-hidden" id="task-header-scroll-area">
            <CardContent className="p-4 w-full overflow-x-hidden">
              <div className="flex items-start justify-between w-full overflow-x-hidden">
                <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-x-hidden">
                  <button onClick={handleStatusToggle} className="mt-1">
                    {(currentTask.taskStatus?.name === 'COMPLETED' || currentTask.status === 'COMPLETED') ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 overflow-x-hidden">
                    <div className="mb-2">
                      {isEditingTitle ? (
                        <Input autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={commitTitleChange} onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); await commitTitleChange(); } else if (e.key === 'Escape') { setIsEditingTitle(false); setEditingTitle(currentTask.title || ''); } }} className="text-lg font-medium" />
                      ) : (
                        <h3 className={`font-medium text-lg ${(currentTask.taskStatus?.name === 'COMPLETED' || currentTask.status === 'COMPLETED') ? 'line-through text-muted-foreground' : ''} cursor-text`} onClick={() => setIsEditingTitle(true)} title="Titel bearbeiten">{currentTask.title}</h3>
                      )}
                    </div>
                    {/* Meta: Projekt, Kunde (Dropdowns, wenn Listen vorhanden) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                      {(projects && projects.length > 0) ? (
                        <DropdownSelect
                          items={(projects || []).map((p: any) => ({ id: p.id, label: p.name }))}
                          selectedId={currentTask.projectId || currentTask.project?.id || undefined}
                          onSelect={(id) => handleProjectChange(id)}
                          onOpenChange={(isOpen) => {
                            // Wenn Dropdown offen ist, erlauben wir Scroll im Header
                            const headerEl = document.getElementById('task-header-scroll-area');
                            if (headerEl) headerEl.style.overflow = isOpen ? 'auto' : 'visible';
                          }}
                          searchable
                          buttonClassName="px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors"
                          getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
                          placeholder="Projekt wählen..."
                        />
                      ) : (
                        <Badge variant="outline">Projekt: {currentTask.project?.name ?? '—'}</Badge>
                      )}
                      {(customers && customers.length > 0) ? (
                        <DropdownSelect
                          items={(customers || []).map((c: any) => ({ id: c.id, label: c.name }))}
                          selectedId={currentTask.customerId || currentTask.customer?.id || undefined}
                          onSelect={(id) => handleCustomerChange(id)}
                          onOpenChange={(isOpen) => {
                            const headerEl = document.getElementById('task-header-scroll-area');
                            if (headerEl) headerEl.style.overflow = isOpen ? 'auto' : 'visible';
                          }}
                          searchable
                          buttonClassName="px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors"
                          getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
                          placeholder="Kunde wählen..."
                        />
                      ) : (
                        <Badge variant="outline">Kunde: {currentTask.customer?.name ?? '—'}</Badge>
                      )}
                    </div>
                    {/* Beschreibung */}
                    <div className="mb-3">
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <FixedRichTextEditor
                            value={editingDescription}
                            onChange={setEditingDescription}
                            placeholder="Beschreibung bearbeiten..."
                            className="min-h-[180px]"
                            mentionCandidates={(Array.isArray(users) ? users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar })) : [])}
                          />
                          <div>
                            <Button size="sm" onClick={async () => {
                              const next = (editingDescription || '').trim();
                              try {
                                await onTaskUpdate(currentTask.id, { description: next });
                                setCurrentTask(prev => ({ ...prev, description: next }));
                                // Mentions aus Beschreibung -> NotificationCenter
                                try {
                                  const tokens = extractMentionTokensFromHtml(next);
                                  if (tokens.length > 0 && Array.isArray(users)) {
                                    const mentionedUsers = users.filter((u: any) => tokens.some(t => doesTokenMatchUser(t, u)));
                                    if (mentionedUsers.length > 0) {
                                      const plain = stripHtmlToPlainText(next);
                                      const ticketNumber: number | undefined = (currentTask as any)?.taskNumber;
                                      const customerName = (currentTask as any)?.customer?.name || '—';
                                      const href = ticketNumber ? `/?view=kanban&taskNo=${ticketNumber}` : '';
                                      mentionedUsers.forEach((u: any) => {
                                        const title = 'Erwähnung in Beschreibung';
                                        const message = `${currentUser?.name || 'Unbekannt'}: ${plain} — ${currentTask.title}${ticketNumber ? ` (Ticket #${ticketNumber})` : ''} — Kunde: ${customerName}`;
                                        const idStr = `mention-desc-${currentTask.id}-${Date.now()}-${u.id}`;
                                        window.dispatchEvent(new CustomEvent('notifications:push', { detail: { id: idStr, type: 'mention', title, message, taskId: currentTask.id, href } }));
                                      });
                                    }
                                  }
                                } catch {}
                                setIsEditingDescription(false);
                              } catch (e) { console.error('Error saving description:', e); }
                            }} title="Beschreibung speichern"><Save className="h-4 w-4 mr-1" /> Speichern</Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditingDescription(true); } }}
                          onClick={() => setIsEditingDescription(true)}
                          title="Beschreibung bearbeiten"
                          className="cursor-text"
                        >
                          {(() => {
                            const html = currentTask.description || '';
                            const plain = stripHtmlToPlainText(html);
                            const isEmpty = !plain || plain.trim().length === 0;
                            if (isEmpty) {
                              return (
                                <div className="text-sm text-muted-foreground italic py-2 px-3 border border-dashed rounded hover:bg-muted">
                                  Beschreibung hinzufügen…
                                </div>
                              );
                            }
                            return (
                              <div className="prose prose-sm text-foreground mb-3 max-w-none break-words dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3 overflow-visible">
                      <DropdownSelect items={taskStatuses.map((s: any) => ({ id: s.id, label: s.label }))} selectedId={currentTask.statusId || undefined} onSelect={(id) => handleStatusChange(id)} buttonClassName={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(currentTask.taskStatus?.name || currentTask.status)}`} getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`} searchable={false} placeholder="Status suchen..." />
                      <DropdownSelect items={[{ id: 'URGENT', label: 'URGENT' }, { id: 'HIGH', label: 'HIGH' }, { id: 'MEDIUM', label: 'MEDIUM' }, { id: 'LOW', label: 'LOW' }]} selectedId={currentTask.priority} onSelect={(id) => handlePriorityChange(id as any)} searchable={false} buttonClassName={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${(priorityColors as any)[currentTask.priority]}`} getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`} />
                      <DropdownSelect items={(categories || []).map((c: any) => ({ id: c.id, label: c.name }))} selectedId={currentTask.categoryId || currentTask.category?.id || undefined} onSelect={(id) => handleCategoryChange(id)} searchable={false} buttonClassName={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors ${currentTask.category ? '' : ''}`} getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`} />
                        <DropdownSelect items={(users || []).map((u: any) => ({ id: u.id, label: u.name || u.email, icon: (<span className="inline-flex items-center justify-center"><Avatar className="h-4 w-4 border-0"><AvatarImage src={u.avatar} /><AvatarFallback>{getInitials(u.name || u.email)}</AvatarFallback></Avatar></span>) }))} selectedId={currentTask.assigneeId || currentTask.assignee?.id || undefined} onSelect={async (id) => { try { await onTaskUpdate(currentTask.id, { assigneeId: id } as any); const found = users.find((u: any) => u.id === id) || null; setCurrentTask(prev => ({ ...prev, assignee: found as any, assigneeId: id })); try { const title = 'Neue Zuweisung'; const ticketNumber = currentTask.taskNumber; const message = `${found?.name || 'Nutzer'} wurde der Aufgabe \"${currentTask.title}\"${ticketNumber ? ` (Ticket #${ticketNumber})` : ''} zugewiesen. Projekt: ${currentTask.project?.name || '—'}, Kunde: ${currentTask.customer?.name || '—'}`; const href = ticketNumber ? `/?view=kanban&taskNo=${ticketNumber}` : `/?view=kanban&taskId=${currentTask.id}`; const idStr = `assign-${currentTask.id}-${Date.now()}-${id}`; window.dispatchEvent(new CustomEvent('notifications:push', { detail: { id: idStr, type: 'assignment', title, message, taskId: currentTask.id, href } })); } catch {} } catch (e) { console.error('Error updating assignee:', e); } }} searchable buttonClassName={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2`} getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`} />
                      <DropdownSelect items={(teams || []).map((t: any) => ({ id: t.id, label: t.name, icon: (<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />) }))} selectedId={currentTask.teamId || currentTask.team?.id || undefined} onSelect={(id) => handleTeamChange(id)} searchable buttonClassName={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2`} getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`} />
                      {/* Produkte Multi-Select Dropdown - verwendet wiederverwendbare MultiDropdownSelect Komponente */}
                      {allProducts?.length > 0 && (
                        <MultiDropdownSelect
                          items={allProducts.map((p: any) => ({
                            id: p.id,
                            label: p.name,
                            icon: renderProductIcon(p.icon, "w-4 h-4"),
                          }))}
                          selectedIds={((currentTask as any).products || []).map((tp: any) => tp.productId || tp.product?.id).filter(Boolean)}
                          onSelectionChange={async (newProductIds) => {
                            try {
                              await onTaskUpdate(currentTask.id, { productIds: newProductIds } as any);
                              // Update local state
                              const newProducts = newProductIds.map((pid: string) => {
                                const prod = allProducts.find((p: any) => p.id === pid);
                                return { productId: pid, product: prod };
                              });
                              setCurrentTask(prev => ({ ...prev, products: newProducts } as any));
                            } catch (e) {
                              console.error('Error updating products:', e);
                            }
                          }}
                          icon={<Package className="h-3 w-3 text-muted-foreground" />}
                          emptyLabel="Produkte"
                          placeholder="Produkt suchen..."
                          buttonClassName="px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors"
                          maxDisplayItems={2}
                        />
                      )}
                      <Badge variant="outline" className="cursor-pointer" onClick={() => { try { subtasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }}>{totalSubtasks} Unteraufgaben</Badge>
                      <Badge variant="outline" className="flex items-center gap-1 cursor-pointer" onClick={() => { try { attachmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }}><Paperclip className="h-3 w-3" />{currentTask.attachments.length}</Badge>
                      {/* Chat Badges */}
                      <Badge variant="outline" className="flex items-center gap-1 cursor-pointer" onClick={() => { try { chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }} title="Interner Chat"><MessageSquare className="h-3 w-3" />{((currentTask as any).chatMessages?.length || 0)}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1 cursor-pointer" onClick={() => { try { chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }} title="Kundenchat"><span className="inline-flex items-center justify-center bg-red-600 rounded-full p-0.5"><MessageSquare className="h-3 w-3 text-white" /></span>{((currentTask as any).customerChatMessages?.length || 0)}</Badge>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground space-x-4">
                      <DatePickerSelect
                        label="Start"
                        selected={currentTask.startDate ? new Date(currentTask.startDate) : null}
                        onSelect={async (date) => {
                          try {
                            await onTaskUpdate(currentTask.id, { startDate: date ? date : ('' as any) } as any);
                            setCurrentTask(prev => ({ ...prev, startDate: date || null } as any));
                          } catch (e) {
                            console.error('Error updating start date:', e);
                          }
                        }}
                        variant={'modal'}
                      />
                      <DatePickerSelect
                        label="Fällig"
                        selected={currentTask.dueDate ? new Date(currentTask.dueDate) : null}
                        onSelect={async (date) => {
                          try {
                            await onTaskUpdate(currentTask.id, { dueDate: date ? date : ('' as any) } as any);
                            setCurrentTask(prev => ({ ...prev, dueDate: date || null } as any));
                          } catch (e) {
                            console.error('Error updating due date:', e);
                          }
                        }}
                        variant={'modal'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expanded Details (im Inline-Modus einklappbar) */}
          {(renderMode === 'popup' || !isInlineCollapsed) && (
          <div className="space-y-4 pr-1">
            {/* Unteraufgaben */}
            <Card ref={subtasksRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Unteraufgaben</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowSubtaskForm(true)} className="text-xs"><Plus className="h-3 w-3 mr-1" />Hinzufügen</Button>
                </div>
              </CardHeader>
              <CardContent>
                {localSubtasks.length > 0 ? (
                  <div className="space-y-2">
                    {localSubtasks.map((subtask: any) => (
                      <div key={subtask.id} className="flex items-start gap-2 text-sm p-2 rounded border">
                        <button onClick={async () => { const newStatus = subtask.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'; try { await onSubtaskUpdate(subtask.id, { status: newStatus }); setLocalSubtasks(prev => prev.map((st: any) => (st.id === subtask.id ? { ...st, status: newStatus } : st))); } catch (e) { console.error('Error toggling subtask:', e); } }} className="mt-0.5" title={subtask.status === 'COMPLETED' ? 'Als offen markieren' : 'Als erledigt markieren'}>
                          {subtask.status === 'COMPLETED' ? (<CheckSquare className="h-4 w-4 text-green-600" />) : (<Square className="h-4 w-4 text-muted-foreground" />)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            {/* Titel */}
                            <span className={`font-medium ${subtask.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''} cursor-text`}>{subtask.title}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingSubtask(subtask); setShowSubtaskForm(true); }} className="h-6 w-6 p-0 flex-shrink-0" title="Bearbeiten"><Edit className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={async () => { if (!confirm('Unteraufgabe wirklich löschen?')) return; try { await onSubtaskDelete(subtask.id); setLocalSubtasks(prev => prev.filter((st: any) => st.id !== subtask.id)); } catch (e) { console.error('Error deleting subtask:', e); } }} className="h-6 w-6 p-0 flex-shrink-0 text-red-500 hover:text-red-700" title="Löschen"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          {subtask.description && (<p className="text-xs text-muted-foreground mb-2">{subtask.description}</p>)}
                          {/* Meta: Prio, Zugewiesen zu, Team */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {/* Priority */}
                            <DropdownSelect
                              items={[{ id: 'URGENT', label: 'URGENT' }, { id: 'HIGH', label: 'HIGH' }, { id: 'MEDIUM', label: 'MEDIUM' }, { id: 'LOW', label: 'LOW' }]}
                              selectedId={subtask.priority}
                              onSelect={(id) => handleSubtaskPriorityChange(subtask.id, id as any)}
                              searchable={false}
                              buttonClassName={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${(priorityColors as any)[subtask.priority || 'LOW'] || 'bg-muted text-muted-foreground'}`}
                              getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
                              placeholder="Priorität"
                            />
                            {/* Assignee */}
                              <DropdownSelect
                              items={(users || []).map((u: any) => ({ id: u.id, label: u.name || u.email, icon: (<span className="inline-flex items-center justify-center"><Avatar className="h-4 w-4 border-0"><AvatarImage src={u.avatar} /><AvatarFallback>{getInitials(u.name || u.email)}</AvatarFallback></Avatar></span>) }))}
                              selectedId={subtask.assigneeId || subtask.assignee?.id || undefined}
                                onSelect={async (id) => { await handleSubtaskAssigneeChange(subtask.id, id); try { const assigned = (users || []).find((u: any) => u.id === id); const title = 'Neue Zuweisung (Unteraufgabe)'; const ticketNumber = currentTask.taskNumber; const message = `${assigned?.name || 'Nutzer'} wurde der Unteraufgabe \"${subtask.title}\" in \"${currentTask.title}\"${ticketNumber ? ` (Ticket #${ticketNumber})` : ''} zugewiesen. Projekt: ${currentTask.project?.name || '—'}, Kunde: ${currentTask.customer?.name || '—'}`; const href = ticketNumber ? `/?view=kanban&taskNo=${ticketNumber}` : `/?view=kanban&taskId=${currentTask.id}`; const idStr = `assign-sub-${currentTask.id}-${subtask.id}-${Date.now()}-${id}`; window.dispatchEvent(new CustomEvent('notifications:push', { detail: { id: idStr, type: 'assignment', title, message, taskId: currentTask.id, href } })); } catch {} }}
                              searchable
                              buttonClassName={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2`}
                              getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
                              placeholder="Zugewiesen zu"
                            />
                            {/* Team */}
                            <DropdownSelect
                              items={(teams || []).map((t: any) => ({ id: t.id, label: t.name, color: t.color }))}
                              selectedId={subtask.teamId || subtask.team?.id || undefined}
                              onSelect={(id) => handleSubtaskTeamChange(subtask.id, id)}
                              searchable
                              buttonClassName={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-colors`}
                              getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
                              placeholder="Team"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Keine Unteraufgaben vorhanden</p>
                )}
              </CardContent>
            </Card>

            {/* Formulare */}
            <div className="space-y-4">
              {showSubtaskForm && (
                <SubtaskForm taskId={currentTask.id} onSubmit={(editingSubtask ? (data: any) => handleSubtaskEditSubmit(data) : (data: any) => handleSubtaskAdd(data))} onCancel={() => { setShowSubtaskForm(false); setEditingSubtask(null); }} open={showSubtaskForm} onOpenChange={(o) => { setShowSubtaskForm(o); if (!o) setEditingSubtask(null); }} users={users as any} teams={teams as any} editingSubtask={editingSubtask} />
              )}

              {/* Attachments (einklappbar) */}
              <div ref={attachmentsRef} />
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">Anhänge<Badge variant="outline" className="text-[11px] px-1 py-0">{currentTask.attachments.length}</Badge></CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setAttachmentsOpen(o => !o)} className="text-xs" aria-expanded={attachmentsOpen} aria-controls="attachments-section">{attachmentsOpen ? 'Einklappen' : 'Ausklappen'}</Button>
                  </div>
                </CardHeader>
                {attachmentsOpen && (
                  <CardContent id="attachments-section" className="pt-0">
                    <AttachmentForm taskId={currentTask.id} attachments={currentTask.attachments as any} onAttachmentAdd={handleAttachmentAddClick} onAttachmentDelete={handleAttachmentDeleteClick} />
                  </CardContent>
                )}
              </Card>

              {/* Interner Chat */}
              {(isAdmin || isManager) && (
                <div ref={chatRef}>
                  <TaskInternalChat taskId={currentTask.id} taskTitle={currentTask.title} onMessageCountChange={(count) => { setCurrentTask(prev => ({ ...(prev as any), chatMessages: new Array(count).fill(null) }) as any); }} />
                </div>
              )}

              {/* Kundenchat */}
              <TaskInternalChat taskId={currentTask.id} taskTitle={currentTask.title} mode="customer" restrictToStaffOverride={false} onMessageCountChange={(count) => { setCurrentTask(prev => ({ ...(prev as any), customerChatMessages: new Array(count).fill(null) }) as any); }} />
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );

  if (renderMode === 'popup') {
    return (
      <Dialog open={!!open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="w-[96vw] sm:w-[90vw] md:w-[80vw] lg:w-[65vw] xl:w-[55vw] 2xl:w-[50vw] lg:min-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Aufgabe: {currentTask.title || 'Details'}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Inline-Darstellung mit Rahmen
  return (
    <div className="w-full border rounded-md p-3 sm:p-4">
      {content}
    </div>
  );
}


