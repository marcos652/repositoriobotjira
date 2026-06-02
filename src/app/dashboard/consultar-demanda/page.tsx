'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Loader2, CheckCircle2, AlertTriangle, X, ExternalLink,
  FileText, User, Tag, Clock, Edit3, Save, ArrowUpRight,
  Sparkles, Building2, MessageCircle, GitBranch,
  GitPullRequest, GitMerge, Send, Copy, Link2,
  Paperclip, ListTree, ArrowRight, Timer, ChevronDown,
  Activity, Shield, Calendar
} from 'lucide-react';

// ─── Types ───
interface CommentData { id: string; author: string; authorAvatar: string | null; body: string; created: string; }
interface PullRequestData { id: string; title: string; status: string; url: string; author: string | null; source: string | null; destination: string | null; reviewers: string[]; }
interface SubtaskData { key: string; summary: string; status: string; issuetype: string; }
interface LinkedIssueData { key: string; summary: string; status: string; type: string; direction: string; }
interface AttachmentData { id: string; filename: string; size: number; mimeType: string; url: string; thumbnail: string | null; author: string; created: string; }
interface TransitionData { id: string; name: string; to: string; }
interface ChangelogEntry { author: string; authorAvatar: string | null; created: string; items: { field: string; from: string; to: string; }[]; }
interface SprintData { id: number; name: string; state: string; startDate: string; endDate: string; }
interface TimeTrackingData { originalEstimate: string | null; remainingEstimate: string | null; timeSpent: string | null; }

interface DemandaData {
  success: boolean; issue_key: string; summary: string | null; texto: string | null; textoHtml: string | null;
  nome_cliente: string | null; status: string | null; statusCategory: string | null;
  issuetype: string | null; priority: string | null; assignee: string | null;
  assigneeId: string | null; reporter: string | null; created: string | null; updated: string | null;
  labels: string[]; comments: CommentData[]; subtasks: SubtaskData[];
  linkedIssues: LinkedIssueData[]; attachments: AttachmentData[];
  transitions: TransitionData[]; sprint: SprintData | null;
  pullRequests: PullRequestData[]; changelog: ChangelogEntry[];
  timeTracking: TimeTrackingData | null; url: string;
}

// ─── Helpers ───
const SEARCH_HISTORY_KEY = 'jiraops_search_history';
function loadHistory(): string[] { try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); } catch { return []; } }
function saveHistory(h: string[]) { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(h.slice(0, 10))); }
function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function formatDateTime(d: string) { return `${new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; }
function formatBytes(b: number) { return b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`; }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function ConsultarDemandaPage() {
  const [searchKey, setSearchKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [demanda, setDemanda] = useState<DemandaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTexto, setEditTexto] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editReporter, setEditReporter] = useState('');
  const [editCliente, setEditCliente] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // New features state
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity' | 'dev'>('details');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Jira users for assignee search
  const [jiraUsers, setJiraUsers] = useState<{ accountId: string; displayName: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => { setSearchHistory(loadHistory()); }, []);

  // Fetch Jira users when editing starts
  useEffect(() => {
    if (!editing) return;
    fetch('/api/jira-users')
      .then(r => r.json())
      .then(data => { if (data.users) setJiraUsers(data.users); })
      .catch(() => {});
  }, [editing]);

  const handleSearch = useCallback(async (keyOverride?: string) => {
    let key = (keyOverride || searchKey).trim();
    if (!key) return;

    const isExactKey = /^[a-zA-Z]+-\d+$/.test(key);
    const isNumber = /^\d+$/.test(key);
    const isKeySearch = isExactKey || isNumber;

    if (isNumber) key = `DSMM-${key}`;
    if (isKeySearch) key = key.toUpperCase();

    setLoading(true); setError(null); setDemanda(null); setSearchResults(null); setEditing(false);
    setUpdateResult(null); setActiveTab('details'); setShowHistory(false);

    try {
      if (isKeySearch) {
        const res = await fetch(`/api/demanda/${key}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setDemanda(data);
          setEditTexto(data.texto || '');
          setEditSummary(data.summary || '');
          setEditPriority(data.priority || '');
          setEditAssignee(data.assignee || '');
          setEditAssigneeId(data.assigneeId || '');
          setEditReporter(data.reporter || '');
          setEditCliente(data.nome_cliente || '');
          const h = [key, ...loadHistory().filter(k => k !== key)].slice(0, 10);
          saveHistory(h); setSearchHistory(h);
        } else {
          setError(data.error || 'Demanda não encontrada');
        }
      } else {
        const res = await fetch(`/api/search-demanda?q=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setSearchResults(data.results);
          if (data.results.length === 0) setError('Nenhuma demanda encontrada com esse termo.');
          const h = [key, ...loadHistory().filter(k => k !== key)].slice(0, 10);
          saveHistory(h); setSearchHistory(h);
        } else {
          setError(data.error || 'Erro na busca textual');
        }
      }
    } catch { setError('Erro de conexão'); }
    finally { setLoading(false); }
  }, [searchKey]);

  const handleUpdate = async () => {
    if (!demanda) return;
    setUpdating(true); setUpdateResult(null);
    const body: any = {};
    if (editTexto !== (demanda.texto || '')) body.description = editTexto;
    if (editSummary !== (demanda.summary || '')) body.summary = editSummary;
    if (editPriority !== (demanda.priority || '')) body.priority = editPriority;
    if (editAssigneeId !== (demanda.assigneeId || '')) body.assignee = editAssigneeId;
    if (editCliente !== (demanda.nome_cliente || '')) body.cliente = editCliente;
    if (Object.keys(body).length === 0) { setUpdateResult({ success: false, message: 'Nenhuma alteração' }); setUpdating(false); return; }
    try {
      const res = await fetch(`/api/atualizar-demanda/${demanda.issue_key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) { setUpdateResult({ success: true, message: 'Atualizada!' }); setEditing(false); setTimeout(() => handleSearch(demanda.issue_key), 1500); }
      else setUpdateResult({ success: false, message: data.error || 'Erro' });
    } catch { setUpdateResult({ success: false, message: 'Erro de conexão' }); }
    finally { setUpdating(false); }
  };

  const handleAddComment = async () => {
    if (!demanda || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/demanda/${demanda.issue_key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', comment: newComment.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setNewComment(''); handleSearch(demanda.issue_key); }
      else setUpdateResult({ success: false, message: data.error || 'Erro ao comentar' });
    } catch { setUpdateResult({ success: false, message: 'Erro de conexão' }); }
    finally { setSendingComment(false); }
  };

  const handleTransition = async (transitionId: string) => {
    if (!demanda) return;
    setTransitioning(true);
    try {
      const res = await fetch(`/api/demanda/${demanda.issue_key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', transitionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) { handleSearch(demanda.issue_key); }
      else setUpdateResult({ success: false, message: data.error || 'Erro ao transicionar' });
    } catch { setUpdateResult({ success: false, message: 'Erro de conexão' }); }
    finally { setTransitioning(false); }
  };

  const copyLink = () => {
    if (!demanda) return;
    navigator.clipboard.writeText(demanda.url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const issueTypeColor = (type: string | null) => {
    switch (type) {
      case 'Bug': return { bg: 'rgba(244,63,94,0.12)', color: '#FB7185', border: 'rgba(244,63,94,0.15)' };
      case 'Story': return { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: 'rgba(34,197,94,0.15)' };
      default: return { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: 'rgba(59,130,246,0.15)' };
    }
  };

  const statusColor = (cat: string | null) => {
    switch (cat) {
      case 'done': return { bg: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: 'rgba(34,197,94,0.12)' };
      case 'indeterminate': return { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: 'rgba(59,130,246,0.12)' };
      default: return { bg: 'rgba(245,158,11,0.1)', color: '#FBBF24', border: 'rgba(245,158,11,0.12)' };
    }
  };

  const S = {
    label: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' } as React.CSSProperties,
    card: { padding: '14px 18px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' } as React.CSSProperties,
    badge: (bg: string, color: string, border: string): React.CSSProperties => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: bg, color, border: `1px solid ${border}` }),
    tab: (active: boolean): React.CSSProperties => ({ padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', color: active ? '#818CF8' : 'var(--text-tertiary)' }),
  };

  return (
    <div className="cd-root animate-fade-in">

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.12)' }}>
            <Search size={20} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Consultar & Editar Demanda</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Visualize, edite, comente e mude o status das demandas</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '14px', height: '48px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input type="text" value={searchKey}
              onChange={e => setSearchKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              placeholder="Ex: DSMM-123 ou Erro de Login..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }} />
            {searchKey && <button onClick={() => { setSearchKey(''); setDemanda(null); setSearchResults(null); setError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><X size={14} /></button>}
          </div>
          <button onClick={() => handleSearch()} disabled={loading || !searchKey.trim()} style={{ padding: '0 24px', borderRadius: '14px', height: '48px', background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(59,130,246,0.2)' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar
          </button>
        </div>

        {/* Search history dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div style={{ position: 'absolute', top: '56px', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '6px', maxHeight: '240px', overflow: 'auto' }}>
            <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Buscas recentes</div>
            {searchHistory.map((k) => (
              <button key={k} onMouseDown={() => { setSearchKey(k.replace('DSMM-', '')); handleSearch(k); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textAlign: 'left', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <Clock size={12} style={{ color: 'var(--text-tertiary)' }} /> {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error / Update Result */}
      {error && (
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '14px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)', marginBottom: '20px' }}>
          <AlertTriangle size={18} style={{ color: '#FB7185' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#FB7185' }}>{error}</span>
        </div>
      )}
      {updateResult && (
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '14px', marginBottom: '20px', background: updateResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${updateResult.success ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)'}` }}>
          {updateResult.success ? <CheckCircle2 size={16} style={{ color: '#4ADE80' }} /> : <AlertTriangle size={16} style={{ color: '#FB7185' }} />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: updateResult.success ? '#4ADE80' : '#FB7185' }}>{updateResult.message}</span>
        </div>
      )}

      {/* Search Results List */}
      {!demanda && searchResults && searchResults.length > 0 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Resultados da busca ({searchResults.length})</h2>
          {searchResults.map(res => (
            <div key={res.key} onClick={() => { setSearchKey(res.key); handleSearch(res.key); }} className="group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-indigo)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-secondary)')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={S.badge(issueTypeColor('Story').bg, issueTypeColor('Story').color, issueTypeColor('Story').border)}>{res.key}</span>
                  <span style={S.badge(statusColor(res.statusCategory).bg, statusColor(res.statusCategory).color, statusColor(res.statusCategory).border)}>{res.status}</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="group-hover:text-indigo-400 transition-colors">{res.summary}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {res.assignee}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(res.created)}</span>
                </div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', color: 'var(--text-tertiary)' }} className="group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                <ArrowRight size={18} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DEMANDA CARD ── */}
      {demanda && (
        <div className="animate-fade-in" style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #A78BFA)' }} />

          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-secondary)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{demanda.issue_key}</span>
              {demanda.issuetype && (() => { const c = issueTypeColor(demanda.issuetype); return <span style={S.badge(c.bg, c.color, c.border)}>{demanda.issuetype}</span>; })()}
              {demanda.status && (() => { const c = statusColor(demanda.statusCategory); return <span style={S.badge(c.bg, c.color, c.border)}>{demanda.status}</span>; })()}
              {demanda.priority && <span style={S.badge('rgba(245,158,11,0.08)', '#FBBF24', 'rgba(245,158,11,0.1)')}>{demanda.priority}</span>}
              {demanda.sprint && <span style={{ ...S.badge('rgba(139,92,246,0.08)', '#A78BFA', 'rgba(139,92,246,0.1)'), display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} /> {demanda.sprint.name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Status transition dropdown */}
              {demanda.transitions.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select disabled={transitioning} onChange={e => { if (e.target.value) handleTransition(e.target.value); e.target.value = ''; }}
                    style={{ padding: '8px 28px 8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'rgba(34,197,94,0.06)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.1)', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1L5 5L9 1\' stroke=\'%234ADE80\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                    <option value="">Mover para...</option>
                    {demanda.transitions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(99,102,241,0.08)', color: '#818CF8', border: 'none', cursor: 'pointer' }}>
                {copied ? <><CheckCircle2 size={14} /> Copiado!</> : <><Copy size={14} /> Link</>}
              </button>
              <button onClick={() => { setEditing(!editing); setUpdateResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: editing ? 'rgba(244,63,94,0.08)' : 'rgba(99,102,241,0.08)', color: editing ? '#FB7185' : '#818CF8', border: 'none', cursor: 'pointer' }}>
                {editing ? <><X size={14} /> Cancelar</> : <><Edit3 size={14} /> Editar</>}
              </button>
              <a href={demanda.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', textDecoration: 'none', boxShadow: '0 2px 8px rgba(59,130,246,0.2)' }}>
                Jira <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid var(--border-secondary)', overflowX: 'auto' }}>
            {[
              { id: 'details' as const, label: 'Detalhes', icon: <FileText size={13} /> },
              { id: 'comments' as const, label: `Comentários (${demanda.comments.length})`, icon: <MessageCircle size={13} /> },
              { id: 'activity' as const, label: `Atividade (${demanda.changelog.length})`, icon: <Activity size={13} /> },
              { id: 'dev' as const, label: `Dev (${demanda.pullRequests.length + demanda.subtasks.length})`, icon: <GitBranch size={13} /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...S.tab(activeTab === tab.id), display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px' }}>

            {/* ═══ DETAILS TAB ═══ */}
            {activeTab === 'details' && (
              <>
                {/* Summary */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={S.label}><FileText size={12} /> Título</label>
                  {editing ? (
                    <input value={editSummary} onChange={e => setEditSummary(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  ) : (
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{demanda.summary || '—'}</p>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={S.label}><Sparkles size={12} /> Descrição</label>
                  {editing ? (
                    <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={6} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
                  ) : demanda.textoHtml ? (
                    <div className="jira-description" style={{ padding: '18px 22px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', maxHeight: '600px', overflow: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: demanda.textoHtml }} />
                  ) : (
                    <div style={{ padding: '14px 18px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.7, background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '400px', overflow: 'auto' }}>
                      {demanda.texto || 'Sem descrição'}
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div className="cd-info-grid">
                  {/* Cliente */}
                  <div style={S.card}>
                    <label style={S.label}><Building2 size={11} /> Cliente</label>
                    {editing ? (
                      <input value={editCliente} onChange={e => setEditCliente(e.target.value)} placeholder="Nome do cliente" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.nome_cliente || '—'}</p>
                    )}
                  </div>

                  {/* Prioridade */}
                  <div style={S.card}>
                    <label style={S.label}><Tag size={11} /> Prioridade</label>
                    {editing ? (
                      <select value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                        <option value="Highest">Highest</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Lowest">Lowest</option>
                      </select>
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.priority || '—'}</p>
                    )}
                  </div>

                  {/* Responsável */}
                  <div style={{ ...S.card, position: 'relative' }}>
                    <label style={S.label}><User size={11} /> Responsável</label>
                    {editing ? (
                      <>
                        <input
                          value={userSearch || editAssignee}
                          onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                          onFocus={() => setShowUserDropdown(true)}
                          onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                          placeholder="Buscar usuário..."
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                        {showUserDropdown && jiraUsers.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '200px', overflow: 'auto', marginTop: '4px' }}>
                            {jiraUsers
                              .filter(u => !userSearch || u.displayName.toLowerCase().includes(userSearch.toLowerCase()))
                              .map(u => (
                                <button key={u.accountId} onMouseDown={() => { setEditAssignee(u.displayName); setEditAssigneeId(u.accountId); setUserSearch(''); setShowUserDropdown(false); }}
                                  style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                  {u.displayName}
                                </button>
                              ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.assignee || 'Não atribuído'}</p>
                    )}
                  </div>

                  {/* Relator */}
                  <div style={S.card}>
                    <label style={S.label}><User size={11} /> Relator</label>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.reporter || '—'}</p>
                  </div>

                  {/* Criado */}
                  <div style={S.card}>
                    <label style={S.label}><Clock size={11} /> Criado</label>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{formatDate(demanda.created)}</p>
                  </div>

                  {/* Atualizado */}
                  <div style={S.card}>
                    <label style={S.label}><Clock size={11} /> Atualizado</label>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{formatDate(demanda.updated)}</p>
                  </div>
                </div>

                {/* Time Tracking */}
                {demanda.timeTracking && (demanda.timeTracking.originalEstimate || demanda.timeTracking.timeSpent) && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Timer size={12} /> Time Tracking</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {demanda.timeTracking.originalEstimate && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Estimado</div><div style={{ fontSize: '14px', fontWeight: 800, color: '#60A5FA' }}>{demanda.timeTracking.originalEstimate}</div></div>}
                      {demanda.timeTracking.timeSpent && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Gasto</div><div style={{ fontSize: '14px', fontWeight: 800, color: '#4ADE80' }}>{demanda.timeTracking.timeSpent}</div></div>}
                      {demanda.timeTracking.remainingEstimate && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Restante</div><div style={{ fontSize: '14px', fontWeight: 800, color: '#FBBF24' }}>{demanda.timeTracking.remainingEstimate}</div></div>}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {demanda.labels.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Tag size={12} /> Labels</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {demanda.labels.map(l => <span key={l} style={S.badge('rgba(99,102,241,0.06)', '#818CF8', 'rgba(99,102,241,0.1)')}>{l}</span>)}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {demanda.attachments.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Paperclip size={12} /> Anexos ({demanda.attachments.length})</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {demanda.attachments.map(a => (
                        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none', transition: 'all 0.15s', maxWidth: '250px' }}>
                          {a.thumbnail ? <img src={a.thumbnail} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} /> : <Paperclip size={14} style={{ color: 'var(--text-tertiary)' }} />}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.filename}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatBytes(a.size)}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Issues */}
                {demanda.linkedIssues.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Link2 size={12} /> Issues Vinculadas ({demanda.linkedIssues.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {demanda.linkedIssues.map((link, i) => (
                        <a key={i} href={`https://movingpay.atlassian.net/browse/${link.key}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none', transition: 'all 0.15s' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, minWidth: '80px' }}>{link.type}</span>
                          <ArrowRight size={12} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#818CF8' }}>{link.key}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.summary}</span>
                          <span style={S.badge('rgba(245,158,11,0.08)', '#FBBF24', 'rgba(245,158,11,0.1)')}>{link.status}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                {editing && (
                  <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                    <button onClick={handleUpdate} disabled={updating} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, background: updating ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff', border: 'none', cursor: updating ? 'wait' : 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.2)' }}>
                      {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {updating ? 'Atualizando...' : 'Salvar alterações'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ═══ COMMENTS TAB ═══ */}
            {activeTab === 'comments' && (
              <>
                {/* Add comment */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escreva um comentário..." rows={3}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment(); }}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Ctrl+Enter para enviar</span>
                    <button onClick={handleAddComment} disabled={sendingComment || !newComment.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: !newComment.trim() ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', border: 'none', cursor: sendingComment ? 'wait' : 'pointer', boxShadow: newComment.trim() ? '0 2px 8px rgba(59,130,246,0.2)' : 'none' }}>
                      {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
                    </button>
                  </div>
                </div>

                {/* Comments list */}
                {demanda.comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                    <MessageCircle size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhum comentário</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {demanda.comments.map((c, i) => (
                      <div key={i} style={S.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          {c.authorAvatar ? <img src={c.authorAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '8px' }} /> : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
                              {c.author.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.author}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginLeft: 'auto' }}>{formatDateTime(c.created)}</span>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ═══ ACTIVITY TAB ═══ */}
            {activeTab === 'activity' && (
              <>
                {demanda.changelog.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                    <Activity size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma atividade registrada</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {demanda.changelog.map((entry, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                        {entry.authorAvatar ? <img src={entry.authorAvatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0 }} /> : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {entry.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{entry.author}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{timeAgo(entry.created)}</span>
                          </div>
                          {entry.items.map((item, j) => (
                            <div key={j} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>{item.field}</span>
                              {item.from && <> de <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{item.from}</span></>}
                              {item.to && <> para <span style={{ fontWeight: 700, color: '#818CF8' }}>{item.to}</span></>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ═══ DEV TAB ═══ */}
            {activeTab === 'dev' && (
              <>
                {/* PRs */}
                {demanda.pullRequests.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={S.label}><GitPullRequest size={12} /> Pull Requests ({demanda.pullRequests.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {demanda.pullRequests.map((pr, i) => {
                        const sc = pr.status === 'MERGED' ? { bg: 'rgba(34,197,94,0.08)', color: '#4ADE80', border: 'rgba(34,197,94,0.15)', icon: GitMerge }
                          : pr.status === 'DECLINED' ? { bg: 'rgba(244,63,94,0.08)', color: '#FB7185', border: 'rgba(244,63,94,0.15)', icon: X }
                          : { bg: 'rgba(59,130,246,0.08)', color: '#60A5FA', border: 'rgba(59,130,246,0.15)', icon: GitPullRequest };
                        const Icon = sc.icon;
                        return (
                          <div key={i} style={{ padding: '14px 18px', borderRadius: '12px', background: sc.bg, border: `1px solid ${sc.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                              <Icon size={16} style={{ color: sc.color }} />
                              <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', flex: 1 }}>{pr.title}</a>
                              <span style={S.badge(sc.bg, sc.color, sc.border)}>{pr.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {pr.source && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}><GitBranch size={11} /> {pr.source} {pr.destination && <>→ {pr.destination}</>}</span>}
                              {pr.author && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>por {pr.author}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                {demanda.subtasks.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={S.label}><ListTree size={12} /> Subtasks ({demanda.subtasks.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {demanda.subtasks.map((st, i) => (
                        <a key={i} href={`https://movingpay.atlassian.net/browse/${st.key}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#818CF8' }}>{st.key}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.summary}</span>
                          <span style={S.badge('rgba(245,158,11,0.08)', '#FBBF24', 'rgba(245,158,11,0.1)')}>{st.status}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {demanda.pullRequests.length === 0 && demanda.subtasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                    <GitBranch size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma info de desenvolvimento</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !demanda && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.08)', marginBottom: '16px' }}>
            <Search size={28} style={{ color: 'rgba(129,140,248,0.4)' }} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Digite o número da demanda acima</p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Ex: 86, 84, 47</p>
          {searchHistory.length > 0 && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {searchHistory.slice(0, 5).map(k => (
                <button key={k} onClick={() => { setSearchKey(k.replace('DSMM-', '')); handleSearch(k); }}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(99,102,241,0.06)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.08)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .cd-root { width: 100%; max-width: 1100px; margin: 0 auto; padding: 8px 0; }
        .cd-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 900px) { .cd-info-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .cd-root { padding: 4px 0; } .cd-info-grid { grid-template-columns: 1fr; } }

        /* Jira description rich formatting */
        .jira-description { font-size: 13px; line-height: 1.8; color: var(--text-secondary); word-break: break-word; }
        .jira-description h1 { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 20px 0 10px; }
        .jira-description h2 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 18px 0 8px; }
        .jira-description h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 16px 0 6px; }
        .jira-description h4, .jira-description h5, .jira-description h6 { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 14px 0 4px; }
        .jira-description p { margin: 8px 0; }
        .jira-description ul, .jira-description ol { margin: 8px 0; padding-left: 24px; }
        .jira-description li { margin: 4px 0; }
        .jira-description ul li { list-style: disc; }
        .jira-description ol li { list-style: decimal; }
        .jira-description a { color: #818CF8; text-decoration: none; font-weight: 600; }
        .jira-description a:hover { text-decoration: underline; }
        .jira-description strong, .jira-description b { font-weight: 700; color: var(--text-primary); }
        .jira-description em, .jira-description i { font-style: italic; }
        .jira-description code { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 2px 6px; border-radius: 4px; background: rgba(99,102,241,0.08); color: #A78BFA; }
        .jira-description pre { background: rgba(0,0,0,0.2); border: 1px solid var(--border-secondary); border-radius: 8px; padding: 14px 18px; overflow-x: auto; margin: 12px 0; }
        .jira-description pre code { background: none; padding: 0; color: var(--text-secondary); }
        .jira-description blockquote { margin: 12px 0; padding: 10px 16px; border-left: 3px solid #818CF8; background: rgba(99,102,241,0.04); border-radius: 0 8px 8px 0; }
        .jira-description table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
        .jira-description th { background: rgba(99,102,241,0.08); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--text-primary); border: 1px solid var(--border-secondary); }
        .jira-description td { padding: 8px 14px; border: 1px solid var(--border-secondary); }
        .jira-description tr:nth-child(even) td { background: rgba(0,0,0,0.05); }
        .jira-description img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .jira-description hr { border: none; border-top: 1px solid var(--border-secondary); margin: 16px 0; }
        .jira-description .panel { padding: 12px 16px; border-radius: 8px; margin: 10px 0; border: 1px solid var(--border-secondary); background: rgba(99,102,241,0.03); }
        .jira-description .user-hover { color: #818CF8; font-weight: 600; }
      `}</style>
    </div>
  );
}
