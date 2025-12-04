import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/project-templates/[id] - Get a single template
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const template = await db.projectTemplate.findFirst({
      where: withTenant({ id }),
      include: {
        products: {
          include: {
            product: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Project template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching project template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project template' },
      { status: 500 }
    );
  }
}

// PUT /api/project-templates/[id] - Update a template
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Verify template belongs to tenant
    const existingTemplate = await db.projectTemplate.findFirst({
      where: withTenant({ id })
    });
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Project template not found' },
        { status: 404 }
      );
    }

    const { productIds, ...templateData } = validatedData;

    // Delete existing products if they are being updated
    if (productIds !== undefined) {
      await db.templateProduct.deleteMany({
        where: { templateId: id }
      });
    }

    const template = await db.projectTemplate.update({
      where: { id },
      data: {
        ...templateData,
        products: productIds ? {
          create: productIds.map(productId => ({
            productId,
          }))
        } : undefined,
      },
      include: {
        products: {
          include: {
            product: true
          }
        },
        tasks: true
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating project template:', error);
    return NextResponse.json(
      { error: 'Failed to update project template' },
      { status: 500 }
    );
  }
}

// DELETE /api/project-templates/[id] - Delete a template
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify template belongs to tenant before deleting
    const existingTemplate = await db.projectTemplate.findFirst({
      where: withTenant({ id })
    });
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Project template not found' },
        { status: 404 }
      );
    }

    await db.projectTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project template:', error);
    return NextResponse.json(
      { error: 'Failed to delete project template' },
      { status: 500 }
    );
  }
}
