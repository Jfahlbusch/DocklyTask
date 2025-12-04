import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_TENANT } from '@/lib/tenant-db'

export async function POST() {
  try {
    const tenantId = DEFAULT_TENANT

    await db.$transaction(async (tx) => {
      // TaskStatus mit Compound-Key (name + tenantId)
      await tx.taskStatus.upsert({
        where: { name_tenantId: { name: 'PENDING', tenantId } },
        update: {},
        create: { name: 'PENDING', label: 'Ausstehend', color: 'bg-gray-100 text-gray-800', order: 1, tenantId },
      })
      await tx.taskStatus.upsert({
        where: { name_tenantId: { name: 'IN_PROGRESS', tenantId } },
        update: {},
        create: { name: 'IN_PROGRESS', label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-800', order: 2, tenantId },
      })

      // User mit Compound-Key (email + tenantId)
      const admin = await tx.user.upsert({
        where: { email_tenantId: { email: 'admin@example.com', tenantId } },
        update: { role: 'ADMIN', name: 'Admin User' },
        create: { email: 'admin@example.com', role: 'ADMIN', name: 'Admin User', tenantId },
      })

      // 20 Test-User anlegen (falls noch nicht vorhanden)
      const roles = ['MANAGER','USER','VIEWER'] as const
      const userPromises = Array.from({ length: 20 }).map((_, i) => {
        const idx = i + 1
        const email = `user${idx}@example.com`
        const role = roles[i % roles.length] as any
        const name = `Test User ${idx}`
        return tx.user.upsert({
          where: { email_tenantId: { email, tenantId } },
          update: { name, role },
          create: { email, name, role, tenantId },
        })
      })
      await Promise.all(userPromises)

      const customer = await tx.customer.upsert({
        where: { id: 'seed-cust-1' },
        update: { name: 'Demo Kunde' },
        create: { id: 'seed-cust-1', name: 'Demo Kunde', tenantId },
      })

      // Drei Beispielprojekte anlegen
      const projectA = await tx.project.upsert({
        where: { id: 'seed-proj-1' },
        update: { name: 'Demo Projekt A' },
        create: { id: 'seed-proj-1', name: 'Demo Projekt A', customerId: customer.id, status: 'PLANNING', tenantId },
      })
      const projectB = await tx.project.upsert({
        where: { id: 'seed-proj-2' },
        update: { name: 'Demo Projekt B' },
        create: { id: 'seed-proj-2', name: 'Demo Projekt B', customerId: customer.id, status: 'IN_PROGRESS', tenantId },
      })
      const projectC = await tx.project.upsert({
        where: { id: 'seed-proj-3' },
        update: { name: 'Demo Projekt C' },
        create: { id: 'seed-proj-3', name: 'Demo Projekt C', customerId: customer.id, status: 'ON_HOLD', tenantId },
      })
      const projects = [projectA, projectB, projectC]

      // Category mit Compound-Key (name + tenantId)
      const category = await tx.category.upsert({
        where: { name_tenantId: { name: 'Allgemein', tenantId } },
        update: {},
        create: { name: 'Allgemein', color: '#64748b', tenantId },
      })

      const pending = await tx.taskStatus.findFirst({ where: { name: 'PENDING', tenantId } })
      const priorities = ['LOW','MEDIUM','HIGH','URGENT'] as const
      const now = new Date()
      // Startnummer für fortlaufende Ticketnummern ermitteln
      const agg = await tx.task.aggregate({ _max: { taskNumber: true }, where: { tenantId } })
      const startNo = (agg._max.taskNumber || 0) + 1

      const tasksToCreate = Array.from({ length: 10 }).map((_, idx) => {
        const due = new Date(now)
        due.setDate(now.getDate() + (idx + 1))
        const start = new Date(now)
        start.setDate(now.getDate() - (idx % 3))
        return tx.task.create({
          data: {
            title: `Demo Aufgabe ${idx + 1}`,
            description: `Dies ist die Demo-Aufgabe Nummer ${idx + 1}.`,
            taskNumber: startNo + idx,
            statusId: pending?.id,
            priority: priorities[idx % priorities.length] as any,
            startDate: start,
            dueDate: due,
            projectId: projects[idx % projects.length].id,
            categoryId: category.id,
            createdById: admin.id,
            isCustomerVisible: false,
            tenantId,
          },
        })
      })
      await Promise.all(tasksToCreate)
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Seed error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'seed failed' }, { status: 500 })
  }
}
