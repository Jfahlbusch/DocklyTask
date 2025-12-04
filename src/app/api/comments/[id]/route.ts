import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Server } from 'socket.io';
import { withTenant } from '@/lib/tenant-db';

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/comments/[id] - Update a comment
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // Verify comment belongs to a task in the current tenant
    const existing = await db.taskComment.findFirst({
      where: {
        id,
        task: withTenant({})
      }
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const comment = await db.taskComment.update({
      where: { id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      }
    });

    try {
      const anyGlobal = global as any;
      const io: Server | undefined = anyGlobal.io;
      if (io) {
        io.to(`task:${comment.taskId}`).emit('comments:updated', comment);
      }
    } catch {}

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify comment belongs to a task in the current tenant
    const existing = await db.taskComment.findFirst({
      where: {
        id,
        task: withTenant({})
      }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    await db.taskComment.delete({ where: { id } });

    try {
      const anyGlobal = global as any;
      const io: Server | undefined = anyGlobal.io;
      if (io) {
        io.to(`task:${existing.taskId}`).emit('comments:deleted', { id, taskId: existing.taskId });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
