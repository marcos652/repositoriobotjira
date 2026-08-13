'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Command,
  LogOut,
  Search,
  X,
  Zap,
} from 'lucide-react';
import {
  navigationSections,
  settingsNavigationItem,
} from '@/config/navigation';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function getDisplayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [userImage, setUserImage] = useState('');
  const [authMethod, setAuthMethod] = useState<'google' | 'slack' | ''>('');
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/custom-session')
      .then((response) => response.json())
      .then((data) => {
        if (!data.user?.email) return;
        setUserEmail(data.user.email);
        setUserRole(data.user.role || 'user');
        setUserImage(data.user.image || '');
        setAuthMethod(data.user.image ? 'google' : 'slack');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previouslyFocused = document.activeElement;
    const frame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>('.dashboard-sidebar__mobile-close')?.focus();
    });
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onMobileClose();
        return;
      }
      if (event.key !== 'Tab' || !sidebarRef.current) return;

      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyboard);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [mobileOpen, onMobileClose]);

  const handleLogout = async () => {
    if (authMethod === 'google') {
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
      });
    }
    await fetch('/api/custom-session', { method: 'DELETE' });
    router.push('/login');
  };

  const isActive = (href: string) => href === '/dashboard'
    ? pathname === href
    : pathname.startsWith(href);

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  const compact = collapsed && !mobileOpen;
  const initials = userEmail ? getInitials(userEmail) : 'JO';
  const displayName = userEmail ? getDisplayName(userEmail) : 'Carregando...';
  const SettingsIcon = settingsNavigationItem.icon;

  return (
    <aside
      ref={sidebarRef}
      id="dashboard-sidebar"
      aria-label="Navegação principal"
      className={`dashboard-sidebar ${compact ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
    >
      <div className="dashboard-sidebar__header">
        <Link href="/dashboard" className="dashboard-brand" onClick={onMobileClose} aria-label="JiraOps — ir para o overview">
          <span className="dashboard-brand__mark" aria-hidden="true"><Zap size={18} /></span>
          {!compact && <span className="dashboard-brand__name">JiraOps</span>}
        </Link>
        <button
          type="button"
          className="dashboard-icon-button dashboard-sidebar__mobile-close"
          onClick={onMobileClose}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="dashboard-sidebar__search-wrap">
        <button
          type="button"
          className="dashboard-sidebar__search"
          onClick={openCommandPalette}
          aria-label="Abrir busca global"
          title={compact ? 'Buscar' : undefined}
        >
          <Search size={18} aria-hidden="true" />
          {!compact && (
            <>
              <span>Buscar</span>
              <kbd><Command size={11} />K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="dashboard-sidebar__nav">
        {navigationSections.map((section) => (
          <section key={section.label} className="dashboard-nav-section" aria-label={section.label}>
            {!compact && <h2>{section.label}</h2>}
            <div className="dashboard-nav-section__items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={active ? 'page' : undefined}
                    className={`dashboard-nav-item ${active ? 'is-active' : ''}`}
                    title={compact ? item.label : undefined}
                  >
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    {!compact && <span>{item.label}</span>}
                    {!compact && item.href === '/dashboard/notificacoes' && <span className="dashboard-nav-item__badge">3</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="dashboard-sidebar__footer">
        <Link
          href={settingsNavigationItem.href}
          onClick={onMobileClose}
          aria-current={isActive(settingsNavigationItem.href) ? 'page' : undefined}
          className={`dashboard-nav-item ${isActive(settingsNavigationItem.href) ? 'is-active' : ''}`}
          title={compact ? settingsNavigationItem.label : undefined}
        >
          <SettingsIcon size={20} strokeWidth={1.8} aria-hidden="true" />
          {!compact && <span>{settingsNavigationItem.label}</span>}
        </Link>

        <div className="dashboard-profile">
          {userImage ? (
            // The URL comes from the authenticated provider and is intentionally rendered as-is.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dashboard-profile__avatar" src={userImage} alt="" />
          ) : (
            <span className="dashboard-profile__avatar" aria-hidden="true">{initials}</span>
          )}
          {!compact && (
            <span className="dashboard-profile__copy">
              <strong>{displayName}</strong>
              <small>{userEmail ? (userRole === 'admin' ? 'Administrador' : 'Usuário') : 'Validando sessão'}</small>
            </span>
          )}
          {!compact && (
            <button type="button" className="dashboard-icon-button" onClick={handleLogout} aria-label="Sair">
              <LogOut size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="dashboard-sidebar__collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!compact && <span>Recolher menu</span>}
        </button>
      </div>
    </aside>
  );
}
