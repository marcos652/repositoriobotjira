'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { usePathname, useRouter } from 'next/navigation';
import ToastProvider from '@/components/ui/ToastProvider';
import CommandPalette from '@/components/ui/CommandPalette';
import OnboardingTour from '@/components/ui/OnboardingTour';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Auto-refresh session every 4 hours to keep it alive
function useSessionAutoRefresh() {
  useEffect(() => {
    const refresh = () => {
      fetch('/api/auth/session', { method: 'PUT' }).catch(() => {});
    };
    // Refresh immediately on mount, then every 4 hours
    refresh();
    const interval = setInterval(refresh, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'Visão geral de todos os times' },
  '/dashboard/nova-demanda': { title: 'Nova Demanda', subtitle: 'Crie demandas automaticamente via bot Gemini' },
  '/dashboard/suporte': { title: 'Suporte', subtitle: 'Dashboard operacional de atendimento' },
  '/dashboard/dev': { title: 'Desenvolvimento', subtitle: 'Dashboard de engenharia e sprint' },
  '/dashboard/backlog': { title: 'Backlog', subtitle: 'Visualize e priorize itens do backlog' },
  '/dashboard/kanban': { title: 'Kanban Board', subtitle: 'Quadro visual de tarefas e fluxo de trabalho' },
  '/dashboard/calendario': { title: 'Calendário', subtitle: 'Sprints, deadlines e marcos do projeto' },
  '/dashboard/metricas': { title: 'Métricas', subtitle: 'Indicadores de performance e produtividade' },
  '/dashboard/relatorios': { title: 'Relatórios', subtitle: 'Reports e exportações de dados' },
  '/dashboard/sla': { title: 'SLA / Contratos', subtitle: 'Monitoramento de níveis de serviço' },
  '/dashboard/equipe': { title: 'Equipe', subtitle: 'Gestão e performance do time' },
  '/dashboard/releases': { title: 'Releases', subtitle: 'Histórico de versões e deploys' },
  '/dashboard/clientes': { title: 'Clientes', subtitle: 'Gestão de contas e clientes' },
  '/dashboard/knowledge': { title: 'Base de Conhecimento', subtitle: 'Documentação e artigos internos' },
  '/dashboard/automacoes': { title: 'Automações', subtitle: 'Regras e workflows automatizados' },
  '/dashboard/integracoes': { title: 'Integrações', subtitle: 'Conexões e APIs externas' },
  '/dashboard/logs': { title: 'Logs / Auditoria', subtitle: 'Histórico de ações e eventos do sistema' },
  '/dashboard/notificacoes': { title: 'Notificações', subtitle: 'Alertas e histórico de avisos' },
  '/dashboard/configuracoes': { title: 'Configurações', subtitle: 'Preferências gerais do sistema' },
  '/dashboard/implantacao': { title: 'Implantação', subtitle: 'Acompanhamento de novos clientes e integrações' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const pageInfo = pageTitles[pathname] || { title: 'JiraOps', subtitle: '' };
  useKeyboardShortcuts();
  useSessionAutoRefresh();

  useEffect(() => {
    // RBAC: Client-side route protection
    const adminOnlyRoutes = ['/dashboard/configuracoes', '/dashboard/ips', '/dashboard/equipe', '/dashboard/logs'];
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      fetch('/api/auth/session')
        .then(r => r.json())
        .then(data => {
          const role = data.user?.role || 'user';
          if (role !== 'admin') {
            router.push('/dashboard');
          }
        })
        .catch(() => {});
    }
  }, [pathname, router]);

  return (
    <ThemeProvider>
      <FilterProvider>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div
              className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
              style={{ marginLeft: sidebarCollapsed ? '92px' : '288px' }}
            >
              <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
              <main
                className={`flex-1 overflow-y-auto ${
                  ['/dashboard/nova-demanda','/dashboard/metricas','/dashboard/calendario','/dashboard/equipe','/dashboard/relatorios','/dashboard/sla','/dashboard/releases','/dashboard/clientes','/dashboard/knowledge','/dashboard/automacoes','/dashboard/integracoes','/dashboard/logs','/dashboard/notificacoes','/dashboard/configuracoes','/dashboard/implantacao'].includes(pathname)
                    ? 'pl-8 pr-4 py-4'
                    : 'pl-14 pr-10 py-10'
                }`}
                style={{ background: 'var(--bg-primary)' }}
              >
                <div key={pathname} className="animate-page-enter">
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
