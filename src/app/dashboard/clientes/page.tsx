'use client';
import React from 'react';
import { Building2, Mail, Phone, MapPin, TrendingUp } from 'lucide-react';

const clients = [
  { name: 'TechCorp Brasil', contact: 'João Almeida', email: 'joao@techcorp.com', tickets: 24, satisfaction: 92, plan: 'Enterprise', color: '#6366F1' },
  { name: 'Digital Solutions', contact: 'Maria Costa', email: 'maria@digsol.com', tickets: 18, satisfaction: 88, plan: 'Business', color: '#3B82F6' },
  { name: 'StartupXYZ', contact: 'Pedro Lima', email: 'pedro@startupxyz.com', tickets: 8, satisfaction: 95, plan: 'Starter', color: '#22C55E' },
  { name: 'MegaRetail', contact: 'Ana Santos', email: 'ana@megaretail.com', tickets: 31, satisfaction: 79, plan: 'Enterprise', color: '#F59E0B' },
  { name: 'CloudInfra', contact: 'Lucas Rocha', email: 'lucas@cloudinfra.io', tickets: 15, satisfaction: 91, plan: 'Business', color: '#8B5CF6' },
  { name: 'FinanceApp', contact: 'Carla Mendes', email: 'carla@financeapp.com', tickets: 12, satisfaction: 87, plan: 'Business', color: '#EC4899' },
];

export default function ClientesPage() {
  return (
    <div className="cl-root">
      <div className="cl-hero"><div className="cl-hero-grid"/><div className="cl-hero-orb cl-hero-orb-1"/><div className="cl-hero-orb cl-hero-orb-2"/>
        <div className="cl-hero-content"><div className="cl-hero-left"><div className="cl-hero-icon"><Building2 size={24} color="#fff"/></div><div><h1 className="cl-hero-title">Clientes</h1><p className="cl-hero-sub">Gestão de contas e clientes</p></div></div>
          <div className="cl-pill">{clients.length} ativos</div></div>
      </div>
      <div className="cl-body"><div className="cl-main"><div className="cl-grid">
        {clients.map(c=>(
          <div key={c.name} className="cl-card">
            <div className="cl-card-top">
              <div className="cl-avatar" style={{background:c.color}}>{c.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div><p className="cl-name">{c.name}</p><p className="cl-plan" style={{color:c.color}}>{c.plan}</p></div>
            </div>
            <div className="cl-contact"><p><Mail size={10}/> {c.email}</p><p><Building2 size={10}/> {c.contact}</p></div>
            <div className="cl-stats">
              <div className="cl-stat"><span className="cl-stat-val" style={{color:'var(--accent-blue)'}}>{c.tickets}</span><span className="cl-stat-label">Tickets</span></div>
              <div className="cl-stat"><span className="cl-stat-val" style={{color:c.satisfaction>=90?'var(--accent-emerald)':c.satisfaction>=80?'var(--accent-amber)':'var(--accent-rose)'}}>{c.satisfaction}%</span><span className="cl-stat-label">Satisfação</span></div>
            </div>
          </div>
        ))}
      </div></div>
      <div className="cl-sidebar"><div className="cl-sb-section"><h3 className="cl-sb-title">Por Plano</h3>
        {['Enterprise','Business','Starter'].map(p=><div key={p} className="cl-plan-item"><span>{p}</span><span className="cl-plan-count">{clients.filter(c=>c.plan===p).length}</span></div>)}
      </div><div className="cl-sb-divider"/><div className="cl-sb-section"><h3 className="cl-sb-title">Satisfação Média</h3>
        <div className="cl-avg"><span className="cl-avg-val">{Math.round(clients.reduce((s,c)=>s+c.satisfaction,0)/clients.length)}%</span></div>
      </div></div></div>
      <style jsx>{`
        .cl-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .cl-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0F1A29 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .cl-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .cl-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .cl-hero-orb-1{width:250px;height:250px;background:rgba(59,130,246,.18);top:-80px;right:15%;animation:clO 8s ease-in-out infinite}
        .cl-hero-orb-2{width:180px;height:180px;background:rgba(6,182,212,.14);bottom:-60px;left:25%;animation:clO 11s ease-in-out infinite reverse}
        @keyframes clO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .cl-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .cl-hero-left{display:flex;align-items:center;gap:16px}
        .cl-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3B82F6,#06B6D4);box-shadow:0 8px 28px rgba(59,130,246,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .cl-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.cl-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .cl-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .cl-body{flex:1;display:flex;overflow:hidden}.cl-main{flex:1;overflow-y:auto;padding:24px 28px}
        .cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .cl-card{padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s}
        .cl-card:hover{border-color:var(--border-primary);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .cl-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .cl-avatar{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0}
        .cl-name{font-size:14px;font-weight:700;color:var(--text-primary)}.cl-plan{font-size:10px;font-weight:700;margin-top:1px}
        .cl-contact{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
        .cl-contact p{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-tertiary)}
        .cl-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .cl-stat{text-align:center;padding:8px;border-radius:8px;background:var(--bg-card)}
        .cl-stat-val{font-size:18px;font-weight:800;display:block}.cl-stat-label{font-size:9px;color:var(--text-tertiary);margin-top:2px;display:block}
        .cl-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .cl-sb-section{padding:20px}.cl-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .cl-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .cl-plan-item{display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:var(--text-secondary)}
        .cl-plan-count{font-weight:800;color:var(--text-primary)}
        .cl-avg{text-align:center;padding:20px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-secondary)}
        .cl-avg-val{font-size:36px;font-weight:800;color:var(--accent-emerald)}
      `}</style>
    </div>
  );
}
