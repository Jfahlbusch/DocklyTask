/**
 * Pipedrive OAuth Callback Endpoint
 * 
 * GET /api/integrations/pipedrive/callback
 * Handles the OAuth callback from Pipedrive and exchanges the code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/integrations/pipedrive/oauth-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Pipedrive
    if (error) {
      console.error('Pipedrive OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Exchange code for tokens and create/update connection
    await handleOAuthCallback(code, state);

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&pipedrive=connected`
    );
  } catch (error) {
    console.error('Pipedrive callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=integrations&error=${encodeURIComponent(errorMessage)}`
    );
  }
}

