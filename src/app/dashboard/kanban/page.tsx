'use client';

import Link from 'next/link';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Kanban, Loader2, WifiOff, RefreshCw, ExternalLink, GripVertical, Trash2
} from 'lucide-react';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    priority: { name: string };
    issuetype: { name: string };
    assignee?: { displayName: string; avatarUrls?: Record<string, string> };
  };
}

interface KanbanColumn {
  title: string;
  color: string;
  bgColor: string;
  statusCategory: string;
  items: JiraIssue[];
}

const typeColor: Record<string, { bg: string; color: string }> = {
  'Story': { bg: 'rgba(34,197,94,0.1)', color: '#4ADE80' },
  'Bug': { bg: 'rgba(244,63,94,0.1)', color: '#FB7185' },
  'Task': { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA' },
  'Sub-task': { bg: 'rgba(139,92,246,0.1)', color: '#A78BFA' },
};

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchKanban = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);

      // Fetch ALL non-done issues from DSMM
      const res = await fetch('/api/jira/issues?project=DSMM');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const issues: JiraIssue[] = data.issues || [];
      setTotal(issues.length);

      // Group by status name
      const statusGroups = new Map<string, JiraIssue[]>();
      for (const issue of issues) {
        const status = issue.fields.status.name;
        if (!statusGroups.has(status)) statusGroups.set(status, []);
        statusGroups.get(status)!.push(issue);
      }

      // Define column order and colors
      const columnConfig: { title: string; color: string; bgColor: string; match: string[] }[] = [
        { title: 'Backlog', color: '#94A3B8', bgColor: 'rgba(100,116,139,0.06)', match: ['Backlog', 'Open'] },
        { title: 'To Do', color: '#818CF8', bgColor: 'rgba(99,102,241,0.06)', match: ['Para Fazer', 'To Do', 'A Fazer', 'Selected for Development'] },
        { title: 'In Progress', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.06)', match: ['Em Andamento', 'In Progress', 'Em andamento'] },
        { title: 'Refinamento', color: '#A78BFA', bgColor: 'rgba(139,92,246,0.06)', match: ['Refinamento', 'Refinement'] },
        { title: 'Code Review', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.06)', match: ['Code Review', 'Revisão', 'Review'] },
        { title: 'QA', color: '#F97316', bgColor: 'rgba(249,115,22,0.06)', match: ['QA', 'Teste', 'Testing'] },
        { title: 'Done', color: '#4ADE80', bgColor: 'rgba(34,197,94,0.06)', match: ['Concluído', 'Done', 'Closed', 'Resolved', 'Concluido'] },
      ];

      const result: KanbanColumn[] = [];
      const used = new Set<string>();

      for (const config of columnConfig) {
        const items: JiraIssue[] = [];
        for (const match of config.match) {
          const group = statusGroups.get(match);
          if (group) {
            items.push(...group);
            used.add(match);
          }
        }
        if (items.length > 0) {
          result.push({ ...config, statusCategory: config.title, items });
        }
      }

      // Add any unmapped statuses
      for (const [status, items] of statusGroups) {
        if (!used.has(status)) {
          result.push({ title: status, color: '#818CF8', bgColor: 'rgba(99,102,241,0.06)', statusCategory: status, items });
        }
      }

      setColumns(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir a demanda ${key}? Esta ação não pode ser desfeita.`)) return;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/demanda/${key}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKanban();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Erro ao excluir');
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setDeletingKey(null);
    }
  };

  useEffect(() => { fetchKanban(); }, [fetchKanban]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando board do Jira...</p>
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
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar board</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={() => fetchKanban()} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}>
            <Kanban size={20} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Kanban Board</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{total} issues • {columns.length} colunas • Jira DSMM</p>
          </div>
        </div>
        <button onClick={() => fetchKanban(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', flex: 1, paddingBottom: '12px' }}>
        {columns.map((col) => (
          <div key={col.title} style={{ minWidth: '280px', maxWidth: '320px', flex: '1 0 280px', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: col.bgColor, border: '1px solid var(--border-secondary)', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${col.color}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.title}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: `${col.color}15`, color: col.color }}>{col.items.length}</span>
            </div>

            {/* Cards */}
            <div style={{ padding: '10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 250px)' }}>
              {col.items.map(issue => {
                const tc = typeColor[issue.fields.issuetype.name] || typeColor['Task'];
                return (
                  <Link key={issue.key} href={`/dashboard/consultar-demanda?key=${issue.key}`}
                    style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer', display: 'block' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: '#818CF8' }}>{issue.key}</span>
                        <button onClick={(e) => handleDelete(e, issue.key)} disabled={deletingKey === issue.key} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FB7185', padding: 0, display: 'flex', opacity: deletingKey === issue.key ? 0.5 : 1 }}>
                          {deletingKey === issue.key ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', ...tc }}>{issue.fields.issuetype.name}</span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{issue.fields.summary}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {issue.fields.assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff' }}>
                            {issue.fields.assignee.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.assignee.displayName}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Sem responsável</span>
                      )}
                      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.08)', color: '#FBBF24' }}>{issue.fields.priority.name}</span>
                    </div>
                  </Link>
                );
              })}
              {col.items.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600 }}>Nenhuma issue</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
