/**
 * Pipedrive Sync Endpoint
 * 
 * POST /api/integrations/pipedrive/sync
 * Triggers a manual sync operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, ensureValidToken } from '@/integrations/pipedrive/oauth-service';
import { PipedriveSyncService } from '@/integrations/pipedrive/sync-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';
import { SyncType } from '@/integrations/types';

const syncRequestSchema = z.object({
  syncType: z.enum(['full', 'incremental', 'manual']).default('incremental'),
});

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    
    const validated = syncRequestSchema.parse(body);
    const syncType = validated.syncType as SyncType;

    // Get and validate connection
    let connection = await getConnection(tenantId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Pipedrive is not connected' },
        { status: 404 }
      );
    }

    if (!connection.isActive) {
      return NextResponse.json(
        { error: 'Pipedrive integration is not active' },
        { status: 400 }
      );
    }

    // Ensure token is valid
    connection = await ensureValidToken(connection);

    // Create sync service and run sync
    const syncService = new PipedriveSyncService(connection);
    
    // Update token in sync service if it was refreshed
    if (connection.accessToken !== (await getConnection(tenantId))?.accessToken) {
      syncService.updateAccessToken(connection.accessToken);
    }

    const result = await syncService.runSync(syncType);

    return NextResponse.json({
      success: result.success,
      syncType: result.syncType,
      statistics: {
        organizations: {
          fetched: result.organizationsFetched,
          created: result.organizationsCreated,
          updated: result.organizationsUpdated,
        },
        persons: {
          fetched: result.personsFetched,
          created: result.personsCreated,
          updated: result.personsUpdated,
        },
      },
      errors: result.errors.length,
      duration: result.completedAt.getTime() - result.startedAt.getTime(),
    });
  } catch (error) {
    console.error('Pipedrive sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

