import { db } from './src/lib/db';

async function main() {
  // Create default task statuses
  const pendingStatus = await db.taskStatus.create({
    data: {
      name: 'PENDING',
      label: 'Ausstehend',
      description: 'Aufgabe wurde noch nicht begonnen',
      color: 'bg-gray-100 text-gray-800',
      order: 1,
    },
  });

  const inProgressStatus = await db.taskStatus.create({
    data: {
      name: 'IN_PROGRESS',
      label: 'In Bearbeitung',
      description: 'Aufgabe wird aktuell bearbeitet',
      color: 'bg-blue-100 text-blue-800',
      order: 2,
    },
  });

  const completedStatus = await db.taskStatus.create({
    data: {
      name: 'COMPLETED',
      label: 'Abgeschlossen',
      description: 'Aufgabe wurde erfolgreich abgeschlossen',
      color: 'bg-green-100 text-green-800',
      order: 3,
    },
  });

  const cancelledStatus = await db.taskStatus.create({
    data: {
      name: 'CANCELLED',
      label: 'Abgebrochen',
      description: 'Aufgabe wurde abgebrochen',
      color: 'bg-red-100 text-red-800',
      order: 4,
    },
  });

  // Create sample users
  const adminUser = await db.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const managerUser = await db.user.create({
    data: {
      email: 'manager@example.com',
      name: 'Manager User',
      role: 'MANAGER',
    },
  });

  const regularUser = await db.user.create({
    data: {
      email: 'user@example.com',
      name: 'Regular User',
      role: 'USER',
    },
  });

  // Create sample customers
  const customer1 = await db.customer.create({
    data: {
      name: 'TechCorp GmbH',
      mainContact: 'Hans Mueller',
      info: 'Technology company specializing in software development',
    },
  });

  const customer2 = await db.customer.create({
    data: {
      name: 'Innovate AG',
      mainContact: 'Anna Schmidt',
      info: 'Innovation and consulting services',
    },
  });

  // Create sample categories
  const category1 = await db.category.create({
    data: {
      name: 'Development',
      color: '#3b82f6',
    },
  });

  const category2 = await db.category.create({
    data: {
      name: 'Design',
      color: '#8b5cf6',
    },
  });

  const category3 = await db.category.create({
    data: {
      name: 'Marketing',
      color: '#10b981',
    },
  });

  // Create sample products
  const product1 = await db.product.create({
    data: {
      name: 'Web Development',
      description: 'Custom web application development',
      icon: '🌐',
    },
  });

  const product2 = await db.product.create({
    data: {
      name: 'Mobile App',
      description: 'Native mobile application development',
      icon: '📱',
    },
  });

  // Create sample projects
  const project1 = await db.project.create({
    data: {
      name: 'Corporate Website Redesign',
      description: 'Complete redesign of the corporate website',
      status: 'IN_PROGRESS',
      goLiveDate: new Date('2024-03-15'),
      customerId: customer1.id,
      products: {
        create: [
          { productId: product1.id },
        ],
      },
      assignees: {
        create: [
          { userId: managerUser.id, role: 'project_manager' },
          { userId: regularUser.id, role: 'developer' },
        ],
      },
    },
  });

  const project2 = await db.project.create({
    data: {
      name: 'Mobile Banking App',
      description: 'Development of a mobile banking application',
      status: 'PLANNING',
      goLiveDate: new Date('2024-06-01'),
      customerId: customer2.id,
      products: {
        create: [
          { productId: product2.id },
        ],
      },
      assignees: {
        create: [
          { userId: managerUser.id, role: 'project_manager' },
        ],
      },
    },
  });

  // Create sample tasks
  const task1 = await db.task.create({
    data: {
      title: 'Create homepage design mockups',
      description: 'Design mockups for the new homepage layout',
      statusId: inProgressStatus.id,
      priority: 'HIGH',
      startDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-01'),
      projectId: project1.id,
      categoryId: category2.id,
      assigneeId: regularUser.id,
      createdById: managerUser.id,
      subtasks: {
        create: [
          { title: 'Research competitor websites', priority: 'HIGH' },
          { title: 'Create wireframes', priority: 'MEDIUM' },
          { title: 'Design high-fidelity mockups', priority: 'LOW' },
        ],
      },
    },
  });

  const task2 = await db.task.create({
    data: {
      title: 'Implement user authentication',
      description: 'Implement secure user authentication system',
      statusId: pendingStatus.id,
      priority: 'MEDIUM',
      startDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-15'),
      projectId: project1.id,
      categoryId: category1.id,
      assigneeId: regularUser.id,
      createdById: managerUser.id,
      subtasks: {
        create: [
          { title: 'Set up authentication backend', priority: 'HIGH' },
          { title: 'Create login/register forms', priority: 'MEDIUM' },
          { title: 'Implement password reset', priority: 'LOW' },
        ],
      },
    },
  });

  const task3 = await db.task.create({
    data: {
      title: 'Database schema design',
      description: 'Design database schema for mobile banking app',
      statusId: completedStatus.id,
      priority: 'HIGH',
      startDate: new Date('2024-01-10'),
      dueDate: new Date('2024-01-25'),
      projectId: project2.id,
      categoryId: category1.id,
      assigneeId: managerUser.id,
      createdById: adminUser.id,
      subtasks: {
        create: [
          { title: 'Analyze requirements', priority: 'HIGH' },
          { title: 'Create ER diagram', priority: 'MEDIUM' },
          { title: 'Write SQL scripts', priority: 'LOW' },
        ],
      },
    },
  });

  // Create sample comments
  await db.taskComment.create({
    data: {
      content: 'Great progress on the mockups! Please focus on the mobile responsiveness.',
      taskId: task1.id,
      userId: managerUser.id,
    },
  });

  await db.taskComment.create({
    data: {
      content: 'Will do. I\'m currently working on the wireframes.',
      taskId: task1.id,
      userId: regularUser.id,
    },
  });

  // Create sample attachments
  await db.taskAttachment.create({
    data: {
      fileName: 'homepage-mockup-v1.pdf',
      fileSize: 2048000,
      fileType: 'application/pdf',
      fileUrl: '/attachments/homepage-mockup-v1.pdf',
      taskId: task1.id,
    },
  });

  console.log('Sample data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });