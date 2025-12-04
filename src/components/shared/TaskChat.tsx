'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Trash2, 
  Edit,
  Check,
  X,
  Image as ImageIcon,
  Type,
  Loader2,
  Shield,
  MessageSquare
} from 'lucide-react';
import { useTaskContext } from '@/hooks/useTaskContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { getSocket } from '@/lib/socketClient';

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: string;
  timestamp: Date;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  }>;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' | string;

export interface TaskChatProps {
  taskId: string;
  taskTitle: string;
  className?: string;
  mode?: 'internal' | 'customer';
  apiBaseOverride?: string;
  socketPrefixOverride?: string;
  selectFromTaskOverride?: (task: any) => any[];
  restrictToStaffOverride?: boolean;
  onMessageCountChange?: (count: number) => void;
  allowedRoles?: UserRole[];
  enableBackgroundCount?: boolean; // ob die Anzahl im Hintergrund abgefragt werden soll
  backgroundPollMs?: number; // Polling-Intervall für die Hintergrundabfrage
}

export default function TaskChat({
  taskId,
  taskTitle,
  className,
  mode = 'internal',
  apiBaseOverride,
  socketPrefixOverride,
  selectFromTaskOverride,
  restrictToStaffOverride,
  onMessageCountChange,
  allowedRoles,
  enableBackgroundCount = true,
  backgroundPollMs = 30000,
}: TaskChatProps) {
  const { users, tasks } = useTaskContext();
  const { isAdmin, isManager } = useUserPermissions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pendingContentRef = useRef<string | null>(null);
  const suppressNextAutoScrollRef = useRef<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState<string>('');
  const composeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isRichOpen, setIsRichOpen] = useState<boolean>(false);
  const [richContent, setRichContent] = useState<string>('');

  // Emoji & Giphy
  const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🤔','🙄','😇','😉','👍','🙏','🔥','✨','💪','💡','✅','❌'];
  const apiBase = apiBaseOverride || (mode === 'internal' ? '/api/chat-messages' : '/api/customer-chat-messages');
  const socketPrefix = socketPrefixOverride || (mode === 'internal' ? 'chat' : 'customerChat');
  const selectFromTask = selectFromTaskOverride || ((task: any) => (mode === 'internal' ? task.chatMessages : task.customerChatMessages));
  const restrictToStaff = typeof restrictToStaffOverride === 'boolean' ? restrictToStaffOverride : (mode === 'internal');
  const headerTitle = mode === 'internal' ? 'Interner Chat' : 'Kundenchat';
  const badgeText = mode === 'internal' ? 'Intern' : 'Extern';
  const giphyApiKey = (typeof window !== 'undefined' ? (localStorage.getItem('giphyApiKey') || undefined) : undefined) || (process.env.NEXT_PUBLIC_GIPHY_API_KEY as string | undefined);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [isGifLoading, setIsGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [gifPopoverOpen, setGifPopoverOpen] = useState(false);

  const currentUser = users[0] || { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', avatar: null };

  // Mention-Autocomplete (nur im einfachen Textmodus)
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const composerWrapRef = useRef<HTMLDivElement | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const mentionListRef = useRef<HTMLDivElement | null>(null);

  // Sichtbarkeit: erlaubt über allowedRoles oder Standard-Restriktion für internen Chat
  const userRole = (currentUser as any)?.role || 'USER';
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return null;
  }
  if (!allowedRoles && restrictToStaff && !isAdmin && !isManager) {
    return null;
  }

  // --- GIF helpers ---
  const extractGifUrls = (text: string): string[] => {
    if (!text) return [];
    const regex = /(https?:\/\/\S+?\.gif(?:\?\S*)?)/gi;
    const matches = text.match(regex);
    return matches ? Array.from(new Set(matches)) : [];
  };
  const fetchGifs = async (q: string) => {
    if (!giphyApiKey) {
      setGifError('GIPHY API Key fehlt. Setze NEXT_PUBLIC_GIPHY_API_KEY.');
      return;
    }
    setIsGifLoading(true);
    setGifError(null);
    try {
      const endpoint = q && q.trim().length > 0 ? 'search' : 'trending';
      const params = new URLSearchParams({ api_key: giphyApiKey, limit: '24', rating: 'g' });
      if (endpoint === 'search') params.set('q', q.trim());
      const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error('GIPHY Anfrage fehlgeschlagen');
      const data = await res.json();
      setGifResults(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setGifError(e?.message || 'Fehler beim Laden der GIFs');
    } finally {
      setIsGifLoading(false);
    }
  };
  const handleSelectGif = (gif: any) => {
    const url = gif?.images?.downsized_medium?.url || gif?.images?.original?.url;
    if (!url) return;
    const content = url;
    const temp: ChatMessage = { id: `temp-${Date.now()}`, content, userId: currentUser.id, userName: currentUser.name || 'Unknown', userAvatar: currentUser.avatar || undefined, userRole: currentUser.role, timestamp: new Date() };
    setMessages(prev => sortAsc([...prev, temp]));
    pendingContentRef.current = content;
    suppressNextAutoScrollRef.current = true;
    setGifPopoverOpen(false);
    fetch(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, taskId, userId: currentUser.id }) }).catch(err => console.error('Error sending gif message:', err));
  };

  // Helpers
  const sortAsc = (items: ChatMessage[]) => items.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const upsertMessage = (incoming: ChatMessage) => {
    setMessages(prev => {
      const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === incoming.content && m.userId === incoming.userId);
      if (tempIndex !== -1) {
        const copy = prev.slice();
        copy[tempIndex] = incoming;
        return sortAsc(copy);
      }
      const exists = prev.some(m => m.id === incoming.id);
      const next = exists ? prev.map(m => (m.id === incoming.id ? incoming : m)) : [...prev, incoming];
      return sortAsc(next);
    });
  };
  const removeMessage = (id: string) => setMessages(prev => prev.filter(m => m.id !== id));

  // --- Mentions ---
  const normalizeToken = (value: string): string => (value || '').toLowerCase().replace(/[^a-z0-9äöüß]/gi, '');
  const extractMentionTokens = (raw: string): string[] => {
    const text = raw || '';
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

  // Hintergrund: Anzahl Nachrichten periodisch abfragen und melden
  useEffect(() => {
    if (!onMessageCountChange || !enableBackgroundCount) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) return;
        const task = await res.json();
        const arr = (selectFromTask(task) || []) as any[];
        if (alive) onMessageCountChange(arr.length);
      } catch {}
    };

    // initial und Polling
    fetchCount();
    timer = setInterval(fetchCount, Math.max(5000, backgroundPollMs));
    return () => { alive = false; if (timer) clearInterval(timer as any); };
  }, [taskId, enableBackgroundCount, backgroundPollMs, selectFromTask, onMessageCountChange]);

  // UI: Initial laden nur wenn expandiert
  useEffect(() => { if (isExpanded) { loadMessages(); } }, [taskId, isExpanded]);

  // onMessageCountChange auch bei UI-Änderungen feuern
  useEffect(() => { try { onMessageCountChange?.(messages.length); } catch {} }, [messages.length]);

  // Realtime: nur wenn expandiert für UI
  useEffect(() => {
    if (!isExpanded) return;
    const socket = getSocket();
    socket.emit(`${socketPrefix}:join`, { taskId });

    const onCreated = (payload: any) => {
      if (!payload || payload.taskId !== taskId) return;
      if (payload.userId && payload.userId === currentUser.id) {
        suppressNextAutoScrollRef.current = true;
        if (pendingContentRef.current && pendingContentRef.current === payload.content) {
          pendingContentRef.current = null;
        }
      }
      upsertMessage({ id: payload.id, content: payload.content, userId: payload.userId, userName: payload.user?.name || 'Unbekannt', userAvatar: payload.user?.avatar, userRole: 'USER', timestamp: new Date(payload.createdAt || Date.now()) });
    };
    const onUpdated = (payload: any) => { if (!payload || payload.taskId !== taskId) return; upsertMessage({ id: payload.id, content: payload.content, userId: payload.userId, userName: payload.user?.name || 'Unbekannt', userAvatar: payload.user?.avatar, userRole: 'USER', timestamp: new Date(payload.createdAt || Date.now()) }); };
    const onDeleted = (payload: any) => { if (!payload || payload.taskId !== taskId) return; removeMessage(payload.id); };

    socket.on(`${socketPrefix}:created`, onCreated);
    socket.on(`${socketPrefix}:updated`, onUpdated);
    socket.on(`${socketPrefix}:deleted`, onDeleted);
    return () => { try { socket.off(`${socketPrefix}:created`, onCreated); socket.off(`${socketPrefix}:updated`, onUpdated); socket.off(`${socketPrefix}:deleted`, onDeleted); socket.emit(`${socketPrefix}:leave`, { taskId }); } catch {} };
  }, [taskId, isExpanded]);

  // Auto-Scroll
  useEffect(() => { if (isExpanded) { if (suppressNextAutoScrollRef.current) { suppressNextAutoScrollRef.current = false; return; } scrollToBottom(); } }, [messages, isExpanded]);
  const scrollToBottom = () => { const root = scrollAreaRef.current; if (!root) return; const viewport = root.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null; if (!viewport) return; viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' }); };

  // Laden
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Erst versuchen, aus dem lokalen Kontext zu lesen (vermeidet Netzwerkfehler)
      const localTask: any | undefined = Array.isArray(tasks) ? tasks.find((t: any) => t.id === taskId) : undefined;
      if (localTask) {
        const source = (selectFromTask(localTask) || []) as any[];
        const initial: ChatMessage[] = source.map((c: any) => ({ id: c.id, content: c.content, userId: c.userId, userName: c.user?.name || 'Unbekannt', userAvatar: c.user?.avatar, userRole: 'USER', timestamp: new Date(c.createdAt) }));
        setMessages(sortAsc(initial));
        return;
      }
      // Fallback: API abrufen
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task for chat');
      const task = await res.json();
      const source = (selectFromTask(task) || []) as any[];
      const initial: ChatMessage[] = source.map((c: any) => ({ id: c.id, content: c.content, userId: c.userId, userName: c.user?.name || 'Unbekannt', userAvatar: c.user?.avatar, userRole: 'USER', timestamp: new Date(c.createdAt) }));
      setMessages(sortAsc(initial));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const handleSendMessage = useCallback(async () => {
    const content = (isRichOpen ? richContent : newMessage).trim();
    if (!content) return;
    const temp: ChatMessage = { id: `temp-${Date.now()}`, content, userId: currentUser.id, userName: currentUser.name || 'Unknown', userAvatar: currentUser.avatar || undefined, userRole: currentUser.role, timestamp: new Date() };
    try {
      setMessages(prev => sortAsc([...prev, temp]));
      pendingContentRef.current = content;
      suppressNextAutoScrollRef.current = true;
      await fetch(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, taskId, userId: currentUser.id }) });
      setNewMessage(''); setRichContent('');

      // Mentions → NotificationCenter Event
      try {
        const tokens = extractMentionTokens(content);
        if (tokens.length > 0 && Array.isArray(users)) {
          const mentionedUsers = users.filter(u => tokens.some(t => doesTokenMatchUser(t, u)));
          if (mentionedUsers.length > 0) {
            const plain = stripHtmlToPlainText(content);
            const hostTask: any | undefined = Array.isArray(tasks) ? tasks.find((t: any) => t.id === taskId) : undefined;
            const href = hostTask?.taskNumber ? `/?view=kanban&taskNo=${hostTask.taskNumber}` : '';
            const ticketNumber: number | undefined = hostTask?.taskNumber;
            mentionedUsers.forEach((u) => {
              const title = `Erwähnung in ${mode === 'internal' ? 'internem' : 'Kunden'}-Chat`;
              const customerName = hostTask?.customer?.name || '—';
              const message = `${currentUser.name || 'Unbekannt'}: ${plain} — ${taskTitle}${ticketNumber ? ` (Ticket #${ticketNumber})` : ''} — Kunde: ${customerName}`;
              const id = `mention-${taskId}-${Date.now()}-${u.id}`;
              window.dispatchEvent(new CustomEvent('notifications:push', { detail: { id, type: 'mention', title, message, taskId, href } }));
            });
          }
        }
      } catch {}
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== temp.id));
    }
  }, [newMessage, richContent, isRichOpen, currentUser, taskId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention Navigation
    if (!isRichOpen && mentionOpen) {
      const list = getFilteredMentionUsers();
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => list.length ? ((i + 1) % list.length) : 0); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => list.length ? ((i - 1 + list.length) % list.length) : 0); return; }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const list = getFilteredMentionUsers();
        if (list.length > 0) {
          applySelectedMention(list[Math.min(mentionIndex, list.length - 1)]);
        } else {
          handleSendMessage();
        }
        return;
      }
    }
    // Senden bei Enter
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };
  const handleEditKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } };

  const handleEditStart = (message: ChatMessage) => { setEditingMessageId(message.id); setEditingMessageContent(message.content); };
  const handleEditCancel = () => { setEditingMessageId(null); setEditingMessageContent(''); };
  const handleEditSave = async () => { if (!editingMessageId) return; const newContent = editingMessageContent.trim(); if (!newContent) return; const snapshot = messages; setMessages(prev => prev.map(m => (m.id === editingMessageId ? { ...m, content: newContent } : m))); try { const res = await fetch(`${apiBase}/${editingMessageId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent }) }); if (!res.ok) throw new Error('Failed to update'); setEditingMessageId(null); setEditingMessageContent(''); } catch (e) { setMessages(snapshot); console.error('Error updating message:', e); } };
  const handleDeleteMessage = async (id: string) => { if (!confirm('Möchten Sie diese Nachricht wirklich löschen?')) return; const snapshot = messages; setMessages(prev => prev.filter(m => m.id !== id)); try { const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Failed to delete'); } catch (e) { setMessages(snapshot); console.error('Error deleting message:', e); } };

  // Rich/Emoji helpers
  const insertAtCursor = (value: string, setter: Dispatch<SetStateAction<string>>, ref: React.RefObject<HTMLTextAreaElement | null>) => { const el = ref.current; if (!el) { setter((prev: string) => (prev || '') + value); return; } const start = el.selectionStart ?? (el.value?.length ?? 0); const end = el.selectionEnd ?? start; const current = el.value ?? ''; const next = current.slice(0, start) + value + current.slice(end); setter(next); requestAnimationFrame(() => { try { el.focus(); const pos = start + value.length; el.setSelectionRange(pos, pos); } catch {} }); };
  const appendToRichContent = (value: string) => { setRichContent((prev: string) => (prev || '') + value); };
  const handleToggleRich = () => { const next = !isRichOpen; if (next) { const plain = newMessage.trim(); if (plain) { const html = plain.replace(/\n/g, '<br>'); setRichContent(html); } } setIsRichOpen(next); };

  // Mention Detection (nur im Textarea-Modus)
  const detectMention = () => {
    if (isRichOpen) { setMentionOpen(false); return; }
    const el = composeTextareaRef.current;
    const value = newMessage || '';
    if (!el) { setMentionOpen(false); return; }
    const caret = el.selectionStart ?? value.length;
    // Finde letztes '@' vor dem Cursor
    let at = value.lastIndexOf('@', caret - 1);
    if (at === -1) { setMentionOpen(false); return; }
    // Stelle sicher, dass zwischen '@' und caret kein Leerzeichen/Zeilenumbruch ist, und '@' nicht Teil einer Email (vor '@' darf kein Wortchar sein)
    const before = value[at - 1] || ' ';
    if (/\w/.test(before)) { setMentionOpen(false); return; }
    const segment = value.slice(at + 1, caret);
    if (/[^A-Za-z0-9äöüÄÖÜß._-]/.test(segment)) { setMentionOpen(false); return; }
    setMentionOpen(true);
    setMentionStart(at);
    setMentionQuery(segment);
    setMentionIndex(0);
    const pos = getTextareaCaretPagePosition(el, caret);
    const taRect = el.getBoundingClientRect();
    const availableWidth = Math.min(taRect.width, 480);
    if (pos) setMentionPos({ top: pos.top + window.scrollY, left: pos.left + window.scrollX, width: availableWidth });
  };

  useEffect(() => {
    if (!mentionOpen) return;
    const onScrollOrResize = () => {
      const el = composeTextareaRef.current;
      if (!el) return;
      const caret = el.selectionStart ?? (el.value?.length ?? 0);
      const pos = getTextareaCaretPagePosition(el, caret);
      const taRect = el.getBoundingClientRect();
      const availableWidth = Math.min(taRect.width, 480);
      if (pos) setMentionPos({ top: pos.top + window.scrollY, left: pos.left + window.scrollX, width: availableWidth });
    };
    const onDocClick = (e: MouseEvent) => {
      const wrap = composerWrapRef.current;
      if (!wrap) return setMentionOpen(false);
      if (!wrap.contains(e.target as Node)) setMentionOpen(false);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize, true);
    const el = composeTextareaRef.current;
    el?.addEventListener('scroll', onScrollOrResize, true);
    document.addEventListener('mousedown', onDocClick, true);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize, true);
      el?.removeEventListener('scroll', onScrollOrResize, true);
      document.removeEventListener('mousedown', onDocClick, true);
    };
  }, [mentionOpen]);

  // Hilfsfunktion: Caret-Position im Textarea in Seitenkoordinaten ermitteln
  function getTextareaCaretPagePosition(textarea: HTMLTextAreaElement, caretIndex: number): { left: number; top: number } | null {
    try {
      const style = window.getComputedStyle(textarea);
      const div = document.createElement('div');
      const span = document.createElement('span');
      const rect = textarea.getBoundingClientRect();
      // Spiegel-Stile
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
      div.style.boxSizing = style.boxSizing;
      div.style.width = `${textarea.clientWidth}px`;
      div.style.padding = style.padding;
      div.style.border = style.border;
      div.style.fontFamily = style.fontFamily;
      div.style.fontSize = style.fontSize;
      div.style.lineHeight = style.lineHeight;
      div.style.letterSpacing = style.letterSpacing as string;
      div.style.left = `${rect.left + window.scrollX}px`;
      div.style.top = `${rect.top + window.scrollY}px`;
      // Inhalt bis Caret spiegeln
      const value = textarea.value.substring(0, caretIndex);
      div.textContent = value;
      // Dummy-Span ans Ende für genaue Messung
      span.textContent = '\u200b';
      div.appendChild(span);
      document.body.appendChild(div);
      const lineH = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.2);
      const top = span.offsetTop + lineH; // unter der Zeile
      const left = span.offsetLeft;
      document.body.removeChild(div);
      // Korrigiere Scroll innerhalb des Textareas
      return { left: rect.left + left - textarea.scrollLeft, top: rect.top + top - textarea.scrollTop };
    } catch {
      return null;
    }
  }

  const getFilteredMentionUsers = (): any[] => {
    const q = (mentionQuery || '').toLowerCase();
    const pool = Array.isArray(users) ? users : [];
    if (!mentionOpen) return [];
    if (!q) return pool;
    return pool.filter(u => (u.name || u.email || '').toLowerCase().includes(q));
  };

  const applySelectedMention = (user: any) => {
    if (isRichOpen) return; // Nur Textarea-Einfügen
    const el = composeTextareaRef.current;
    const value = newMessage || '';
    if (!el || mentionStart == null) return;
    const caret = el.selectionStart ?? value.length;
    const label = `@${user.name || user.email}`;
    const next = value.slice(0, mentionStart) + label + ' ' + value.slice(caret);
    setNewMessage(next);
    setMentionOpen(false);
    setMentionIndex(0);
    // Cursor hinter Erwähnung platzieren
    requestAnimationFrame(() => {
      try {
        const pos = (mentionStart + label.length + 1);
        el.focus();
        el.setSelectionRange(pos, pos);
      } catch {}
    });
  };

  // UI helpers
  const formatTimestamp = (timestamp: Date) => { const now = new Date(); const diffInHours = Math.abs(now.getTime() - timestamp.getTime()) / (1000 * 60 * 60); return diffInHours < 24 ? format(timestamp, 'HH:mm', { locale: de }) : format(timestamp, 'dd.MM.yyyy HH:mm', { locale: de }); };
  const getRoleBadgeColor = (role: string) => { switch (role) { case 'ADMIN': return 'bg-red-100 text-red-800 border-red-200'; case 'MANAGER': return 'bg-blue-100 text-blue-800 border-blue-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'; } };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {mode === 'customer' ? (
              <span className="inline-flex items-center justify-center bg-red-600 rounded-full p-1">
                <MessageSquare className="h-4 w-4 text-white" />
              </span>
            ) : (
              <MessageSquare className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle className="text-lg">{headerTitle}</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {badgeText}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Minimieren' : 'Erweitern'}
          </Button>
        </div>
        {isExpanded && (
          <div className="text-sm text-gray-600 mt-1">Aufgabe: {taskTitle}</div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          <div className="flex flex-col h-[500px] min-h-0">
            <ScrollArea className="flex-1 min-h-0 p-4 bg-gray-50 rounded-md border overflow-x-hidden w-full" ref={scrollAreaRef}>
              <div className="space-y-4 min-w-0 overflow-x-hidden w-full">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 min-w-0 overflow-x-hidden w-full ${message.userId === currentUser.id ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={message.userAvatar} alt={message.userName} />
                      <AvatarFallback>{message.userName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[70%] min-w-0 overflow-hidden ${message.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.userName}</span>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(message.userRole)}`}>{message.userRole}</Badge>
                        <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                        {message.userId === currentUser.id && (
                          <div className={`flex items-center gap-1 ${message.userId === currentUser.id ? 'ml-auto' : ''}`}>
                            {editingMessageId === message.id ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={handleEditSave} aria-label="Speichern"><Check className="h-3 w-3" /></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditCancel} aria-label="Abbrechen"><X className="h-3 w-3" /></Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditStart(message)}><Edit className="h-3 w-3" /></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => handleDeleteMessage(message.id)}><Trash2 className="h-3 w-3" /></Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingMessageId === message.id ? (
                        <div className="w-full min-w-0">
                          <Textarea ref={editTextareaRef} value={editingMessageContent} onChange={(e) => setEditingMessageContent(e.target.value)} onKeyDown={handleEditKeyDown} rows={2} className="mt-1 max-h-40 resize-y" />
                        </div>
                      ) : (
                        <div className={`rounded-lg px-3 py-2 break-words break-all max-w-full overflow-hidden ${message.userId === currentUser.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          {(() => {
                            const cleaned = message.content.replace(/https?:\/\/\S+?\.gif(?:\?\S*)?/gi, '').trim();
                            if (!cleaned) return null;
                            const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(cleaned);
                            if (looksLikeHtml) {
                              return (<div className="prose prose-sm max-w-full break-words break-all whitespace-normal overflow-hidden text-current" dangerouslySetInnerHTML={{ __html: cleaned }} />);
                            }
                            return (<p className="text-sm whitespace-pre-wrap break-all">{cleaned}</p>);
                          })()}
                          {extractGifUrls(message.content).length > 0 && (
                            <div className="mt-2 space-y-2">
                              {extractGifUrls(message.content).map((url) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={url} src={url} alt="GIF" className="max-w-full rounded border" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-2 text-sm text-gray-600">
                              <Paperclip className="h-3 w-3" />
                              <span>{attachment.fileName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4 w-full overflow-x-hidden">
              <div className="flex gap-2 w-full min-w-0 overflow-x-hidden">
                <Button type="button" variant={isRichOpen ? 'default' : 'ghost'} size="sm" aria-pressed={isRichOpen} onClick={handleToggleRich} title={isRichOpen ? 'Rich-Text einklappen' : 'Rich-Text ausklappen'}>
                  <Type className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0 overflow-x-hidden relative" ref={composerWrapRef}>
                  {isRichOpen ? (
                    <FixedRichTextEditor value={richContent} onChange={setRichContent} placeholder="Formatierte Nachricht schreiben..." className="min-h-[120px] w-full max-w-full" mentionCandidates={(Array.isArray(users) ? users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar })) : [])} />
                  ) : (
                    <Textarea ref={composeTextareaRef} value={newMessage} onChange={(e) => { setNewMessage(e.target.value); detectMention(); }} onKeyDown={handleKeyDown} onClick={detectMention} onKeyUp={detectMention} placeholder="Interne Nachricht eingeben... (Shift+Enter für Zeilenumbruch)" rows={2} className="min-h-[40px] max-h-40 resize-y w-full max-w-full overflow-x-hidden break-words break-all" />
                  )}
                  {!isRichOpen && mentionOpen && mentionPos && createPortal(
                    <div style={{ position: 'absolute', top: mentionPos.top, left: mentionPos.left, width: mentionPos.width, zIndex: 9999 }}
                      className="bg-white border rounded shadow-lg overflow-hidden">
                      <div ref={mentionListRef} className="max-h-56 overflow-auto">
                        {getFilteredMentionUsers().slice(0, 50).map((u, idx) => (
                          <button key={u.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${idx === (mentionIndex % Math.max(1, getFilteredMentionUsers().length)) ? 'bg-gray-100' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); applySelectedMention(u); }}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={u.avatar} />
                                <AvatarFallback>{(u.name || u.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">{u.name || u.email}</div>
                                {u.email && <div className="truncate text-xs text-gray-500">{u.email}</div>}
                              </div>
                            </div>
                          </button>
                        ))}
                        {getFilteredMentionUsers().length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">Keine Treffer…</div>
                        )}
                      </div>
                    </div>, document.body
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Emoji hinzufügen"><Smile className="h-4 w-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="grid grid-cols-8 gap-1 w-56 p-2">
                    {EMOJIS.map((e) => (
                      <button key={e} className="hover:bg-gray-100 rounded p-1 text-lg" onClick={() => { if (isRichOpen) { appendToRichContent(e); } else { insertAtCursor(e, setNewMessage, composeTextareaRef); } }}>{e}</button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Popover open={gifPopoverOpen} onOpenChange={setGifPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="GIF hinzufügen"><ImageIcon className="h-4 w-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[420px] p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input value={gifQuery} onChange={(e) => setGifQuery(e.target.value)} placeholder="Nach GIF suchen..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchGifs(gifQuery); } }} />
                      <Button size="sm" onClick={() => fetchGifs(gifQuery)}>Suchen</Button>
                    </div>
                    {gifError && (<div className="text-xs text-red-600">{gifError}</div>)}
                    <div className="min-h-[120px] max-h-[360px] overflow-auto border rounded p-2">
                      {isGifLoading ? (
                        <div className="flex items-center justify-center py-8 text-gray-500"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> GIFs werden geladen...</div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {gifResults.map((g) => {
                            const url = g?.images?.downsized_small?.mp4 || g?.images?.downsized_medium?.url || g?.images?.original?.url;
                            const still = g?.images?.fixed_width_small_still?.url || g?.images?.downsized_still?.url || g?.images?.preview_gif?.url;
                            return (
                              <button key={g.id} className="relative group rounded overflow-hidden border" title={g.title} onClick={() => handleSelectGif(g)}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={still || url} alt={g.title || 'GIF'} className="w-full h-24 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button onClick={handleSendMessage} disabled={!(isRichOpen ? richContent.trim() : newMessage.trim())} size="sm"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}


