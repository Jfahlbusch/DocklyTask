"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTaskContext } from './useTaskContext';
import { useAuth } from '@/auth/AuthProvider';

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export interface UserPermissions {
  canRead: (resource: string) => boolean;
  canWrite: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  isViewer: boolean;
}

export function useUserPermissions(): UserPermissions {
  const { users } = useTaskContext();
  const { claims } = useAuth();

  const [role, setRole] = useState<UserRole>(() => {
    // Fallback: falls kein Login, nutze bisherigen Mock-User
    const fallback = (users[0]?.role as UserRole) || 'USER';
    return fallback;
  });

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentUserRole() {
      try {
        // Wenn global_admin vorhanden, Admin erzwingen
        const kcRoles: string[] = (claims as any)?.realm_access?.roles || [];
        if (Array.isArray(kcRoles) && kcRoles.includes('global_admin')) {
          if (!cancelled) setRole('ADMIN');
          return;
        }
        // Optional: wenn wir die eigene User-ID in der Session hätten, könnten wir gezielt laden.
        // Bis dahin versuchen wir, über /api/users die eigene E-Mail zu matchen (falls vorhanden)
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const list: Array<{ email: string; role: UserRole }> = await res.json();
        // E-Mail aus Claims
        const email = (claims as any)?.email || (claims as any)?.preferred_username;
        const me = list.find(u => u.email && email && u.email.toLowerCase() === String(email).toLowerCase());
        if (me && !cancelled) setRole(me.role);
      } catch (_) { /* ignore */ }
    }
    loadCurrentUserRole();
    return () => { cancelled = true; };
  }, [claims, users]);

  const permissions = useMemo(() => {
    const rolePermissions: Record<UserRole, Record<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>> = {
      ADMIN: {
        tasks: { canRead: true, canWrite: true, canDelete: true },
        projects: { canRead: true, canWrite: true, canDelete: true },
        customers: { canRead: true, canWrite: true, canDelete: true },
        products: { canRead: true, canWrite: true, canDelete: true },
        categories: { canRead: true, canWrite: true, canDelete: true },
        templates: { canRead: true, canWrite: true, canDelete: true },
        teams: { canRead: true, canWrite: true, canDelete: true },
        users: { canRead: true, canWrite: true, canDelete: true },
        admin: { canRead: true, canWrite: true, canDelete: true },
        'internal-chat': { canRead: true, canWrite: true, canDelete: true },
      },
      MANAGER: {
        tasks: { canRead: true, canWrite: true, canDelete: true },
        projects: { canRead: true, canWrite: true, canDelete: true },
        customers: { canRead: true, canWrite: true, canDelete: false },
        products: { canRead: true, canWrite: false, canDelete: false },
        categories: { canRead: true, canWrite: true, canDelete: true },
        templates: { canRead: true, canWrite: true, canDelete: true },
        teams: { canRead: true, canWrite: true, canDelete: true },
        users: { canRead: true, canWrite: false, canDelete: false },
        admin: { canRead: false, canWrite: false, canDelete: false },
        'internal-chat': { canRead: true, canWrite: true, canDelete: true },
      },
      USER: {
        tasks: { canRead: true, canWrite: true, canDelete: false },
        projects: { canRead: true, canWrite: false, canDelete: false },
        customers: { canRead: true, canWrite: false, canDelete: false },
        products: { canRead: true, canWrite: false, canDelete: false },
        categories: { canRead: true, canWrite: false, canDelete: false },
        templates: { canRead: true, canWrite: false, canDelete: false },
        teams: { canRead: true, canWrite: false, canDelete: false },
        users: { canRead: false, canWrite: false, canDelete: false },
        admin: { canRead: false, canWrite: false, canDelete: false },
        'internal-chat': { canRead: false, canWrite: false, canDelete: false },
      },
      VIEWER: {
        tasks: { canRead: true, canWrite: false, canDelete: false },
        projects: { canRead: true, canWrite: false, canDelete: false },
        customers: { canRead: true, canWrite: false, canDelete: false },
        products: { canRead: true, canWrite: false, canDelete: false },
        categories: { canRead: true, canWrite: false, canDelete: false },
        templates: { canRead: true, canWrite: false, canDelete: false },
        teams: { canRead: true, canWrite: false, canDelete: false },
        users: { canRead: false, canWrite: false, canDelete: false },
        admin: { canRead: false, canWrite: false, canDelete: false },
        'internal-chat': { canRead: false, canWrite: false, canDelete: false },
      },
    };

    return {
      canRead: (resource: string) => rolePermissions[role]?.[resource]?.canRead || false,
      canWrite: (resource: string) => rolePermissions[role]?.[resource]?.canWrite || false,
      canDelete: (resource: string) => rolePermissions[role]?.[resource]?.canDelete || false,
      hasRole: (target: UserRole | UserRole[]) => Array.isArray(target) ? target.includes(role) : role === target,
      isAdmin: role === 'ADMIN',
      isManager: role === 'MANAGER',
      isUser: role === 'USER',
      isViewer: role === 'VIEWER',
    };
  }, [role]);

  return permissions;
}