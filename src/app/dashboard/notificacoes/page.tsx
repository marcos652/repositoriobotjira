'use client';

/* eslint-disable @next/next/no-img-element -- Os avatares do Jira usam hosts remotos dinâmicos. */

import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Bell, CheckCircle2, ExternalLink, Loader2, MessageCircle, RefreshCw, WifiOff } from 'lucide-react';

interface Notification {
  type: string;
  issueKey: string;
  summary: string;
  author: string;
  authorAvatar: string | null;
  date: string;
  message: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  comment: { icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  status: { icon: ArrowRight, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
};

async function requestNotifications() {
  const response = await fetch('/api/jira/team');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return (data.notifications || []) as Notification[];
}

function NotificationState({ mode, onRetry }: { mode: 'loading' | 'error'; onRetry?: () => void }) {
  const isLoading = mode === 'loading';

  return (
    <div className="nt-state-page">
      <div className="nt-state-card">
        <div className={`nt-state-icon ${mode}`}>
          {isLoading ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
        </div>
        <h1>{isLoading ? 'Notificações' : 'Erro'}</h1>
        <p>{isLoading ? 'Carregando notificações...' : 'Não foi possível carregar as notificações.'}</p>
        {!isLoading && <button onClick={onRetry}>Tentar novamente</button>}
      </div>

      <style jsx>{`
        .nt-state-page {
          display: flex;
          min-height: 60vh;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .nt-state-card {
          display: flex;
          width: min(100%, 420px);
          align-items: center;
          flex-direction: column;
          padding: 40px 24px;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
          text-align: center;
        }
        .nt-state-icon {
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-rose-light);
        }
        .nt-state-icon.loading { color: #F43F5E; }
        .nt-state-icon.error { color: #FB7185; }
        .nt-state-card h1 {
          margin: 18px 0 0;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 500;
          line-height: 30px;
        }
        .nt-state-card p {
          margin: 7px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
        }
        .nt-state-card button {
          min-height: 36px;
          margin-top: 20px;
          padding: 8px 14px;
          border: 1px solid #F43F5E;
          border-radius: 8px;
          background: #F43F5E;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
        }
      `}</style>
    </div>
  );
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all');

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await requestNotifications();
      setNotifications(data);
      setError(null);
    } catch (fetchError) {
      setError(String(fetchError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    void requestNotifications()
      .then((data) => {
        if (!active) return;
        setNotifications(data);
        setError(null);
      })
      .catch((fetchError) => {
        if (active) setError(String(fetchError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const filtered = notifications.filter((notification) => filterType === 'all' || notification.type === filterType);
  const commentCount = notifications.filter((notification) => notification.type === 'comment').length;
  const statusCount = notifications.filter((notification) => notification.type === 'status').length;

  if (loading) {
    return <NotificationState mode="loading" />;
  }

  if (error) {
    return <NotificationState mode="error" onRetry={() => void fetchData()} />;
  }

  const tabs = [
    { id: 'all', label: `Todas (${notifications.length})` },
    { id: 'comment', label: `Comentários (${commentCount})` },
    { id: 'status', label: `Status (${statusCount})` },
  ];

  return (
    <div className="nt-root">
      <header className="nt-header">
        <div className="nt-heading">
          <div className="nt-kicker"><Bell size={15} /> Central de atividades</div>
          <h1>Notificações</h1>
          <p>{notifications.length} atividades nos últimos 7 dias</p>
        </div>
        <button className="nt-refresh" onClick={() => void fetchData(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      <nav className="nt-tabs" aria-label="Filtrar notificações">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={filterType === tab.id ? 'active' : ''}
            onClick={() => setFilterType(tab.id)}
            aria-pressed={filterType === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="nt-surface" aria-labelledby="nt-activity-title">
        <div className="nt-surface-header">
          <div>
            <h2 id="nt-activity-title">Atividades</h2>
            <p>Atualizações recentes dos seus projetos no Jira.</p>
          </div>
          <span>{filtered.length} resultados</span>
        </div>

        {filtered.length === 0 ? (
          <div className="nt-empty">
            <div className="nt-empty-icon"><CheckCircle2 size={22} /></div>
            <h3>Nenhuma notificação</h3>
            <p>Não há atividades para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="nt-list">
            {filtered.map((notification, index) => {
              const config = typeConfig[notification.type] || typeConfig.status;
              const Icon = config.icon;

              return (
                <article key={`${notification.issueKey}-${notification.date}-${index}`} className="nt-row">
                  <div className="nt-type-icon" style={{ background: config.bg, color: config.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="nt-content">
                    <div className="nt-author-row">
                      <div className="nt-author">
                        {notification.authorAvatar
                          ? <img src={notification.authorAvatar} alt="" />
                          : <span className="nt-avatar-placeholder" aria-hidden="true">{notification.author.slice(0, 1).toUpperCase()}</span>}
                        <strong>{notification.author}</strong>
                      </div>
                      <time dateTime={notification.date}>{timeAgo(notification.date)}</time>
                    </div>
                    <p className="nt-message">{notification.message}</p>
                    <div className="nt-issue-row">
                      <a href={`https://movingpay.atlassian.net/browse/${notification.issueKey}`} target="_blank" rel="noopener noreferrer">
                        {notification.issueKey} <ExternalLink size={10} />
                      </a>
                      {notification.summary && <span>{notification.summary}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .nt-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .nt-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .nt-heading { min-width: 0; }
        .nt-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #F43F5E;
          font-size: 12px;
          font-weight: 700;
        }
        .nt-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .nt-heading p,
        .nt-surface-header p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .nt-refresh,
        .nt-tabs button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
        }
        .nt-refresh:hover,
        .nt-tabs button:hover { background: var(--bg-card-hover); }
        .nt-refresh:disabled { cursor: wait; opacity: 0.65; }
        .nt-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 0 4px 2px;
        }
        .nt-tabs button { white-space: nowrap; }
        .nt-tabs button.active {
          border-color: rgba(244, 63, 94, 0.15);
          background: var(--accent-rose-light);
          color: #F43F5E;
        }
        .nt-surface {
          flex: 1;
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .nt-surface-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .nt-surface-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .nt-surface-header > span {
          min-height: 32px;
          padding: 7px 10px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .nt-row {
          display: flex;
          gap: 14px;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .nt-row:last-child { border-bottom: 0; }
        .nt-row:hover { background: var(--bg-card-hover); }
        .nt-type-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .nt-content { min-width: 0; flex: 1; }
        .nt-author-row,
        .nt-author,
        .nt-issue-row {
          display: flex;
          align-items: center;
        }
        .nt-author-row { justify-content: space-between; gap: 12px; }
        .nt-author { min-width: 0; gap: 8px; }
        .nt-author img,
        .nt-avatar-placeholder {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          border-radius: 6px;
        }
        .nt-author img { object-fit: cover; }
        .nt-avatar-placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 10px;
          font-weight: 700;
        }
        .nt-author strong {
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nt-author-row time {
          flex: 0 0 auto;
          color: var(--text-tertiary);
          font-size: 10px;
          font-variant-numeric: tabular-nums;
        }
        .nt-message {
          margin: 7px 0 8px;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 18px;
        }
        .nt-issue-row { min-width: 0; gap: 8px; }
        .nt-issue-row a {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.08);
          color: #818CF8;
          font-size: 10px;
          font-weight: 700;
          text-decoration: none;
        }
        .nt-issue-row a:hover { text-decoration: underline; }
        .nt-issue-row > span {
          overflow: hidden;
          color: var(--text-tertiary);
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nt-empty {
          display: flex;
          min-height: 300px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 48px 20px;
          text-align: center;
        }
        .nt-empty-icon {
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .nt-empty h3 {
          margin: 14px 0 0;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 650;
        }
        .nt-empty p {
          margin: 5px 0 0;
          color: var(--text-tertiary);
          font-size: 12px;
        }
        @media (max-width: 640px) {
          .nt-header { align-items: flex-start; flex-direction: column; }
          .nt-heading h1 { font-size: 28px; line-height: 34px; }
          .nt-surface-header { align-items: flex-start; padding: 20px; }
          .nt-surface-header > span { display: none; }
          .nt-row { padding: 18px 20px; }
          .nt-author-row { align-items: flex-start; flex-direction: column; gap: 5px; }
          .nt-author-row time { padding-left: 30px; }
          .nt-issue-row { align-items: flex-start; flex-direction: column; }
          .nt-issue-row > span { width: 100%; }
        }
      `}</style>
    </div>
  );
}
