'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getTenant } from './tenant';
import { setupAuthFetch } from './setupFetchAuth';

interface AuthContextValue {
	ready: boolean;
	authenticated: boolean;
	token: string | null;
	profile: any;
	claims: Record<string, any> | null;
	tenant: string;
	hasRole: (role: string) => boolean;
	accessGranted: () => boolean;
	login: (opts?: any) => void;
	logout: () => void;
	getToken: () => string | undefined;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const tenant = getTenant();

	// inject bearer for fetch
	setupAuthFetch(() => (session as any)?.accessToken);

	const claims = (session as any)?.claims || null;

	const hasRole = (role: string) => {
		const roles: string[] = (claims as any)?.realm_access?.roles || [];
		return roles.includes(role);
	};

	const accessGranted = () => {
		if (tenant === 'local' && process.env.NODE_ENV !== 'production') return true;
		if (hasRole('global_admin')) return true;
		const usePlanner: string[] = (claims as any)?.use_docklytask || [];
		const managePlanner: string[] = (claims as any)?.manage_docklytask || [];
		return (Array.isArray(usePlanner) && usePlanner.includes(tenant)) || (Array.isArray(managePlanner) && managePlanner.includes(tenant));
	};

	const value = useMemo<AuthContextValue>(() => ({
		ready: status !== 'loading',
		authenticated: status === 'authenticated',
		token: (session as any)?.accessToken || null,
		profile: session?.user || null,
		claims,
		tenant,
		hasRole,
		accessGranted,
		login: () => signIn('keycloak'),
		logout: () => signOut({ callbackUrl: '/' }),
		getToken: () => (session as any)?.accessToken,
	}), [status, session, claims, tenant]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
	return ctx;
}


