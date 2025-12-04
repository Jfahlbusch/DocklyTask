import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTenant, withTenantData } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    const where = activeOnly 
      ? withTenant({ isActive: true }) 
      : withTenant({});
    
    const statuses = await db.taskStatus.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching task statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task statuses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, label, description, color, order, isActive } = body;

    // Validate required fields
    if (!name || !label) {
      return NextResponse.json(
        { error: 'Name and label are required' },
        { status: 400 }
      );
    }

    // Check if status name already exists for this tenant
    const existingStatus = await db.taskStatus.findFirst({
      where: withTenant({ name })
    });

    if (existingStatus) {
      return NextResponse.json(
        { error: 'Status with this name already exists' },
        { status: 400 }
      );
    }

    const status = await db.taskStatus.create({
      data: withTenantData({
        name,
        label,
        description: description || null,
        color: color || 'bg-gray-100 text-gray-800',
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true
      })
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error('Error creating task status:', error);
    return NextResponse.json(
      { error: 'Failed to create task status' },
      { status: 500 }
    );
  }
}
