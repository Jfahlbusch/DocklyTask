import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData, getCurrentTenant } from '@/lib/tenant-db';

// Helper function to get the next available task number for the tenant
async function getNextTaskNumber(): Promise<number> {
  const tenantId = getCurrentTenant();
  // Find the highest existing task number for this tenant
  const result = await db.task.aggregate({
    where: { tenantId },
    _max: {
      taskNumber: true
    }
  });
  
  const maxNumber = result._max.taskNumber || 0;
  return maxNumber + 1;
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  statusId: z.string().optional(),
  createdById: z.string(),
  isCustomerVisible: z.boolean().optional().default(false),
  productIds: z.array(z.string()).optional().default([]),
});

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
});

// GET /api/tasks - Get all tasks with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      statusId: searchParams.get('statusId'),
      priority: searchParams.get('priority'),
      customerId: searchParams.get('customerId'),
      projectId: searchParams.get('projectId'),
      categoryId: searchParams.get('categoryId'),
      assigneeId: searchParams.get('assigneeId'),
      teamId: searchParams.get('teamId'),
      createdById: searchParams.get('createdById'),
      showCompleted: searchParams.get('showCompleted') === 'true',
    };

    const where: any = withTenant({});
    
    if (filters.statusId && filters.statusId !== 'all') {
      where.statusId = filters.statusId;
    }
    
    if (filters.priority && filters.priority !== 'all') {
      where.priority = filters.priority;
    }
    
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    
    if (filters.teamId) {
      where.teamId = filters.teamId;
    }
    
    if (filters.createdById) {
      where.createdById = filters.createdById;
    }
    
    if (!filters.showCompleted) {
      // Zeige alle Tasks ausser COMPLETED – aber schliesse Tasks ohne Status NICHT aus
      // (Relation-Filter auf optionaler Relation würde sonst ein implizites INNER JOIN erzeugen)
      where.OR = [
        { taskStatus: { is: null } },
        { taskStatus: { is: { name: { not: 'COMPLETED' } } } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
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
      },
      orderBy: [
        { taskNumber: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Get the next available task number
    const taskNumber = await getNextTaskNumber();

    // Normalize optional foreign keys to undefined to avoid FK violations on empty strings
    const normalized = {
      ...validatedData,
      customerId: validatedData.customerId || undefined,
      projectId: validatedData.projectId || undefined,
      categoryId: validatedData.categoryId || undefined,
      assigneeId: validatedData.assigneeId || undefined,
      teamId: validatedData.teamId || undefined,
      statusId: validatedData.statusId || undefined,
    };

    // Validate required FK: createdById must exist in same tenant
    const creator = await db.user.findFirst({ 
      where: withTenant({ id: normalized.createdById }) 
    });
    if (!creator) {
      return NextResponse.json(
        { error: 'Invalid createdById: User not found' },
        { status: 400 }
      );
    }

    // Resolve status name from statusId if provided, otherwise default
    let statusName = 'PENDING';
    if (normalized.statusId) {
      const status = await db.taskStatus.findFirst({ 
        where: withTenant({ id: normalized.statusId }) 
      });
      statusName = status?.name || 'PENDING';
    }

    // Extract productIds before creating task
    const { productIds, ...taskData } = normalized;

    const task = await db.task.create({
      data: withTenantData({
        ...taskData,
        taskNumber,
        startDate: taskData.startDate ? new Date(taskData.startDate) : null,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        status: statusName,
        // Create product relations
        products: productIds && productIds.length > 0 ? {
          create: productIds.map((productId: string) => ({
            productId
          }))
        } : undefined
      }),
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
          }
        },
        products: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    // Prisma FK violation
    if (typeof error === 'object' && error && (error as any).code === 'P2003') {
      return NextResponse.json(
        { error: 'Foreign key constraint violated', details: (error as any).meta },
        { status: 400 }
      );
    }

    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
