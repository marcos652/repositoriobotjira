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
      className="sticky top-0 z-30 border-b transition-all duration-300"
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 82%, transparent)',
        borderColor: 'var(--border-primary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Main row ── */}
      <div className="flex items-center justify-between px-10 py-5">

        {/* Left: Title + live badge aligned on same line */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
              style={{ background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>
              <span className="live-dot" />
              Ao vivo
            </div>
          </div>
          {subtitle && (
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Center: Date Range with Jira Button Style */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            {dateRanges.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className="px-3.5 py-1.5 rounded text-xs font-bold transition-all duration-100 active:scale-95 cursor-pointer"
                style={{
                  background: filters.dateRange === value ? 'var(--accent-blue)' : 'transparent',
                  color: filters.dateRange === value ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Right: Action buttons with interactive hover highlights */}
        <div className="flex items-center gap-2.5">
          {[
            { icon: <Search size={16} />, title: 'Buscar', hoverColor: 'var(--accent-blue)' },
            { icon: <RefreshCw size={16} />, title: 'Sincronizar com Jira', hoverColor: 'var(--accent-violet)' },
            { icon: <Download size={16} />, title: 'Exportar', hoverColor: 'var(--accent-emerald)' },
          ].map((btn) => (
            <button
              key={btn.title}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-bg-card-hover border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-primary)',
              }}
              title={btn.title}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = btn.hoverColor;
                e.currentTarget.style.borderColor = btn.hoverColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              {btn.icon}
            </button>
          ))}

          {/* Notifications button */}
          <button
            className="relative p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-bg-card-hover border"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-primary)',
            }}
            title="Notificações"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-rose)';
              e.currentTarget.style.borderColor = 'var(--accent-rose)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent-rose)', boxShadow: '0 0 6px var(--accent-rose)' }} />
          </button>

          {/* Theme Toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-bg-card-hover border"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-primary)',
            }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-amber)';
              e.currentTarget.style.borderColor = 'var(--accent-amber)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Separator */}
          <div className="w-px h-6 mx-1.5" style={{ background: 'var(--border-primary)' }} />

          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold cursor-pointer transition-all hover:scale-110 active:scale-95"
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
