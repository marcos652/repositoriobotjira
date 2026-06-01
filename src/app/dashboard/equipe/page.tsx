'use client';
import React, { useEffect, useState } from 'react';
import { Users, Loader2, WifiOff, RefreshCw } from 'lucide-react';

interface TeamMember { name: string; email: string; avatar: string | null; open: number; resolved: number; inProgress: number; }

const gradients = [
  'linear-gradient(135deg,#6366F1,#8B5CF6)', 'linear-gradient(135deg,#EC4899,#F43F5E)',
  'linear-gradient(135deg,#F59E0B,#F97316)', 'linear-gradient(135deg,#06B6D4,#3B82F6)',
  'linear-gradient(135deg,#22C55E,#10B981)', 'linear-gradient(135deg,#8B5CF6,#A78BFA)',
  'linear-gradient(135deg,#EF4444,#DC2626)', 'linear-gradient(135deg,#14B8A6,#0D9488)',
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

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#8B5CF6' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando equipe do Jira...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro ao carregar</p><button onClick={() => fetchData()} style={{ padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg,#8B5CF6,#A78BFA)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Tentar novamente</button></div></div>;

  const topPerformers = [...team].slice(0, 3);
  const totalOpen = team.reduce((s, m) => s + m.open, 0);
  const totalResolved = team.reduce((s, m) => s + m.resolved, 0);
  const totalInProgress = team.reduce((s, m) => s + m.inProgress, 0);

  return (
    <div className="eq-root">
      <div className="eq-hero">
        <div className="eq-hero-grid" /><div className="eq-hero-orb eq-hero-orb-1" /><div className="eq-hero-orb eq-hero-orb-2" />
        <div className="eq-hero-content">
          <div className="eq-hero-left">
            <div className="eq-hero-icon"><Users size={24} color="#fff" /></div>
            <div><h1 className="eq-hero-title">Equipe</h1><p className="eq-hero-sub">Dados reais do projeto DSMM</p></div>
          </div>
          <div className="eq-hero-right">
            <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.6)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar</button>
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
                      {m.avatar ? <img src={m.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 12 }} /> : <div className="eq-avatar" style={{ background: gradients[i % gradients.length] }}>{initials}</div>}
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
            <h3 className="eq-sb-title">🏆 Top Performers</h3>
            <div className="eq-top">
              {topPerformers.map((m, i) => {
                const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={m.name} className="eq-top-item">
                    <div className="eq-top-rank">#{i + 1}</div>
                    {m.avatar ? <img src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} /> : <div className="eq-top-avatar" style={{ background: gradients[i % gradients.length] }}>{initials}</div>}
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
        .eq-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .eq-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18 0%,#14102A 30%,#1A1045 60%,#0D0B22 100%);border-bottom:1px solid rgba(255,255,255,0.05);padding:28px 32px}
        .eq-hero-grid{position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .eq-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .eq-hero-orb-1{width:250px;height:250px;background:rgba(139,92,246,0.2);top:-80px;right:15%;animation:eqO 8s ease-in-out infinite}
        .eq-hero-orb-2{width:180px;height:180px;background:rgba(236,72,153,0.14);bottom:-60px;left:25%;animation:eqO 11s ease-in-out infinite reverse}
        @keyframes eqO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .eq-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .eq-hero-left{display:flex;align-items:center;gap:16px}
        .eq-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#8B5CF6,#A78BFA);box-shadow:0 8px 28px rgba(139,92,246,0.35),inset 0 1px 0 rgba(255,255,255,0.2)}
        .eq-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.eq-hero-sub{font-size:13px;color:rgba(148,163,184,0.65);margin-top:2px}
        .eq-hero-right{display:flex;gap:8px;align-items:center}
        .eq-pill-total{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(148,163,184,0.6);font-size:11px;font-weight:600}
        .eq-body{flex:1;display:flex;overflow:hidden}.eq-main{flex:1;overflow-y:auto;padding:24px 28px}
        .eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .eq-card{padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all 0.2s}
        .eq-card:hover{border-color:var(--border-primary);box-shadow:0 4px 16px rgba(0,0,0,0.06);transform:translateY(-2px)}
        .eq-card-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .eq-avatar-wrap{position:relative}.eq-avatar{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff}
        .eq-name{font-size:14px;font-weight:700;color:var(--text-primary)}.eq-role{font-size:11px;color:var(--text-tertiary);margin-top:1px}
        .eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .eq-stat{text-align:center;padding:8px;border-radius:8px;background:var(--bg-card)}
        .eq-stat-val{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
        .eq-stat-label{font-size:9px;font-weight:600;color:var(--text-tertiary);margin-top:2px}
        .eq-progress-track{height:3px;border-radius:2px;background:var(--border-secondary);margin-top:14px;overflow:hidden}
        .eq-progress-fill{height:100%;border-radius:2px;background:var(--accent-violet);transition:width 0.6s ease}
        .eq-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .eq-sb-section{padding:20px}.eq-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-tertiary);margin-bottom:14px}
        .eq-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .eq-top{display:flex;flex-direction:column;gap:12px}
        .eq-top-item{display:flex;align-items:center;gap:10px}
        .eq-top-rank{font-size:11px;font-weight:800;color:var(--text-tertiary);width:20px}
        .eq-top-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0}
        .eq-top-name{font-size:12px;font-weight:600;color:var(--text-primary)}.eq-top-score{font-size:10px;color:var(--text-tertiary)}
        .eq-summary{display:flex;flex-direction:column;gap:10px}
        .eq-summary-item{display:flex;justify-content:space-between;align-items:center}
        .eq-summary-label{font-size:11px;color:var(--text-secondary)}
        .eq-summary-val{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
      `}</style>
    </div>
  );
}
