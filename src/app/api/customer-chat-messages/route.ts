import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Server } from 'socket.io'
import { withTenant } from '@/lib/tenant-db'

const createMessageSchema = z.object({
  content: z.string().min(1),
  taskId: z.string(),
  userId: z.string(),
})

// POST /api/customer-chat-messages - Create a new customer chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createMessageSchema.parse(body)

    // Verify task exists and belongs to tenant
    const task = await db.task.findFirst({
      where: withTenant({ id: validated.taskId })
    })
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const message = await db.taskCustomerChatMessage.create({
      data: validated,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Broadcast realtime event
    try {
      const anyGlobal = global as any
      const io: Server | undefined = anyGlobal.io
      if (io) {
        io.to(`task:${message.taskId}`).emit('customerChat:created', message)
      }
    } catch {}

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating customer chat message:', error)
    return NextResponse.json(
      { error: 'Failed to create customer chat message' },
      { status: 500 }
    )
  }
}
