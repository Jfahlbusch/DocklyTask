import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  statusId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  isCustomerVisible: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a single task
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const task = await db.task.findFirst({
      where: withTenant({ id }),
      include: {
        taskStatus: true,
        customer: true,
        project: true,
        category: true,
        assignee: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        team: {
          select: { id: true, name: true, color: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            team: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        attachments: true,
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        chatMessages: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        customerChatMessages: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        products: {
          include: {
            product: true
          }
        },
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Verify task belongs to tenant
    const existingTask = await db.task.findFirst({
      where: withTenant({ id })
    });
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updateData: any = { ...validatedData };
    // Normalize optional foreign keys: empty string -> null (to clear), undefined -> skip
    const fkKeys: Array<keyof typeof validatedData> = [
      'customerId',
      'projectId',
      'categoryId',
      'assigneeId',
      'teamId',
    ];
    for (const key of fkKeys) {
      if (key in validatedData) {
        const v = (validatedData as any)[key];
        if (v === '') {
          updateData[key] = null; // clear relation
        }
      }
    }
    
    if (validatedData.statusId && validatedData.statusId !== '') {
      // Find the task status to get the name (within tenant)
      const taskStatus = await db.taskStatus.findFirst({
        where: withTenant({ id: validatedData.statusId })
      });
      if (taskStatus) {
        updateData.status = taskStatus.name;
      }
    } else if ('statusId' in validatedData && validatedData.statusId === '') {
      // If empty statusId was sent, do not change status; remove field
      delete updateData.statusId;
    }
    
    // Dates: empty string -> null, string -> Date, undefined -> skip
    if ('startDate' in validatedData) {
      if (validatedData.startDate === '') updateData.startDate = null;
      else if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate);
    }
    if ('dueDate' in validatedData) {
      if (validatedData.dueDate === '') updateData.dueDate = null;
      else if (validatedData.dueDate) updateData.dueDate = new Date(validatedData.dueDate);
    }

    // Handle productIds: delete existing and create new relations
    const { productIds } = validatedData;
    delete updateData.productIds; // Don't include in direct update

    // If productIds is provided (even empty array), update product relations
    if (productIds !== undefined) {
      // Delete existing product relations
      await db.taskProduct.deleteMany({
        where: { taskId: id }
      });

      // Create new product relations
      if (productIds.length > 0) {
        await db.taskProduct.createMany({
          data: productIds.map((productId: string) => ({
            taskId: id,
            productId
          }))
        });
      }
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        taskStatus: true,
        customer: true,
        project: true,
        category: true,
        assignee: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        team: {
          select: { id: true, name: true, color: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            team: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        attachments: true,
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        products: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    // Prisma FK violation
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
    
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify task belongs to tenant before deleting
    const existingTask = await db.task.findFirst({
      where: withTenant({ id })
    });
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await db.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
