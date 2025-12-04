'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import CommentForm from '@/components/forms/CommentForm';
import { Edit, Trash2 } from 'lucide-react';
import { getSocket } from '@/lib/socketClient';

interface CommentsSectionProps {
  taskId: string;
  comments: any[];
  currentUser: any;
  onAdd: (taskId: string, content: string) => Promise<void>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  className?: string;
}

export default function CommentsSection({
  taskId,
  comments,
  currentUser,
  onAdd,
  onUpdate,
  onDelete,
  className,
}: CommentsSectionProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [localComments, setLocalComments] = useState<any[]>(comments || []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync from props: robust Merge statt hard reset, um Race Conditions mit Live-Events zu vermeiden
  useEffect(() => {
    setLocalComments(prev => {
      const byId = new Map<string, any>();
      for (const c of prev) byId.set(c.id, c);
      for (const c of (comments || [])) byId.set(c.id, c);
      const merged = Array.from(byId.values());
      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return merged;
    });
  }, [comments]);

  // Realtime subscription
  useEffect(() => {
    const socket = getSocket();
    socket.emit('comments:join', { taskId });

    const upsert = (incoming: any) => {
      setLocalComments(prev => {
        const exists = prev.some(c => c.id === incoming.id);
        const next = exists ? prev.map(c => (c.id === incoming.id ? incoming : c)) : [...prev, incoming];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return next;
      });
    };
    const onCreated = (payload: any) => {
      if (!payload || payload.taskId !== taskId) return;
      upsert(payload);
    };
    const onUpdated = (payload: any) => {
      if (!payload || payload.taskId !== taskId) return;
      upsert(payload);
    };
    const onDeleted = (payload: any) => {
      if (!payload || payload.taskId !== taskId) return;
      setLocalComments(prev => prev.filter(c => c.id !== payload.id));
    };

    socket.on('comments:created', onCreated);
    socket.on('comments:updated', onUpdated);
    socket.on('comments:deleted', onDeleted);
    return () => {
      try {
        socket.off('comments:created', onCreated);
        socket.off('comments:updated', onUpdated);
        socket.off('comments:deleted', onDeleted);
        socket.emit('comments:leave', { taskId });
      } catch {}
    };
  }, [taskId]);

  // Auto scroll to bottom when comments change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [localComments.length]);

  const handleEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleSave = async (commentId: string) => {
    // Optimistisches Update
    const snapshot = localComments;
    setLocalComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentContent, updatedAt: new Date().toISOString() } : c));
    try {
      await onUpdate(commentId, editingCommentContent);
      setEditingCommentId(null);
      setEditingCommentContent('');
    } catch (e) {
      // Rollback bei Fehler
      setLocalComments(snapshot);
    }
  };

  const handleCancel = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Möchten Sie diesen Kommentar wirklich löschen?')) return;
    // Optimistisches Entfernen
    const snapshot = localComments;
    setLocalComments(prev => prev.filter(c => c.id !== commentId));
    try {
      await onDelete(commentId);
    } catch (e) {
      // Bei Fehler wiederherstellen
      setLocalComments(snapshot);
    }
  };

  return (
    <div className={className}>
      {localComments.length > 0 ? (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto overflow-x-hidden space-y-3 border rounded-lg p-3 bg-gray-50 custom-scrollbar"
        >
          {localComments.map((comment: any) => (
            <div
              key={comment.id}
              className="text-sm bg-white p-3 rounded border w-full min-w-0 overflow-x-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.user?.avatar} />
                    <AvatarFallback>
                      {comment.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{comment.user?.name}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(comment.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {comment.userId === currentUser?.id && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(comment)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <FixedRichTextEditor
                    value={editingCommentContent}
                    onChange={setEditingCommentContent}
                    placeholder="Kommentar bearbeiten..."
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(comment.id)}>
                      Speichern
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-gray-700 prose prose-sm max-w-none break-words whitespace-normal overflow-x-hidden"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">Keine Kommentare vorhanden</p>
      )}

      <Separator className="my-3" />

      <CommentForm taskId={taskId} currentUser={currentUser} onSubmit={(content) => onAdd(taskId, content)} />
    </div>
  );
}


