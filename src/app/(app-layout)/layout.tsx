'use client';

import { useEffect, useState } from 'react';
import { TaskProvider } from '@/hooks/useTaskContext';
import { TeamProvider } from '@/hooks/useTeamContext';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import { AuthProvider } from '@/auth/AuthProvider';
import Protected from '@/auth/Protected';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onCollapsed = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setSidebarCollapsed(!!detail);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sidebar:collapsed', onCollapsed as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sidebar:collapsed', onCollapsed as EventListener);
      }
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <AuthProvider>
      <Protected>
        <TaskProvider>
          <TeamProvider>
            <div className="min-h-screen bg-background">
              <Header onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
              <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
              <main className={`pt-16 min-h-screen ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
                <div className="p-4 sm:p-6 lg:pr-6 mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-9xl">
                  {children}
                </div>
              </main>
            </div>
          </TeamProvider>
        </TaskProvider>
      </Protected>
    </AuthProvider>
  );
}