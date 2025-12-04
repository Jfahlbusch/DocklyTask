'use client';

import TaskDetailView from './shared/TaskDetailView';
import { Task, Project, Customer, User as UserType, Category, Team } from '@/lib/types';

interface TaskDetailPopupProps {
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
  onAttachmentAdd: (taskId: string, file: File) => void;
  onAttachmentDelete: (attachmentId: string) => void;
  onCommentAttachmentAdd: (commentId: string, file: File) => void;
  onCommentAttachmentDelete: (attachmentId: string) => void;
  currentUser: any;
  refreshData: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskDetailPopup(props: TaskDetailPopupProps) {
  // Ensure handler types match TaskDetailView expectations
  const safeProps = {
    ...props,
    onAttachmentAdd: async (taskId: string, file: File) => props.onAttachmentAdd(taskId, file),
    onAttachmentDelete: async (attachmentId: string) => props.onAttachmentDelete(attachmentId),
    onCommentAttachmentAdd: async (commentId: string, file: File) => props.onCommentAttachmentAdd(commentId, file),
    onCommentAttachmentDelete: async (attachmentId: string) => props.onCommentAttachmentDelete(attachmentId),
  } as const;
  return (
    <TaskDetailView
      renderMode="popup"
      {...(safeProps as any)}
      projects={props.projects}
      customers={props.customers}
    />
  );
}

 
