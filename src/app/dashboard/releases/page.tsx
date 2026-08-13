'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitPullRequest, GitMerge, Tag, Clock, Rocket, ChevronDown, Loader2, AlertTriangle, ExternalLink, CheckCircle2, X, Filter, AlertOctagon, RefreshCw } from 'lucide-react';

interface PullRequestInfo { id: string; title: string; status: string; url: string; author: string | null; source: string | null; destination: string | null; mergeable: boolean | null; mergeableState: string | null; }
interface BranchInfo { name: string; url: string | null; repository: string | null; lastCommitMessage: string | null; }
interface BuildInfo { pipeline: string; buildNumber: number | string | null; url: string | null; state: string | null; lastUpdated: string | null; }

interface DevTask {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issuetype: string;
  assignee: string | null;
  updated: string | null;
  devSummary: { branches: number; commits: number; pullRequests: number; builds: { count: number; state: string | null } };
  pullRequests: PullRequestInfo[];
  branches: BranchInfo[];
  builds: BuildInfo[];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cacheAgeLabel(cachedAt: number | null): string {
  if (!cachedAt) return '';
  const mins = Math.floor((Date.now() - cachedAt) / 60000);
  if (mins < 1) return 'atualizado agora';
  return `atualizado há ${mins}min`;
}

function prBadge(status: string) {
  if (status === 'MERGED') return { label: 'Merged', color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)', icon: GitMerge };
  if (status === 'DECLINED') return { label: 'Declined', color: 'var(--accent-rose)', bg: 'var(--accent-rose-light)', icon: X };
  return { label: 'Aberto', color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)', icon: GitPullRequest };
}

// Mesmo esquema de cor por statusCategory usado no resto do app (IssueDetailPanel etc.)
const statusStyle: Record<string, { color: string; bg: string }> = {
  done: { color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)' },
  indeterminate: { color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
  new: { color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
};

function taskHasConflict(t: DevTask): boolean {
  return t.pullRequests.some(pr => pr.mergeableState === 'dirty');
}

export default function ReleasesPage() {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scanned, setScanned] = useState(0);
  const [filterConflict, setFilterConflict] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadReleases = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetch(forceRefresh ? '/api/jira/releases?refresh=1' : '/api/jira/releases');
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.releases || []);
        setScanned(data.scanned || 0);
        setCachedAt(data.cachedAt || null);
      } else {
        setError(data.error || 'Falha ao carregar do Jira');
      }
    } catch {
      setError('Erro de conexão com o Jira');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadReleases());
    return () => window.cancelAnimationFrame(frame);
  }, [loadReleases]);

  const totalPRs = tasks.reduce((s, t) => s + t.pullRequests.length, 0);
  const openPRs = tasks.reduce((s, t) => s + t.pullRequests.filter(p => p.status !== 'MERGED' && p.status !== 'DECLINED').length, 0);
  const mergedPRs = tasks.reduce((s, t) => s + t.pullRequests.filter(p => p.status === 'MERGED').length, 0);
  const failingBuilds = tasks.reduce((s, t) => s + t.builds.filter(b => (b.state || '').toLowerCase().includes('fail')).length, 0);
  const conflictTasks = tasks.filter(taskHasConflict);
  // null/undefined em todos os PRs = GITHUB_TOKEN não configurado, não "sem conflito"
  const conflictDataAvailable = tasks.some(t => t.pullRequests.some(pr => pr.mergeableState !== null));
  const visibleTasks = filterConflict ? conflictTasks : tasks;

  return (
    <div className="rl-root">
      <div className="rl-page-header">
        <div className="rl-header-content">
          <div className="rl-header-left">
            <div><h1 className="rl-title">Releases</h1><p className="rl-subtitle">Tarefas do DSMM com PR vinculado — mesmo painel &ldquo;Desenvolvimento&rdquo; do Jira</p></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {cachedAt && !loading && <span className="rl-cache-hint">{cacheAgeLabel(cachedAt)}</span>}
            <button type="button" className="rl-btn-refresh" onClick={() => loadReleases(true)} disabled={loading || refreshing} title="Atualizar agora (ignora o cache)">
              <RefreshCw size={14} className={refreshing ? 'rl-spin' : ''} />
            </button>
            <div className="rl-pill"><Rocket size={13}/> {tasks.length} com PR</div>
          </div>
        </div>
      </div>
      <div className="rl-body"><div className="rl-main">
        {!loading && !error && tasks.length > 0 && (
          <div className="rl-filters">
            <Filter size={13} style={{ color: 'var(--text-tertiary)' }} />
            <button type="button" className={`rl-filter-btn ${!filterConflict ? 'active' : ''}`} onClick={() => setFilterConflict(false)}>Todos ({tasks.length})</button>
            <button type="button" className={`rl-filter-btn conflict ${filterConflict ? 'active' : ''}`} onClick={() => setFilterConflict(true)} disabled={!conflictDataAvailable}>
              <AlertOctagon size={12} /> Com conflito ({conflictTasks.length})
            </button>
            {!conflictDataAvailable && <span className="rl-filter-hint">Configure GITHUB_TOKEN no .env.local pra detectar conflito de merge</span>}
          </div>
        )}
        {loading ? (
          <div className="rl-loading"><Loader2 size={20} className="rl-spin" /><span>Escaneando as tarefas do DSMM em busca de PRs vinculados — pode levar ~10s na primeira carga, depois fica em cache</span></div>
        ) : error ? (
          <div className="rl-loading"><AlertTriangle size={20} style={{ color: 'var(--accent-rose)' }} /><span>{error}</span></div>
        ) : tasks.length === 0 ? (
          <div className="rl-loading"><GitBranch size={20} style={{ opacity: 0.4 }} /><span>Nenhuma tarefa do DSMM tem PR vinculado ainda ({scanned} tarefas escaneadas)</span></div>
        ) : visibleTasks.length === 0 ? (
          <div className="rl-loading"><AlertOctagon size={20} style={{ opacity: 0.4 }} /><span>Nenhum PR com conflito de merge agora.</span></div>
        ) : (
          <div className="rl-list">
            {visibleTasks.map(t => {
              const isOpen = expanded === t.key;
              return (
                <div key={t.key} className="rl-card-wrap">
                  <button type="button" className="rl-card" onClick={() => setExpanded(isOpen ? null : t.key)}>
                    <div className="rl-card-ver"><Tag size={14} style={{ color: 'var(--accent-blue)' }} /><span>{t.key}</span></div>
                    <div className="rl-card-info">
                      <span className="rl-card-author">{t.summary}</span>
                      <span className="rl-card-date"><Clock size={10} />{formatDate(t.updated)}{t.assignee && ` · ${t.assignee}`}</span>
                    </div>
                    <div className="rl-card-stats">
                      <span><GitBranch size={11} style={{ marginRight: 3, verticalAlign: -1 }} />{t.devSummary.branches}</span>
                      <span><GitPullRequest size={11} style={{ marginRight: 3, verticalAlign: -1 }} />{t.devSummary.pullRequests}</span>
                      {t.devSummary.builds.count > 0 && (
                        (t.devSummary.builds.state || '').toLowerCase().includes('fail')
                          ? <AlertTriangle size={11} style={{ color: 'var(--accent-rose)' }} />
                          : <CheckCircle2 size={11} style={{ color: 'var(--accent-emerald)' }} />
                      )}
                    </div>
                    {(() => {
                      const st = statusStyle[t.statusCategory] || statusStyle.new;
                      return (
                        <span className="rl-badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}` }}>
                          <span className="rl-badge-dot" style={{ background: st.color }} />
                          {t.status}
                        </span>
                      );
                    })()}
                    <ChevronDown size={14} className={`rl-chevron ${isOpen ? 'open' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="rl-issues">
                      {t.pullRequests.map((pr, i) => {
                        const b = prBadge(pr.status);
                        const Icon = b.icon;
                        const conflict = pr.mergeableState === 'dirty';
                        return (
                          <a key={i} className="rl-issue-row" href={pr.url} target="_blank" rel="noopener noreferrer"
                            style={conflict ? { background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose)' } : undefined}>
                            <Icon size={12} style={{ color: b.color, flexShrink: 0 }} />
                            <span className="rl-issue-summary">{pr.title}</span>
                            {pr.source && <span className="rl-issue-branch">{pr.source}{pr.destination && ` → ${pr.destination}`}</span>}
                            {conflict && (
                              <span className="rl-issue-status" style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertOctagon size={11} /> Conflito
                              </span>
                            )}
                            <span className="rl-issue-status" style={{ color: b.color }}>{b.label}</span>
                            <ExternalLink size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
                          </a>
                        );
                      })}
                      {t.branches.filter(br => !t.pullRequests.some(pr => pr.source === br.name)).map((br, i) => (
                        <div key={`b-${i}`} className="rl-issue-row" style={{ cursor: br.url ? 'pointer' : 'default' }}>
                          <GitBranch size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          <span className="rl-issue-summary" style={{ fontFamily: 'monospace' }}>{br.name}</span>
                          {br.lastCommitMessage && <span className="rl-issue-branch">{br.lastCommitMessage}</span>}
                        </div>
                      ))}
                      {t.builds.map((bd, i) => {
                        const failed = (bd.state || '').toLowerCase().includes('fail');
                        return (
                          <a key={`bd-${i}`} className="rl-issue-row" href={bd.url || undefined} target="_blank" rel="noopener noreferrer">
                            {failed ? <AlertTriangle size={12} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} /> : <CheckCircle2 size={12} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />}
                            <span className="rl-issue-summary">{bd.pipeline}</span>
                            {bd.buildNumber != null && <span className="rl-issue-branch">#{bd.buildNumber}</span>}
                          </a>
                        );
                      })}
                      {t.pullRequests.length === 0 && t.branches.length === 0 && t.builds.length === 0 && (
                        <p className="rl-issues-empty">Sem detalhes de branch/PR/build retornados pelo Jira pra esta tarefa.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="rl-sidebar"><div className="rl-sb-section"><h3 className="rl-sb-title">Pull Requests</h3>
        <div className="rl-stats">
          <div className="rl-stat-item"><span className="rl-stat-label">Abertos</span><span className="rl-stat-val">{openPRs}</span></div>
          <div className="rl-stat-item"><span className="rl-stat-label">Merged</span><span className="rl-stat-val">{mergedPRs}</span></div>
          <div className="rl-stat-item"><span className="rl-stat-label">Total</span><span className="rl-stat-val">{totalPRs}</span></div>
        </div>
      </div><div className="rl-sb-divider"/><div className="rl-sb-section"><h3 className="rl-sb-title">Estatísticas</h3>
        <div className="rl-stats">{[
          { l: 'Tarefas com PR', v: tasks.length },
          { l: 'Tarefas escaneadas', v: scanned },
          { l: 'Builds falhando', v: failingBuilds },
          { l: 'PRs com conflito', v: conflictDataAvailable ? conflictTasks.length : '—' },
        ].map(s => (
          <div key={s.l} className="rl-stat-item"><span className="rl-stat-label">{s.l}</span><span className="rl-stat-val">{s.v}</span></div>
        ))}</div>
      </div></div></div>
      <style jsx>{`
        .rl-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .rl-page-header{flex-shrink:0}
        .rl-header-content{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .rl-header-left{display:flex;align-items:center}
        .rl-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.rl-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .rl-pill{min-height:40px;display:flex;align-items:center;gap:6px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600;flex-shrink:0}
        .rl-cache-hint{font-size:11px;color:var(--text-tertiary);white-space:nowrap}
        .rl-btn-refresh{width:40px;height:40px;border-radius:8px;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0}
        .rl-btn-refresh:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}
        .rl-btn-refresh:disabled{opacity:.5;cursor:not-allowed}
        .rl-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.rl-main{min-width:0}
        .rl-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;padding:4px;width:fit-content;max-width:100%;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:8px}
        .rl-filter-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:6px;font-size:11px;font-weight:600;font-family:inherit;border:1px solid transparent;background:transparent;color:var(--text-tertiary);cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .rl-filter-btn:hover:not(:disabled){background:var(--bg-card-hover);color:var(--text-secondary)}
        .rl-filter-btn.active{background:var(--accent-blue-light);color:var(--accent-blue);border-color:var(--accent-blue)}
        .rl-filter-btn.conflict.active{background:var(--accent-rose-light);color:var(--accent-rose);border-color:var(--accent-rose)}
        .rl-filter-btn:disabled{opacity:.4;cursor:not-allowed}
        .rl-filter-hint{font-size:10px;color:var(--text-tertiary);font-style:italic}
        .rl-loading{display:flex;align-items:center;gap:10px;padding:40px;justify-content:center;color:var(--text-tertiary);font-size:13px;text-align:center}
        .rl-spin{animation:rlSpin 1s linear infinite}@keyframes rlSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .rl-list{display:flex;flex-direction:column;gap:12px}
        .rl-card-wrap{border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);overflow:hidden}
        .rl-card{display:flex;align-items:center;gap:16px;padding:18px 20px;width:100%;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit}
        .rl-card:hover{background:var(--bg-card-hover)}
        .rl-card-ver{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;color:var(--accent-blue);min-width:90px;flex-shrink:0}
        .rl-card-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
        .rl-card-date{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-tertiary)}
        .rl-card-author{font-size:12px;color:var(--text-primary);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rl-card-stats{display:flex;align-items:center;gap:12px;font-size:10px;color:var(--text-tertiary);font-weight:600;flex-shrink:0}
        .rl-badge{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;padding:5px 10px;border-radius:8px;flex-shrink:0;text-transform:uppercase;letter-spacing:.03em}
        .rl-badge-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .rl-chevron{color:var(--text-tertiary);flex-shrink:0;transition:transform .2s}
        .rl-chevron.open{transform:rotate(180deg)}
        .rl-issues{padding:4px 20px 14px 44px;display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--border-secondary)}
        .rl-issues-empty{font-size:12px;color:var(--text-tertiary);padding:10px 0}
        .rl-issue-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;text-decoration:none;transition:background .15s}
        .rl-issue-row:hover{background:var(--bg-card-hover)}
        .rl-issue-summary{font-size:12px;color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rl-issue-branch{font-size:11px;color:var(--text-tertiary);font-family:monospace;flex-shrink:0}
        .rl-issue-status{font-size:10px;font-weight:700;flex-shrink:0}
        .rl-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden}
        .rl-sb-section{padding:24px}.rl-sb-title{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        .rl-sb-divider{height:1px;margin:0 24px;background:var(--border-secondary)}
        .rl-stats{display:flex;flex-direction:column;gap:10px}
        .rl-stat-item{display:flex;justify-content:space-between}.rl-stat-label{font-size:11px;color:var(--text-secondary)}.rl-stat-val{font-size:13px;font-weight:800;color:var(--text-primary)}
        @media (max-width:1180px){.rl-body{grid-template-columns:1fr}.rl-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.rl-sb-divider{display:none}.rl-sb-section+.rl-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:760px){.rl-header-content>div:last-child{width:100%;flex-wrap:wrap}.rl-card{align-items:flex-start;gap:10px;flex-wrap:wrap}.rl-card-info{order:3;flex-basis:calc(100% - 36px)}.rl-card-stats{margin-left:auto}.rl-badge{order:4;margin-left:100px}.rl-chevron{margin-left:auto}.rl-issues{padding:10px 14px}.rl-issue-row{flex-wrap:wrap}.rl-issue-branch{width:100%;padding-left:22px;overflow:hidden;text-overflow:ellipsis}.rl-sidebar{display:block}.rl-sb-section+.rl-sb-section{border-left:0}.rl-sb-divider{display:block}.rl-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
