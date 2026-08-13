'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FilterProvider } from '@/contexts/FilterContext';
import ToastProvider from '@/components/ui/ToastProvider';
import CommandPalette from '@/components/ui/CommandPalette';
import OnboardingTour from '@/components/ui/OnboardingTour';
import { getNavigationItem } from '@/config/navigation';

function useSessionAutoRefresh() {
  useEffect(() => {
    const refresh = () => {
      fetch('/api/custom-session', { method: 'PUT' }).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentItem = getNavigationItem(pathname);
  const pageInfo = currentItem || {
    label: 'JiraOps',
    description: 'Gestão operacional integrada',
  };

  useSessionAutoRefresh();

  useEffect(() => {
    const stored = window.localStorage.getItem('jiraops-sidebar-collapsed');
    const frame = window.requestAnimationFrame(() => setSidebarCollapsed(stored === 'true'));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMobileOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      window.localStorage.setItem('jiraops-sidebar-collapsed', String(!current));
      return !current;
    });
  };

  return (
    <ThemeProvider>
      <FilterProvider>
        <ToastProvider>
          <div className="dashboard-shell">
            <Sidebar
              collapsed={sidebarCollapsed}
              mobileOpen={mobileOpen}
              onToggle={toggleSidebar}
              onMobileClose={closeMobile}
            />
            {mobileOpen && (
              <button
                type="button"
                className="dashboard-sidebar-backdrop"
                aria-label="Fechar menu"
                onClick={closeMobile}
              />
            )}
            <div className="dashboard-workspace">
              <Header
                title={pageInfo.label}
                subtitle={pageInfo.description}
                onMenuOpen={() => setMobileOpen(true)}
              />
              <main className="dashboard-content">
                <div key={pathname} className="dashboard-page-frame animate-page-enter">
                  {children}
                </div>
              </main>
            </div>
            <CommandPalette />
            <OnboardingTour />
          </div>
        </ToastProvider>
      </FilterProvider>
    </ThemeProvider>
  );
}
