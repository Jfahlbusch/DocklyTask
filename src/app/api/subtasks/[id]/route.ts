import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTenant } from '@/lib/tenant-db';

interface RouteParams { params: Promise<{ id: string }> }

// PUT /api/subtasks/[id] - Update a subtask
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const body = await request.json();
    const { id } = await context.params;

    // Verify subtask belongs to a task in the current tenant
    const existingSubtask = await db.subTask.findFirst({
      where: {
        id,
        task: withTenant({})
      },
    });

    if (!existingSubtask) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.teamId !== undefined) updateData.teamId = body.teamId;
    if (body.status !== undefined) updateData.status = body.status;

    const updatedSubtask = await db.subTask.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask' },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete a subtask
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;

    // Verify subtask belongs to a task in the current tenant
    const existingSubtask = await db.subTask.findFirst({
      where: {
        id,
        task: withTenant({})
      },
    });

    if (!existingSubtask) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    await db.subTask.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtask' },
      { status: 500 }
    );
  }
}
