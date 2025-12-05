import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentTenant } from '@/lib/tenant-db';

export async function GET(request: NextRequest) {
  try {
    const tenantId = getCurrentTenant();
    
    // Try to get existing configuration
    let config = await db.appConfiguration.findFirst({
      where: { tenantId }
    });

    // If no config exists, create default one
    if (!config) {
      config = await db.appConfiguration.create({
        data: {
          tenantId,
          appName: 'DocklyTask',
          primaryColor: '#3b82f6',
          secondaryColor: '#64748b',
          mode: 'DEMO'
        }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching app configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = getCurrentTenant();
    const body = await request.json();
    const { appName, appLogo, appFavicon, primaryColor, secondaryColor, mode } = body;

    // Get or create configuration
    let config = await db.appConfiguration.findFirst({
      where: { tenantId }
    });

    if (config) {
      // Update existing config
      config = await db.appConfiguration.update({
        where: { id: config.id },
        data: {
          appName: appName ?? config.appName,
          appLogo: appLogo ?? config.appLogo,
          appFavicon: appFavicon ?? config.appFavicon,
          primaryColor: primaryColor ?? config.primaryColor,
          secondaryColor: secondaryColor ?? config.secondaryColor,
          mode: mode ?? config.mode
        }
      });
    } else {
      // Create new config
      config = await db.appConfiguration.create({
        data: {
          tenantId,
          appName: appName ?? 'DocklyTask',
          appLogo,
          appFavicon,
          primaryColor: primaryColor ?? '#3b82f6',
          secondaryColor: secondaryColor ?? '#64748b',
          mode: mode ?? 'DEMO'
        }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating app configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update app configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST is same as PUT for app configuration (upsert behavior)
  return PUT(request);
}

