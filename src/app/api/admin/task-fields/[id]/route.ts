import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

// GET - Fetch a single field configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const { id } = await params;

    const field = await db.taskFieldConfig.findFirst({
      where: { id, tenantId },
    });

    if (!field) {
      return NextResponse.json({ error: 'Feld nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error('Error fetching task field config:', error);
    return NextResponse.json({ error: 'Failed to fetch field configuration' }, { status: 500 });
  }
}

// Schema for updating a field
const updateFieldSchema = z.object({
  label: z.string().min(1).optional(),
  fieldType: z.enum(['TEXT', 'TEXTAREA', 'RICHTEXT', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'USER', 'CUSTOMER', 'PROJECT', 'TEAM', 'CATEGORY', 'PRODUCT']).optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isArchived: z.boolean().optional(), // Archive/restore field
  visibleForRoles: z.string().optional().nullable(), // JSON array of roles, e.g. '["ADMIN", "MANAGER"]'
  width: z.number().min(25).max(100).optional(), // Width in percent
  placeholder: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  options: z.string().optional().nullable(),
  position: z.number().optional(),
  sectionId: z.string().optional().nullable(), // Optional section grouping
});

// PUT - Update a field configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const { id } = await params;
    const body = await request.json();
    const data = updateFieldSchema.parse(body);

    // Check if field exists
    const existingField = await db.taskFieldConfig.findFirst({
      where: { id, tenantId },
    });

    if (!existingField) {
      return NextResponse.json({ error: 'Feld nicht gefunden' }, { status: 404 });
    }

    // Prevent changing fieldType for system fields (could break data)
    if (existingField.isSystem && data.fieldType && data.fieldType !== existingField.fieldType) {
      return NextResponse.json({ error: 'Der Feldtyp von Systemfeldern kann nicht geändert werden' }, { status: 400 });
    }

    const field = await db.taskFieldConfig.update({
      where: { id },
      data,
    });

    return NextResponse.json(field);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating task field config:', error);
    return NextResponse.json({ 
      error: 'Failed to update field configuration', 
      details: error?.message || String(error) 
    }, { status: 500 });
  }
}

// DELETE - Delete a field configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const { id } = await params;

    // Check if field exists
    const existingField = await db.taskFieldConfig.findFirst({
      where: { id, tenantId },
    });

    if (!existingField) {
      return NextResponse.json({ error: 'Feld nicht gefunden' }, { status: 404 });
    }

    // Prevent deleting system fields
    if (existingField.isSystem) {
      return NextResponse.json({ error: 'Systemfelder können nicht gelöscht werden' }, { status: 400 });
    }

    // Delete associated custom field values first
    await db.taskCustomFieldValue.deleteMany({
      where: { fieldId: id },
    });

    // Delete the field
    await db.taskFieldConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task field config:', error);
    return NextResponse.json({ error: 'Failed to delete field configuration' }, { status: 500 });
  }
}
