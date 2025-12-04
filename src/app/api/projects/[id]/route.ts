import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  goLiveDate: z.string().optional(),
  customerId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get a single project
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const project = await db.project.findFirst({
      where: withTenant({ id }),
      include: {
        customer: true,
        products: {
          include: {
            product: true
          }
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        tasks: {
          include: {
            category: true,
            assignee: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            createdBy: {
              select: { id: true, name: true, email: true }
            },
            subtasks: true,
            attachments: true,
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Verify project belongs to tenant
    const existingProject = await db.project.findFirst({
      where: withTenant({ id })
    });
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const { productIds, assigneeIds, ...projectData } = validatedData;

    // First, update the basic project data
    const updateData: any = { ...projectData };
    
    if (validatedData.goLiveDate) {
      updateData.goLiveDate = new Date(validatedData.goLiveDate);
    }

    // Delete existing products and assignees if they are being updated
    if (productIds !== undefined) {
      await db.projectProduct.deleteMany({
        where: { projectId: id }
      });
    }

    if (assigneeIds !== undefined) {
      await db.projectAssignee.deleteMany({
        where: { projectId: id }
      });
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...updateData,
        products: productIds ? {
          create: productIds.map(productId => ({
            productId,
          }))
        } : undefined,
        assignees: assigneeIds ? {
          create: assigneeIds.map(userId => ({
            userId,
          }))
        } : undefined,
      },
      include: {
        customer: true,
        products: {
          include: {
            product: true
          }
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        tasks: true,
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project and all related tasks
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify project belongs to tenant before deleting
    const existingProject = await db.project.findFirst({
      where: withTenant({ id }),
      include: {
        tasks: {
          select: { id: true }
        }
      }
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project and all related data in a transaction
    const result = await db.$transaction(async (tx) => {
      const taskIds = existingProject.tasks.map(t => t.id);
      
      if (taskIds.length > 0) {
        // 1. Delete all task-related data first (in order of dependencies)
        
        // Delete task comments and their attachments
        await tx.commentAttachment.deleteMany({
          where: { comment: { taskId: { in: taskIds } } }
        });
        await tx.taskComment.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // Delete chat messages
        await tx.taskChatMessage.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        await tx.taskCustomerChatMessage.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // Delete attachments
        await tx.taskAttachment.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // Delete subtasks
        await tx.subTask.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // Delete task products
        await tx.taskProduct.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // Delete custom field values
        await tx.taskCustomFieldValue.deleteMany({
          where: { taskId: { in: taskIds } }
        });
        
        // 2. Delete all tasks
        await tx.task.deleteMany({
          where: { id: { in: taskIds } }
        });
      }
      
      // 3. Delete the project (ProjectAssignee and ProjectProduct are deleted via Cascade)
      await tx.project.delete({
        where: { id }
      });
      
      return { tasksDeleted: taskIds.length };
    });

    return NextResponse.json({ 
      success: true,
      message: `Projekt und ${result.tasksDeleted} Aufgabe(n) gelöscht.`
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
