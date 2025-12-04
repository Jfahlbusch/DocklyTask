import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData } from '@/lib/tenant-db';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

// GET /api/project-templates - Get all templates
export async function GET() {
  try {
    const templates = await db.projectTemplate.findMany({
      where: withTenant({}),
      include: {
        products: {
          include: {
            product: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching project templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project templates' },
      { status: 500 }
    );
  }
}

// POST /api/project-templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const { productIds, ...templateData } = validatedData;

    const template = await db.projectTemplate.create({
      data: withTenantData({
        ...templateData,
        products: productIds ? {
          create: productIds.map(productId => ({
            productId,
          }))
        } : undefined,
      }),
      include: {
        products: {
          include: {
            product: true
          }
        },
        tasks: true
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating project template:', error);
    return NextResponse.json(
      { error: 'Failed to create project template' },
      { status: 500 }
    );
  }
}
