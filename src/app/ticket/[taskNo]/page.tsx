'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTaskContext } from '@/hooks/useTaskContext';
import TaskDetailView from '@/components/shared/TaskDetailView';

export default function TicketStandalonePage() {
  const params = useParams<{ taskNo: string }>();
  const taskNo = params?.taskNo ? String(params.taskNo) : '';
  const { tasks, users, teams, projects, customers, taskStatuses, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask, addComment, updateComment, deleteComment, addAttachment, deleteAttachment, addCommentAttachment, deleteCommentAttachment } = useTaskContext();

  const foundTask = useMemo(() => {
    return tasks.find((t: any) => String((t as any).taskNumber) === taskNo);
  }, [tasks, taskNo]);

  if (!foundTask) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">Ticket #{taskNo} nicht gefunden.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background">
      <TaskDetailView
        renderMode="inline"
        defaultExpandAll
        task={foundTask as any}
        taskStatuses={taskStatuses as any}
        users={users as any}
        teams={teams as any}
        projects={projects as any}
        customers={customers as any}
        onTaskUpdate={updateTask}
        onTaskDelete={deleteTask}
        onTaskEdit={() => {}}
        onSubtaskUpdate={updateSubtask}
        onSubtaskAdd={async (taskId, data) => addSubtask({ ...data, taskId })}
        onSubtaskDelete={deleteSubtask}
        onCommentAdd={async (taskId, content) => addComment({ taskId, content, userId: users[0]?.id || '' })}
        onCommentUpdate={async (id, content) => updateComment(id, { content })}
        onCommentDelete={deleteComment}
        onAttachmentAdd={async (taskId, file) => addAttachment({ taskId, file })}
        onAttachmentDelete={deleteAttachment}
        onCommentAttachmentAdd={async (commentId, file) => addCommentAttachment({ commentId, file })}
        onCommentAttachmentDelete={deleteCommentAttachment}
        currentUser={users[0]}
        refreshData={async () => {}}
      />
    </div>
  );
}


