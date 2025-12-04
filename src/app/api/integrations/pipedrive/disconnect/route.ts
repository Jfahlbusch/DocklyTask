/**
 * Pipedrive Disconnect Endpoint
 * 
 * DELETE /api/integrations/pipedrive/disconnect
 * Disconnects the Pipedrive integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { disconnect } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    await disconnect(tenantId);

    return NextResponse.json({ success: true, message: 'Pipedrive integration disconnected' });
  } catch (error) {
    console.error('Pipedrive disconnect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

