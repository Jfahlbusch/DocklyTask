'use client';

import React from 'react';
import { useAuth } from './AuthProvider';
import { getTenant } from './tenant';

export default function Protected({ children }: { children: React.ReactNode }) {
	const { ready, authenticated, accessGranted, login } = useAuth();
	const tenant = getTenant();

	// DEV-Modus: Auth umgehen für 'local' und 'default' Tenants
	// ⚠️ TODO: Vor Livegang prüfen!
	const isDevBypass = process.env.NODE_ENV !== 'production' && (tenant === 'local' || tenant === 'default');

	if (!ready) return null;

	// Im DEV-Modus mit local/default Tenant: Auth überspringen
	if (isDevBypass) {
		return <>{children}</>;
	}

	if (!authenticated) {
		login();
		return null;
	}

	if (!accessGranted()) {
		if (typeof window !== 'undefined') {
			window.location.href = '/denied';
		}
		return null;
	}

	return children;
}


