import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { withTenant } from '@/lib/tenant-db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/task-attachments/[id] - Delete an attachment
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    
    // Verify attachment belongs to a task in the current tenant
    const attachment = await db.taskAttachment.findFirst({
      where: {
        id,
        task: withTenant({})
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), 'public', attachment.fileUrl);
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting file from disk:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await db.taskAttachment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
