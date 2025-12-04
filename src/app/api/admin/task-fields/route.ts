import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

// Default system fields that every task should have
const SYSTEM_FIELDS = [
  { fieldKey: 'title', label: 'Titel', fieldType: 'TEXT', isRequired: true, isSystem: true, position: 0, width: 100, isArchived: false },
  { fieldKey: 'description', label: 'Beschreibung', fieldType: 'RICHTEXT', isRequired: false, isSystem: true, position: 1, width: 100, isArchived: false },
  { fieldKey: 'products', label: 'Produkte', fieldType: 'PRODUCT', isRequired: false, isSystem: true, position: 2, width: 100, isArchived: false },
  { fieldKey: 'priority', label: 'Priorität', fieldType: 'SELECT', isRequired: true, isSystem: true, position: 3, width: 50, isArchived: false },
  { fieldKey: 'status', label: 'Status', fieldType: 'SELECT', isRequired: true, isSystem: true, position: 4, width: 50, isArchived: false },
  { fieldKey: 'customer', label: 'Kunde', fieldType: 'CUSTOMER', isRequired: false, isSystem: true, position: 5, width: 50, isArchived: false },
  { fieldKey: 'assignee', label: 'Zugewiesen an (Person)', fieldType: 'USER', isRequired: false, isSystem: true, position: 6, width: 50, isArchived: false },
  { fieldKey: 'team', label: 'Zugewiesen an (Team)', fieldType: 'TEAM', isRequired: false, isSystem: true, position: 7, width: 50, isArchived: false },
  { fieldKey: 'project', label: 'Projekt', fieldType: 'PROJECT', isRequired: false, isSystem: true, position: 8, width: 50, isArchived: false },
  { fieldKey: 'category', label: 'Kategorie', fieldType: 'CATEGORY', isRequired: false, isSystem: true, position: 9, width: 50, isArchived: false },
  { fieldKey: 'startDate', label: 'Startdatum', fieldType: 'DATE', isRequired: false, isSystem: true, position: 10, width: 50, isArchived: false },
  { fieldKey: 'dueDate', label: 'Fälligkeitsdatum', fieldType: 'DATE', isRequired: false, isSystem: true, position: 11, width: 50, isArchived: false },
];

// GET - Fetch all field configurations
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();

    // Get existing field configs with section info
    let fields = await db.taskFieldConfig.findMany({
      where: { tenantId },
      include: {
        section: true,
      },
      orderBy: { position: 'asc' },
    });

    // If no fields exist, create default system fields
    if (fields.length === 0) {
      await db.taskFieldConfig.createMany({
        data: SYSTEM_FIELDS.map((field) => ({
          ...field,
          isVisible: true,
          tenantId,
        })),
      });

      fields = await db.taskFieldConfig.findMany({
        where: { tenantId },
        include: {
          section: true,
        },
        orderBy: { position: 'asc' },
      });
    }

    // Normalize fields - ensure width and isArchived have default values
    const normalizedFields = fields.map((field) => ({
      ...field,
      width: field.width ?? 100,
      isArchived: field.isArchived ?? false,
    }));

    return NextResponse.json(normalizedFields);
  } catch (error) {
    console.error('Error fetching task field configs:', error);
    return NextResponse.json({ error: 'Failed to fetch field configurations' }, { status: 500 });
  }
}

// Schema for creating a new field
const createFieldSchema = z.object({
  fieldKey: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field key must start with a letter and contain only letters, numbers, and underscores'),
  label: z.string().min(1),
  fieldType: z.enum(['TEXT', 'TEXTAREA', 'RICHTEXT', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'USER', 'CUSTOMER', 'PROJECT', 'TEAM', 'CATEGORY', 'PRODUCT']),
  isRequired: z.boolean().optional().default(false),
  isVisible: z.boolean().optional().default(true),
  visibleForRoles: z.string().optional().nullable(), // JSON array of roles, e.g. '["ADMIN", "MANAGER"]'
  width: z.number().min(25).max(100).optional().default(100), // Width in percent
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  options: z.string().optional(), // JSON array for SELECT/MULTISELECT
  sectionId: z.string().optional().nullable(), // Optional section grouping
});

// POST - Create a new field configuration
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const data = createFieldSchema.parse(body);

    // Check if fieldKey already exists
    const existingField = await db.taskFieldConfig.findFirst({
      where: { fieldKey: data.fieldKey, tenantId },
    });

    if (existingField) {
      return NextResponse.json({ error: 'Ein Feld mit diesem Schlüssel existiert bereits' }, { status: 400 });
    }

    // Get max position
    const maxPosition = await db.taskFieldConfig.aggregate({
      where: { tenantId },
      _max: { position: true },
    });

    const field = await db.taskFieldConfig.create({
      data: {
        ...data,
        isSystem: false,
        position: (maxPosition._max.position ?? -1) + 1,
        tenantId,
      },
    });

    return NextResponse.json(field);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating task field config:', error);
    return NextResponse.json({ error: 'Failed to create field configuration' }, { status: 500 });
  }
}

// Schema for updating field positions
const updatePositionsSchema = z.array(z.object({
  id: z.string(),
  position: z.number(),
}));

// PATCH - Bulk update field positions
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    const updates = updatePositionsSchema.parse(body);

    // Update all positions in a transaction
    await db.$transaction(
      updates.map((update) =>
        db.taskFieldConfig.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    );

    const fields = await db.taskFieldConfig.findMany({
      where: { tenantId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(fields);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating field positions:', error);
    return NextResponse.json({ error: 'Failed to update field positions' }, { status: 500 });
  }
}

