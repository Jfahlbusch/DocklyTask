/**
 * Pipedrive Fields Endpoint
 * 
 * GET /api/integrations/pipedrive/fields
 * Returns available Pipedrive organization fields for mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, ensureValidToken } from '@/integrations/pipedrive/oauth-service';
import { PipedriveClient } from '@/integrations/pipedrive/client';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    
    // Get and validate connection
    let connection = await getConnection(tenantId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Pipedrive is not connected' },
        { status: 404 }
      );
    }

    // Ensure token is valid
    connection = await ensureValidToken(connection);

    // Create client and fetch fields
    const client = new PipedriveClient({
      accessToken: connection.accessToken,
      apiDomain: connection.apiDomain!,
    });

    const [orgFieldsResponse, personFieldsResponse] = await Promise.all([
      client.getOrganizationFields(),
      client.getPersonFields(),
    ]);

    return NextResponse.json({
      organizationFields: orgFieldsResponse.data,
      personFields: personFieldsResponse.data,
    });
  } catch (error) {
    console.error('Pipedrive fields error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

