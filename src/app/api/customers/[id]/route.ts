import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  mainContact: z.string().optional(),
  info: z.string().optional(),
  profile: z.any().optional(),
});

// Helper function to serialize BigInt values to strings for JSON compatibility
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/customers/[id] - Get a single customer
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const customer = await db.customer.findFirst({
      where: withTenant({ id }),
      include: {
        projects: {
          include: {
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
            }
          }
        },
        tasks: {
          include: {
            project: true,
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
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
          }
        },
        // Include contacts (Ansprechpartner) from Pipedrive sync
        contacts: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true,
            pipedriveId: true,
            pipedriveSyncedAt: true,
            metadata: true,
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Serialize BigInt values and add profile
    const serializedCustomer = serializeBigInt(customer);
    const withProfile = { ...serializedCustomer, profile: (customer?.info && customer.info.trim().startsWith('{') ? JSON.parse(customer.info) : undefined) } as any;
    return NextResponse.json(withProfile);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    // Verify customer belongs to tenant
    const existingCustomer = await db.customer.findFirst({
      where: withTenant({ id })
    });
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const data: any = {
      ...validatedData,
    };
    if (validatedData.profile) {
      data.info = JSON.stringify(validatedData.profile);
      delete data.profile;
    }

    const customer = await db.customer.update({
      where: { id },
      data,
      include: {
        projects: true,
        tasks: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Serialize BigInt values and add profile
    const serializedCustomer = serializeBigInt(customer);
    const withProfile = { ...serializedCustomer, profile: (customer.info && customer.info.trim().startsWith('{') ? JSON.parse(customer.info) : undefined) };
    return NextResponse.json(withProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify customer belongs to tenant before deleting
    const existingCustomer = await db.customer.findFirst({
      where: withTenant({ id })
    });
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    await db.customer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
