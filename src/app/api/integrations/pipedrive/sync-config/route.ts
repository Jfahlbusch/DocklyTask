/**
 * Pipedrive Sync Configuration Endpoint
 * 
 * GET /api/integrations/pipedrive/sync-config
 * Returns current sync configuration
 * 
 * PUT /api/integrations/pipedrive/sync-config
 * Updates sync configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, updateSyncConfig } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

const syncConfigSchema = z.object({
  syncCustomFields: z.boolean().optional(),
  customFieldMapping: z.record(z.string(), z.string()).optional(),
  syncPersons: z.boolean().optional(),
  incrementalSync: z.boolean().optional(),
  autoSyncEnabled: z.boolean().optional(),
  autoSyncTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const connection = await getConnection(tenantId);

    if (!connection) {
      return NextResponse.json(
        { error: 'Pipedrive is not connected' },
        { status: 404 }
      );
    }

    return NextResponse.json(connection.syncConfig);
  } catch (error) {
    console.error('Pipedrive sync config GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    
    const validated = syncConfigSchema.parse(body);

    await updateSyncConfig(tenantId, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid sync configuration format', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Pipedrive sync config PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

