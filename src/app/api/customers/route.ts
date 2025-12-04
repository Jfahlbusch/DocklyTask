import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData } from '@/lib/tenant-db';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  mainContact: z.string().optional(),
  info: z.string().optional(),
  profile: z.any().optional(),
});

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

// GET /api/customers - Get all customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = withTenant({});
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mainContact: { contains: search, mode: 'insensitive' } },
        { info: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await db.customer.findMany({
      where,
      include: {
        projects: {
          select: {
            id: true,
            status: true,
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        // Include contacts (Ansprechpartner) for display
        contacts: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add computed fields and serialize BigInt values
    const customersWithStats = customers.map(customer => {
      // Convert BigInt fields to strings for JSON serialization
      const serializedCustomer = serializeBigInt(customer);
      
      return {
        ...serializedCustomer,
        profile: (() => { try { return customer.info && customer.info.trim().startsWith('{') ? JSON.parse(customer.info) : undefined; } catch { return undefined; } })(),
        totalProjects: customer.projects.length,
        activeProjects: customer.projects.filter(p => 
          !['COMPLETED', 'CANCELLED'].includes(p.status)
        ).length,
        totalTasks: customer.tasks.length,
      };
    });

    return NextResponse.json(customersWithStats);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCustomerSchema.parse(body);

    const data = withTenantData({
      name: validatedData.name,
      mainContact: validatedData.mainContact,
      info: validatedData.profile ? JSON.stringify(validatedData.profile) : (validatedData.info || undefined),
    });

    const customer = await db.customer.create({
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
    const withProfile = { ...serializedCustomer, profile: (validatedData.profile ? validatedData.profile : (customer.info && customer.info.trim().startsWith('{') ? JSON.parse(customer.info) : undefined)) };

    return NextResponse.json(withProfile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
