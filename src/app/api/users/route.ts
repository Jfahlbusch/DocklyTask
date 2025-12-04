import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData } from '@/lib/tenant-db';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional().default('USER'),
  customerId: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
  customerId: z.string().optional(),
});

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      where: withTenant({}),
      include: {
        customer: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const user = await db.user.create({
      data: withTenantData(validatedData),
      include: {
        customer: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
