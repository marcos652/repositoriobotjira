'use client';
import React, { useEffect, useState } from 'react';
import { Bell, Loader2, WifiOff, RefreshCw, MessageCircle, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';

interface Notification { type: string; issueKey: string; summary: string; author: string; authorAvatar: string | null; date: string; message: string; }

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  comment: { icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  status: { icon: ArrowRight, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
};

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/jira/team');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = notifications.filter(n => filterType === 'all' || n.type === filterType);
  const commentCount = notifications.filter(n => n.type === 'comment').length;
  const statusCount = notifications.filter(n => n.type === 'status').length;

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#F43F5E' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando notificações...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro</p><button onClick={() => fetchData()} style={{ padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #F43F5E, #EC4899)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Tentar novamente</button></div></div>;

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.12)' }}>
            <Bell size={20} style={{ color: '#FB7185' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Notificações</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{notifications.length} atividades nos últimos 7 dias</p>
          </div>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { id: 'all', label: `Todas (${notifications.length})` },
          { id: 'comment', label: `Comentários (${commentCount})` },
          { id: 'status', label: `Status (${statusCount})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilterType(tab.id)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filterType === tab.id ? 'rgba(244,63,94,0.08)' : 'var(--bg-secondary)', color: filterType === tab.id ? '#FB7185' : 'var(--text-tertiary)', borderWidth: 1, borderStyle: 'solid', borderColor: filterType === tab.id ? 'rgba(244,63,94,0.15)' : 'var(--border-primary)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div style={{ flex: 1, overflow: 'auto', borderRadius: '16px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhuma notificação</p>
          </div>
        ) : (
          <div style={{ padding: '4px' }}>
            {filtered.map((n, i) => {
              const cfg = typeConfig[n.type] || typeConfig.status;
              const Icon = cfg.icon;
              return (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '16px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-secondary)' : 'none', transition: 'background 0.1s', borderRadius: '12px', margin: '2px' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, flexShrink: 0 }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {n.authorAvatar ? <img src={n.authorAvatar} alt="" style={{ width: 20, height: 20, borderRadius: 6 }} /> : null}
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{n.author}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginLeft: 'auto' }}>{timeAgo(n.date)}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{n.message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <a href={`https://movingpay.atlassian.net/browse/${n.issueKey}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', background: 'rgba(99,102,241,0.08)', color: '#818CF8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {n.issueKey} <ExternalLink size={10} />
                      </a>
                      {n.summary && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.summary}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
