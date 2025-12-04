import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData } from '@/lib/tenant-db';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional().default('PLANNING'),
  goLiveDate: z.string().optional(),
  customerId: z.string(),
  productIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  goLiveDate: z.string().optional(),
  customerId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
});

// GET /api/projects - Get all projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status'),
      customerId: searchParams.get('customerId'),
      search: searchParams.get('search'),
    };

    const where: any = withTenant({});
    
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const projects = await db.project.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true }
        },
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
        },
        tasks: {
          select: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: [
        { goLiveDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Add computed fields
    const projectsWithStats = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project,
        totalTasks,
        completedTasks,
        progress,
      };
    });

    return NextResponse.json(projectsWithStats);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    const { productIds, assigneeIds, ...projectData } = validatedData;

    const project = await db.project.create({
      data: withTenantData({
        ...projectData,
        goLiveDate: validatedData.goLiveDate ? new Date(validatedData.goLiveDate) : null,
        products: productIds ? {
          create: productIds.map(productId => ({
            productId,
          }))
        } : undefined,
        assignees: assigneeIds ? {
          create: assigneeIds.map(userId => ({
            userId,
          }))
        } : undefined,
      }),
      include: {
        customer: true,
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
        },
        tasks: true,
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
