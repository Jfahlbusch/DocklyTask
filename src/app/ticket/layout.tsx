'use client';

import React, { useState } from 'react';
import { TaskProvider } from '@/hooks/useTaskContext';
import { TeamProvider } from '@/hooks/useTeamContext';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import { AuthProvider } from '@/auth/AuthProvider';
import Protected from '@/auth/Protected';

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <AuthProvider>
      <Protected>
        <TaskProvider>
          <TeamProvider>
            <div className="min-h-screen bg-background">
              <Header onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
              <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
              <main className="pt-16 min-h-screen">
                <div className="p-4 sm:p-6 lg:pl-64 lg:pr-6 mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-9xl">
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


