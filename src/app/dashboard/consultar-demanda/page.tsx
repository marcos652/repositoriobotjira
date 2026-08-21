'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Loader2, CheckCircle2, AlertTriangle, X,
  FileText, User, Tag, Clock, Edit3, Save, ArrowUpRight,
  Sparkles, Building2, MessageCircle, GitBranch,
  GitPullRequest, GitMerge, Send, Copy, Link2,
  Paperclip, ListTree, ArrowRight, Timer, ChevronDown,
  Activity, Shield, Calendar, Trash2, Plus
} from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// ─── Types ───
interface CommentData { id: string; author: string; authorAvatar: string | null; body: string; bodyHtml: string | null; created: string; }
interface CommentImage { id: string; filename: string; preview: string; }
interface PullRequestData { id: string; title: string; status: string; url: string; author: string | null; source: string | null; destination: string | null; reviewers: string[]; }
interface BranchData { name: string; url: string | null; repository: string | null; lastCommitDate: string | null; lastCommitMessage: string | null; }
interface BuildData { pipeline: string; buildNumber: number | string | null; url: string | null; state: string | null; lastUpdated: string | null; testResults: { passed: number; failed: number; skipped: number } | null; }
interface DevSummary { branches: number; commits: number; pullRequests: number; builds: { count: number; state: string | null } }
interface SubtaskData { key: string; summary: string; status: string; issuetype: string; }
interface LinkedIssueData { key: string; summary: string; status: string; type: string; direction: string; }
interface AttachmentData { id: string; filename: string; size: number; mimeType: string; url: string; thumbnail: string | null; author: string; created: string; }
interface TransitionData { id: string; name: string; to: string; }
interface ChangelogEntry { author: string; authorAvatar: string | null; created: string; items: { field: string; from: string; to: string; }[]; }
interface SprintData { id: number; name: string; state: string; startDate: string; endDate: string; }
interface TimeTrackingData { originalEstimate: string | null; remainingEstimate: string | null; timeSpent: string | null; }
interface SearchResultData { key: string; summary: string; status: string; statusCategory: string | null; assignee: string; created: string | null; }

interface DemandaData {
  success: boolean; issue_key: string; summary: string | null; texto: string | null; textoHtml: string | null;
  nome_cliente: string | null; status: string | null; statusCategory: string | null;
  issuetype: string | null; priority: string | null; assignee: string | null;
  assigneeId: string | null; reporter: string | null; created: string | null; updated: string | null;
  labels: string[]; comments: CommentData[]; subtasks: SubtaskData[];
  linkedIssues: LinkedIssueData[]; attachments: AttachmentData[];
  transitions: TransitionData[]; sprint: SprintData | null;
  pullRequests: PullRequestData[]; branches: BranchData[]; builds: BuildData[]; devSummary: DevSummary | null; changelog: ChangelogEntry[];
  timeTracking: TimeTrackingData | null; url: string;
  produto: { id: string; value: string }[];
  saude: { id: string; value: string } | null;
  impacto: { id: string; value: string } | null;
  dataInicio: string | null;
  cliente: { id: string; value: string }[];
  po: string | null;
  poAvatar: string | null;
  techLead: string | null;
  techLeadAvatar: string | null;
  creator: string | null;
  reporterAvatar: string | null;
  assigneeAvatar: string | null;
  duedate: string | null;
  estimativaSegundos: number | null;
  tempoGastoSegundos: number | null;
  implementationPlan: string | null;
  developer: string | null;
  developerId: string | null;
  plannedEnd: string | null;
}

// ─── Helpers ───
const SEARCH_HISTORY_KEY = 'jiraops_search_history';
function loadHistory(): string[] { try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); } catch { return []; } }
function saveHistory(h: string[]) { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(h.slice(0, 10))); }
/**
 * Datas do Jira em duas formas: com hora ("2026-08-17T15:06:45.875-0300") e SEM hora
 * ("2026-08-17", o caso de Data de início e Planned end).
 *
 * O `new Date('2026-08-17')` é interpretado como meia-noite UTC, que no Brasil (UTC-3) é 21h
 * do dia ANTERIOR — a tela mostrava "16 de ago." onde o Jira mostrava 17. Data sem hora não
 * tem fuso: é montada como data local, campo por campo, para não sofrer conversão.
 */
function formatDate(d: string | null) {
  if (!d) return '—';
  const soData = /^\d{4}-\d{2}-\d{2}$/.exec(d);
  const data = soData
    ? new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
    : new Date(d);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
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
  const [, setEditReporter] = useState('');
  const [editCliente, setEditCliente] = useState('');
  const [editProduto, setEditProduto] = useState<string[]>([]);
  const [editSaude, setEditSaude] = useState('');
  const [editImpacto, setEditImpacto] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editLabels, setEditLabels] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultData[] | null>(null);

  // New features state
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentImages, setCommentImages] = useState<CommentImage[]>([]);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [commentDragOver, setCommentDragOver] = useState(false);
  const commentFileInputRef = React.useRef<HTMLInputElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity' | 'filhos' | 'dev'>('details');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Jira users for assignee search
  const [jiraUsers, setJiraUsers] = useState<{ accountId: string; displayName: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  // Developer tem busca e dropdown proprios: compartilhar com o Responsavel faria os dois
  // abrirem juntos e filtrarem com o mesmo texto.
  const [editDeveloper, setEditDeveloper] = useState('');
  const [editDeveloperId, setEditDeveloperId] = useState('');
  const [devSearch, setDevSearch] = useState('');
  const [showDevDropdown, setShowDevDropdown] = useState(false);

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
          setEditDeveloper(data.developer || '');
          setEditDeveloperId(data.developerId || '');
          setDevSearch('');
          setEditReporter(data.reporter || '');
          setEditCliente(data.nome_cliente || '');
          setEditProduto(data.produto?.map((p: { id: string }) => p.id) || []);
          setEditSaude(data.saude?.id || '');
          setEditImpacto(data.impacto?.id || '');
          setEditDataInicio(data.dataInicio || '');
          setEditLabels(data.labels?.join(', ') || '');
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

  /* eslint-disable react-hooks/set-state-in-effect -- initializes browser-backed search state and URL selection */
  useEffect(() => { 
    setSearchHistory(loadHistory()); 
    // Check URL for ?key= param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const keyParam = params.get('key');
      if (keyParam) {
        setSearchKey(keyParam);
        setTimeout(() => handleSearch(keyParam), 50);
      }
    }
  }, [handleSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpdate = async () => {
    if (!demanda) return;
    setUpdating(true); setUpdateResult(null);
    const body: Record<string, string | string[]> = {};
    if (editTexto !== (demanda.texto || '')) body.description = editTexto;
    if (editSummary !== (demanda.summary || '')) body.summary = editSummary;
    if (editPriority !== (demanda.priority || '')) body.priority = editPriority;
    if (editAssigneeId !== (demanda.assigneeId || '')) body.assignee = editAssigneeId;
    if (editDeveloperId !== (demanda.developerId || '')) body.developer = editDeveloperId;
    if (editCliente !== (demanda.nome_cliente || '')) body.cliente = editCliente;
    if (editLabels !== (demanda.labels?.join(', ') || '')) body.labels = editLabels.split(',').map(s=>s.trim()).filter(Boolean);
    if (JSON.stringify(editProduto) !== JSON.stringify(demanda.produto?.map(p=>p.id)||[])) body.produto = editProduto;
    if (editSaude !== (demanda.saude?.id || '')) body.saude = editSaude;
    if (editImpacto !== (demanda.impacto?.id || '')) body.impacto = editImpacto;
    if (editDataInicio !== (demanda.dataInicio || '')) body.dataInicio = editDataInicio;

    if (Object.keys(body).length === 0) { setUpdateResult({ success: false, message: 'Nenhuma alteração' }); setUpdating(false); return; }
    try {
      const res = await fetch(`/api/atualizar-demanda/${demanda.issue_key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) { setUpdateResult({ success: true, message: 'Atualizada!' }); setEditing(false); setTimeout(() => handleSearch(demanda.issue_key), 1500); }
      else setUpdateResult({ success: false, message: data.error || 'Erro' });
    } catch { setUpdateResult({ success: false, message: 'Erro de conexão' }); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!demanda) return;
    if (!confirm(`Tem certeza que deseja excluir a demanda ${demanda.issue_key}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true); setUpdateResult(null);
    try {
      const res = await fetch(`/api/demanda/${demanda.issue_key}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateResult({ success: true, message: 'Demanda excluída!' });
        setDemanda(null);
        if (searchHistory.includes(demanda.issue_key)) {
          const h = searchHistory.filter(k => k !== demanda.issue_key);
          saveHistory(h); setSearchHistory(h);
        }
      } else {
        setUpdateResult({ success: false, message: data.error || 'Erro ao excluir' });
      }
    } catch { setUpdateResult({ success: false, message: 'Erro de conexão' }); }
    finally { setDeleting(false); }
  };

  // Sobe a imagem já como anexo da issue (endpoint existente) — assim, quando o comentário
  // referenciar "!nome_do_arquivo!" ela já existe e o Jira consegue resolver o embed.
  const uploadCommentImage = async (file: File) => {
    if (!demanda || !file.type.startsWith('image/')) return;
    if (file.size > 15 * 1024 * 1024) {
      setUpdateResult({ success: false, message: 'Imagem muito grande (máx 15MB)' });
      return;
    }
    setUploadingCommentImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/demanda/${demanda.issue_key}/anexos`, { method: 'POST', body: formData });
      const data = await res.json();
      const attachment = data?.attachments?.[0];
      if (res.ok && attachment) {
        const preview = URL.createObjectURL(file);
        setCommentImages(prev => [...prev, { id: attachment.id, filename: attachment.filename, preview }]);
      } else {
        setUpdateResult({ success: false, message: data.error || 'Erro ao enviar imagem' });
      }
    } catch {
      setUpdateResult({ success: false, message: 'Falha no upload da imagem' });
    } finally {
      setUploadingCommentImage(false);
    }
  };

  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadCommentImage(file);
        break;
      }
    }
  };

  const handleCommentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCommentDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadCommentImage);
  };

  const removeCommentImage = (index: number) => {
    setCommentImages(prev => {
      const img = prev[index];
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddComment = async () => {
    if (!demanda || (!newComment.trim() && commentImages.length === 0)) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/demanda/${demanda.issue_key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          comment: newComment.trim(),
          images: commentImages.map(i => i.filename),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewComment('');
        commentImages.forEach(i => URL.revokeObjectURL(i.preview));
        setCommentImages([]);
        handleSearch(demanda.issue_key);
      }
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
      case 'Bug': return { bg: 'var(--accent-rose-light)', color: 'var(--accent-rose-soft)', border: 'var(--accent-rose-light)' };
      case 'Story': return { bg: 'var(--accent-emerald-light)', color: 'var(--accent-green-soft)', border: 'var(--accent-emerald-light)' };
      default: return { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue-soft)', border: 'var(--accent-blue-light)' };
    }
  };

  const statusColor = (cat: string | null) => {
    switch (cat) {
      case 'done': return { bg: 'var(--accent-emerald-light)', color: 'var(--accent-green-soft)', border: 'var(--accent-emerald-light)' };
      case 'indeterminate': return { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue-soft)', border: 'var(--accent-blue-light)' };
      default: return { bg: 'var(--accent-amber-light)', color: 'var(--accent-amber-soft)', border: 'var(--accent-amber-light)' };
    }
  };

  const S = {
    label: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' } as React.CSSProperties,
    card: { padding: '16px 18px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' } as React.CSSProperties,
    badge: (bg: string, color: string, border: string): React.CSSProperties => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: bg, color, border: `1px solid ${border}` }),
    tab: (active: boolean): React.CSSProperties => ({ padding: '10px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none', background: active ? 'var(--accent-violet-light)' : 'transparent', color: active ? 'var(--accent-indigo-soft)' : 'var(--text-tertiary)' }),
  };

  return (
    <div className="cd-root animate-fade-in">

      {/* Header */}
      <div className="cd-page-header">
        <h1>Consultar & Editar Demanda</h1>
        <p>Visualize, edite, comente e mude o status das demandas</p>
      </div>

      {/* Search Bar */}
      <div className="cd-search-wrap">
        <div className="cd-search-row">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '8px', height: '48px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)' }}>
            <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input type="text" value={searchKey}
              onChange={e => setSearchKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              aria-label="Chave ou resumo da demanda"
              placeholder="Ex: DSMM-123 ou Erro de Login..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }} />
            {searchKey && <button aria-label="Limpar busca" onClick={() => { setSearchKey(''); setDemanda(null); setSearchResults(null); setError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><X size={14} /></button>}
          </div>
          <button onClick={() => handleSearch()} disabled={loading || !searchKey.trim()} style={{ padding: '0 24px', borderRadius: '8px', height: '48px', background: loading ? 'var(--bg-card-hover)' : 'var(--accent-blue)', color: loading ? 'var(--text-tertiary)' : 'var(--text-inverse)', border: `1px solid ${loading ? 'var(--border-primary)' : 'var(--accent-blue)'}`, fontSize: '13px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar
          </button>
        </div>

        {/* Search history dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div style={{ position: 'absolute', top: '56px', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '8px', maxHeight: '240px', overflow: 'auto' }}>
            <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Buscas recentes</div>
            {searchHistory.map((k) => (
              <button key={k} onMouseDown={() => { setSearchKey(k.replace('DSMM-', '')); handleSearch(k); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textAlign: 'left' }}>
                <Clock size={12} style={{ color: 'var(--text-tertiary)' }} /> {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error / Update Result */}
      {error && (
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '16px', background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose-light)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--accent-rose-soft)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-rose-soft)' }}>{error}</span>
        </div>
      )}
      {updateResult && (
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '16px', background: updateResult.success ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)', border: `1px solid ${updateResult.success ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)'}` }}>
          {updateResult.success ? <CheckCircle2 size={16} style={{ color: 'var(--accent-green-soft)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--accent-rose-soft)' }} />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: updateResult.success ? 'var(--accent-green-soft)' : 'var(--accent-rose-soft)' }}>{updateResult.message}</span>
        </div>
      )}

      {/* Search Results List */}
      {!demanda && searchResults && searchResults.length > 0 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Resultados da busca ({searchResults.length})</h2>
          {searchResults.map(res => (
            <button type="button" key={res.key} onClick={() => { setSearchKey(res.key); handleSearch(res.key); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '24px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={S.badge(issueTypeColor('Story').bg, issueTypeColor('Story').color, issueTypeColor('Story').border)}>{res.key}</span>
                  <span style={S.badge(statusColor(res.statusCategory).bg, statusColor(res.statusCategory).color, statusColor(res.statusCategory).border)}>{res.status}</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{res.summary}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {res.assignee}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(res.created)}</span>
                </div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-tertiary)' }}>
                <ArrowRight size={18} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── DEMANDA CARD ── */}
      {demanda && (
        <div className="animate-fade-in" style={{ borderRadius: '24px', overflow: 'hidden', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)' }}>

          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-secondary)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--accent-blue-soft)' }}>{demanda.issue_key}</span>
              {demanda.issuetype && (() => { const c = issueTypeColor(demanda.issuetype); return <span style={S.badge(c.bg, c.color, c.border)}>{demanda.issuetype}</span>; })()}
              {demanda.status && (() => { const c = statusColor(demanda.statusCategory); return <span style={S.badge(c.bg, c.color, c.border)}>{demanda.status}</span>; })()}
              {demanda.priority && <span style={S.badge('var(--accent-amber-light)', 'var(--accent-amber-soft)', 'var(--accent-amber-light)')}>{demanda.priority}</span>}
              {demanda.sprint && <span style={{ ...S.badge('var(--accent-violet-light)', 'var(--accent-violet-soft)', 'var(--accent-violet-light)'), display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} /> {demanda.sprint.name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Status transition dropdown */}
              {demanda.transitions.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => {
                    const el = document.getElementById('transition-dropdown');
                    if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
                  }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--accent-emerald-light)', color: 'var(--accent-green-soft)', border: '1px solid var(--accent-emerald-light)', cursor: 'pointer' }}>
                    {transitioning ? <Loader2 size={14} className="animate-spin" /> : 'Mover para...'} <ChevronDown size={14} />
                  </button>
                  <div id="transition-dropdown" style={{ display: 'none', position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '16px', width: '280px', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-secondary)' }}>
                      Fluxo de Trabalho
                    </div>
                    {demanda.transitions.map(t => (
                      <button key={t.id} onClick={() => {
                        document.getElementById('transition-dropdown')!.style.display = 'none';
                        handleTransition(t.id);
                      }} disabled={transitioning} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-secondary)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={S.badge('var(--bg-secondary)', 'var(--text-secondary)', 'var(--border-secondary)')}>{t.to}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--accent-violet-light)', color: 'var(--accent-indigo-soft)', border: '1px solid var(--accent-violet-light)', cursor: 'pointer' }}>
                {copied ? <><CheckCircle2 size={14} /> Copiado!</> : <><Copy size={14} /> Link</>}
              </button>
              <button onClick={() => { setEditing(!editing); setUpdateResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: editing ? 'var(--accent-rose-light)' : 'var(--accent-violet-light)', color: editing ? 'var(--accent-rose-soft)' : 'var(--accent-indigo-soft)', border: '1px solid var(--border-secondary)', cursor: 'pointer' }}>
                {editing ? <><X size={14} /> Cancelar</> : <><Edit3 size={14} /> Editar</>}
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--accent-rose-light)', color: 'var(--accent-rose-soft)', border: '1px solid var(--accent-rose-light)', cursor: deleting ? 'wait' : 'pointer' }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Excluir</>}
              </button>
              <a href={demanda.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--accent-blue)', color: 'var(--text-inverse)', textDecoration: 'none', border: '1px solid var(--accent-blue)' }}>
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
              { id: 'filhos' as const, label: `Itens filhos (${demanda.subtasks.length})`, icon: <ListTree size={13} /> },
              { id: 'dev' as const, label: `Dev (${demanda.pullRequests.length})`, icon: <GitBranch size={13} /> },
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
                    <input value={editSummary} onChange={e => setEditSummary(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  ) : (
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{demanda.summary || '—'}</p>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={S.label}><Sparkles size={12} /> Descrição</label>
                  {editing ? (
                    <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={6} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
                  ) : demanda.textoHtml ? (
                    <div className="jira-description" style={{ padding: '18px 22px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', maxHeight: '600px', overflow: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(demanda.textoHtml) }} />
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

                  {/* Categorias (Labels) */}
                  <div style={S.card}>
                    <label style={S.label}><Tag size={11} /> Categorias</label>
                    {editing ? (
                      <input value={editLabels} onChange={e => setEditLabels(e.target.value)} placeholder="backend, bug..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.labels.length > 0 ? demanda.labels.join(', ') : '—'}</p>
                    )}
                  </div>

                  {/* Produto */}
                  <div style={S.card}>
                    <label style={S.label}><Building2 size={11} /> Produto</label>
                    {editing ? (
                      <select multiple value={editProduto} onChange={e => setEditProduto(Array.from(e.target.selectedOptions, option => option.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', height: '80px' }}>
                        <option value="10225">Gateway</option>
                        <option value="10226">Console</option>
                        <option value="10227">Vendedor</option>
                        <option value="10228">Estabelecimento</option>
                        <option value="10229">Regulatório</option>
                        <option value="10230">Registradora</option>
                      </select>
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.produto?.map(p => p.value).join(', ') || '—'}</p>
                    )}
                  </div>

                  {/* Saúde do Cliente */}
                  <div style={S.card}>
                    <label style={S.label}><Shield size={11} /> Saúde do Cliente</label>
                    {editing ? (
                      <select value={editSaude} onChange={e => setEditSaude(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                        <option value="">Selecione...</option>
                        <option value="10119">Saudável</option>
                        <option value="10120">Atenção</option>
                        <option value="10121">Crítico</option>
                      </select>
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.saude?.value || '—'}</p>
                    )}
                  </div>

                  {/* Impacto */}
                  <div style={S.card}>
                    <label style={S.label}><AlertTriangle size={11} /> Impacto</label>
                    {editing ? (
                      <select value={editImpacto} onChange={e => setEditImpacto(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                        <option value="">Selecione...</option>
                        <option value="10000">Extensive / Widespread</option>
                        <option value="10001">Significant / Large</option>
                        <option value="10002">Moderate / Limited</option>
                        <option value="10003">Minor / Localized</option>
                      </select>
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.impacto?.value || '—'}</p>
                    )}
                  </div>

                  {/* Data de Início */}
                  <div style={S.card}>
                    <label style={S.label}><Calendar size={11} /> Data de Início</label>
                    {editing ? (
                      <input type="date" value={editDataInicio} onChange={e => setEditDataInicio(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', colorScheme: 'dark' }} />
                    ) : (
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.dataInicio ? formatDate(demanda.dataInicio) : '—'}</p>
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
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '16px', maxHeight: '200px', overflow: 'auto', marginTop: '4px' }}>
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

                  {/* PO e Tech Lead: o painel do Jira mostra os dois logo abaixo do Relator, e
                      sem eles a tela não reflete o mesmo quadro. */}
                  <div style={S.card}>
                    <label style={S.label}><User size={11} /> PO</label>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.po || '—'}</p>
                  </div>

                  <div style={S.card}>
                    <label style={S.label}><User size={11} /> Tech Lead</label>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.techLead || '—'}</p>
                  </div>

                  {/* Criador só aparece quando difere do Relator: no Jira são campos distintos
                      (em DSMM-287 o criador é a conta de serviço e a relatora é a Fabiana), mas
                      repetir o mesmo nome em dois cards seria só ruído. */}
                  {demanda.creator && demanda.creator !== demanda.reporter && (
                    <div style={S.card}>
                      <label style={S.label}><User size={11} /> Criador</label>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.creator}</p>
                    </div>
                  )}

                  {demanda.duedate && (
                    <div style={S.card}>
                      <label style={S.label}><Calendar size={11} /> Previsão de entrega</label>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{formatDate(demanda.duedate)}</p>
                    </div>
                  )}

                  {/* Estes campos só aparecem quando preenchidos: o Jira os esconde atrás de
                      "Mais campos", e um card "—" para cada um empurraria os campos que
                      importam para fora da tela. Developer é a exceção: em modo de edição ele
                      aparece mesmo vazio, senão não haveria como definir quem é o responsável
                      numa demanda que ainda não tem um. */}
                  {(editing || demanda.developer) && (
                    <div style={{ ...S.card, position: 'relative' }}>
                      <label style={S.label}><User size={11} /> Developer</label>
                      {editing ? (
                        <>
                          <input
                            value={devSearch || editDeveloper}
                            onChange={e => { setDevSearch(e.target.value); setShowDevDropdown(true); }}
                            onFocus={() => setShowDevDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDevDropdown(false), 200)}
                            placeholder="Buscar developer..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                          {showDevDropdown && jiraUsers.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '16px', maxHeight: '200px', overflow: 'auto', marginTop: '4px' }}>
                              {editDeveloperId && (
                                <button onMouseDown={() => { setEditDeveloper(''); setEditDeveloperId(''); setDevSearch(''); setShowDevDropdown(false); }}
                                  style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-rose-soft, #FB7185)', background: 'none', border: 'none', borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', textAlign: 'left' }}>
                                  Remover developer
                                </button>
                              )}
                              {jiraUsers
                                .filter(u => !devSearch || u.displayName.toLowerCase().includes(devSearch.toLowerCase()))
                                .map(u => (
                                  <button key={u.accountId} onMouseDown={() => { setEditDeveloper(u.displayName); setEditDeveloperId(u.accountId); setDevSearch(''); setShowDevDropdown(false); }}
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
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{demanda.developer}</p>
                      )}
                    </div>
                  )}

                  {demanda.plannedEnd && (
                    <div style={S.card}>
                      <label style={S.label}><Calendar size={11} /> Planned end</label>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{formatDate(demanda.plannedEnd)}</p>
                    </div>
                  )}

                  {demanda.implementationPlan && (
                    <div style={{ ...S.card, gridColumn: '1 / -1' }}>
                      <label style={S.label}><Activity size={11} /> Implementation plan</label>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{demanda.implementationPlan}</p>
                    </div>
                  )}

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
                      {demanda.timeTracking.originalEstimate && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Estimado</div><div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-blue-soft)' }}>{demanda.timeTracking.originalEstimate}</div></div>}
                      {demanda.timeTracking.timeSpent && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Gasto</div><div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-green-soft)' }}>{demanda.timeTracking.timeSpent}</div></div>}
                      {demanda.timeTracking.remainingEstimate && <div style={{ ...S.card, flex: 1 }}><div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Restante</div><div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-amber-soft)' }}>{demanda.timeTracking.remainingEstimate}</div></div>}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {demanda.labels.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Tag size={12} /> Labels</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {demanda.labels.map(l => <span key={l} style={S.badge('var(--accent-violet-light)', 'var(--accent-indigo-soft)', 'var(--accent-violet-light)')}>{l}</span>)}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {demanda.attachments.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.label}><Paperclip size={12} /> Anexos ({demanda.attachments.length})</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {demanda.attachments.map(a => (
                        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none', maxWidth: '250px' }}>
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
                        <a key={i} href={`https://movingpay.atlassian.net/browse/${link.key}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, minWidth: '80px' }}>{link.type}</span>
                          <ArrowRight size={12} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-indigo-soft)' }}>{link.key}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.summary}</span>
                          <span style={S.badge('var(--accent-amber-light)', 'var(--accent-amber-soft)', 'var(--accent-amber-light)')}>{link.status}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                {editing && (
                  <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                    <button onClick={handleUpdate} disabled={updating} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: updating ? 'var(--bg-card-hover)' : 'var(--accent-green)', color: updating ? 'var(--text-tertiary)' : 'var(--text-inverse)', border: `1px solid ${updating ? 'var(--border-primary)' : 'var(--accent-green)'}`, cursor: updating ? 'wait' : 'pointer' }}>
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
                  <div
                    onDragOver={e => { e.preventDefault(); setCommentDragOver(true); }}
                    onDragLeave={() => setCommentDragOver(false)}
                    onDrop={handleCommentDrop}
                    style={{ borderRadius: '8px', outline: commentDragOver ? '2px dashed var(--accent-blue)' : 'none' }}
                  >
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onPaste={handleCommentPaste}
                      placeholder="Escreva um comentário... (cole uma imagem com Ctrl+V ou arraste aqui)" rows={3}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment(); }}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }} />
                  </div>

                  {(commentImages.length > 0 || uploadingCommentImage) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {commentImages.map((img, i) => (
                        <div key={img.id} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-secondary)' }}>
                          <img src={img.preview} alt={img.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => removeCommentImage(i)} title="Remover" aria-label={`Remover imagem ${i + 1}`} style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                      {uploadingCommentImage && (
                        <div style={{ width: '56px', height: '56px', borderRadius: '8px', border: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input ref={commentFileInputRef} type="file" accept="image/*" multiple hidden
                        onChange={e => { Array.from(e.target.files || []).forEach(uploadCommentImage); e.target.value = ''; }} />
                      <button type="button" onClick={() => commentFileInputRef.current?.click()} title="Anexar imagem"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer' }}>
                        <Paperclip size={12} /> Imagem
                      </button>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Ctrl+Enter para enviar</span>
                    </div>
                    <button onClick={handleAddComment} disabled={sendingComment || (!newComment.trim() && commentImages.length === 0)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: (!newComment.trim() && commentImages.length === 0) ? 'var(--bg-card-hover)' : 'var(--accent-blue)', color: (!newComment.trim() && commentImages.length === 0) ? 'var(--text-tertiary)' : 'var(--text-inverse)', border: `1px solid ${(!newComment.trim() && commentImages.length === 0) ? 'var(--border-primary)' : 'var(--accent-blue)'}`, cursor: sendingComment ? 'wait' : 'pointer' }}>
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
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-inverse)' }}>
                              {c.author.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.author}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginLeft: 'auto' }}>{formatDateTime(c.created)}</span>
                        </div>
                        {c.bodyHtml ? (
                          <div className="jira-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }} />
                        ) : (
                          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
                        )}
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
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--text-inverse)', flexShrink: 0 }}>
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
                              {item.to && <> para <span style={{ fontWeight: 700, color: 'var(--accent-indigo-soft)' }}>{item.to}</span></>}
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
            {activeTab === 'filhos' && (
              <div style={{ padding: '24px' }}>
                {/* O botão fica ANTES da lista e aparece mesmo sem filho nenhum: quando não há
                    nenhum é justamente quando alguém quer criar o primeiro. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <label style={{ ...S.label, marginBottom: 0 }}>
                    <ListTree size={12} /> Itens filhos ({demanda.subtasks.length})
                  </label>
                  {/* Leva a chave DESTA demanda para a tela de criação, que já abre com ela como
                      pai. É o mesmo caminho de criar manualmente, só sem a pessoa ter que
                      digitar a chave de novo e sem risco de errar o número. */}
                  <Link
                    href={`/dashboard/nova-demanda?pai=${demanda.issue_key}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px', minHeight: '36px',
                      padding: '0 14px', borderRadius: '8px', border: '1px solid var(--accent-violet)',
                      background: 'var(--accent-violet)', color: '#fff', fontSize: '12px',
                      fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    <Plus size={13} /> Criar item filho
                  </Link>
                </div>

                {demanda.subtasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {demanda.subtasks.map((st, i) => (
                      <a
                        key={i}
                        href={`https://movingpay.atlassian.net/browse/${st.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none' }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-indigo-soft)' }}>{st.key}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.summary}</span>
                        <span style={S.badge('var(--accent-amber-light)', 'var(--accent-amber-soft)', 'var(--accent-amber-light)')}>{st.status}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                    <ListTree size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhum item filho ainda</p>
                    <p style={{ fontSize: '11px', marginTop: '4px' }}>
                      Criar um item filho abre a tela de nova demanda já com {demanda.issue_key} como pai.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dev' && (
              <>
                {/* Resumo — mesmos números do painel "Desenvolvimento" do Jira */}
                {demanda.devSummary && (demanda.devSummary.branches > 0 || demanda.devSummary.pullRequests > 0 || demanda.devSummary.builds.count > 0) && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
                      <GitBranch size={14} style={{ color: 'var(--accent-blue)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{demanda.devSummary.branches}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ramificaç{demanda.devSummary.branches === 1 ? 'ão' : 'ões'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
                      <GitPullRequest size={14} style={{ color: 'var(--accent-violet)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{demanda.devSummary.pullRequests}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>pull request{demanda.devSummary.pullRequests === 1 ? '' : 's'}</span>
                    </div>
                    {demanda.devSummary.builds.count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
                        {demanda.devSummary.builds.state?.toLowerCase().includes('fail') ? (
                          <AlertTriangle size={14} style={{ color: 'var(--accent-rose)' }} />
                        ) : (
                          <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{demanda.devSummary.builds.count}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>compilaç{demanda.devSummary.builds.count === 1 ? 'ão' : 'ões'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Branches */}
                {demanda.branches.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={S.label}><GitBranch size={12} /> Ramificações ({demanda.branches.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {demanda.branches.map((b, i) => (
                        <a key={i} href={b.url || undefined} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', textDecoration: 'none', cursor: b.url ? 'pointer' : 'default' }}>
                          <GitBranch size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', flexShrink: 0 }}>{b.name}</span>
                          {b.repository && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>— {b.repository}</span>}
                          {b.lastCommitMessage && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.lastCommitMessage}</span>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRs */}
                {demanda.pullRequests.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={S.label}><GitPullRequest size={12} /> Pull Requests ({demanda.pullRequests.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {demanda.pullRequests.map((pr, i) => {
                        const sc = pr.status === 'MERGED' ? { bg: 'var(--accent-emerald-light)', color: 'var(--accent-green-soft)', border: 'var(--accent-emerald-light)', icon: GitMerge }
                          : pr.status === 'DECLINED' ? { bg: 'var(--accent-rose-light)', color: 'var(--accent-rose-soft)', border: 'var(--accent-rose-light)', icon: X }
                          : { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue-soft)', border: 'var(--accent-blue-light)', icon: GitPullRequest };
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

                {/* Builds — mesma tabela do modal "Desenvolvimento" do Jira (Pipeline / build / testes / atualizado) */}
                {demanda.builds.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={S.label}><CheckCircle2 size={12} /> Builds ({demanda.builds.length})</label>
                    <div style={{ borderRadius: '12px', border: '1px solid var(--border-secondary)', overflow: 'hidden' }}>
                      {demanda.builds.map((b, i) => {
                        const failed = (b.state || '').toLowerCase().includes('fail');
                        return (
                          <a key={i} href={b.url || undefined} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', textDecoration: 'none', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)', borderBottom: i < demanda.builds.length - 1 ? '1px solid var(--border-secondary)' : 'none', cursor: b.url ? 'pointer' : 'default' }}>
                            {failed ? <AlertTriangle size={14} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} /> : <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />}
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{b.pipeline}</span>
                            {b.buildNumber != null && <span style={{ fontSize: '11px', color: 'var(--accent-indigo-soft)', fontFamily: 'monospace', flexShrink: 0 }}>#{b.buildNumber}</span>}
                            {b.testResults && (b.testResults.passed + b.testResults.failed + b.testResults.skipped) > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {b.testResults.passed} ok{b.testResults.failed > 0 && `, ${b.testResults.failed} falhas`}{b.testResults.skipped > 0 && `, ${b.testResults.skipped} pulados`}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{b.lastUpdated ? timeAgo(b.lastUpdated) : '—'}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {demanda.pullRequests.length === 0 && demanda.branches.length === 0 && demanda.builds.length === 0 && (
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
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-blue-light)', border: '1px solid var(--border-primary)', marginBottom: '16px' }}>
            <Search size={28} style={{ color: 'var(--accent-indigo-soft)', opacity: 0.4 }} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Digite o número da demanda acima</p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Ex: 86, 84, 47</p>
          {searchHistory.length > 0 && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {searchHistory.slice(0, 5).map(k => (
                <button key={k} onClick={() => { setSearchKey(k.replace('DSMM-', '')); handleSearch(k); }}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--accent-violet-light)', color: 'var(--accent-indigo-soft)', border: '1px solid var(--accent-violet-light)', cursor: 'pointer' }}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .cd-root { display: flex; width: 100%; flex-direction: column; gap: 24px; }
        .cd-page-header h1 { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -0.02em; }
        .cd-page-header p { margin: 4px 0 0; color: var(--text-secondary); font-size: 15px; line-height: 24px; }
        .cd-search-wrap { position: relative; }
        .cd-search-row { display: flex; gap: 12px; }
        .cd-info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-bottom: 24px; }
        @media (max-width: 900px) { .cd-info-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .cd-search-row { flex-direction: column; } .cd-info-grid { grid-template-columns: 1fr; gap: 16px; } }

      `}</style>
    </div>
  );
}
