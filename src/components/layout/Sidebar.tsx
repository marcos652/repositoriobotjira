'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Headphones, Code2, Settings, BarChart3,
  Users, GitBranch, Zap, ChevronLeft, ChevronRight, HelpCircle,
  Kanban, CalendarDays, ClipboardList, Bell, Shield,
  Bot, BookOpen, ScrollText, Building2, FileBarChart, Sparkles,
  LogOut, Search
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string): string {
  const name = email.split('@')[0];
  return name.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function getRole(email: string): string {
  // Primary admin
  if (email === 'marcos.vinicius@movingpay.com.br') return 'Administrador';
  return 'Usuário';
}

const navItems = [
  {
    section: 'MENU',
    items: [
      { label: 'Nova Demanda', href: '/dashboard/nova-demanda', icon: Sparkles },
      { label: 'Consultar Demanda', href: '/dashboard/consultar-demanda', icon: Search },
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
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userImage, setUserImage] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<'google' | 'slack' | ''>('');

  useEffect(() => {
    // Try Auth.js session first (Google SSO)
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.user?.email) {
          setUserEmail(data.user.email);
          if (data.user.image) setUserImage(data.user.image);
          setAuthMethod(data.user.image ? 'google' : 'slack');
        } else if (data.authenticated && data.user?.email) {
          // Manual session fallback
          setUserEmail(data.user.email);
          setAuthMethod('slack');
        }
      })
      .catch(() => {});
  }, []);

  const initials = userEmail ? getInitials(userEmail) : '??';
  const displayName = userEmail ? getDisplayName(userEmail) : 'Carregando...';
  const role = userEmail ? getRole(userEmail) : '';

  const handleLogout = async () => {
    if (authMethod === 'google') {
      // Auth.js signout
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
      });
    }
    // Also clear manual session
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40 overflow-hidden"
      style={{
        width: collapsed ? '76px' : '272px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'linear-gradient(165deg, #0A0F1E 0%, #0F1629 25%, #131B35 55%, #171F3D 80%, #0D1225 100%)',
        boxShadow: '4px 0 32px rgba(0, 0, 0, 0.45)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* ── Decorative orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            top: '-80px', right: '-100px',
          }} />
        <div className="absolute w-[200px] h-[200px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
            bottom: '10%', left: '-60px',
          }} />
        <div className="absolute w-[150px] h-[150px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
            top: '40%', right: '-40px',
          }} />
      </div>

      {/* ─── Logo Area ─── */}
      <div
        className="relative flex items-center h-[68px] flex-shrink-0"
        style={{
          padding: collapsed ? '0 18px' : '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1,
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-3.5 overflow-hidden">
          <div className="relative flex-shrink-0">
            <div
              className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center transition-transform duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Zap size={18} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
          {!collapsed && (
            <div className="sidebar-fade-in overflow-hidden">
              <p className="text-[16px] font-extrabold leading-none whitespace-nowrap tracking-tight text-white">
                Jira<span style={{ color: 'rgba(255,255,255,0.7)' }}>Ops</span>
              </p>
              <p className="text-[10px] mt-1.5 whitespace-nowrap font-medium"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                Dashboard v2.0
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* ─── Navigation ─── */}
      <nav
        className="relative flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll"
        style={{
          padding: collapsed ? '12px 10px' : '12px 12px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {navItems.flatMap(s => s.items).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  relative flex items-center text-[13px] font-semibold group
                  ${collapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 px-3 py-[11px]'}
                `}
                style={{
                  borderRadius: '12px',
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  background: active
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.06)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: active
                    ? '1px solid rgba(255,255,255,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: active
                    ? '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 15px rgba(255,255,255,0.05)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                  transform: 'translateY(0) scale(1)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (!active) {
                    el.style.background = 'rgba(255,255,255,0.14)';
                    el.style.color = '#fff';
                    el.style.borderColor = 'rgba(255,255,255,0.14)';
                    el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 12px rgba(255,255,255,0.04)';
                    el.style.transform = 'translateY(-1px) scale(1.01)';
                  } else {
                    el.style.boxShadow = '0 6px 28px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.08)';
                    el.style.transform = 'translateY(-1px) scale(1.01)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (!active) {
                    el.style.background = 'rgba(255,255,255,0.06)';
                    el.style.color = 'rgba(255,255,255,0.65)';
                    el.style.borderColor = 'rgba(255,255,255,0.06)';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                  } else {
                    el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 15px rgba(255,255,255,0.05)';
                  }
                  el.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {/* Icon container */}
                <div className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: collapsed ? '32px' : '28px',
                    height: collapsed ? '32px' : '28px',
                    borderRadius: '8px',
                    background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.25s ease',
                  }}>
                  <Icon size={collapsed ? 17 : 16} strokeWidth={active ? 2.2 : 1.8} />
                </div>

                {/* Label */}
                {!collapsed && (
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                )}

                {/* Notification badge */}
                {item.label === 'Notificações' && !collapsed && (
                  <span className="badge-pulse ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
                      color: '#fff',
                      boxShadow: '0 0 8px rgba(244, 63, 94, 0.5)',
                    }}>
                    3
                  </span>
                )}
                {item.label === 'Notificações' && collapsed && (
                  <div className="absolute top-1 right-1 w-[8px] h-[8px] rounded-full badge-pulse"
                    style={{
                      background: '#F43F5E',
                      boxShadow: '0 0 6px rgba(244, 63, 94, 0.6)',
                    }} />
                )}

                {/* Active glow dot */}
                {active && !collapsed && (
                  <div className="ml-auto flex-shrink-0 w-[6px] h-[6px] rounded-full"
                    style={{
                      background: '#fff',
                      boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                    }} />
                )}

                {/* Tooltip for collapsed */}
                {collapsed && (
                  <div
                    className="absolute left-full ml-3 px-3 py-2 text-[12px] font-semibold
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      translate-x-1 group-hover:translate-x-0
                      transition-all duration-150 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      background: 'rgba(30, 58, 138, 0.95)',
                      color: '#fff',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
                      style={{ borderRightColor: 'rgba(30, 58, 138, 0.95)' }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Bottom Section ─── */}
      <div className="relative flex-shrink-0"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: collapsed ? '12px 10px' : '14px 12px',
          zIndex: 1,
        }}>

        {/* Help link */}
        {!collapsed && (
          <Link href="#"
            className="flex items-center gap-3 px-3 py-[9px] text-[12px] font-medium mb-2 group"
            style={{
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.8)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)';
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
            <div className="flex items-center gap-3 flex-1 min-w-0 px-3 py-3"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="relative flex-shrink-0">
                <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}>
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full"
                  style={{
                    background: '#4ADE80',
                    border: '2px solid #5B21B6',
                    boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
                  }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold truncate text-white">{displayName}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {role}
                </p>
              </div>
              <button
                className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                title="Sair"
                onClick={handleLogout}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#FCA5A5';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <LogOut size={14} />
              </button>
            </div>

            {/* Collapse button */}
            <button
              onClick={onToggle}
              className="flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
              }}
              title="Recolher menu"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full"
                style={{ background: '#4ADE80', border: '2px solid #5B21B6' }} />
            </div>

            <button
              onClick={onToggle}
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: '100%', height: '32px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
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
