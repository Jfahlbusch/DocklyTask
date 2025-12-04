import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

// GET - Fetch a single section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantFromHeadersAsync();

    const section = await db.taskFieldSection.findFirst({
      where: { id, tenantId },
      include: {
        fields: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: 'Bereich nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json({ error: 'Failed to fetch section' }, { status: 500 });
  }
}

// Schema for updating a section
const updateSectionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isCollapsed: z.boolean().optional(),
  position: z.number().optional(),
});

// PUT - Update a section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const data = updateSectionSchema.parse(body);

    // Check if section exists
    const existing = await db.taskFieldSection.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bereich nicht gefunden' }, { status: 404 });
    }

    const section = await db.taskFieldSection.update({
      where: { id },
      data,
      include: {
        fields: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

// DELETE - Delete a section (fields will have sectionId set to null)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantFromHeadersAsync();

    // Check if section exists
    const existing = await db.taskFieldSection.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bereich nicht gefunden' }, { status: 404 });
    }

    // Delete section (fields will have sectionId set to null due to onDelete: SetNull)
    await db.taskFieldSection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}

