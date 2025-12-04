'use client';

import { CheckSquare, Square, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DropdownSelect from '@/components/ui/DropdownSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mode: 'task' für echte Aufgaben, 'template' für Projektvorlagen
type ListMode = 'task' | 'template';

interface SubtaskListProps {
  subtasks: any[];
  statusMap?: Record<string, string>;
  onToggle?: (subtaskId: string, currentStatus: string) => void;
  onEdit?: (subtask: any) => void;
  onDelete?: (subtaskId: string) => void;
  users?: Array<{ id: string; name?: string; email?: string; avatar?: string }>;
  teams?: Array<{ id: string; name: string; color?: string }>;
  onPriorityChange?: (subtaskId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => void;
  onAssigneeChange?: (subtaskId: string, userId: string) => void;
  onTeamChange?: (subtaskId: string, teamId: string) => void;
  // Template-Modus: keine Assignee/Team-Felder, kein Status-Toggle
  mode?: ListMode;
  // Kompakte Ansicht ohne Dropdowns
  compact?: boolean;
}

export default function SubtaskList({ 
  subtasks, 
  statusMap = {}, 
  onToggle, 
  onEdit, 
  onDelete, 
  users = [], 
  teams = [], 
  onPriorityChange, 
  onAssigneeChange, 
  onTeamChange,
  mode = 'task',
  compact = false,
}: SubtaskListProps) {
  const isTemplateMode = mode === 'template';
  if (!subtasks || subtasks.length === 0) {
    return <p className="text-sm text-gray-500 italic">Keine Unteraufgaben vorhanden</p>;
  }

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };

  const getInitials = (raw: string | undefined | null) => {
    const value = (raw || '').trim();
    if (!value) return '?';
    const emailIdx = value.indexOf('@');
    const base = emailIdx > 0 ? value.slice(0, emailIdx) : value;
    const bySpace = base.split(/\s+/).filter(Boolean);
    if (bySpace.length >= 2) {
      return (bySpace[0][0] + bySpace[bySpace.length - 1][0]).toUpperCase();
    }
    const bySeparators = base.split(/[._-]+/).filter(Boolean);
    if (bySeparators.length >= 2) {
      return (bySeparators[0][0] + bySeparators[bySeparators.length - 1][0]).toUpperCase();
    }
    const firstTwo = base.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    return (firstTwo || base[0]).toUpperCase();
  };

  return (
    <div className="space-y-2">
      {subtasks.map((subtask) => {
        const current = statusMap[subtask.id] || subtask.status || 'PENDING';
        const completed = current === 'COMPLETED';
        return (
          <div key={subtask.id} className="flex items-start gap-2 text-sm p-2 rounded border hover:bg-gray-50 group">
            {/* Status-Toggle nur im Task-Modus */}
            {!isTemplateMode && onToggle && (
              <button
                type="button"
                onClick={() => onToggle(subtask.id, current)}
                className="mt-0.5 text-gray-500 hover:text-gray-700"
                title={completed ? 'Als offen markieren' : 'Als erledigt markieren'}
              >
                {completed ? (
                  <CheckSquare className="h-4 w-4 text-green-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <span className={`font-medium ${!isTemplateMode && completed ? 'line-through text-gray-500' : ''}`}>
                  {subtask.title}
                </span>
                <div className="ml-2 hidden group-hover:flex gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(subtask)}
                      className="p-1 rounded hover:bg-gray-100"
                      title="Bearbeiten"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(subtask.id)}
                      className="p-1 rounded hover:bg-gray-100 text-red-600 hover:text-red-700"
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {Boolean((subtask as any).description) && (
                <p className="text-xs text-gray-600 mb-2">{(subtask as any).description}</p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Priorität - immer anzeigen, im kompakten Modus als Badge, sonst als Dropdown */}
                {compact ? (
                  <Badge className={`text-[10px] ${priorityColors[String((subtask as any).priority)] || ''}`}>
                    {(subtask as any).priority}
                  </Badge>
                ) : (
                  <DropdownSelect
                    items={[
                      { id: 'URGENT', label: 'URGENT' },
                      { id: 'HIGH', label: 'HIGH' },
                      { id: 'MEDIUM', label: 'MEDIUM' },
                      { id: 'LOW', label: 'LOW' },
                    ]}
                    selectedId={(subtask as any).priority}
                    onSelect={(id) => onPriorityChange?.((subtask as any).id, id as any)}
                    searchable={false}
                    buttonClassName={`px-2 py-1 rounded-full text-[10px] font-medium cursor-pointer transition-colors ${priorityColors[String((subtask as any).priority)] || ''}`}
                    getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`}
                  />
                )}
                
                {/* Assignee und Team - jetzt auch im Template-Modus verfügbar */}
                {!compact && (
                  <>
                    <DropdownSelect
                      items={users.map(u => ({
                        id: u.id,
                        label: u.name || u.email || 'Unbekannt',
                        icon: (
                          <Avatar className="h-4 w-4 border-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback>{getInitials(u.name || u.email)}</AvatarFallback>
                          </Avatar>
                        )
                      }))}
                      selectedId={(subtask as any).assigneeId || (subtask as any).assignee?.id}
                      onSelect={(id) => onAssigneeChange?.((subtask as any).id, id)}
                      searchable={true}
                      buttonClassName={`px-2 py-1 rounded-full text-[10px] font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2`}
                      getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`}
                    />
                    <DropdownSelect
                      items={teams.map(t => ({ id: t.id, label: t.name, icon: (<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />) }))}
                      selectedId={(subtask as any).teamId || (subtask as any).team?.id}
                      onSelect={(id) => onTeamChange?.((subtask as any).id, id)}
                      searchable={true}
                      buttonClassName={`px-2 py-1 rounded-full text-[10px] font-medium border cursor-pointer hover:opacity-80 transition-colors flex items-center gap-2`}
                      getItemClassName={(item, isActive) => `block w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


