/**
 * Pipedrive Configuration Endpoint
 * 
 * GET /api/integrations/pipedrive/config
 * Returns current configuration status
 * 
 * PUT /api/integrations/pipedrive/config
 * Updates Pipedrive credentials and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationConfig, saveIntegrationConfig } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';
import { z } from 'zod';

const configSchema = z.object({
  clientId: z.string().min(1, 'Client ID ist erforderlich'),
  clientSecret: z.string().min(1, 'Client Secret ist erforderlich'),
  redirectUri: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    console.log('Getting config for tenant:', tenantId);
    
    const config = await getIntegrationConfig(tenantId);
    console.log('Config result:', config);

    const defaultRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/pipedrive/callback`;

    return NextResponse.json({
      ...config,
      defaultRedirectUri,
    });
  } catch (error) {
    console.error('Pipedrive config GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to get configuration', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const body = await request.json();
    
    const validated = configSchema.parse(body);

    await saveIntegrationConfig(tenantId, {
      clientId: validated.clientId,
      clientSecret: validated.clientSecret,
      redirectUri: validated.redirectUri,
      isEnabled: validated.isEnabled,
    });

    return NextResponse.json({ success: true, message: 'Konfiguration gespeichert' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Konfiguration', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Pipedrive config PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

