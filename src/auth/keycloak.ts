'use client';

import Keycloak from 'keycloak-js';

let keycloakInstance: Keycloak | null = null;

export function getKeycloak(): Keycloak | null {
	if (typeof window === 'undefined') return null;
	if (keycloakInstance) return keycloakInstance;
	const url = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
	const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
	const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
	if (!url || !realm || !clientId) {
		console.error('Keycloak env not configured. Please set NEXT_PUBLIC_KEYCLOAK_URL, REALM, CLIENT_ID');
		return null;
	}
	keycloakInstance = new Keycloak({ url, realm, clientId });
	return keycloakInstance;
}



