import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // SQLite doesn't support mode: 'insensitive', but LIKE is case-insensitive by default
    // Parallel search across all entities
    const [tasks, projects, customers, products, categories, teams, users, projectTemplates] = await Promise.all([
      // Tasks - taskNumber is Int, so we can only search title/description
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          taskNumber: true,
          title: true,
          taskStatus: { select: { name: true, color: true } },
          project: { select: { name: true } },
        },
        take: 5,
      }),

      // Projects
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          customer: { select: { name: true } },
        },
        take: 5,
      }),

      // Customers - only has name, mainContact, info
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { mainContact: { contains: query } },
            { info: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          mainContact: true,
          city: true,
        },
        take: 5,
      }),

      // Products
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          icon: true,
        },
        take: 5,
      }),

      // Categories
      prisma.category.findMany({
        where: {
          name: { contains: query },
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
        take: 5,
      }),

      // Teams
      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
        take: 5,
      }),

      // Users
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
        take: 5,
      }),

      // Project Templates
      prisma.projectTemplate.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: 5,
      }),
    ]);

    // Format results with type and navigation info
    const results = [
      ...tasks.map((task) => ({
        type: 'task' as const,
        id: task.id,
        title: task.title,
        subtitle: task.taskNumber ? `#${task.taskNumber}` : undefined,
        description: task.project?.name || undefined,
        status: task.taskStatus?.name,
        statusColor: task.taskStatus?.color,
        href: `/?task=${task.id}`,
        icon: 'task',
      })),
      ...projects.map((project) => ({
        type: 'project' as const,
        id: project.id,
        title: project.name,
        subtitle: project.status,
        description: project.customer?.name || undefined,
        href: `/projects?project=${project.id}`,
        icon: 'project',
      })),
      ...customers.map((customer) => ({
        type: 'customer' as const,
        id: customer.id,
        title: customer.name,
        subtitle: customer.mainContact || undefined,
        description: customer.city || undefined,
        href: `/customers/${customer.id}`,
        icon: 'customer',
      })),
      ...products.map((product) => ({
        type: 'product' as const,
        id: product.id,
        title: product.name,
        subtitle: product.icon || undefined,
        href: `/products?product=${product.id}`,
        icon: 'product',
      })),
      ...categories.map((category) => ({
        type: 'category' as const,
        id: category.id,
        title: category.name,
        color: category.color || undefined,
        href: `/categories?category=${category.id}`,
        icon: 'category',
      })),
      ...teams.map((team) => ({
        type: 'team' as const,
        id: team.id,
        title: team.name,
        subtitle: `${team._count.members} Mitglieder`,
        href: `/admin?tab=teams&team=${team.id}`,
        icon: 'team',
      })),
      ...users.map((user) => ({
        type: 'user' as const,
        id: user.id,
        title: user.name || user.email,
        subtitle: user.email,
        avatar: user.avatar || undefined,
        href: `/admin?tab=users&user=${user.id}`,
        icon: 'user',
      })),
      ...projectTemplates.map((template) => ({
        type: 'template' as const,
        id: template.id,
        title: template.name,
        description: template.description || undefined,
        href: `/project-templates?template=${template.id}`,
        icon: 'template',
      })),
    ];

    return NextResponse.json({
      results,
      counts: {
        tasks: tasks.length,
        projects: projects.length,
        customers: customers.length,
        products: products.length,
        categories: categories.length,
        teams: teams.length,
        users: users.length,
        templates: projectTemplates.length,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Suche' },
      { status: 500 }
    );
  }
}
