/**
 * Pipedrive Connection Status Endpoint
 * 
 * GET /api/integrations/pipedrive/status
 * Returns the current connection status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnectionStatus } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const status = await getConnectionStatus(tenantId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Pipedrive status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Pipedrive connection status' },
      { status: 500 }
    );
  }
}

