import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTenant } from '@/lib/tenant-db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const status = await db.taskStatus.findFirst({
      where: withTenant({ id })
    });

    if (!status) {
      return NextResponse.json(
        { error: 'Task status not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching task status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, label, description, color, order, isActive } = body;

    // Check if status exists and belongs to tenant
    const existingStatus = await db.taskStatus.findFirst({
      where: withTenant({ id })
    });

    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Task status not found' },
        { status: 404 }
      );
    }

    // Check if name is being changed and already exists for this tenant
    if (name && name !== existingStatus.name) {
      const nameExists = await db.taskStatus.findFirst({
        where: withTenant({ name })
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Status with this name already exists' },
          { status: 400 }
        );
      }
    }

    const status = await db.taskStatus.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(label && { label }),
        ...(description !== undefined && { description: description || null }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Check if status exists and belongs to tenant
    const existingStatus = await db.taskStatus.findFirst({
      where: withTenant({ id }),
      include: {
        tasks: true
      }
    });

    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Task status not found' },
        { status: 404 }
      );
    }

    // Check if status is being used by tasks
    if (existingStatus.tasks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete status that is being used by tasks' },
        { status: 400 }
      );
    }

    await db.taskStatus.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Task status deleted successfully' });
  } catch (error) {
    console.error('Error deleting task status:', error);
    return NextResponse.json(
      { error: 'Failed to delete task status' },
      { status: 500 }
    );
  }
}
