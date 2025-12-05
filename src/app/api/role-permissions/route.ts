import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTenant, withTenantData } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const permissions = await db.rolePermission.findMany({
      orderBy: [
        { role: 'asc' },
        { resource: 'asc' }
      ]
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, resource, canRead, canWrite, canDelete } = body;

    // Validate required fields
    if (!role || !resource) {
      return NextResponse.json(
        { error: 'Role and resource are required' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await db.rolePermission.findFirst({
      where: { role, resource }
    });

    if (existingPermission) {
      // Update existing permission
      const updated = await db.rolePermission.update({
        where: { id: existingPermission.id },
        data: {
          canRead: canRead ?? existingPermission.canRead,
          canWrite: canWrite ?? existingPermission.canWrite,
          canDelete: canDelete ?? existingPermission.canDelete
        }
      });
      return NextResponse.json(updated);
    }

    // Create new permission
    const permission = await db.rolePermission.create({
      data: {
        role,
        resource,
        canRead: canRead ?? true,
        canWrite: canWrite ?? false,
        canDelete: canDelete ?? false
      }
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error('Error creating role permission:', error);
    return NextResponse.json(
      { error: 'Failed to create role permission' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, resource, canRead, canWrite, canDelete } = body;

    if (!role || !resource) {
      return NextResponse.json(
        { error: 'Role and resource are required' },
        { status: 400 }
      );
    }

    const permission = await db.rolePermission.upsert({
      where: {
        role_resource: { role, resource }
      },
      update: {
        canRead: canRead ?? true,
        canWrite: canWrite ?? false,
        canDelete: canDelete ?? false
      },
      create: {
        role,
        resource,
        canRead: canRead ?? true,
        canWrite: canWrite ?? false,
        canDelete: canDelete ?? false
      }
    });

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error updating role permission:', error);
    return NextResponse.json(
      { error: 'Failed to update role permission' },
      { status: 500 }
    );
  }
}

