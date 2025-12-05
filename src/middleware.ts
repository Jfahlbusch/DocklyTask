import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function getTenantFromRequest(req: NextRequest): string {
	const source = (process.env.NEXT_PUBLIC_APP_TENANT_SOURCE || 'subdomain').toLowerCase();
	if (source === 'fixed') return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'local';
	if (source === 'query') return req.nextUrl.searchParams.get('tenant') || 'local';
	const host = req.headers.get('host') || '';
	const parts = host.split('.');
	if (parts.length > 2) return parts[0];
	return 'local';
}

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	
	// Statische Dateien und Assets ignorieren
	if (
		pathname.includes('.') || // Dateien mit Extension (favicon.ico, etc.)
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/_next') ||
		pathname.startsWith('/public') ||
		pathname.startsWith('/denied') ||
		pathname === '/'
	) {
		return NextResponse.next();
	}
	const tenant = getTenantFromRequest(req);
	// DEV: Erlaube 'local' und 'default' Tenants ohne Auth
	if ((tenant === 'local' || tenant === 'default') && process.env.NODE_ENV !== 'production') return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL('/api/auth/signin/keycloak', req.url);
    // Nur valide Seiten als Callback verwenden, nicht statische Dateien
    const callbackPath = req.nextUrl.pathname + req.nextUrl.search;
    const validCallback = !callbackPath.includes('.') && !callbackPath.startsWith('/api/');
    loginUrl.searchParams.set('callbackUrl', validCallback ? callbackPath : '/');
    return NextResponse.redirect(loginUrl);
  }

	const roles = ((token as any).realm_access?.roles || []) as string[];
	if (roles.includes('global_admin')) return NextResponse.next();

	const useArr = ((token as any).use_docklytask || []) as string[];
	const manageArr = ((token as any).manage_docklytask || []) as string[];
	if (useArr.includes(tenant) || manageArr.includes(tenant)) return NextResponse.next();

	return NextResponse.redirect(new URL('/denied', req.url));
}

export const config = {
	matcher: [
		'/((?!api/auth|_next|public|denied).*)',
	],
};


