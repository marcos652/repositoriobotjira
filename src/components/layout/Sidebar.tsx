'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Headphones, Code2, Settings, BarChart3,
  Users, GitBranch, Zap, ChevronLeft, ChevronRight, HelpCircle,
  Kanban, CalendarDays, ClipboardList, Bell, Shield,
  Bot, BookOpen, ScrollText, Building2, FileBarChart, Sparkles
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    section: 'MENU',
    items: [
      { label: 'Nova Demanda', href: '/dashboard/nova-demanda', icon: Sparkles },
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Suporte', href: '/dashboard/suporte', icon: Headphones },
      { label: 'Desenvolvimento', href: '/dashboard/dev', icon: Code2 },
    ],
  },
  {
    section: 'PLANEJAMENTO',
    items: [
      { label: 'Backlog', href: '/dashboard/backlog', icon: ClipboardList },
      { label: 'Kanban Board', href: '/dashboard/kanban', icon: Kanban },
      { label: 'Calendário', href: '/dashboard/calendario', icon: CalendarDays },
    ],
  },
  {
    section: 'ANÁLISE',
    items: [
      { label: 'Métricas', href: '/dashboard/metricas', icon: BarChart3 },
      { label: 'Relatórios', href: '/dashboard/relatorios', icon: FileBarChart },
      { label: 'SLA / Contratos', href: '/dashboard/sla', icon: Shield },
      { label: 'Equipe', href: '/dashboard/equipe', icon: Users },
      { label: 'Releases', href: '/dashboard/releases', icon: GitBranch },
    ],
  },
  {
    section: 'GESTÃO',
    items: [
      { label: 'Clientes', href: '/dashboard/clientes', icon: Building2 },
      { label: 'Base de Conhecimento', href: '/dashboard/knowledge', icon: BookOpen },
      { label: 'Automações', href: '/dashboard/automacoes', icon: Bot },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { label: 'Integrações', href: '/dashboard/integracoes', icon: Zap },
      { label: 'Logs / Auditoria', href: '/dashboard/logs', icon: ScrollText },
      { label: 'Notificações', href: '/dashboard/notificacoes', icon: Bell },
      { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
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
        width: collapsed ? '76px' : '264px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ─── Logo Area ─── */}
      <div
        className="flex items-center h-[64px] flex-shrink-0"
        style={{
          padding: collapsed ? '0 18px' : '0 22px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="sidebar-logo-icon relative flex-shrink-0">
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Zap size={17} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
          {!collapsed && (
            <div className="sidebar-fade-in overflow-hidden">
              <p
                className="text-[15px] font-bold leading-none whitespace-nowrap"
                style={{ color: '#F1F5F9' }}
              >
                Jira<span style={{ color: '#A78BFA' }}>Ops</span>
              </p>
              <p
                className="text-[10px] mt-1 whitespace-nowrap font-medium"
                style={{ color: 'rgba(148, 163, 184, 0.7)' }}
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
          padding: collapsed ? '16px 10px' : '16px 14px',
        }}
      >
        {navItems.map((section, sIdx) => (
          <div key={section.section} className={sIdx > 0 ? 'mt-7' : ''}>
            {/* Section label */}
            {!collapsed && (
              <p
                className="text-[10px] font-semibold tracking-[0.15em] mb-2 px-3"
                style={{ color: 'rgba(148, 163, 184, 0.45)' }}
              >
                {section.section}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div
                className="my-4 mx-auto"
                style={{
                  width: '24px',
                  height: '1px',
                  background: 'rgba(255,255,255,0.06)',
                }}
              />
            )}

            <div className="space-y-[2px]">
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
                      ${collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-[9px]'}
                      ${active ? 'sidebar-nav-active' : ''}
                    `}
                    style={{
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                      background: active
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'transparent',
                      color: active ? '#A78BFA' : 'rgba(203, 213, 225, 0.7)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'rgba(255, 255, 255, 0.04)';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          'rgba(241, 245, 249, 0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          'transparent';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          'rgba(203, 213, 225, 0.7)';
                      }
                    }}
                  >
                    {/* Active pill indicator */}
                    {active && !collapsed && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2"
                        style={{
                          width: '3px',
                          height: '18px',
                          borderRadius: '0 4px 4px 0',
                          background: 'linear-gradient(180deg, #8B5CF6, #6366F1)',
                          boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: '22px',
                        height: '22px',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Icon
                        size={17}
                        strokeWidth={active ? 2.2 : 1.7}
                      />
                    </div>

                    {/* Label */}
                    {!collapsed && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}

                    {/* Active dot for collapsed */}
                    {active && collapsed && (
                      <div
                        className="absolute -right-0.5 top-1/2 -translate-y-1/2"
                        style={{
                          width: '3px',
                          height: '18px',
                          borderRadius: '4px 0 0 4px',
                          background: 'linear-gradient(180deg, #8B5CF6, #6366F1)',
                          boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
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
                          background: '#1E293B',
                          color: '#F1F5F9',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
                        }}
                      >
                        {item.label}
                        <div
                          className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
                          style={{ borderRightColor: '#1E293B' }}
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
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: collapsed ? '12px 10px' : '14px',
        }}
      >
        {/* Help link */}
        {!collapsed && (
          <Link
            href="#"
            className="sidebar-nav-item flex items-center gap-3 px-3 py-[9px] text-[12px] font-medium mb-3 group"
            style={{
              borderRadius: '8px',
              color: 'rgba(148, 163, 184, 0.6)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(255, 255, 255, 0.04)';
              (e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(241, 245, 249, 0.9)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(148, 163, 184, 0.6)';
            }}
          >
            <HelpCircle size={16} strokeWidth={1.7} />
            <span>Central de Ajuda</span>
          </Link>
        )}

        {/* User + collapse toggle */}
        {!collapsed ? (
          <div className="flex items-center gap-2">
            {/* User card */}
            <div
              className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2.5"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
              }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff',
                  }}
                >
                  MV
                </div>
                {/* Online dot */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full"
                  style={{
                    background: '#22C55E',
                    border: '2px solid #0F172A',
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-semibold truncate"
                  style={{ color: '#E2E8F0' }}
                >
                  Marcos Vinicius
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: 'rgba(148, 163, 184, 0.5)' }}
                >
                  Administrador
                </p>
              </div>
            </div>

            {/* Collapse button */}
            <button
              onClick={onToggle}
              className="sidebar-collapse-btn flex items-center justify-center flex-shrink-0"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(148, 163, 184, 0.6)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.08)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  '#F1F5F9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.04)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(148, 163, 184, 0.6)';
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
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: '#fff',
                }}
              >
                MV
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full"
                style={{
                  background: '#22C55E',
                  border: '2px solid #0F172A',
                }}
              />
            </div>

            {/* Expand button */}
            <button
              onClick={onToggle}
              className="sidebar-collapse-btn flex items-center justify-center"
              style={{
                width: '100%',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(148, 163, 184, 0.6)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.08)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  '#F1F5F9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255, 255, 255, 0.04)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(148, 163, 184, 0.6)';
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
