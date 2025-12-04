export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import NextAuth, { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { db } from '@/lib/db';
import { appendFile } from 'fs/promises';
import { join } from 'path';

const DEV_LOG_FILE = join(process.cwd(), 'dev.log');

async function writeDevLog(event: string, data: Record<string, any>) {
	try {
		const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n';
		await appendFile(DEV_LOG_FILE, line);
	} catch {
		// ignore file logging errors in production path
	}
}

function parseOmniAuthOrigin(originValue: unknown): Record<string, any> {
	if (typeof originValue !== 'string' || originValue.length === 0) return {};
	const tryDecode = (v: string) => {
		try { return decodeURIComponent(v); } catch { return v; }
	};
	const value = tryDecode(originValue);
	// Try URL with query params
	try {
		const url = value.includes('://') ? new URL(value) : new URL(value, 'http://local');
		const params = Object.fromEntries(url.searchParams.entries());
		return { ...params, href: url.href };
	} catch {}
	// Try JSON
	try {
		const obj = JSON.parse(value);
		if (obj && typeof obj === 'object') return obj as any;
	} catch {}
	// Try querystring form: a=b&c=d
	if (value.includes('=')) {
		const out: Record<string, any> = {};
		for (const part of value.split('&')) {
			const [k, v] = part.split('=');
			if (k) out[k] = v ? tryDecode(v) : '';
		}
		return out;
	}
	return {};
}

function pickFirstString(obj: any, keys: string[]): string | undefined {
	for (const k of keys) {
		const v = obj?.[k];
		if (typeof v === 'string' && v.trim().length > 0) return v.trim();
	}
	return undefined;
}

function extractCustomerInfo(claims: any, rawInfo: any, omniParsed: any): { customerName?: string; customerId?: string } {
	const sources = [
		claims,
		claims?.extra,
		claims?.attributes,
		rawInfo,
		rawInfo?.extra,
		rawInfo?.attributes,
		omniParsed,
	];
	let customerId: string | undefined;
	let customerName: string | undefined;
	for (const src of sources) {
		if (!src || typeof src !== 'object') continue;
		// IDs
		customerId = customerId || pickFirstString(src, ['customerId', 'customer_id', 'customerUUID', 'customer_uuid', 'customer']);
		// Names
		customerName = customerName || pickFirstString(src, ['customerName', 'customer_name', 'customer', 'client', 'tenant', 'tenantName', 'tenant_name']);
		if (customerId && customerName) break;
	}
	return { customerId, customerName };
}

function extractCustomerFromGroups(groups: unknown): string | undefined {
	if (!Array.isArray(groups)) return undefined;
	const technicalGroupPatterns = [
		/^\/?(realm-management)(\/|$)/i,
		/^\/?(account)(\/|$)/i,
		/^\/?(roles?)(\/|$)/i,
		/^\/?(uma_authorization)(\/|$)/i,
		/^\/?(offline_access)(\/|$)/i,
		/^default-roles-/i,
	];
	const normalize = (g: string) => {
		const part = g.includes('/') ? g.split('/').filter(Boolean).pop() as string : g;
		let name = part;
		try { name = decodeURIComponent(part); } catch {}
		name = name.replace(/^(customer|tenant|client)[-_:\s]+/i, '');
		return name.trim();
	};
	for (const g of groups) {
		if (typeof g !== 'string' || g.trim().length === 0) continue;
		if (technicalGroupPatterns.some((re) => re.test(g))) continue;
		const candidate = normalize(g);
		if (candidate && candidate.length > 0) return candidate;
	}
	return undefined;
}

function deriveCustomerFromEmailOrUsername(email?: string, preferredUsername?: string): string | undefined {
  // 1) Aus E-Mail-Domain ableiten (zweiter Level: z.B. backofficedigital aus backofficedigital.de)
  const deriveFromDomain = (domain: string): string | undefined => {
    try {
      const parts = domain.toLowerCase().split('.').filter(Boolean);
      if (parts.length === 0) return undefined;
      // nimm das linkeste Label (Second-Level-Domain bei üblichen Domains)
      return parts[0];
    } catch {
      return undefined;
    }
  };

  if (email && email.includes('@')) {
    const domain = email.split('@')[1];
    const name = deriveFromDomain(domain);
    if (name) return name;
  }
  // 2) Aus preferred_username ableiten, Keycloak formatiert häufig user+tag_domain.tld → ersetze _ als Trenner
  if (preferredUsername && !preferredUsername.includes('@')) {
    const maybe = preferredUsername.split('_').pop();
    if (maybe && maybe.includes('.')) {
      const name = deriveFromDomain(maybe);
      if (name) return name;
    }
  }
  return undefined;
}

function getRealmFromIssuer(issuer?: string): string | undefined {
  if (!issuer) return undefined;
  try {
    const url = new URL(issuer);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'realms');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return undefined;
}

async function fetchAdminAccessToken(issuer?: string) {
  try {
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || process.env.KEYCLOAK_CLIENT_SECRET;
    if (!issuer || !clientId || !clientSecret) return null as any;
    const tokenUrl = `${issuer}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    await writeDevLog('keycloak_http', {
      method: 'POST',
      url: tokenUrl,
      body: { grant_type: 'client_credentials', client_id: clientId, client_secret: '***' },
    });
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    await writeDevLog('keycloak_http_resp', {
      url: tokenUrl,
      status: resp.status,
    });
    // Body für Log (maskiert) erfassen
    try {
      const clone = resp.clone();
      const text = await clone.text();
      let bodyForLog: any = text;
      try { bodyForLog = JSON.parse(text); } catch {}
      if (bodyForLog && typeof bodyForLog === 'object') {
        if ('access_token' in bodyForLog) bodyForLog.access_token = '***';
        if ('refresh_token' in bodyForLog) bodyForLog.refresh_token = '***';
        if ('id_token' in bodyForLog) bodyForLog.id_token = '***';
      }
      await writeDevLog('keycloak_http_resp_body', { url: tokenUrl, body: bodyForLog });
    } catch {}
    if (!resp.ok) return null as any;
    const json = await resp.json();
    return json?.access_token as string | null;
  } catch {
    return null as any;
  }
}

async function fetchUserGroupsFromAdmin(issuer?: string, userId?: string) {
  try {
    if (!issuer || !userId) return [] as any[];
    const realm = getRealmFromIssuer(issuer);
    if (!realm) return [] as any[];
    const adminToken = await fetchAdminAccessToken(issuer);
    if (!adminToken) return [] as any[];
    const explicitInfo = (process.env.KEYCLOAK_INFO || '').replace(/\/$/, '');
    let adminBase = '';
    if (explicitInfo) {
      if (explicitInfo.includes('/admin/realms/')) {
        adminBase = explicitInfo;
      } else if (explicitInfo.includes('/realms/')) {
        adminBase = explicitInfo.replace(/\/realms\/[^/]+$/, `/admin/realms/${realm}`);
      } else {
        adminBase = `${explicitInfo}/admin/realms/${realm}`;
      }
    } else {
      adminBase = issuer.replace(/\/realms\/[^/]+$/, `/admin/realms/${realm}`);
    }
    const url = `${adminBase}/users/${encodeURIComponent(userId)}/groups`;
    await writeDevLog('keycloak_admin_base', { used: adminBase, from: explicitInfo ? 'KEYCLOAK_INFO' : 'issuer' });
    await writeDevLog('keycloak_http', {
      method: 'GET',
      url,
      headers: { Authorization: 'Bearer ***' },
    });
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
    await writeDevLog('keycloak_http_resp', {
      url,
      status: resp.status,
    });
    try {
      const clone = resp.clone();
      const text = await clone.text();
      let bodyForLog: any = text;
      try { bodyForLog = JSON.parse(text); } catch {}
      await writeDevLog('keycloak_http_resp_body', { url, body: bodyForLog });
    } catch {}
    if (!resp.ok) return [] as any[];
    const groups = await resp.json();
    return Array.isArray(groups) ? groups : [];
  } catch {
    return [] as any[];
  }
}

export const authOptions: NextAuthOptions = {
	providers: [
		KeycloakProvider({
			clientId: process.env.KEYCLOAK_CLIENT_ID || '',
			clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
			issuer: process.env.KEYCLOAK_ISSUER,
			authorization: {
				params: { scope: 'openid profile email microprofile-jwt' },
			},
		}),
	],
	session: { strategy: 'jwt' },
	events: {
		async signIn({ user, account, profile, isNewUser }) {
			// Versuche, zusätzliche Rohdaten (raw_info) von Keycloak UserInfo zu lesen
			let rawInfo: any = null;
			try {
				if ((account as any)?.access_token && process.env.KEYCLOAK_ISSUER) {
					const res = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`, {
						headers: { Authorization: `Bearer ${(account as any).access_token}` },
					});
					if (res.ok) {
						rawInfo = await res.json();
					}
				}
			} catch {}
			// omniauth.origin aus Profile-/Claim-Daten extrahieren, falls vorhanden
			const omni = (profile as any)?.omniauth?.origin || (profile as any)?.['omniauth.origin'];
			const omniParsed = parseOmniAuthOrigin(omni);
			await writeDevLog('keycloak_signIn_account', {
				account,
			});
			await writeDevLog('keycloak_signIn_profile', {
				profile,
			});
			await writeDevLog('keycloak_signIn', {
				email: (user as any)?.email || (profile as any)?.email,
				name: (user as any)?.name || (profile as any)?.name,
				provider: account?.provider,
				isNewUser: Boolean(isNewUser),
				hasRawInfo: Boolean(rawInfo),
				customerFromExtra: (rawInfo as any)?.extra?.customer || (rawInfo as any)?.attributes?.customer || null,
				tenantsFromExtra: (rawInfo as any)?.extra?.use_docklytask || (rawInfo as any)?.attributes?.use_docklytask || null,
				extra: (rawInfo as any)?.extra || null,
				attributes: (rawInfo as any)?.attributes || null,
				omniauthOrigin: omni || null,
				omniauthOriginRaw: omni || null,
				omniauthParsed: omniParsed,
				rawInfo: rawInfo || null,
			});
		},
	},
	callbacks: {
    async jwt({ token, account, profile, user }) {
      const decodeJwt = (t?: string) => {
        if (!t) return null as any;
        try {
          const [, payload] = t.split('.');
          const json = Buffer.from(payload, 'base64').toString('utf8');
          return JSON.parse(json);
        } catch {
          return null as any;
        }
      };
			// Access Token/ID Token übernehmen
			if (account) {
				token.accessToken = account.access_token;
				token.idToken = account.id_token;
				const omniFromClaims = (profile as any)?.omniauth?.origin || (profile as any)?.['omniauth.origin'];
				const omniParsedClaims = parseOmniAuthOrigin(omniFromClaims);
				await writeDevLog('keycloak_jwt_account', {
					account,
				});
				await writeDevLog('keycloak_jwt_profile', {
					profile,
				});
				await writeDevLog('keycloak_jwt', {
					provider: account.provider,
					providerAccountId: (account as any)?.providerAccountId,
					hasIdToken: Boolean((account as any)?.id_token),
					hasAccessToken: Boolean((account as any)?.access_token),
					email: (profile as any)?.email || (user as any)?.email || null,
					extra: ((token as any)?.raw_info as any)?.extra || null,
					attributes: ((token as any)?.raw_info as any)?.attributes || null,
					omniauthOrigin: omniFromClaims || null,
					omniauthParsed: omniParsedClaims,
					rawInfo: ((token as any)?.raw_info as any) || null,
					accessTokenStart: String((account as any)?.access_token || '').slice(0, 12),
				});
				// UserInfo (raw_info) von Keycloak laden, um extra/attributes zu erhalten
				try {
					if ((account as any)?.access_token && process.env.KEYCLOAK_ISSUER) {
						const userInfoUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`;
						await writeDevLog('keycloak_http', {
							method: 'GET',
							url: userInfoUrl,
							headers: { Authorization: 'Bearer ***' },
						});
            const res = await fetch(userInfoUrl, {
							headers: { Authorization: `Bearer ${(account as any).access_token}` },
						});
						await writeDevLog('keycloak_http_resp', {
							url: userInfoUrl,
							status: res.status,
						});
            try {
              const clone = res.clone();
              const text = await clone.text();
              let bodyForLog: any = text;
              try { bodyForLog = JSON.parse(text); } catch {}
              await writeDevLog('keycloak_http_resp_body', { url: userInfoUrl, body: bodyForLog });
            } catch {}
						if (res.ok) {
							const ui = await res.json();
							(token as any).raw_info = ui;
							// Falls Keycloak zusätzliche Felder unter extra liefert, übernehmen
							if (ui && typeof ui === 'object' && 'extra' in ui) {
								(token as any).extra = (ui as any).extra;
							}
							// Gruppen aus UserInfo übernehmen, wenn vorhanden
							if (Array.isArray((ui as any)?.groups)) {
								(token as any).groups = (ui as any).groups;
							}
				await writeDevLog('keycloak_userinfo', {
							hasRawInfo: true,
							keys: Object.keys(ui || {}),
							extra: (ui as any)?.extra || null,
							attributes: (ui as any)?.attributes || null,
						rawInfo: ui || null,
							rawInfo_full: ui || null,
						});
						}
					}
				} catch {}
			}
      // Claims bevorzugt aus ID/Access Token lesen, UserInfo (raw_info) und Profile als Fallback
			const idClaims = decodeJwt((account as any)?.id_token || (token as any)?.idToken);
			const atClaims = decodeJwt((account as any)?.access_token || (token as any)?.accessToken);
			const profClaims: Record<string, any> = (profile as any) || {};
			const rawInfoClaims: Record<string, any> = ((token as any)?.raw_info as any) || {};
      // MicroProfile-JWT Gruppen aus ID- und Access-Token separat loggen
      await writeDevLog('keycloak_microprofile_groups', {
        fromIdToken: Array.isArray((idClaims as any)?.groups) ? (idClaims as any).groups : null,
        fromAccessToken: Array.isArray((atClaims as any)?.groups) ? (atClaims as any).groups : null,
      });
			// Zusätzliche Gruppenkandidaten direkt aus dem Access Token ableiten (realm_access/resource_access)
			const accessRealmRoles: string[] = Array.isArray((atClaims as any)?.realm_access?.roles) ? (atClaims as any).realm_access.roles : [];
			const accessResourceRoles: string[] = (() => {
				const ra = (atClaims as any)?.resource_access || {};
				try {
					return Object.values(ra).flatMap((r: any) => Array.isArray(r?.roles) ? r.roles : []);
				} catch { return []; }
			})();
			const groupsFromAccessToken: string[] = Array.from(new Set([
				...((Array.isArray((atClaims as any)?.groups) ? (atClaims as any).groups : []) as string[]),
				...(accessRealmRoles as string[]),
				...(accessResourceRoles as string[]),
			]));
			await writeDevLog('keycloak_groups_from_accessToken', {
				groupsClaim: Array.isArray((atClaims as any)?.groups) ? (atClaims as any).groups : null,
				realmRoles: accessRealmRoles,
				resourceRoles: accessResourceRoles,
				combined: groupsFromAccessToken,
			});
			const claims: Record<string, any> = {
				...(idClaims || {}),
				...(atClaims || {}),
				...(rawInfoClaims || {}),
				...(profClaims || {}),
			};
      // Vollständige, dekodierte Claims mitschreiben
      await writeDevLog('keycloak_claims', {
        idClaims: idClaims || null,
        atClaims: atClaims || null,
        profClaims: profClaims || null,
        rawInfoClaims: rawInfoClaims || null,
      });
      token.realm_access = (claims as any).realm_access;
      token.resource_access = (claims as any).resource_access;
			// Keycloak Gruppen: MicroProfile-JWT groups können im ID-Token, Access-Token (inkl. realm/resource roles) oder zusammengeführten Claims stehen
			const groupsFromClaims: string[] = Array.from(new Set([
				...(Array.isArray((claims as any).groups) ? (claims as any).groups : []),
				...(Array.isArray((idClaims as any)?.groups) ? (idClaims as any).groups : []),
				...groupsFromAccessToken,
			]));
      const groupsFromRaw: string[] = Array.isArray(((token as any)?.raw_info as any)?.groups) ? (((token as any)?.raw_info as any).groups as string[]) : [];
      const groups: string[] = Array.from(new Set([...(groupsFromClaims || []), ...(groupsFromRaw || [])]));
      (token as any).groups = groups;
      await writeDevLog('keycloak_groups_detected', {
        fromClaims: groupsFromClaims,
        fromUserInfo: groupsFromRaw,
        final: groups,
      });
      token.use_docklytask = (claims as any).use_docklytask;
      token.manage_docklytask = (claims as any).manage_docklytask;
      token.extra = (claims as any).extra;
      token.attributes = (claims as any).attributes;

      const parseList = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String).filter(Boolean);
        if (typeof val === 'string') return val.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        return [];
      };

      const collectTenants = (): string[] => {
        const tenants: string[] = [];
        tenants.push(...parseList((claims as any)?.use_docklytask));
        tenants.push(...parseList((claims as any)?.manage_docklytask));
        tenants.push(...parseList((claims as any)?.extra?.use_docklytask));
        tenants.push(...parseList((claims as any)?.extra?.manage_docklytask));
        tenants.push(...parseList((claims as any)?.attributes?.use_docklytask));
        tenants.push(...parseList((claims as any)?.attributes?.manage_docklytask));
        // Rollen mit Präfixen wie use_docklytask:tenant aus resource_access extrahieren
        const resAccess = (claims as any)?.resource_access || {};
        const resourceRoles: string[] = Object.values(resAccess).flatMap((r: any) => r?.roles || []);
        for (const role of resourceRoles) {
          const m = String(role).match(/^(use_docklytask|manage_docklytask)[:|=](.+)$/);
          if (m) tenants.push(m[2]);
        }
        // Aus Gruppen-Namen Mandanten/Kunden extrahieren, z. B. "/customers/ACME" oder "/tenants/ACME"
        for (const g of groups) {
          const gm = String(g).match(/^\/(customers|customer|tenants|tenant)\/(.+)$/i);
          if (gm) tenants.push(gm[2]);
        }
        return Array.from(new Set(tenants.filter(Boolean)));
      };

      const tenants = collectTenants();
      (token as any).tenants = tenants;

      // Benutzer in unserer DB anlegen/aktualisieren (bei erstem Login oder wenn Profildaten vorhanden)
      try {
        const email = (claims as any)?.email || (profile as any)?.email || (user as any)?.email || (token as any)?.email;
        if (email) {
          const name = (claims as any)?.name || (profile as any)?.name || (user as any)?.name || (claims as any)?.preferred_username || null;
          const avatar = (claims as any)?.picture || (profile as any)?.picture || null;
          const realmRoles: string[] = (((claims as any)?.realm_access?.roles) || []) as string[];
          const resRoles: string[] = Object.values(((claims as any)?.resource_access) || {}).flatMap((r: any) => r?.roles || []);
          const allRoles: string[] = [...realmRoles, ...resRoles];
          const isGlobalAdmin = Array.isArray(allRoles) && allRoles.includes('global_admin');

          // Kundenname aus raw_info.extra / raw_info.attributes, omniauth.origin oder, falls eindeutig, aus Tenants ableiten
          // Kundendaten robust extrahieren
          const omni = (claims as any)?.omniauth?.origin || (claims as any)?.['omniauth.origin'] || (profile as any)?.['omniauth.origin'];
          const omniParsed = parseOmniAuthOrigin(omni);
          const { customerId: claimCustomerId, customerName: claimCustomerName } = extractCustomerInfo(
            claims,
            (token as any)?.raw_info,
            omniParsed,
          );
          // Kundenname ggf. aus Gruppen ableiten (z. B. "/customers/ACME"). Falls leer, Admin-API abfragen
          let groupCustomerName: string | undefined = extractCustomerFromGroups((token as any).groups);
          if (!groupCustomerName) {
            const adminGroups = await fetchUserGroupsFromAdmin(process.env.KEYCLOAK_ISSUER, (claims as any)?.sub || (token as any)?.userId);
            await writeDevLog('keycloak_admin_groups', { count: adminGroups.length, adminGroups });
            const adminGroupNames = adminGroups.map((g: any) => g?.path || g?.name).filter(Boolean);
            const adminDerived = extractCustomerFromGroups(adminGroupNames);
            if (adminDerived) {
              groupCustomerName = adminDerived;
              (token as any).groups = Array.from(new Set([...(token as any).groups || [], ...adminGroupNames]));
            }
          }
          // Finale Auswahl: Claims -> Gruppen -> aus JWT (Domain/Username) -> eindeutiger Tenant
          const fallbackFromJwt = deriveCustomerFromEmailOrUsername((claims as any)?.email, (claims as any)?.preferred_username);
          const preferredCustomerName = (typeof claimCustomerName === 'string' && claimCustomerName.trim().length > 0)
            ? claimCustomerName.trim()
            : (groupCustomerName && groupCustomerName.trim().length > 0 ? groupCustomerName.trim()
              : (fallbackFromJwt && fallbackFromJwt.trim().length > 0 ? fallbackFromJwt.trim() : (tenants.length === 1 ? tenants[0] : null)));
          // Für Debug ins Dev-Log schreiben
          await writeDevLog('keycloak_customer_pick', {
            claimCustomerId: claimCustomerId || null,
            claimCustomerName: claimCustomerName || null,
            groupCustomerName: groupCustomerName || null,
            fallbackFromJwt: fallbackFromJwt || null,
            chosenCustomerName: preferredCustomerName || null,
            tenants,
            groups,
          });

          let customerId: string | undefined = undefined;
          // Falls eine eindeutige Customer-ID aus Claims vorhanden ist, direkt nutzen
          if (!customerId && claimCustomerId) {
            const existingById = await db.customer.findUnique({ where: { id: claimCustomerId } });
            if (existingById) customerId = existingById.id;
          }
          // Tenant für den Benutzer bestimmen (erster verfügbarer oder 'default')
          const derivedTenantId = tenants.length > 0 ? tenants[0] : 'default';
          
          if (!customerId && preferredCustomerName) {
            try {
              const existingCustomer = await db.customer.findFirst({ 
                where: { 
                  name: { equals: preferredCustomerName, mode: 'insensitive' },
                  tenantId: derivedTenantId
                } as any 
              });
              if (existingCustomer) {
                customerId = existingCustomer.id;
              } else {
                const createdCustomer = await db.customer.create({ 
                  data: { name: preferredCustomerName, tenantId: derivedTenantId } 
                });
                customerId = createdCustomer.id;
              }
            } catch (e) {
              console.error('Upserting customer from claims failed', e);
            }
          }

          const updateData: any = {
            name: name ?? undefined,
            avatar: avatar ?? undefined,
          };
          if (isGlobalAdmin) {
            updateData.role = 'ADMIN';
          }
          if (customerId) {
            updateData.customerId = customerId;
          }

          // findFirst + update/create statt upsert wegen Compound-Unique-Key
          let existingUser = await db.user.findFirst({
            where: { email, tenantId: derivedTenantId }
          });
          
          let upserted;
          if (existingUser) {
            upserted = await db.user.update({
              where: { id: existingUser.id },
              data: updateData,
            });
          } else {
            upserted = await db.user.create({
              data: {
                email,
                name,
                avatar,
                tenantId: derivedTenantId,
                ...(isGlobalAdmin ? { role: 'ADMIN' } : {}),
                ...(customerId ? { customerId } : {}),
              },
            });
          }
          (token as any).userId = upserted.id;
          (token as any).customerName = preferredCustomerName || null;
        }
			} catch (e) {
				await writeDevLog('keycloak_jwt_error', {
					message: 'upsert user failed',
					error: e instanceof Error ? e.message : String(e),
				});
      }
			return token;
		},
		async session({ session, token }) {
			(session as any).accessToken = token.accessToken;
			(session as any).claims = {
        realm_access: (token as any).realm_access,
        resource_access: (token as any).resource_access,
				use_docklytask: (token as any).use_docklytask,
				manage_docklytask: (token as any).manage_docklytask,
        extra: (token as any).extra,
        attributes: (token as any).attributes,
        tenants: (token as any).tenants,
				groups: (token as any).groups,
			};
      if (session.user) {
        (session.user as any).id = (token as any).userId;
        (session.user as any).customerName = (token as any).customerName || null;
      }
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
	// Hilfreich für Diagnose
  debug: process.env.NODE_ENV !== 'production',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


