import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const createTemplateTaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  templateId: z.string().min(1, 'Template-ID ist erforderlich'),
  parentTaskId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  statusId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(), // ISO date string
  dueDate: z.string().optional().nullable(),   // ISO date string
  isCustomerVisible: z.boolean().optional().default(false),
  productIds: z.array(z.string()).optional(),
});

// GET /api/template-tasks - Get all template tasks (optionally filtered by templateId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    // Build where clause
    const whereClause: any = {};
    
    if (templateId) {
      // Verify template belongs to tenant
      const template = await db.projectTemplate.findFirst({
        where: withTenant({ id: templateId })
      });
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      whereClause.templateId = templateId;
    }

    const tasks = await db.templateTask.findMany({
      where: whereClause,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        subtasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            team: { select: { id: true, name: true, color: true } },
            category: { select: { id: true, name: true, color: true } },
            status: { select: { id: true, name: true, label: true, color: true } },
            products: { include: { product: true } },
          },
        },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        team: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
        status: { select: { id: true, name: true, label: true, color: true } },
        products: { include: { product: true } },
      },
      orderBy: [
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching template tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template tasks' },
      { status: 500 }
    );
  }
}

// POST /api/template-tasks - Create a new template task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTemplateTaskSchema.parse(body);

    // Verify template exists and belongs to tenant
    const template = await db.projectTemplate.findFirst({
      where: withTenant({ id: validatedData.templateId })
    });
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // If parentTaskId provided, verify it exists
    if (validatedData.parentTaskId) {
      const parentTask = await db.templateTask.findFirst({
        where: {
          id: validatedData.parentTaskId,
          templateId: validatedData.templateId,
        },
      });
      
      if (!parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 404 }
        );
      }
    }

    // Create the template task
    const task = await db.templateTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        templateId: validatedData.templateId,
        parentTaskId: validatedData.parentTaskId || null,
        assigneeId: validatedData.assigneeId || null,
        teamId: validatedData.teamId || null,
        categoryId: validatedData.categoryId || null,
        statusId: validatedData.statusId || null,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        isCustomerVisible: validatedData.isCustomerVisible || false,
        // Products are handled separately
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        subtasks: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        team: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
        status: { select: { id: true, name: true, label: true, color: true } },
        products: { include: { product: true } },
      },
    });

    // Handle products if provided
    if (validatedData.productIds && validatedData.productIds.length > 0) {
      await db.templateTaskProduct.createMany({
        data: validatedData.productIds.map(productId => ({
          templateTaskId: task.id,
          productId,
        })),
      });
      
      // Refetch to include products
      const taskWithProducts = await db.templateTask.findUnique({
        where: { id: task.id },
        include: {
          template: { select: { id: true, name: true } },
          subtasks: true,
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          team: { select: { id: true, name: true, color: true } },
          category: { select: { id: true, name: true, color: true } },
          status: { select: { id: true, name: true, label: true, color: true } },
          products: { include: { product: true } },
        },
      });
      
      return NextResponse.json(taskWithProducts, { status: 201 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating template task:', error);
    return NextResponse.json(
      { error: 'Failed to create template task' },
      { status: 500 }
    );
  }
}

