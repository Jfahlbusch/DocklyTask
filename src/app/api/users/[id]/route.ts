import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant } from '@/lib/tenant-db';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
  customerId: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get a single user
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const user = await db.user.findFirst({
      where: withTenant({ id }),
      include: {
        customer: true,
        assignedTasks: {
          include: {
            project: true,
            customer: true,
            category: true,
          }
        },
        createdTasks: {
          include: {
            project: true,
            customer: true,
            category: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Verify user belongs to tenant
    const existingUser = await db.user.findFirst({
      where: withTenant({ id })
    });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: validatedData,
      include: {
        customer: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify user belongs to tenant before deleting
    const existingUser = await db.user.findFirst({
      where: withTenant({ id })
    });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
