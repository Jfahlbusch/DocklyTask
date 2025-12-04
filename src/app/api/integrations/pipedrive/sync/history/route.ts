/**
 * Pipedrive Sync History Endpoint
 * 
 * GET /api/integrations/pipedrive/sync/history
 * Returns the sync history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/integrations/pipedrive/oauth-service';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get connection
    const connection = await getConnection(tenantId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Pipedrive is not connected' },
        { status: 404 }
      );
    }

    // Fetch sync logs
    const [logs, total] = await Promise.all([
      db.integrationSyncLog.findMany({
        where: { connectionId: connection.id },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.integrationSyncLog.count({
        where: { connectionId: connection.id },
      }),
    ]);

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      id: log.id,
      connectionId: log.connectionId,
      syncType: log.syncType,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      status: log.status,
      organizationsFetched: log.organizationsFetched,
      organizationsCreated: log.organizationsCreated,
      organizationsUpdated: log.organizationsUpdated,
      personsFetched: log.personsFetched,
      personsCreated: log.personsCreated,
      personsUpdated: log.personsUpdated,
      errors: JSON.parse(log.errors || '[]'),
    }));

    return NextResponse.json({
      logs: parsedLogs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Pipedrive sync history error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync history' },
      { status: 500 }
    );
  }
}

