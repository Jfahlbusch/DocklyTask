/**
 * Tenant-Helper-Funktionen für Multi-Tenant-Datenbankzugriff
 * 
 * Diese Datei stellt Hilfsfunktionen bereit, um den aktuellen Tenant
 * aus dem Request-Context zu extrahieren und in Prisma-Queries einzubinden.
 */

import { headers } from 'next/headers';

export type TenantSource = 'subdomain' | 'query' | 'fixed';

// Cache für den aktuellen Tenant (wird pro Request gesetzt)
let cachedTenant: string | null = null;

/**
 * Extrahiert den Tenant aus den Request-Headern (Server-Side)
 * 
 * Unterstützte Quellen (via NEXT_PUBLIC_APP_TENANT_SOURCE):
 * - 'subdomain': Erster Teil des Hostnamens (kunde.app.de → 'kunde')
 * - 'query': URL-Parameter ?tenant=xxx (wird via x-tenant Header übergeben)
 * - 'fixed': Fester Wert aus NEXT_PUBLIC_APP_FIXED_TENANT
 * 
 * @returns Der aktuelle Tenant-Identifier oder 'default'
 */
export function getTenantFromHeaders(): string {
  const source = (process.env.NEXT_PUBLIC_APP_TENANT_SOURCE || 'subdomain').toLowerCase() as TenantSource;
  
  // Fixed tenant (für Development)
  if (source === 'fixed') {
    return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'default';
  }
  
  // Für localhost im Development-Modus
  if (process.env.NODE_ENV === 'development') {
    const fixedTenant = process.env.NEXT_PUBLIC_APP_FIXED_TENANT;
    if (fixedTenant) return fixedTenant;
  }
  
  return 'default';
}

/**
 * Async-Version für Server Actions und Route Handlers in Next.js 15+
 */
export async function getTenantFromHeadersAsync(): Promise<string> {
  const source = (process.env.NEXT_PUBLIC_APP_TENANT_SOURCE || 'subdomain').toLowerCase() as TenantSource;
  
  // Fixed tenant (für Development)
  if (source === 'fixed') {
    return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'default';
  }
  
  try {
    const headersList = await headers();
    
    // Prüfe auf expliziten x-tenant Header (z.B. von Middleware gesetzt)
    const explicitTenant = headersList.get('x-tenant');
    if (explicitTenant) {
      return explicitTenant;
    }
    
    // Query-Parameter-Modus
    if (source === 'query') {
      const referer = headersList.get('referer') || '';
      try {
        const url = new URL(referer, 'http://localhost');
        const tenant = url.searchParams.get('tenant');
        if (tenant) return tenant;
      } catch {}
    }
    
    // Subdomain-Modus (Default)
    const host = headersList.get('host') || '';
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    
    // Fallback für localhost ohne Subdomain
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'default';
    }
    
  } catch {
    // headers() kann außerhalb von Request-Context fehlschlagen
    console.warn('getTenantFromHeadersAsync: Could not access headers, using default tenant');
  }
  
  return 'default';
}

/**
 * Wrapper für Prisma `where`-Klauseln mit automatischem Tenant-Filter
 * Nutzt synchronen Fallback für Development
 * 
 * @example
 * // Statt: prisma.project.findMany({ where: { status: 'ACTIVE' } })
 * // Nutze: prisma.project.findMany({ where: withTenant({ status: 'ACTIVE' }) })
 * 
 * @param where - Bestehende where-Bedingungen
 * @returns where-Objekt mit hinzugefügtem tenantId-Filter
 */
export function withTenant<T extends object>(where: T = {} as T): T & { tenantId: string } {
  return { ...where, tenantId: getTenantFromHeaders() };
}

/**
 * Wrapper für Prisma `data`-Objekte bei Create/Update mit automatischem Tenant
 * 
 * @example
 * // Statt: prisma.project.create({ data: { name: 'Test', ... } })
 * // Nutze: prisma.project.create({ data: withTenantData({ name: 'Test', ... }) })
 * 
 * @param data - Bestehende Daten für Create/Update
 * @returns data-Objekt mit hinzugefügtem tenantId
 */
export function withTenantData<T extends object>(data: T): T & { tenantId: string } {
  return { ...data, tenantId: getTenantFromHeaders() };
}

/**
 * Holt den aktuellen Tenant-Identifier
 * Alias für getTenantFromHeaders() für kürzere Syntax
 */
export function getCurrentTenant(): string {
  return getTenantFromHeaders();
}

/**
 * Prüft ob der übergebene Tenant mit dem aktuellen Request-Tenant übereinstimmt
 * Nützlich für Validierung bei Updates/Deletes
 * 
 * @param tenantId - Der zu prüfende Tenant
 * @returns true wenn der Tenant übereinstimmt
 */
export function validateTenant(tenantId: string | null | undefined): boolean {
  if (!tenantId) return false;
  return tenantId === getTenantFromHeaders();
}

/**
 * Erstellt ein Tenant-gefiltertes Prisma-Query-Objekt
 * Nützlich für komplexere Abfragen
 * 
 * @example
 * const query = tenantQuery({
 *   where: { status: 'ACTIVE' },
 *   include: { tasks: true },
 *   orderBy: { createdAt: 'desc' }
 * });
 * const projects = await prisma.project.findMany(query);
 */
export function tenantQuery<T extends { where?: object }>(query: T): T {
  return {
    ...query,
    where: withTenant(query.where || {})
  };
}

/**
 * Default-Tenant für Migration bestehender Daten
 */
export const DEFAULT_TENANT = 'default';
