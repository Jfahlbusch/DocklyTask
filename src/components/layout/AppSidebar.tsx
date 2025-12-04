'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  Package, 
  Tags, 
  FileText, 
  Settings, 
  User,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useTaskContext } from '@/hooks/useTaskContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Aufgabenübersicht'
  },
  {
    title: 'Kunden',
    href: '/customers',
    icon: Users,
    description: 'Kundenverwaltung'
  },
  {
    title: 'Projekte',
    href: '/projects',
    icon: FolderOpen,
    description: 'Projektmanagement'
  },
  {
    title: 'Produkte',
    href: '/products',
    icon: Package,
    description: 'Produktverwaltung'
  },
  {
    title: 'Kategorien',
    href: '/categories',
    icon: Tags,
    description: 'Kategorien verwalten'
  },
  {
    title: 'Projektvorlagen',
    href: '/project-templates',
    icon: FileText,
    description: 'Vorlagen verwalten'
  },
];

const adminItems = [
  {
    title: 'Admin Einstellungen',
    href: '/admin',
    icon: Settings,
    description: 'Systemeinstellungen'
  },
];

const userItems = [
  {
    title: 'Mein Profil',
    href: '/profile',
    icon: User,
    description: 'Profil bearbeiten'
  },
];

const testItems = [
  {
    title: 'Rollen-Test',
    href: '/role-test',
    icon: Shield,
    description: 'Chat-Berechtigungen testen'
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { users } = useTaskContext();
  const { isAdmin, isManager, canRead } = useUserPermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const SidebarLink = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = pathname === item.href;
    
    // Berechtigungsprüfung - /admin und /profile immer anzeigen (Prüfung auf der Seite selbst)
    const hasPermission = (() => {
      switch (item.href) {
        case '/admin':
          return true; // Admin-Link immer zeigen
        case '/profile':
          return true; // Profil-Link immer zeigen
        case '/customers':
          return canRead('customers');
        case '/projects':
          return canRead('projects');
        case '/products':
          return canRead('products');
        case '/categories':
          return canRead('categories');
        case '/project-templates':
          return canRead('templates');
        case '/role-test':
          return isAdmin || canRead('admin');
        default:
          return true;
      }
    })();

    if (!hasPermission) return null;

    return (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-glow'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        onClick={() => {
          if (window.innerWidth < 1024) {
            onClose();
          }
        }}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0 transition-transform duration-200',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:scale-110 group-hover:text-primary'
        )} />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <span className={cn(
              "block text-sm font-medium truncate",
              isActive ? 'text-primary-foreground' : ''
            )}>
              {item.title}
            </span>
            <span className={cn(
              "block text-xs truncate",
              isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {item.description}
            </span>
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-16 bottom-0 bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300 shadow-soft',
          'lg:fixed lg:top-16 lg:bottom-0 lg:z-30 lg:left-0 lg:translate-x-0',
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full',
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex justify-end p-2 border-b border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg hover:bg-sidebar-accent"
              onClick={() => {
                const next = !isCollapsed;
                setIsCollapsed(next);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('sidebar:collapsed', { detail: next }));
                }
              }}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <SidebarLink key={item.href} item={item} />
              ))}
            </div>

            {/* User-Bereich - immer sichtbar */}
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Benutzer
                </p>
              )}
              <div className="space-y-1">
                {userItems.map((item) => (
                  <SidebarLink key={item.href} item={item} />
                ))}
              </div>
            </div>

            {/* Admin-Bereich - immer anzeigen (Berechtigungsprüfung auf der Seite selbst) */}
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Administration
                </p>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <SidebarLink key={item.href} item={item} />
                ))}
              </div>
            </div>

            {/* Entwicklung - nur für Admins */}
            {(isAdmin || canRead('admin')) && (
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                {!isCollapsed && (
                  <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Entwicklung
                  </p>
                )}
                <div className="space-y-1">
                  {testItems.map((item) => (
                    <SidebarLink key={item.href} item={item} />
                  ))}
                </div>
              </div>
            )}
          </nav>

          {!isCollapsed && (
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/50">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    Admin User
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Administrator
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  ADMIN
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
