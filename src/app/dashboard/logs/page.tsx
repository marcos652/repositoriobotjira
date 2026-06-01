'use client';
import React, { useEffect, useState } from 'react';
import { ScrollText, Loader2, WifiOff, RefreshCw, Search, Filter } from 'lucide-react';

interface LogEntry { issueKey: string; summary: string; author: string; authorAvatar: string | null; date: string; field: string; from: string; to: string; }

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

const fieldLabels: Record<string, string> = { status: 'Status', assignee: 'Responsável', priority: 'Prioridade', summary: 'Título', description: 'Descrição', issuetype: 'Tipo', labels: 'Labels', Sprint: 'Sprint', resolution: 'Resolução', Fix_Version: 'Versão' };

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterField, setFilterField] = useState('all');

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/jira/team');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.activityLog || []);
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const fields = [...new Set(logs.map(l => l.field))];
  const filtered = logs.filter(l => {
    const matchSearch = !search || l.issueKey.toLowerCase().includes(search.toLowerCase()) || l.author.toLowerCase().includes(search.toLowerCase()) || l.summary?.toLowerCase().includes(search.toLowerCase());
    const matchField = filterField === 'all' || l.field === filterField;
    return matchSearch && matchField;
  });

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#F59E0B' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando logs do Jira...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro</p><button onClick={() => fetchData()} style={{ padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Tentar novamente</button></div></div>;

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <ScrollText size={20} style={{ color: '#FBBF24' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Logs & Auditoria</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{filtered.length} de {logs.length} atividades • Changelog do Jira</p>
          </div>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', height: '40px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por issue, autor..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }} />
        </div>
        <select value={filterField} onChange={e => setFilterField(e.target.value)} style={{ padding: '0 12px', height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">Todos os campos</option>
          {fields.map(f => <option key={f} value={f}>{fieldLabels[f] || f}</option>)}
        </select>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', borderRadius: '16px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <ScrollText size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {filtered.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-secondary)' : 'none', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {log.authorAvatar ? <img src={log.authorAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} /> : (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {log.author.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{log.author}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>{log.issueKey}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginLeft: 'auto' }}>{timeAgo(log.date)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>{fieldLabels[log.field] || log.field}</span>
                    {log.from && <> de <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{log.from}</span></>}
                    {log.to && <> para <span style={{ fontWeight: 700, color: '#818CF8' }}>{log.to}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
