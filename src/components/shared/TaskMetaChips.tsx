'use client';

import { Badge } from '@/components/ui/badge';
import { Paperclip, MessageSquare, CalendarDays, User as UserIcon } from 'lucide-react';

interface TaskMetaChipsProps {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  categoryName?: string;
  assigneeName?: string;
  attachmentCount?: number;
  commentCount?: number;
  dueDate?: Date | string | null;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export default function TaskMetaChips({
  priority,
  categoryName,
  assigneeName,
  attachmentCount,
  commentCount,
  dueDate,
}: TaskMetaChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {priority && (
        <Badge className={`${priorityColors[priority]} text-xs`}>{priority}</Badge>
      )}
      {categoryName && (
        <Badge variant="outline" className="text-xs">{categoryName}</Badge>
      )}
      {assigneeName && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <UserIcon className="h-2 w-2" />
          {assigneeName}
        </Badge>
      )}
      {typeof attachmentCount === 'number' && attachmentCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Paperclip className="h-2 w-2" />
          {attachmentCount}
        </Badge>
      )}
      {typeof commentCount === 'number' && commentCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <MessageSquare className="h-2 w-2" />
          {commentCount}
        </Badge>
      )}
      {dueDate && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <CalendarDays className="h-3 w-3" />
          {new Date(dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
        </div>
      )}
    </div>
  );
}


