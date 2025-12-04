import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Server } from 'socket.io'
import { withTenant } from '@/lib/tenant-db'

const updateSchema = z.object({
  content: z.string().min(1),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/customer-chat-messages/[id]
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const validated = updateSchema.parse(body)

    // Verify message belongs to a task in the current tenant
    const existing = await db.taskCustomerChatMessage.findFirst({
      where: {
        id,
        task: withTenant({})
      }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const message = await db.taskCustomerChatMessage.update({
      where: { id },
      data: { content: validated.content },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    try {
      const anyGlobal = global as any
      const io: Server | undefined = anyGlobal.io
      if (io) {
        io.to(`task:${message.taskId}`).emit('customerChat:updated', message)
      }
    } catch {}

    return NextResponse.json(message)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating customer chat message:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/customer-chat-messages/[id]
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params
    
    // Verify message belongs to a task in the current tenant
    const existing = await db.taskCustomerChatMessage.findFirst({
      where: {
        id,
        task: withTenant({})
      }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.taskCustomerChatMessage.delete({ where: { id } })

    try {
      const anyGlobal = global as any
      const io: Server | undefined = anyGlobal.io
      if (io) {
        io.to(`task:${existing.taskId}`).emit('customerChat:deleted', { id, taskId: existing.taskId })
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer chat message:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
