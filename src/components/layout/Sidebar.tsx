'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Headphones, Code2, Settings, BarChart3,
  Users, GitBranch, Zap, ChevronLeft, ChevronRight, HelpCircle,
  Kanban, CalendarDays, ClipboardList, Bell, Shield,
  Bot, BookOpen, ScrollText, Building2, FileBarChart, Sparkles,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    section: 'MENU',
    items: [
      { label: 'Nova Demanda', href: '/dashboard/nova-demanda', icon: Sparkles, accent: '#A78BFA' },
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, accent: '#3B82F6' },
      { label: 'Suporte', href: '/dashboard/suporte', icon: Headphones, accent: '#3B82F6' },
      { label: 'Desenvolvimento', href: '/dashboard/dev', icon: Code2, accent: '#8B5CF6' },
    ],
  },
  {
    section: 'PLANEJAMENTO',
    items: [
      { label: 'Backlog', href: '/dashboard/backlog', icon: ClipboardList, accent: '#3B82F6' },
      { label: 'Kanban Board', href: '/dashboard/kanban', icon: Kanban, accent: '#8B5CF6' },
      { label: 'Calendário', href: '/dashboard/calendario', icon: CalendarDays, accent: '#06B6D4' },
    ],
  },
  {
    section: 'ANÁLISE',
    items: [
      { label: 'Métricas', href: '/dashboard/metricas', icon: BarChart3, accent: '#10B981' },
      { label: 'Relatórios', href: '/dashboard/relatorios', icon: FileBarChart, accent: '#10B981' },
      { label: 'SLA / Contratos', href: '/dashboard/sla', icon: Shield, accent: '#F59E0B' },
      { label: 'Equipe', href: '/dashboard/equipe', icon: Users, accent: '#06B6D4' },
      { label: 'Releases', href: '/dashboard/releases', icon: GitBranch, accent: '#8B5CF6' },
    ],
  },
  {
    section: 'GESTÃO',
    items: [
      { label: 'Clientes', href: '/dashboard/clientes', icon: Building2, accent: '#F59E0B' },
      { label: 'Base de Conhecimento', href: '/dashboard/knowledge', icon: BookOpen, accent: '#06B6D4' },
      { label: 'Automações', href: '/dashboard/automacoes', icon: Bot, accent: '#F43F5E' },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { label: 'Integrações', href: '/dashboard/integracoes', icon: Zap, accent: '#F59E0B' },
      { label: 'Logs / Auditoria', href: '/dashboard/logs', icon: ScrollText, accent: '#64748B' },
      { label: 'Notificações', href: '/dashboard/notificacoes', icon: Bell, accent: '#F43F5E' },
      { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, accent: '#64748B' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="sidebar-modern fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{
        width: collapsed ? '76px' : '272px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ─── Logo Area ─── */}
      <div
        className="flex items-center h-[68px] flex-shrink-0"
        style={{
          padding: collapsed ? '0 18px' : '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-3.5 overflow-hidden">
          <div className="sidebar-logo-icon relative flex-shrink-0">
            <div
              className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #A78BFA 100%)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <Zap size={18} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
          {!collapsed && (
            <div className="sidebar-fade-in overflow-hidden">
              <p
                className="text-[16px] font-extrabold leading-none whitespace-nowrap tracking-tight"
                style={{ color: '#F1F5F9' }}
              >
                Jira<span style={{ color: '#A78BFA' }}>Ops</span>
              </p>
              <p
                className="text-[10px] mt-1.5 whitespace-nowrap font-medium"
                style={{ color: 'rgba(148, 163, 184, 0.5)' }}
              >
                Dashboard v2.0
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* ─── Navigation ─── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll"
        style={{
          padding: collapsed ? '14px 10px' : '14px 12px',
        }}
      >
        {navItems.map((section, sIdx) => (
          <div key={section.section} className={sIdx > 0 ? 'mt-6' : ''}>
            {/* Section label */}
            {!collapsed && (
              <p
                className="text-[10px] font-bold tracking-[0.15em] mb-2 px-3 uppercase"
                style={{ color: 'rgba(148, 163, 184, 0.3)' }}
              >
                {section.section}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div
                className="my-4 mx-auto"
                style={{
                  width: '28px',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                }}
              />
            )}

            <div className="space-y-[3px]">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      sidebar-nav-item relative flex items-center text-[13px] font-medium group
                      ${collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-[10px]'}
                      ${active ? 'sidebar-nav-active' : ''}
                    `}
                    style={{
                      borderRadius: '10px',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      background: active
                        ? `linear-gradient(135deg, ${item.accent}18, ${item.accent}08)`
                        : 'transparent',
                      color: active ? item.accent : 'rgba(203, 213, 225, 0.6)',
                      boxShadow: active ? `0 0 20px ${item.accent}08` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'rgba(255, 255, 255, 0.03)';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          'rgba(241, 245, 249, 0.9)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'transparent';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          'rgba(203, 213, 225, 0.6)';
                      }
                    }}
                  >
                    {/* Active pill indicator — left side glow bar */}
                    {active && !collapsed && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2"
                        style={{
                          width: '3px',
                          height: '20px',
                          borderRadius: '0 6px 6px 0',
                          background: item.accent,
                          boxShadow: `0 0 12px ${item.accent}60`,
                        }}
                      />
                    )}

                    {/* Icon with subtle glow when active */}
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: collapsed ? '36px' : '24px',
                        height: collapsed ? '36px' : '24px',
                        borderRadius: collapsed ? '10px' : '0',
                        background: collapsed && active ? `${item.accent}15` : 'transparent',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon
                        size={collapsed ? 18 : 17}
                        strokeWidth={active ? 2.2 : 1.7}
                      />
                    </div>

                    {/* Label */}
                    {!collapsed && (
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    )}

                    {/* Active dot for collapsed */}
                    {active && collapsed && (
                      <div
                        className="absolute -right-0.5 top-1/2 -translate-y-1/2"
                        style={{
                          width: '3px',
                          height: '20px',
                          borderRadius: '6px 0 0 6px',
                          background: item.accent,
                          boxShadow: `0 0 12px ${item.accent}60`,
                        }}
                      />
                    )}

                    {/* Tooltip for collapsed */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-3 px-3 py-2 text-[12px] font-semibold
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          translate-x-1 group-hover:translate-x-0
                          transition-all duration-150 pointer-events-none whitespace-nowrap z-50"
                        style={{
                          background: 'rgba(17, 24, 39, 0.95)',
                          color: '#F1F5F9',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        {item.label}
                        <div
                          className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
                          style={{ borderRightColor: 'rgba(17, 24, 39, 0.95)' }}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Bottom Section ─── */}
      <div
        className="flex-shrink-0"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: collapsed ? '12px 10px' : '14px 12px',
        }}
      >
        {/* Help link */}
        {!collapsed && (
          <Link
            href="#"
            className="sidebar-nav-item flex items-center gap-3 px-3 py-[9px] text-[12px] font-medium mb-2 group"
            style={{
              borderRadius: '10px',
              color: 'rgba(148, 163, 184, 0.45)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(255, 255, 255, 0.03)';
              (e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(241, 245, 249, 0.8)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(148, 163, 184, 0.45)';
            }}
          >
            <HelpCircle size={16} strokeWidth={1.7} />
            <span>Central de Ajuda</span>
          </Link>
        )}

        {/* User + collapse toggle */}
        {!collapsed ? (
          <div className="flex items-center gap-2">
            {/* User card — glass style */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 px-3 py-3"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  MV
                </div>
                {/* Online dot */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full"
                  style={{
                    background: '#22C55E',
                    border: '2px solid #070B14',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-bold truncate"
                  style={{ color: '#E2E8F0' }}
                >
                  Marcos Vinicius
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: 'rgba(148, 163, 184, 0.4)' }}
                >
                  Administrador
                </p>
              </div>
              {/* Logout icon */}
              <button
                className="flex-shrink-0 p-1 rounded-md transition-colors cursor-pointer"
                style={{ color: 'rgba(148,163,184,0.3)' }}
                title="Sair"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#F43F5E';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <LogOut size={14} />
              </button>
            </div>

            {/* Collapse button */}
            <button
              onClick={onToggle}
              className="sidebar-collapse-btn flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                color: 'rgba(148, 163, 184, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.06)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  '#F1F5F9';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.02)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(148, 163, 184, 0.4)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.04)';
              }}
              title="Recolher menu"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* Mini user avatar */}
            <div className="relative">
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                MV
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full"
                style={{
                  background: '#22C55E',
                  border: '2px solid #070B14',
                }}
              />
            </div>

            {/* Expand button */}
            <button
              onClick={onToggle}
              className="sidebar-collapse-btn flex items-center justify-center cursor-pointer"
              style={{
                width: '100%',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                color: 'rgba(148, 163, 184, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.06)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  '#F1F5F9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.02)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(148, 163, 184, 0.4)';
              }}
              title="Expandir menu"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
