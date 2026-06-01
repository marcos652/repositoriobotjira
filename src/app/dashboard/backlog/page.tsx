'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Loader2, WifiOff, RefreshCw,
  ExternalLink, ChevronDown, AlertTriangle
} from 'lucide-react';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    priority: { name: string };
    issuetype: { name: string };
    assignee?: { displayName: string };
    created: string;
    updated: string;
  };
}

const priorityStyle: Record<string, { bg: string; color: string }> = {
  'Highest': { bg: 'rgba(244,63,94,0.1)', color: '#FB7185' },
  'High': { bg: 'rgba(245,158,11,0.1)', color: '#FBBF24' },
  'Medium': { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA' },
  'Low': { bg: 'rgba(34,197,94,0.1)', color: '#4ADE80' },
  'Lowest': { bg: 'rgba(100,116,139,0.1)', color: '#94A3B8' },
};

const typeStyle: Record<string, { bg: string; color: string }> = {
  'Story': { bg: 'rgba(34,197,94,0.1)', color: '#4ADE80' },
  'Bug': { bg: 'rgba(244,63,94,0.1)', color: '#FB7185' },
  'Task': { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA' },
  'Sub-task': { bg: 'rgba(139,92,246,0.1)', color: '#A78BFA' },
};

export default function BacklogPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBacklog = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      // Fetch issues with status Backlog, To Do, or Open from DSMM project
      const res = await fetch('/api/jira/issues?project=DSMM&status=Backlog');
      const backlogData = await res.json();
      
      const res2 = await fetch('/api/jira/issues?project=DSMM&status=To Do');
      const todoData = await res2.json();

      const combined = [...(backlogData.issues || []), ...(todoData.issues || [])];
      // Deduplicate by key
      const seen = new Set<string>();
      const deduped = combined.filter((i: JiraIssue) => {
        if (seen.has(i.key)) return false;
        seen.add(i.key);
        return true;
      });
      setIssues(deduped);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBacklog(); }, [fetchBacklog]);

  const filtered = issues.filter(i => {
    const matchSearch = !search || i.key.toLowerCase().includes(search.toLowerCase()) || i.fields.summary.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || i.fields.issuetype.name === filterType;
    const matchPriority = filterPriority === 'all' || i.fields.priority.name === filterPriority;
    return matchSearch && matchType && matchPriority;
  });

  const types = [...new Set(issues.map(i => i.fields.issuetype.name))];
  const priorities = [...new Set(issues.map(i => i.fields.priority.name))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando backlog do Jira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.08)' }}>
            <WifiOff size={28} style={{ color: '#FB7185' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={() => fetchBacklog()} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <ClipboardList size={20} style={{ color: '#60A5FA' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Backlog</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{filtered.length} de {issues.length} itens • Dados do Jira</p>
          </div>
        </div>
        <button onClick={() => fetchBacklog(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', height: '40px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por chave ou título..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0 12px', height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">Todos os Tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '0 12px', height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">Todas Prioridades</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-secondary)' }}>
              {['Chave', 'Título', 'Tipo', 'Prioridade', 'Status', 'Responsável', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Nenhum item encontrado</td></tr>
            ) : filtered.map(issue => {
              const ts = typeStyle[issue.fields.issuetype.name] || typeStyle['Task'];
              const ps = priorityStyle[issue.fields.priority.name] || priorityStyle['Medium'];
              return (
                <tr key={issue.key} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: '#818CF8' }}>{issue.key}</span></td>
                  <td style={{ padding: '12px 16px', maxWidth: '400px' }}><span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.summary}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', ...ts }}>{issue.fields.issuetype.name}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', ...ps }}>{issue.fields.priority.name}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>{issue.fields.status.name}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{issue.fields.assignee?.displayName || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><a href={`https://movingpay.atlassian.net/browse/${issue.key}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)' }}><ExternalLink size={14} /></a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
