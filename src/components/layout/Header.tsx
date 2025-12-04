'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  X, 
  Settings, 
  User, 
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import NotificationCenter from '@/components/shared/NotificationCenter';
import GlobalSearch from '@/components/shared/GlobalSearch';
import { useTaskContext } from '@/hooks/useTaskContext';
import { useAuth } from '@/auth/AuthProvider';

interface HeaderProps {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

export default function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const { users } = useTaskContext();
  const { logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock current user - in real app this would come from auth context
  const currentUser = {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+49 123 456789',
    avatar: null,
    role: 'ADMIN' as const,
  };

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const ThemeIcon = () => {
    if (!mounted) return <Sun className="h-5 w-5" />;
    if (theme === 'system') return <Monitor className="h-5 w-5" />;
    if (resolvedTheme === 'dark') return <Moon className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 z-50 shadow-sm">
      <div className="flex items-center h-full px-4 lg:px-6">
        {/* Left side - Menu Toggle and Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden rounded-lg"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo and App name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-glow transition-transform duration-200 group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden xl:block">
              <span className="font-semibold text-lg tracking-tight">DocklyTask</span>
              <span className="block text-xs text-muted-foreground -mt-0.5">Projektmanagement</span>
            </div>
          </Link>
        </div>

        {/* Center - Global Search */}
        <div className="flex-1 flex justify-center px-4 md:px-8 lg:px-12">
          <div className="w-full max-w-2xl">
            <GlobalSearch />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="rounded-lg h-9 w-9"
            title={`Aktuelles Theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dunkel' : 'Hell'}`}
          >
            <ThemeIcon />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar || ''} alt={currentUser.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3 rounded-lg bg-muted/50 mb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={currentUser.avatar || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold leading-none">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentUser.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer p-2.5">
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Mein Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer p-2.5">
                <Link href="/admin" className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Admin Einstellungen</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem 
                onClick={() => logout()}
                className="rounded-lg cursor-pointer p-2.5 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
