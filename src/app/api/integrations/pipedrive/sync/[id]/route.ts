/**
 * Pipedrive Sync Details Endpoint
 * 
 * GET /api/integrations/pipedrive/sync/[id]
 * Returns details of a specific sync operation (which customers/contacts were synced)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/integrations/pipedrive/oauth-service';
import { db } from '@/lib/db';
import { getTenantFromHeadersAsync } from '@/lib/tenant-db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantFromHeadersAsync();
    const { id: syncLogId } = await context.params;

    // Get connection
    const connection = await getConnection(tenantId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Pipedrive is not connected' },
        { status: 404 }
      );
    }

    // Get the sync log
    const syncLog = await db.integrationSyncLog.findFirst({
      where: { 
        id: syncLogId,
        connectionId: connection.id 
      },
    });

    if (!syncLog) {
      return NextResponse.json(
        { error: 'Sync log not found' },
        { status: 404 }
      );
    }

    // Get customers that were synced during this period
    // We look for customers with pipedriveId that were updated within the sync time window
    const syncStartTime = syncLog.startedAt;
    const syncEndTime = syncLog.completedAt || new Date();

    // Get customers synced in this time window
    const syncedCustomers = await db.customer.findMany({
      where: {
        tenantId,
        pipedriveId: { not: null },
        pipedriveSyncedAt: {
          gte: syncStartTime,
          lte: syncEndTime,
        },
      },
      select: {
        id: true,
        name: true,
        pipedriveId: true,
        pipedriveSyncedAt: true,
        createdAt: true,
        updatedAt: true,
        mainContact: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get contacts synced in this time window
    const syncedContacts = await db.contact.findMany({
      where: {
        tenantId,
        pipedriveId: { not: null },
        pipedriveSyncedAt: {
          gte: syncStartTime,
          lte: syncEndTime,
        },
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        pipedriveId: true,
        pipedriveSyncedAt: true,
        createdAt: true,
        updatedAt: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Determine if customer/contact was created or updated during this sync
    // If createdAt is within the sync window, it was created; otherwise updated
    const customersWithAction = syncedCustomers.map(customer => ({
      ...customer,
      pipedriveId: customer.pipedriveId?.toString(),
      action: customer.createdAt >= syncStartTime && customer.createdAt <= syncEndTime 
        ? 'created' 
        : 'updated',
    }));

    const contactsWithAction = syncedContacts.map(contact => ({
      ...contact,
      pipedriveId: contact.pipedriveId?.toString(),
      action: contact.createdAt >= syncStartTime && contact.createdAt <= syncEndTime 
        ? 'created' 
        : 'updated',
    }));

    // Parse errors from sync log
    const errors = JSON.parse(syncLog.errors || '[]');

    return NextResponse.json({
      syncLog: {
        id: syncLog.id,
        syncType: syncLog.syncType,
        startedAt: syncLog.startedAt,
        completedAt: syncLog.completedAt,
        status: syncLog.status,
        organizationsFetched: syncLog.organizationsFetched,
        organizationsCreated: syncLog.organizationsCreated,
        organizationsUpdated: syncLog.organizationsUpdated,
        personsFetched: syncLog.personsFetched,
        personsCreated: syncLog.personsCreated,
        personsUpdated: syncLog.personsUpdated,
        errors,
      },
      customers: customersWithAction,
      contacts: contactsWithAction,
    });
  } catch (error) {
    console.error('Pipedrive sync details error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync details' },
      { status: 500 }
    );
  }
}

