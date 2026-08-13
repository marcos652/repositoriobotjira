'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useFilters } from '@/contexts/FilterContext';
import type { DateRange } from '@/types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuOpen: () => void;
}

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : email.slice(0, 2)).toUpperCase();
}

function getDisplayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export default function Header({ title, subtitle, onMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { filters, setDateRange, hasActiveFilters, clearFilters } = useFilters();
  const [userEmail, setUserEmail] = useState('');
  const [userImage, setUserImage] = useState('');

  const showsDateFilter = ['/dashboard', '/dashboard/suporte', '/dashboard/dev'].includes(pathname);
  const dateRanges: { label: string; value: DateRange }[] = [
    { label: 'Hoje', value: 'today' },
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: '90 dias', value: '90d' },
  ];

  useEffect(() => {
    fetch('/api/custom-session')
      .then((response) => response.json())
      .then((data) => {
        if (!data.user?.email) return;
        setUserEmail(data.user.email);
        setUserImage(data.user.image || '');
      })
      .catch(() => {});
  }, []);

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__breadcrumb">
        <button
          type="button"
          className="dashboard-icon-button dashboard-topbar__menu"
          onClick={onMenuOpen}
          aria-label="Abrir menu"
          aria-controls="dashboard-sidebar"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="Navegação estrutural">
          <Link href="/dashboard">JiraOps</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        {subtitle && <span className="dashboard-topbar__context">{subtitle}</span>}
      </div>

      {showsDateFilter && (
        <div className="dashboard-topbar__period" aria-label="Período dos dados">
          {dateRanges.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateRange(value)}
              aria-pressed={filters.dateRange === value}
              className={filters.dateRange === value ? 'is-active' : ''}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button type="button" className="dashboard-topbar__clear" onClick={clearFilters} aria-label="Limpar filtros">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className="dashboard-topbar__actions">
        <button type="button" className="dashboard-icon-button" onClick={openCommandPalette} aria-label="Buscar" title="Buscar (Ctrl+K)">
          <Search size={18} />
        </button>
        <Link className="dashboard-icon-button" href="/dashboard/notificacoes" aria-label="Notificações">
          <Bell size={18} />
          <span className="dashboard-topbar__notification-dot" />
        </Link>
        <button type="button" className="dashboard-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="dashboard-topbar__profile">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" />
          ) : (
            <span aria-hidden="true">{userEmail ? getInitials(userEmail) : 'JO'}</span>
          )}
          <strong>{userEmail ? getDisplayName(userEmail) : 'JiraOps'}</strong>
        </div>
      </div>
    </header>
  );
}
