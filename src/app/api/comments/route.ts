import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Server } from 'socket.io';
import { withTenant } from '@/lib/tenant-db';

const createCommentSchema = z.object({
  content: z.string().min(1),
  taskId: z.string(),
  userId: z.string(),
});

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Verify task exists and belongs to tenant
    const task = await db.task.findFirst({
      where: withTenant({ id: validatedData.taskId })
    });
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const comment = await db.taskComment.create({
      data: validatedData,
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Socket.IO Broadcast (Kommentare bleiben auf comments:*), Chat nutzt eigene Events
    try {
      const anyGlobal = global as any;
      const io: Server | undefined = anyGlobal.io;
      if (io) {
        io.to(`task:${comment.taskId}`).emit('comments:created', comment);
      }
    } catch {}

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
