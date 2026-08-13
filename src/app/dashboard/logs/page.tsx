'use client';
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { ScrollText, Loader2, WifiOff, RefreshCw, Search, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface LogEntry { issueKey: string; summary: string; author: string; authorAvatar: string | null; date: string; field: string; from: string; to: string; }

interface RequestLogEntry {
  method: string;
  path: string;
  ip: string;
  who: string;
  identityType: 'service' | 'user' | 'anonymous';
  allowed: boolean;
  createdAt: string;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

const fieldLabels: Record<string, string> = { status: 'Status', assignee: 'Responsável', priority: 'Prioridade', summary: 'Título', description: 'Descrição', issuetype: 'Tipo', labels: 'Labels', Sprint: 'Sprint', resolution: 'Resolução', Fix_Version: 'Versão' };

type Tab = 'jira' | 'requests';

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('jira');

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterField, setFilterField] = useState('all');

  const [reqLogs, setReqLogs] = useState<RequestLogEntry[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqLoaded, setReqLoaded] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqFilter, setReqFilter] = useState<'all' | 'allowed' | 'blocked'>('all');

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

  async function fetchRequestLogs() {
    try {
      setReqLoading(true);
      const res = await fetch('/api/auth/request-logs');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReqLogs(data.logs || []);
      setReqError(null);
    } catch (e) {
      setReqError(e instanceof Error ? e.message : String(e));
    } finally {
      setReqLoading(false);
      setReqLoaded(true);
    }
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (tab === 'requests' && !reqLoaded) fetchRequestLogs(); }, [tab, reqLoaded]);

  const fields = [...new Set(logs.map(l => l.field))];
  const filtered = logs.filter(l => {
    const matchSearch = !search || l.issueKey.toLowerCase().includes(search.toLowerCase()) || l.author.toLowerCase().includes(search.toLowerCase()) || l.summary?.toLowerCase().includes(search.toLowerCase());
    const matchField = filterField === 'all' || l.field === filterField;
    return matchSearch && matchField;
  });

  const filteredReqLogs = reqLogs.filter(l => {
    if (reqFilter === 'allowed') return l.allowed;
    if (reqFilter === 'blocked') return !l.allowed;
    return true;
  });

  return (
    <div className="logs-root animate-fade-in">
      {/* Header */}
      <div className="logs-header">
        <div>
          <div>
            <h1 className="logs-title">Logs & Auditoria</h1>
            <p className="logs-subtitle">
              {tab === 'jira' ? `${filtered.length} de ${logs.length} atividades • Changelog do Jira` : `${filteredReqLogs.length} de ${reqLogs.length} requisições registradas`}
            </p>
          </div>
        </div>
        <button className="logs-refresh" onClick={() => tab === 'jira' ? fetchData(true) : fetchRequestLogs()} disabled={tab === 'jira' ? refreshing : reqLoading}>
          <RefreshCw size={14} className={(tab === 'jira' ? refreshing : reqLoading) ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="logs-tabs">
        <button className={`logs-tab ${tab === 'jira' ? 'logs-tab-active' : ''}`} onClick={() => setTab('jira')}>Atividade no Jira</button>
        <button className={`logs-tab ${tab === 'requests' ? 'logs-tab-active' : ''}`} onClick={() => setTab('requests')}>Requisições na API</button>
      </div>

      {tab === 'jira' ? (
        loading ? (
          <div className="logs-state"><Loader2 size={36} className="animate-spin" style={{ color: '#F59E0B' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando logs do Jira...</p></div>
        ) : error ? (
          <div className="logs-state"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro</p><button className="logs-retry" onClick={() => fetchData()}>Tentar novamente</button></div></div>
        ) : (
          <>
            {/* Filters */}
            <div className="logs-filters">
              <div className="logs-search">
                <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por issue, autor..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }} />
              </div>
              <select className="logs-select" value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="all">Todos os campos</option>
                {fields.map(f => <option key={f} value={f}>{fieldLabels[f] || f}</option>)}
              </select>
            </div>

            {/* Timeline */}
            <div className="logs-panel">
              {filtered.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <ScrollText size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma atividade encontrada</p>
                </div>
              ) : (
                <div style={{ padding: '8px' }}>
                  {filtered.map((log, i) => (
                    <div className="logs-row" key={i} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                      {log.authorAvatar ? <img src={log.authorAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} /> : (
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {log.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{log.author}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>{log.issueKey}</span>
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
          </>
        )
      ) : (
        reqLoading && !reqLoaded ? (
          <div className="logs-state"><Loader2 size={36} className="animate-spin" style={{ color: '#F59E0B' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando requisições...</p></div>
        ) : reqError ? (
          <div className="logs-state"><div className="text-center space-y-5"><ShieldX size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>{reqError}</p></div></div>
        ) : (
          <>
            <div className="logs-filters">
              <div className="logs-request-info">
                <ShieldAlert size={14} />
                IP, e-mail/usuário e rota de toda chamada POST/PUT/DELETE — mais recentes primeiro
              </div>
              <select className="logs-select" value={reqFilter} onChange={e => setReqFilter(e.target.value as 'all' | 'allowed' | 'blocked')}>
                <option value="all">Todas</option>
                <option value="allowed">Só permitidas</option>
                <option value="blocked">Só bloqueadas</option>
              </select>
            </div>

            <div className="logs-panel">
              {filteredReqLogs.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <ShieldCheck size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma requisição registrada ainda</p>
                </div>
              ) : (
                <div style={{ padding: '8px' }}>
                  {filteredReqLogs.map((log, i) => (
                    <div className="logs-row logs-request-row" key={i} style={{ borderBottom: i < filteredReqLogs.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                      {log.allowed
                        ? <ShieldCheck size={18} style={{ color: '#4ADE80', flexShrink: 0 }} />
                        : <ShieldX size={18} style={{ color: '#FB7185', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>{log.method}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>{log.path}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginLeft: 'auto' }}>{timeAgo(log.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <span><span style={{ color: 'var(--text-tertiary)' }}>quem:</span> {log.who} {log.identityType === 'service' && '(serviço)'} {log.identityType === 'anonymous' && '(anônimo)'}</span>
                          <span><span style={{ color: 'var(--text-tertiary)' }}>ip:</span> {log.ip}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      )}

      <style jsx>{`
        .logs-root { display: flex; flex-direction: column; gap: 24px; min-width: 0; min-height: 0; height: 100%; }
        .logs-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; flex-shrink: 0; }
        .logs-title { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -.02em; }
        .logs-subtitle { margin: 6px 0 0; color: var(--text-tertiary); font-size: 14px; }
        .logs-refresh { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); font: 600 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s; }
        .logs-refresh:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
        .logs-refresh:disabled { opacity: .55; cursor: not-allowed; }
        .logs-tabs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .logs-tab { min-height: 40px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-tertiary); font: 600 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .logs-tab:hover { background: var(--bg-secondary); color: var(--text-secondary); }
        .logs-tab-active { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.25); color: #FBBF24; }
        .logs-filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .logs-search, .logs-request-info { flex: 1 1 260px; min-width: 0; height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .logs-request-info { color: var(--text-tertiary); font-size: 12px; }
        .logs-select { height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font: 600 12px var(--font-sans); cursor: pointer; outline: none; }
        .logs-select:focus { border-color: #F59E0B; }
        .logs-panel { flex: 1; min-height: 300px; overflow: auto; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .logs-row { display: flex; gap: 12px; padding: 16px 18px; transition: background .15s; }
        .logs-row:hover { background: var(--bg-secondary); }
        .logs-request-row { align-items: center; }
        .logs-state { flex: 1; min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .logs-retry { min-height: 40px; padding: 0 16px; border-radius: 8px; border: 1px solid #F59E0B; background: #F59E0B; color: #fff; font: 700 13px var(--font-sans); cursor: pointer; }
        @media (max-width: 640px) {
          .logs-root { height: auto; }
          .logs-title { font-size: 28px; line-height: 34px; }
          .logs-refresh { width: 100%; }
          .logs-tabs { display: grid; grid-template-columns: 1fr 1fr; }
          .logs-filters { align-items: stretch; }
          .logs-search, .logs-request-info, .logs-select { width: 100%; }
          .logs-request-info { height: auto; min-height: 48px; padding-top: 8px; padding-bottom: 8px; }
          .logs-panel, .logs-state { min-height: 420px; }
          .logs-row { padding: 14px; }
        }
      `}</style>
    </div>
  );
}
