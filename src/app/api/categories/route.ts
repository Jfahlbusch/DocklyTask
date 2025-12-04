import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData } from '@/lib/tenant-db';

const createCategorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: withTenant({}),
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    const category = await db.category.create({
      data: withTenantData(validatedData)
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
