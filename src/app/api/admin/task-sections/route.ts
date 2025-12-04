import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

// GET - Fetch all sections with their fields
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();

    const sections = await db.taskFieldSection.findMany({
      where: { tenantId },
      include: {
        fields: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching task field sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

// Schema for creating a new section
const createSectionSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  isCollapsed: z.boolean().optional().default(false),
});

// POST - Create a new section
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const data = createSectionSchema.parse(body);

    // Get max position
    const maxPosition = await db.taskFieldSection.aggregate({
      where: { tenantId },
      _max: { position: true },
    });

    const section = await db.taskFieldSection.create({
      data: {
        ...data,
        position: (maxPosition._max.position ?? -1) + 1,
        tenantId,
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating task field section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

// Schema for updating section positions
const updatePositionsSchema = z.array(z.object({
  id: z.string(),
  position: z.number(),
}));

// PATCH - Bulk update section positions
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const updates = updatePositionsSchema.parse(body);

    // Update all positions in a transaction
    await db.$transaction(
      updates.map((update) =>
        db.taskFieldSection.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    );

    const sections = await db.taskFieldSection.findMany({
      where: { tenantId },
      include: {
        fields: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(sections);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating section positions:', error);
    return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
  }
}

