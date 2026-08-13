'use client';
import React, { useEffect, useState } from 'react';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { Cup } from 'iconsax-react';

interface TeamMember { name: string; email: string; avatar: string | null; open: number; resolved: number; inProgress: number; }

const avatarColors = [
  '#6366F1', '#EC4899', '#F59E0B', '#06B6D4',
  '#22C55E', '#8B5CF6', '#EF4444', '#14B8A6',
];

export default function EquipePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/jira/team');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTeam(data.team || []);
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void fetchData());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#8B5CF6' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando equipe do Jira...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro ao carregar</p><button onClick={() => fetchData()} style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent-violet)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Tentar novamente</button></div></div>;

  const topPerformers = [...team].slice(0, 3);
  const totalOpen = team.reduce((s, m) => s + m.open, 0);
  const totalResolved = team.reduce((s, m) => s + m.resolved, 0);
  const totalInProgress = team.reduce((s, m) => s + m.inProgress, 0);

  return (
    <div className="eq-root">
      <div className="eq-page-header">
        <div className="eq-header-content">
          <div className="eq-header-left">
            <div><h1 className="eq-title">Equipe</h1><p className="eq-subtitle">Dados reais do projeto DSMM</p></div>
          </div>
          <div className="eq-header-actions">
            <button className="eq-refresh" onClick={() => fetchData(true)} disabled={refreshing}><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar</button>
            <div className="eq-pill-total">{team.length} membros</div>
          </div>
        </div>
      </div>

      <div className="eq-body">
        <div className="eq-main">
          <div className="eq-grid">
            {team.map((m, i) => {
              const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const maxResolved = Math.max(...team.map(t => t.resolved), 1);
              return (
                <div key={m.email || m.name} className="eq-card">
                  <div className="eq-card-top">
                    <div className="eq-avatar-wrap">
                      {m.avatar ? <img src={m.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 8 }} /> : <div className="eq-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{initials}</div>}
                    </div>
                    <div>
                      <p className="eq-name">{m.name}</p>
                      <p className="eq-role">{m.email || '—'}</p>
                    </div>
                  </div>
                  <div className="eq-stats">
                    <div className="eq-stat"><p className="eq-stat-val" style={{ color: 'var(--accent-blue)' }}>{m.open}</p><p className="eq-stat-label">Aberto</p></div>
                    <div className="eq-stat"><p className="eq-stat-val" style={{ color: 'var(--accent-amber)' }}>{m.inProgress}</p><p className="eq-stat-label">Em Prog.</p></div>
                    <div className="eq-stat"><p className="eq-stat-val" style={{ color: 'var(--accent-emerald)' }}>{m.resolved}</p><p className="eq-stat-label">Resolvidos</p></div>
                  </div>
                  <div className="eq-progress-track"><div className="eq-progress-fill" style={{ width: `${(m.resolved / maxResolved) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="eq-sidebar">
          <div className="eq-sb-section">
            <h3 className="eq-sb-title"><Cup size={16} variant="Bold" color="#FBBF24" aria-hidden="true" /> Top Performers</h3>
            <div className="eq-top">
              {topPerformers.map((m, i) => {
                const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={m.name} className="eq-top-item">
                    <div className="eq-top-rank">#{i + 1}</div>
                    {m.avatar ? <img src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} /> : <div className="eq-top-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{initials}</div>}
                    <div className="eq-top-info"><p className="eq-top-name">{m.name}</p><p className="eq-top-score">{m.resolved} resolvidos</p></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="eq-sb-divider" />
          <div className="eq-sb-section">
            <h3 className="eq-sb-title">Resumo</h3>
            <div className="eq-summary">
              {[
                { label: 'Total em aberto', value: totalOpen, color: 'var(--accent-blue)' },
                { label: 'Em andamento', value: totalInProgress, color: 'var(--accent-amber)' },
                { label: 'Total resolvidos', value: totalResolved, color: 'var(--accent-emerald)' },
              ].map(s => (<div key={s.label} className="eq-summary-item"><span className="eq-summary-label">{s.label}</span><span className="eq-summary-val" style={{ color: s.color }}>{s.value}</span></div>))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .eq-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .eq-page-header{flex-shrink:0}
        .eq-header-content{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .eq-header-left{display:flex;align-items:center}
        .eq-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.eq-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .eq-header-actions{display:flex;gap:8px;align-items:center}
        .eq-refresh,.eq-pill-total{min-height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600}
        .eq-refresh{cursor:pointer;font-family:inherit;transition:background .15s,color .15s}.eq-refresh:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}.eq-refresh:disabled{opacity:.55;cursor:not-allowed}
        .eq-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.eq-main{min-width:0}
        .eq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
        .eq-card{padding:20px;border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);transition:border-color .15s}
        .eq-card:hover{border-color:var(--border-focus)}
        .eq-card-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .eq-avatar-wrap{position:relative}.eq-avatar{width:42px;height:42px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff}
        .eq-name{font-size:14px;font-weight:600;color:var(--text-primary)}.eq-role{font-size:11px;color:var(--text-tertiary);margin-top:2px}
        .eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .eq-stat{text-align:center;padding:8px;border-radius:8px;background:var(--bg-secondary)}
        .eq-stat-val{font-size:20px;font-weight:500;font-variant-numeric:tabular-nums}
        .eq-stat-label{font-size:9px;font-weight:600;color:var(--text-tertiary);margin-top:2px}
        .eq-progress-track{height:3px;border-radius:2px;background:var(--border-secondary);margin-top:14px;overflow:hidden}
        .eq-progress-fill{height:100%;border-radius:2px;background:var(--accent-violet);transition:width 0.6s ease}
        .eq-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden}
        .eq-sb-section{padding:24px}.eq-sb-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        .eq-sb-divider{height:1px;margin:0 24px;background:var(--border-secondary)}
        .eq-top{display:flex;flex-direction:column;gap:12px}
        .eq-top-item{display:flex;align-items:center;gap:10px}
        .eq-top-rank{font-size:11px;font-weight:800;color:var(--text-tertiary);width:20px}
        .eq-top-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0}
        .eq-top-name{font-size:12px;font-weight:600;color:var(--text-primary)}.eq-top-score{font-size:10px;color:var(--text-tertiary)}
        .eq-summary{display:flex;flex-direction:column;gap:10px}
        .eq-summary-item{display:flex;justify-content:space-between;align-items:center}
        .eq-summary-label{font-size:11px;color:var(--text-secondary)}
        .eq-summary-val{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
        @media (max-width:1100px){.eq-body{grid-template-columns:1fr}.eq-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.eq-sb-divider{display:none}.eq-sb-section+.eq-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.eq-header-actions{width:100%;flex-wrap:wrap}.eq-sidebar{display:block}.eq-sb-section+.eq-sb-section{border-left:0}.eq-sb-divider{display:block}.eq-grid{grid-template-columns:1fr}.eq-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
