'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, Headphones, Code2, Sparkles, ClipboardList,
  Kanban, CalendarDays, BarChart3, FileBarChart, Shield, Users,
  GitBranch, Building2, BookOpen, Bot, Zap, ScrollText, Bell,
  Settings, ArrowRight, Command, Hash,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router]);

  const items: CommandItem[] = [
    { id: 'nova', label: 'Nova Demanda', section: 'Ações', icon: <Sparkles size={16} />, action: () => navigate('/dashboard/nova-demanda'), keywords: ['criar', 'new', 'demanda'] },
    { id: 'search', label: 'Consultar Demanda', section: 'Ações', icon: <Search size={16} />, action: () => navigate('/dashboard/consultar-demanda'), keywords: ['buscar', 'search', 'find'] },
    { id: 'overview', label: 'Overview', section: 'Navegação', icon: <LayoutDashboard size={16} />, action: () => navigate('/dashboard'), keywords: ['home', 'inicio'] },
    { id: 'suporte', label: 'Suporte', section: 'Navegação', icon: <Headphones size={16} />, action: () => navigate('/dashboard/suporte'), keywords: ['support', 'ticket'] },
    { id: 'dev', label: 'Desenvolvimento', section: 'Navegação', icon: <Code2 size={16} />, action: () => navigate('/dashboard/dev'), keywords: ['dev', 'engineering'] },
    { id: 'backlog', label: 'Backlog', section: 'Planejamento', icon: <ClipboardList size={16} />, action: () => navigate('/dashboard/backlog') },
    { id: 'kanban', label: 'Kanban Board', section: 'Planejamento', icon: <Kanban size={16} />, action: () => navigate('/dashboard/kanban') },
    { id: 'calendar', label: 'Calendário', section: 'Planejamento', icon: <CalendarDays size={16} />, action: () => navigate('/dashboard/calendario') },
    { id: 'metrics', label: 'Métricas', section: 'Análise', icon: <BarChart3 size={16} />, action: () => navigate('/dashboard/metricas') },
    { id: 'reports', label: 'Relatórios', section: 'Análise', icon: <FileBarChart size={16} />, action: () => navigate('/dashboard/relatorios') },
    { id: 'sla', label: 'SLA / Contratos', section: 'Análise', icon: <Shield size={16} />, action: () => navigate('/dashboard/sla') },
    { id: 'team', label: 'Equipe', section: 'Análise', icon: <Users size={16} />, action: () => navigate('/dashboard/equipe') },
    { id: 'releases', label: 'Releases', section: 'Análise', icon: <GitBranch size={16} />, action: () => navigate('/dashboard/releases') },
    { id: 'clients', label: 'Clientes', section: 'Gestão', icon: <Building2 size={16} />, action: () => navigate('/dashboard/clientes') },
    { id: 'knowledge', label: 'Base de Conhecimento', section: 'Gestão', icon: <BookOpen size={16} />, action: () => navigate('/dashboard/knowledge') },
    { id: 'automations', label: 'Automações', section: 'Gestão', icon: <Bot size={16} />, action: () => navigate('/dashboard/automacoes') },
    { id: 'integrations', label: 'Integrações', section: 'Sistema', icon: <Zap size={16} />, action: () => navigate('/dashboard/integracoes') },
    { id: 'logs', label: 'Logs / Auditoria', section: 'Sistema', icon: <ScrollText size={16} />, action: () => navigate('/dashboard/logs') },
    { id: 'notifications', label: 'Notificações', section: 'Sistema', icon: <Bell size={16} />, action: () => navigate('/dashboard/notificacoes') },
    { id: 'settings', label: 'Configurações', section: 'Sistema', icon: <Settings size={16} />, action: () => navigate('/dashboard/configuracoes') },
  ];

  const filtered = query.trim()
    ? items.filter(item => {
        const q = query.toLowerCase();
        return item.label.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.keywords?.some(k => k.includes(q));
      })
    : items;

  // Group by section
  const sections: Record<string, CommandItem[]> = {};
  filtered.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      filtered[selected].action();
    }
  };

  if (!open) return null;

  return (
    <div
      className="animate-backdrop"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg-overlay)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        className="animate-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          <Search size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, ações..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 15,
              fontFamily: 'var(--font-sans)',
            }}
          />
          <kbd style={{
            fontSize: 11, padding: '2px 6px',
            borderRadius: 4, background: 'var(--bg-input)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-primary)',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 && (
            <p style={{ padding: '24px 18px', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 13 }}>
              Nenhum resultado para &quot;{query}&quot;
            </p>
          )}
          {Object.entries(sections).map(([section, sectionItems]) => (
            <div key={section}>
              <p style={{
                padding: '8px 18px 4px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--text-tertiary)',
              }}>
                {section}
              </p>
              {sectionItems.map(item => {
                const globalIdx = filtered.indexOf(item);
                const isSelected = globalIdx === selected;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(globalIdx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 18px', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, fontFamily: 'var(--font-sans)',
                      background: isSelected ? 'var(--accent-blue-light)' : 'transparent',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                      transition: 'background 0.1s, color 0.1s',
                    }}
                  >
                    <span style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isSelected && <ArrowRight size={14} style={{ color: 'var(--accent-blue)' }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', gap: 16, fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          <span>↑↓ navegar</span>
          <span>↵ selecionar</span>
          <span>esc fechar</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Command size={11} /> K para buscar
          </span>
        </div>
      </div>
    </div>
  );
}
