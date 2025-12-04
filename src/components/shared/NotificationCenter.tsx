'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, MessageCircle, Users, Trash2 } from 'lucide-react';
import { getSocket } from '@/lib/socketClient';
import { useTaskContext } from '@/hooks/useTaskContext';

type NotificationType = 'comment' | 'chat' | 'customerChat' | 'assignment' | 'mention';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  taskId?: string;
  read?: boolean;
  href?: string;
}

export default function NotificationCenter() {
  const { tasks } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const joinedTaskIdsRef = useRef<Set<string>>(new Set());
  const STORAGE_KEY = 'taskwise:notifications';

  // Load persisted notifications
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationItem[];
        // revive dates
        const revived = parsed.map((n) => ({ ...n, createdAt: new Date(n.createdAt) }));
        setItems(revived);
      }
    } catch {}
  }, []);

  // Persist notifications on change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {}
  }, [items]);

  // Join alle Task-Räume, damit wir Events empfangen (Kommentare/Chats)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const socket = getSocket();
    const current = joinedTaskIdsRef.current;
    for (const t of tasks) {
      if (t.id && !current.has(t.id)) {
        try {
          socket.emit('comments:join', { taskId: t.id });
          socket.emit('chat:join', { taskId: t.id });
          socket.emit('customerChat:join', { taskId: t.id });
          current.add(t.id);
        } catch {}
      }
    }
    return () => {
      try {
        for (const id of current) {
          socket.emit('comments:leave', { taskId: id });
          socket.emit('chat:leave', { taskId: id });
          socket.emit('customerChat:leave', { taskId: id });
        }
        current.clear();
      } catch {}
    };
  }, [tasks?.length]);

  // Socket-Events in Notifications umwandeln
  useEffect(() => {
    const socket = getSocket();
    const add = (n: NotificationItem) =>
      setItems(prev => {
        if (prev.some(p => p.id === n.id)) return prev; // de-dupe by id
        return [{ ...n, read: false }, ...prev].slice(0, 200);
      });

    const onCommentCreated = (payload: any) => {
      if (!payload) return;
      add({
        id: `c-${payload.id}`,
        type: 'comment',
        title: 'Neuer Kommentar',
        message: trimText(toPlainText(payload.content ?? '')), 
        createdAt: new Date(payload.createdAt || Date.now()),
        taskId: payload.taskId,
      });
    };
    const onChatCreated = (payload: any) => {
      if (!payload) return;
      add({
        id: `i-${payload.id}`,
        type: 'chat',
        title: 'Neue interne Chat-Nachricht',
        message: trimText(toPlainText(payload.content ?? '')),
        createdAt: new Date(payload.createdAt || Date.now()),
        taskId: payload.taskId,
      });
    };
    const onCustomerChatCreated = (payload: any) => {
      if (!payload) return;
      add({
        id: `u-${payload.id}`,
        type: 'customerChat',
        title: 'Neue Kunden-Chat-Nachricht',
        message: trimText(toPlainText(payload.content ?? '')),
        createdAt: new Date(payload.createdAt || Date.now()),
        taskId: payload.taskId,
      });
    };

    socket.on('comments:created', onCommentCreated);
    socket.on('chat:created', onChatCreated);
    socket.on('customerChat:created', onCustomerChatCreated);

    return () => {
      try {
        socket.off('comments:created', onCommentCreated);
        socket.off('chat:created', onChatCreated);
        socket.off('customerChat:created', onCustomerChatCreated);
      } catch {}
    };
  }, []);

  // Clientseitige Custom-Events (z.B. Zuweisungen) entgegennehmen
  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<any>;
      const payload = ce.detail || {};
      const item: NotificationItem = {
        id: payload.id || `local-${Date.now()}`,
        type: (payload.type as NotificationType) || 'assignment',
        title: payload.title || 'Benachrichtigung',
        message: payload.message || '',
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        taskId: payload.taskId,
        href: payload.href,
        read: false,
      };
      setItems(prev => [item, ...prev].slice(0, 100));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('notifications:push', handler as EventListener);
      return () => window.removeEventListener('notifications:push', handler as EventListener);
    }
  }, []);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  const markAllAsRead = () => setItems(prev => prev.map(i => ({ ...i, read: true })));
  const clearAll = () => setItems([]);

  const iconFor = (type: NotificationType) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-slate-600" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case 'customerChat':
        return <Users className="h-4 w-4 text-red-600" />;
      case 'assignment':
        return <Users className="h-4 w-4 text-emerald-600" />;
      case 'mention':
        return <MessageCircle className="h-4 w-4 text-purple-600" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => setOpen(o)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] w-auto px-1 flex items-center justify-center p-0 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-2">Benachrichtigungen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">Keine Benachrichtigungen</div>
          ) : (
            items.map((n) => (
              <DropdownMenuItem key={n.id} className="whitespace-normal break-words break-all py-3">
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5 flex-shrink-0">{iconFor(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-5">{n.title}</div>
                    <div className="text-xs text-gray-600 leading-5 break-words break-all whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{n.message}</div>
                    {n.href && (
                      <div className="mt-1">
                        <a href={n.href} className="text-xs text-blue-600 hover:underline">Zur Aufgabe öffnen</a>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)}</div>
                  </div>
                  <div className="flex-shrink-0 pl-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Löschen" aria-label="Löschen"
                      onClick={(e) => { e.stopPropagation(); setItems(prev => prev.filter(i => i.id !== n.id)); }}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-2">
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>Als gelesen markieren</Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>Leeren</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toPlainText(htmlOrText: string): string {
  if (!htmlOrText) return '';
  // Falls Rich-Text HTML: in Plaintext umwandeln
  const tmp = typeof window !== 'undefined' ? document.createElement('div') : null;
  if (tmp) {
    tmp.innerHTML = htmlOrText;
    const text = tmp.textContent || tmp.innerText || '';
    return text;
  }
  return htmlOrText;
}

function trimText(text: string, max = 140): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
  } catch {
    return '' + date;
  }
}


