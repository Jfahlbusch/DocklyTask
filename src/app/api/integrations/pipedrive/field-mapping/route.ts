/**
 * Pipedrive Field Mapping Endpoint
 * 
 * GET /api/integrations/pipedrive/field-mapping
 * Returns current field mapping for organizations and persons
 * 
 * PUT /api/integrations/pipedrive/field-mapping
 * Updates field mapping configuration for organizations and/or persons
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, updateFieldMapping, updatePersonFieldMapping } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

const fieldMappingSchema = z.object({
  // Organization field mapping (legacy support)
  mapping: z.record(z.string(), z.string()).optional(),
  // Explicit organization field mapping
  organizationMapping: z.record(z.string(), z.string()).optional(),
  // Person/Contact field mapping
  personMapping: z.record(z.string(), z.string()).optional(),
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

    return NextResponse.json({
      // Legacy support
      mapping: connection.fieldMapping,
      // Explicit mappings
      organizationMapping: connection.fieldMapping,
      personMapping: connection.syncConfig.personFieldMapping || {},
      syncConfig: connection.syncConfig,
    });
  } catch (error) {
    console.error('Pipedrive field mapping GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get field mapping' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    
    const validated = fieldMappingSchema.parse(body);

    // Update organization field mapping
    if (validated.mapping || validated.organizationMapping) {
      await updateFieldMapping(tenantId, validated.organizationMapping || validated.mapping || {});
    }

    // Update person field mapping
    if (validated.personMapping !== undefined) {
      await updatePersonFieldMapping(tenantId, validated.personMapping);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid field mapping format', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Pipedrive field mapping PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

