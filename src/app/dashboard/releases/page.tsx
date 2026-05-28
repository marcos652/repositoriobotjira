'use client';
import React from 'react';
import { GitBranch, Tag, CheckCircle2, Clock, Rocket, AlertCircle } from 'lucide-react';

const releases = [
  { version: 'v2.4.0', date: '25/05/2026', status: 'deployed', changes: 12, bugs: 2, author: 'Lucas S.' },
  { version: 'v2.3.1', date: '20/05/2026', status: 'deployed', changes: 5, bugs: 0, author: 'Ana P.' },
  { version: 'v2.3.0', date: '15/05/2026', status: 'deployed', changes: 18, bugs: 3, author: 'Carlos M.' },
  { version: 'v2.5.0-rc1', date: '28/05/2026', status: 'staging', changes: 8, bugs: 1, author: 'Julia R.' },
  { version: 'v2.2.0', date: '01/05/2026', status: 'deployed', changes: 22, bugs: 4, author: 'Pedro S.' },
];

const statusMap: Record<string,{label:string;color:string;bg:string}> = {
  deployed: { label: 'Deployed', color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)' },
  staging: { label: 'Staging', color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
  failed: { label: 'Failed', color: 'var(--accent-rose)', bg: 'var(--accent-rose-light)' },
};

export default function ReleasesPage() {
  return (
    <div className="rl-root">
      <div className="rl-hero"><div className="rl-hero-grid"/><div className="rl-hero-orb rl-hero-orb-1"/><div className="rl-hero-orb rl-hero-orb-2"/>
        <div className="rl-hero-content"><div className="rl-hero-left"><div className="rl-hero-icon"><GitBranch size={24} color="#fff"/></div><div><h1 className="rl-hero-title">Releases</h1><p className="rl-hero-sub">Histórico de versões e deploys</p></div></div>
          <div className="rl-pill"><Rocket size={13}/> {releases.filter(r=>r.status==='deployed').length} deployed</div></div>
      </div>
      <div className="rl-body"><div className="rl-main"><div className="rl-list">
        {releases.map(r=>{const s=statusMap[r.status];return(
          <div key={r.version} className="rl-card">
            <div className="rl-card-ver"><Tag size={14} style={{color:'var(--accent-blue)'}}/><span>{r.version}</span></div>
            <div className="rl-card-info"><span className="rl-card-date"><Clock size={10}/>{r.date}</span><span className="rl-card-author">{r.author}</span></div>
            <div className="rl-card-stats"><span>{r.changes} changes</span><span>{r.bugs} bugs</span></div>
            <span className="rl-badge" style={{background:s.bg,color:s.color}}>{s.label}</span>
          </div>
        );})}
      </div></div>
      <div className="rl-sidebar"><div className="rl-sb-section"><h3 className="rl-sb-title">Próximo Release</h3>
        <div className="rl-next"><p className="rl-next-ver">v2.5.0</p><p className="rl-next-date">Previsto: 02/06/2026</p><div className="rl-next-bar"><div className="rl-next-fill" style={{width:'65%'}}/></div><p className="rl-next-pct">65% concluído</p></div>
      </div><div className="rl-sb-divider"/><div className="rl-sb-section"><h3 className="rl-sb-title">Estatísticas</h3>
        <div className="rl-stats">{[{l:'Total releases',v:releases.length},{l:'Avg changes',v:Math.round(releases.reduce((s,r)=>s+r.changes,0)/releases.length)},{l:'Bug rate',v:`${Math.round(releases.reduce((s,r)=>s+r.bugs,0)/releases.reduce((s,r)=>s+r.changes,0)*100)}%`}].map(s=>(
          <div key={s.l} className="rl-stat-item"><span className="rl-stat-label">{s.l}</span><span className="rl-stat-val">{s.v}</span></div>
        ))}</div>
      </div></div></div>
      <style jsx>{`
        .rl-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .rl-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#171030 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .rl-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .rl-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .rl-hero-orb-1{width:250px;height:250px;background:rgba(168,85,247,.2);top:-80px;right:15%;animation:rlO 8s ease-in-out infinite}
        .rl-hero-orb-2{width:180px;height:180px;background:rgba(99,102,241,.14);bottom:-60px;left:25%;animation:rlO 11s ease-in-out infinite reverse}
        @keyframes rlO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .rl-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .rl-hero-left{display:flex;align-items:center;gap:16px}
        .rl-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#8B5CF6,#A78BFA);box-shadow:0 8px 28px rgba(139,92,246,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .rl-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.rl-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .rl-pill{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .rl-body{flex:1;display:flex;overflow:hidden}.rl-main{flex:1;overflow-y:auto;padding:24px 28px}
        .rl-list{display:flex;flex-direction:column;gap:10px}
        .rl-card{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s}
        .rl-card:hover{border-color:var(--border-primary);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .rl-card-ver{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:800;color:var(--text-primary);min-width:120px}
        .rl-card-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
        .rl-card-date{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-tertiary)}
        .rl-card-author{font-size:11px;color:var(--text-secondary);font-weight:600}
        .rl-card-stats{display:flex;gap:12px;font-size:10px;color:var(--text-tertiary);font-weight:600}
        .rl-badge{font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;flex-shrink:0}
        .rl-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .rl-sb-section{padding:20px}.rl-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .rl-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .rl-next{padding:16px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-secondary)}
        .rl-next-ver{font-size:18px;font-weight:800;color:var(--text-primary)}.rl-next-date{font-size:10px;color:var(--text-tertiary);margin-top:2px}
        .rl-next-bar{height:4px;border-radius:2px;background:var(--border-secondary);margin-top:12px;overflow:hidden}
        .rl-next-fill{height:100%;border-radius:2px;background:var(--accent-violet);transition:width .6s ease}
        .rl-next-pct{font-size:10px;color:var(--accent-violet);font-weight:700;margin-top:6px}
        .rl-stats{display:flex;flex-direction:column;gap:10px}
        .rl-stat-item{display:flex;justify-content:space-between}.rl-stat-label{font-size:11px;color:var(--text-secondary)}.rl-stat-val{font-size:13px;font-weight:800;color:var(--text-primary)}
      `}</style>
    </div>
  );
}
