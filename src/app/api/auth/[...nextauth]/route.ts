export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import NextAuth, { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID || '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
      issuer: process.env.KEYCLOAK_ISSUER,
      authorization: {
        params: { scope: 'openid profile email' },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Verhindere Redirect auf statische Dateien wie favicon.ico
      const invalidPaths = ['/favicon.ico', '/_next', '/api/auth'];
      const urlPath = url.replace(baseUrl, '');
      
      if (invalidPaths.some(path => urlPath.startsWith(path))) {
        return baseUrl;
      }
      
      // Erlaube relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Erlaube URLs zur gleichen Domain
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      return baseUrl;
    },
    async jwt({ token, account, profile, user }) {
      // Bei erstem Login: Token-Daten speichern
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        
        // Rollen aus dem Access Token extrahieren
        try {
          if (account.access_token) {
            const [, payload] = account.access_token.split('.');
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
            token.realm_access = decoded.realm_access;
            token.resource_access = decoded.resource_access;
            token.groups = decoded.groups || [];
          }
        } catch (e) {
          console.error('Error decoding access token:', e);
        }
      }

      // Benutzer in DB anlegen/aktualisieren
      if (account && (profile as any)?.email) {
        try {
          const email = (profile as any).email;
          const name = (profile as any).name || (profile as any).preferred_username || null;
          const tenantId = 'default';
          
          // Prüfen ob Benutzer existiert
          let existingUser = await db.user.findFirst({
            where: { email, tenantId }
          });
          
          if (existingUser) {
            // Update
            existingUser = await db.user.update({
              where: { id: existingUser.id },
              data: { name: name ?? undefined },
            });
          } else {
            // Create
            existingUser = await db.user.create({
              data: { email, name, tenantId },
            });
          }
          
          token.userId = existingUser.id;
        } catch (e) {
          console.error('Error upserting user:', e);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).claims = {
        realm_access: token.realm_access,
        resource_access: token.resource_access,
        groups: token.groups,
      };
      if (session.user) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
