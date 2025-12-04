/**
 * Pipedrive OAuth Authorization Endpoint
 * 
 * GET /api/integrations/pipedrive/auth
 * Initiates the OAuth flow by redirecting to Pipedrive's authorization page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/integrations/pipedrive/oauth-service';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    // Get current tenant
    const tenantId = await getTenantFromHeadersAsync();

    // Generate authorization URL (will throw if not configured)
    const authUrl = await getAuthorizationUrl(tenantId);

    // Redirect to Pipedrive OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Pipedrive auth error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'NOT_CONFIGURED') {
      // Redirect to admin page with error
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&error=${encodeURIComponent('Pipedrive ist nicht konfiguriert. Bitte konfigurieren Sie zuerst die Client ID und das Client Secret.')}`
      );
    }
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&error=${encodeURIComponent('Fehler beim Starten der Pipedrive-Autorisierung')}`
    );
  }
}

