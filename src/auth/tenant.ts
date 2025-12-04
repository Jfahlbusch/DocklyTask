'use client';

export type TenantSource = 'subdomain' | 'query' | 'fixed';

export function getTenant(): string {
	const source = (process.env.NEXT_PUBLIC_APP_TENANT_SOURCE || 'subdomain').toLowerCase() as TenantSource;
	if (source === 'fixed') {
		return process.env.NEXT_PUBLIC_APP_FIXED_TENANT || 'local';
	}
	if (source === 'query' && typeof window !== 'undefined') {
		const p = new URLSearchParams(window.location.search);
		return p.get('tenant') || 'local';
	}
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		const parts = host.split('.');
		if (parts.length > 2) return parts[0];
	}
	return 'local';
}


