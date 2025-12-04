import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { withTenant } from '@/lib/tenant-db';

// POST /api/comment-attachments - Upload a new comment attachment
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const commentId = formData.get('commentId') as string;

    if (!file || !commentId) {
      return NextResponse.json(
        { error: 'File and commentId are required' },
        { status: 400 }
      );
    }

    // Verify comment belongs to a task in the current tenant
    const comment = await db.taskComment.findFirst({
      where: {
        id: commentId,
        task: withTenant({})
      }
    });
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'comments');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomId}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);
    const fileUrl = `/uploads/comments/${fileName}`;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save attachment info to database
    const attachment = await db.commentAttachment.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        commentId,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error uploading comment attachment:', error);
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}

// GET /api/comment-attachments - Get all attachments (optional commentId filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    // Filter attachments by comments that belong to tasks in the current tenant
    const attachments = await db.commentAttachment.findMany({
      where: {
        ...(commentId && { commentId }),
        comment: {
          task: withTenant({})
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching comment attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}
