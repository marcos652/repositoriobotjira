'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
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
  const currentItem = getNavigationItem(pathname);
  const pageInfo = currentItem || {
    label: 'JiraOps',
    description: 'Gestão operacional integrada',
  };

  useSessionAutoRefresh();

  return (
    <ThemeProvider>
      <FilterProvider>
        <ToastProvider>
          {/* A navegação passou de coluna lateral para faixa no topo, então o shell
              empilha (column) em vez de dividir a largura (row). O estado de
              recolher/gaveta da sidebar saiu junto: a navbar controla o próprio
              menu mobile internamente. */}
          <div className="dashboard-shell">
            <Navbar />
            <div className="dashboard-workspace">
              <Header title={pageInfo.label} subtitle={pageInfo.description} />
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
