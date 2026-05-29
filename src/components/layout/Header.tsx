'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useFilters } from '@/contexts/FilterContext';
import { DateRange } from '@/types';
import {
  Sun, Moon, Bell, Search, RefreshCw, Download, X
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { filters, setDateRange, hasActiveFilters, clearFilters } = useFilters();

  const dateRanges: { label: string; value: DateRange }[] = [
    { label: 'Hoje', value: 'today' },
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: '90 dias', value: '90d' },
  ];

  return (
    <header
      className="sticky top-0 z-30 transition-all duration-300"
      style={{
        background: 'rgba(10, 14, 26, 0.75)',
        borderBottom: '1px solid var(--border-primary)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
      }}
    >
      {/* ── Main row ── */}
      <div className="flex items-center justify-between px-8 py-4">

        {/* Left: Title + live badge */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>
              <span className="live-dot" style={{ width: '6px', height: '6px' }} />
              Ao vivo
            </div>
          </div>
          {subtitle && (
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Center: Date Range Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-primary)',
            }}>
            {dateRanges.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                style={{
                  background: filters.dateRange === value ? 'var(--gradient-primary)' : 'transparent',
                  color: filters.dateRange === value ? '#fff' : 'var(--text-tertiary)',
                  boxShadow: filters.dateRange === value ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.15)' }}
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {[
            { icon: <Search size={16} />, title: 'Buscar', color: 'var(--accent-blue)' },
            { icon: <RefreshCw size={16} />, title: 'Sincronizar com Jira', color: 'var(--accent-violet)' },
            { icon: <Download size={16} />, title: 'Exportar', color: 'var(--accent-emerald)' },
          ].map((btn) => (
            <button
              key={btn.title}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border cursor-pointer"
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--text-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
              title={btn.title}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = btn.color;
                e.currentTarget.style.borderColor = btn.color;
                e.currentTarget.style.boxShadow = `0 0 16px ${btn.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {btn.icon}
            </button>
          ))}

          {/* Notifications */}
          <button
            className="relative p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border cursor-pointer"
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              color: 'var(--text-tertiary)',
              borderColor: 'var(--border-primary)',
            }}
            title="Notificações"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-rose)';
              e.currentTarget.style.borderColor = 'var(--accent-rose)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(244,63,94,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent-rose)', boxShadow: '0 0 8px var(--accent-rose)' }} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border cursor-pointer"
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              color: 'var(--text-tertiary)',
              borderColor: 'var(--border-primary)',
            }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-amber)';
              e.currentTarget.style.borderColor = 'var(--accent-amber)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(245,158,11,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Separator */}
          <div className="w-px h-7 mx-1" style={{ background: 'var(--border-primary)' }} />

          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              boxShadow: 'var(--shadow-glow-blue)',
            }}
            title="Minha conta"
          >
            MV
          </div>
        </div>
      </div>
    </header>
  );
}
