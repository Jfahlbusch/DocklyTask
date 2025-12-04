import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withTenant, withTenantData, getCurrentTenant } from '@/lib/tenant-db';

/**
 * API-Endpunkt: Projekt aus Vorlage erstellen
 * 
 * Erstellt ein neues Projekt mit optionaler Vorlage. Wenn eine Vorlage angegeben wird,
 * werden alle Template-Tasks als echte Tasks für das Projekt erstellt.
 */

/**
 * Helper-Funktion: Ermittelt die nächste verfügbare Task-Nummer für den Tenant
 * Die Transaktion (tx) wird übergeben, um innerhalb der gleichen Transaktion zu bleiben
 */
async function getNextTaskNumber(tx: typeof db): Promise<number> {
  const tenantId = getCurrentTenant();
  const result = await tx.task.aggregate({
    where: { tenantId },
    _max: {
      taskNumber: true
    }
  });
  
  const maxNumber = result._max.taskNumber || 0;
  return maxNumber + 1;
}

const createProjectFromTemplateSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich'),
  customerId: z.string().min(1, 'Kunden-ID ist erforderlich'),
  templateId: z.string().optional().nullable(), // Optional: Ohne Vorlage = leeres Projekt
  description: z.string().optional(),
  goLiveDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
});

// POST /api/projects/from-template - Create project from template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createProjectFromTemplateSchema.parse(body);

    // Verify customer exists and belongs to tenant
    const customer = await db.customer.findFirst({
      where: withTenant({ id: validatedData.customerId }),
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Kunde nicht gefunden' },
        { status: 404 }
      );
    }

    // If templateId provided, verify template exists
    let template = null;
    let templateTasks: any[] = [];

    if (validatedData.templateId) {
      template = await db.projectTemplate.findFirst({
        where: withTenant({ id: validatedData.templateId }),
        include: {
          products: {
            include: {
              product: true,
            },
          },
          tasks: {
            where: {
              parentTaskId: null, // Only get root tasks, subtasks come nested
            },
            orderBy: { createdAt: 'asc' },
            include: {
              subtasks: {
                orderBy: { createdAt: 'asc' },
                include: {
                  products: true,
                },
              },
              products: true,
            },
          },
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Projektvorlage nicht gefunden' },
          { status: 404 }
        );
      }

      templateTasks = template.tasks;
    }

    // Get a default user for createdById (system user or first admin)
    const systemUser = await db.user.findFirst({
      where: withTenant({ role: 'ADMIN' }),
    });

    if (!systemUser) {
      return NextResponse.json(
        { error: 'Kein Admin-Benutzer gefunden. Bitte erstellen Sie zuerst einen Admin-Benutzer.' },
        { status: 500 }
      );
    }

    // Create the project with transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: withTenantData({
          name: validatedData.name,
          description: validatedData.description || template?.description || null,
          status: 'PLANNING',
          customerId: validatedData.customerId,
          goLiveDate: validatedData.goLiveDate ? new Date(validatedData.goLiveDate) : null,
          // Link to template if used
          templates: template ? {
            connect: { id: template.id },
          } : undefined,
          // Add assignees if provided
          assignees: validatedData.assigneeIds ? {
            create: validatedData.assigneeIds.map((userId) => ({
              userId,
            })),
          } : undefined,
          // Copy products from template
          products: template?.products?.length ? {
            create: template.products.map((tp: any) => ({
              productId: tp.productId,
            })),
          } : undefined,
        }),
      });

      // 2. Create tasks from template
      const createdTasks: any[] = [];

      if (templateTasks.length > 0) {
        // Hole die Start-Nummer für die erste Task
        let currentTaskNumber = await getNextTaskNumber(tx);

        for (const templateTask of templateTasks) {
          // Create main task with fortlaufender taskNumber
          const task = await tx.task.create({
            data: withTenantData({
              taskNumber: currentTaskNumber,
              title: templateTask.title,
              description: templateTask.description,
              priority: templateTask.priority,
              status: templateTask.statusId ? undefined : 'PENDING',
              statusId: templateTask.statusId,
              categoryId: templateTask.categoryId,
              assigneeId: templateTask.assigneeId,
              teamId: templateTask.teamId,
              startDate: templateTask.startDate,
              dueDate: templateTask.dueDate,
              isCustomerVisible: templateTask.isCustomerVisible,
              customerId: validatedData.customerId,
              projectId: project.id,
              createdById: systemUser.id,
              // Copy products from template task
              products: templateTask.products?.length ? {
                create: templateTask.products.map((tp: any) => ({
                  productId: tp.productId,
                })),
              } : undefined,
            }),
          });

          // Inkrementiere für die nächste Task
          currentTaskNumber++;

          createdTasks.push(task);

          // Create subtasks from template subtasks
          if (templateTask.subtasks && templateTask.subtasks.length > 0) {
            for (const templateSubtask of templateTask.subtasks) {
              const subtask = await tx.subTask.create({
                data: {
                  title: templateSubtask.title,
                  description: templateSubtask.description,
                  priority: templateSubtask.priority,
                  status: 'PENDING',
                  assigneeId: templateSubtask.assigneeId,
                  teamId: templateSubtask.teamId,
                  taskId: task.id,
                },
              });
            }
          }
        }
      }

      return { project, tasksCreated: createdTasks.length };
    });

    // Fetch the complete project with all relations
    const completeProject = await db.project.findUnique({
      where: { id: result.project.id },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        products: {
          include: {
            product: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        templates: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        project: completeProject,
        tasksCreated: result.tasksCreated,
        message: validatedData.templateId
          ? `Projekt "${validatedData.name}" mit ${result.tasksCreated} Aufgaben aus Vorlage erstellt.`
          : `Projekt "${validatedData.name}" ohne Vorlage erstellt.`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validierungsfehler', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating project from template:', error);
    return NextResponse.json(
      { error: 'Projekt konnte nicht erstellt werden', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/projects/from-template - Get available templates for project creation
export async function GET() {
  try {
    const templates = await db.projectTemplate.findMany({
      where: withTenant({}),
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            tasks: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to include task count directly
    const templatesWithCount = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      taskCount: t._count.tasks,
      products: t.products.map((p) => p.product),
    }));

    return NextResponse.json(templatesWithCount);
  } catch (error) {
    console.error('Error fetching templates for project creation:', error);
    return NextResponse.json(
      { error: 'Vorlagen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

