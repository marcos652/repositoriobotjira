'use client';

import React, { useEffect, useState } from 'react';
import {
  X, User, Calendar, Tag, Flag, MessageSquare, Clock,
  ExternalLink, Loader2, AlertTriangle, CheckCircle2, Circle
} from 'lucide-react';

interface IssueComment {
  author: { displayName: string };
  body: string;
  created: string;
}

interface IssueData {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: { name: string; statusCategory: { key: string; name: string } };
    priority: { name: string; id: string };
    issuetype: { name: string };
    assignee?: { displayName: string; emailAddress?: string } | null;
    reporter?: { displayName: string; emailAddress?: string };
    created: string;
    updated: string;
    resolutiondate?: string;
    duedate?: string;
    labels: string[];
    project: { key: string; name: string };
    comment?: { comments: IssueComment[] };
  };
}

interface IssueDetailPanelProps {
  issueKey: string;
  onClose: () => void;
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  'new': { bg: '#DEEBFF', color: '#0747A6' },
  'indeterminate': { bg: '#FFF0B3', color: '#974F0C' },
  'done': { bg: '#E3FCEF', color: '#006644' },
};

const priorityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  'Highest': { color: '#BF2600', icon: <Flag size={13} style={{ color: '#BF2600' }} /> },
  'High': { color: '#DE350B', icon: <Flag size={13} style={{ color: '#DE350B' }} /> },
  'Medium': { color: '#FF991F', icon: <Flag size={13} style={{ color: '#FF991F' }} /> },
  'Low': { color: '#0052CC', icon: <Flag size={13} style={{ color: '#0052CC' }} /> },
  'Lowest': { color: '#00875A', icon: <Flag size={13} style={{ color: '#00875A' }} /> },
  'Crítica': { color: '#BF2600', icon: <Flag size={13} style={{ color: '#BF2600' }} /> },
  'Alta': { color: '#DE350B', icon: <Flag size={13} style={{ color: '#DE350B' }} /> },
  'Média': { color: '#FF991F', icon: <Flag size={13} style={{ color: '#FF991F' }} /> },
  'Baixa': { color: '#0052CC', icon: <Flag size={13} style={{ color: '#0052CC' }} /> },
};

const typeStyle: Record<string, { bg: string; color: string }> = {
  'Story': { bg: '#E3FCEF', color: '#006644' },
  'Bug': { bg: '#FFEBE6', color: '#BF2600' },
  'Task': { bg: '#DEEBFF', color: '#0747A6' },
  'Epic': { bg: '#EAE6FF', color: '#5243AA' },
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function IssueDetailPanel({ issueKey, onClose }: IssueDetailPanelProps) {
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/issue/${issueKey}`)
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar');
        return res.json();
      })
      .then(data => { setIssue(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [issueKey]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const f = issue?.fields;
  const sCat = f?.status?.statusCategory?.key || 'new';
  const sStyle = statusStyle[sCat] || statusStyle['new'];
  const pConfig = priorityConfig[f?.priority?.name || 'Medium'] || priorityConfig['Medium'];
  const tStyle = typeStyle[f?.issuetype?.name || 'Task'] || typeStyle['Task'];
  const comments = f?.comment?.comments || [];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 transition-opacity"
        style={{ background: 'rgba(9, 30, 66, 0.45)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-screen z-50 flex flex-col issue-panel-slide-in"
        style={{
          width: '560px',
          maxWidth: '90vw',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-primary)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="badge text-[11px] flex-shrink-0"
              style={tStyle}
            >
              {f?.issuetype?.name || '...'}
            </span>
            <span
              className="text-sm font-bold flex-shrink-0"
              style={{ color: 'var(--accent-blue)' }}
            >
              {issueKey}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://movingpay.atlassian.net/browse/${issueKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}
              title="Abrir no Jira"
            >
              <ExternalLink size={15} />
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-60">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <AlertTriangle size={28} style={{ color: 'var(--accent-rose)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          )}

          {!loading && !error && f && (
            <div className="px-6 py-5 space-y-6">
              {/* Title */}
              <h2 className="text-xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {f.summary}
              </h2>

              {/* Status + Priority row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge text-[11px]" style={sStyle}>{f.status.name}</span>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: pConfig.color }}>
                  {pConfig.icon} {f.priority.name}
                </span>
              </div>

              {/* Description */}
              {f.description && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-tertiary)' }}>Descrição</h3>
                  <div
                    className="text-sm leading-relaxed p-4 rounded-lg"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-secondary)',
                    }}
                  >
                    {f.description}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border-primary)' }}
              >
                {[
                  {
                    icon: <User size={14} />,
                    label: 'Responsável',
                    value: f.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}>
                          {getInitials(f.assignee.displayName)}
                        </div>
                        <span>{f.assignee.displayName}</span>
                      </div>
                    ) : <span style={{ color: 'var(--text-tertiary)' }}>Não atribuído</span>,
                  },
                  {
                    icon: <User size={14} />,
                    label: 'Relator',
                    value: f.reporter?.displayName || '—',
                  },
                  {
                    icon: <Calendar size={14} />,
                    label: 'Criado em',
                    value: formatDate(f.created),
                  },
                  {
                    icon: <Clock size={14} />,
                    label: 'Atualizado em',
                    value: formatDate(f.updated),
                  },
                  ...(f.duedate ? [{
                    icon: <Calendar size={14} />,
                    label: 'Prazo',
                    value: new Date(f.duedate).toLocaleDateString('pt-BR'),
                  }] : []),
                  ...(f.resolutiondate ? [{
                    icon: <CheckCircle2 size={14} />,
                    label: 'Resolvido em',
                    value: formatDate(f.resolutiondate),
                  }] : []),
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                    style={{
                      borderBottom: '1px solid var(--border-secondary)',
                      background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    }}
                  >
                    <span style={{ color: 'var(--text-tertiary)', width: '16px', flexShrink: 0 }}>{row.icon}</span>
                    <span className="font-medium" style={{ color: 'var(--text-tertiary)', width: '120px', flexShrink: 0 }}>
                      {row.label}
                    </span>
                    <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {typeof row.value === 'string' ? row.value : row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Labels */}
              {f.labels && f.labels.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <Tag size={12} /> Labels
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {f.labels.map((label) => (
                      <span key={label} className="badge badge-blue text-[11px]">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <MessageSquare size={12} /> Comentários ({comments.length})
                </h3>
                {comments.length === 0 ? (
                  <p className="text-xs italic py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Nenhum comentário ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c, i) => (
                      <div key={i} className="p-4 rounded-lg"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}>
                            {getInitials(c.author.displayName)}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {c.author.displayName}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {formatDate(c.created)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {typeof c.body === 'string' ? c.body : JSON.stringify(c.body)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
