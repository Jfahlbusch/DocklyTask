import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTenant } from '@/lib/tenant-db';

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id, memberId } = await context.params;
    
    // Verify team belongs to tenant
    const team = await db.team.findFirst({
      where: withTenant({ id })
    });
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Verify member exists and belongs to this team
    const existingMember = await db.teamMember.findFirst({
      where: {
        id: memberId,
        teamId: id
      }
    });
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    await db.teamMember.delete({
      where: { id: memberId }
    });

    return NextResponse.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
