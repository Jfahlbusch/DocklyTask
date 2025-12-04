import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const createSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  taskId: z.string(),
});

// GET /api/subtasks - Get all subtasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    // Filter subtasks by tasks that belong to the current tenant
    const subtasks = await db.subTask.findMany({
      where: {
        ...(taskId && { taskId }),
        task: withTenant({})
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    );
  }
}

// POST /api/subtasks - Create a new subtask
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSubtaskSchema.parse(body);

    // Validate task exists and belongs to tenant
    const task = await db.task.findFirst({ 
      where: withTenant({ id: validatedData.taskId }) 
    });
    if (!task) {
      return NextResponse.json(
        { error: 'Invalid taskId: Task not found' },
        { status: 400 }
      );
    }

    if (validatedData.assigneeId) {
      const user = await db.user.findFirst({ 
        where: withTenant({ id: validatedData.assigneeId }) 
      });
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid assigneeId: User not found' },
          { status: 400 }
        );
      }
    }

    if (validatedData.teamId) {
      const team = await db.team.findFirst({ 
        where: withTenant({ id: validatedData.teamId }) 
      });
      if (!team) {
        return NextResponse.json(
          { error: 'Invalid teamId: Team not found' },
          { status: 400 }
        );
      }
    }

    // Normalize empty strings to undefined to avoid FK violations
    const subtask = await db.subTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || undefined,
        priority: validatedData.priority,
        status: 'PENDING',
        assigneeId: validatedData.assigneeId || undefined,
        teamId: validatedData.teamId || undefined,
        taskId: validatedData.taskId,
      },
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

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    // Prisma FK violation → aussagekräftige Antwort
    if (typeof error === 'object' && error && (error as any).code === 'P2003') {
      return NextResponse.json(
        { error: 'Foreign key constraint violated', details: (error as any).meta },
        { status: 400 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create subtask', details: errorMessage },
      { status: 500 }
    );
  }
}
