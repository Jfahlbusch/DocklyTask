import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

// GET - Fetch all subtasks for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const tenantId = await getTenantFromHeadersAsync();

    // First verify the task belongs to this tenant
    const task = await db.task.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    const subtasks = await db.subTask.findMany({
      where: { taskId },
      include: {
        assignee: true,
        team: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

// Schema for creating a subtask
const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  assigneeId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
});

// POST - Create a new subtask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const data = createSubtaskSchema.parse(body);

    console.log('Creating subtask - taskId:', taskId, 'tenantId:', tenantId);

    // Verify task exists and belongs to this tenant
    const task = await db.task.findFirst({
      where: { id: taskId, tenantId },
    });

    console.log('Found task:', task?.id, 'Task tenantId:', task?.tenantId);

    if (!task) {
      // Try to find the task without tenant filter for debugging
      const taskWithoutTenant = await db.task.findFirst({
        where: { id: taskId },
      });
      console.log('Task without tenant filter:', taskWithoutTenant?.id, 'has tenantId:', taskWithoutTenant?.tenantId);
      
      return NextResponse.json({ 
        error: 'Aufgabe nicht gefunden',
        debug: {
          requestedTaskId: taskId,
          requestedTenantId: tenantId,
          taskExistsWithDifferentTenant: !!taskWithoutTenant,
          actualTaskTenantId: taskWithoutTenant?.tenantId
        }
      }, { status: 404 });
    }

    const subtask = await db.subTask.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: 'PENDING',
        taskId,
        assigneeId: data.assigneeId || null,
        teamId: data.teamId || null,
      },
      include: {
        assignee: true,
        team: true,
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}

