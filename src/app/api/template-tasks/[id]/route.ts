import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateTemplateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  parentTaskId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  statusId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(), // ISO date string
  dueDate: z.string().nullable().optional(),   // ISO date string
  isCustomerVisible: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify task belongs to a tenant template
async function verifyTaskBelongsToTenant(taskId: string) {
  const task = await db.templateTask.findFirst({
    where: { id: taskId },
    include: {
      template: true,
    },
  });
  
  if (!task) return null;
  
  // Verify the template belongs to the tenant
  const template = await db.projectTemplate.findFirst({
    where: withTenant({ id: task.templateId })
  });
  
  return template ? task : null;
}

// GET /api/template-tasks/[id] - Get a single template task
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    const task = await verifyTaskBelongsToTenant(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Template task not found' },
        { status: 404 }
      );
    }

    const fullTask = await db.templateTask.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(fullTask);
  } catch (error) {
    console.error('Error fetching template task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template task' },
      { status: 500 }
    );
  }
}

// PUT /api/template-tasks/[id] - Update a template task
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateTemplateTaskSchema.parse(body);

    // Verify task exists and belongs to tenant
    const existingTask = await verifyTaskBelongsToTenant(id);
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Template task not found' },
        { status: 404 }
      );
    }

    // If parentTaskId is provided, verify it exists in the same template
    if (validatedData.parentTaskId) {
      const parentTask = await db.templateTask.findFirst({
        where: {
          id: validatedData.parentTaskId,
          templateId: existingTask.templateId,
        },
      });
      
      if (!parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found in the same template' },
          { status: 404 }
        );
      }
      
      // Prevent circular reference
      if (validatedData.parentTaskId === id) {
        return NextResponse.json(
          { error: 'A task cannot be its own parent' },
          { status: 400 }
        );
      }
    }

    const task = await db.templateTask.update({
      where: { id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.priority !== undefined && { priority: validatedData.priority }),
        ...(validatedData.parentTaskId !== undefined && { parentTaskId: validatedData.parentTaskId }),
        ...(validatedData.assigneeId !== undefined && { assigneeId: validatedData.assigneeId }),
        ...(validatedData.teamId !== undefined && { teamId: validatedData.teamId }),
        ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
        ...(validatedData.statusId !== undefined && { statusId: validatedData.statusId }),
        ...(validatedData.startDate !== undefined && { startDate: validatedData.startDate ? new Date(validatedData.startDate) : null }),
        ...(validatedData.dueDate !== undefined && { dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null }),
        ...(validatedData.isCustomerVisible !== undefined && { isCustomerVisible: validatedData.isCustomerVisible }),
      },
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
    });

    // Handle products if provided
    if (validatedData.productIds !== undefined) {
      // Delete existing products
      await db.templateTaskProduct.deleteMany({
        where: { templateTaskId: id },
      });
      
      // Create new product associations
      if (validatedData.productIds.length > 0) {
        await db.templateTaskProduct.createMany({
          data: validatedData.productIds.map(productId => ({
            templateTaskId: id,
            productId,
          })),
        });
      }
      
      // Refetch to include updated products
      const taskWithProducts = await db.templateTask.findUnique({
        where: { id },
        include: {
          template: { select: { id: true, name: true } },
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
      });
      
      return NextResponse.json(taskWithProducts);
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating template task:', error);
    return NextResponse.json(
      { error: 'Failed to update template task' },
      { status: 500 }
    );
  }
}

// DELETE /api/template-tasks/[id] - Delete a template task
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify task exists and belongs to tenant
    const existingTask = await verifyTaskBelongsToTenant(id);
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Template task not found' },
        { status: 404 }
      );
    }

    // Delete the task (cascades to subtasks via Prisma)
    await db.templateTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template task:', error);
    return NextResponse.json(
      { error: 'Failed to delete template task' },
      { status: 500 }
    );
  }
}

