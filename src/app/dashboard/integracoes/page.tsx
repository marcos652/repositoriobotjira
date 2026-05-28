'use client';
import React from 'react';
import { Plug, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

const integrations = [
  { name: 'Slack', desc: 'Notificações e alertas em canais', status: 'connected', icon: '💬', color: '#E01E5A' },
  { name: 'GitHub', desc: 'Sincronizar PRs e commits', status: 'connected', icon: '🐙', color: '#24292F' },
  { name: 'Confluence', desc: 'Documentação e wikis', status: 'connected', icon: '📘', color: '#1868DB' },
  { name: 'PagerDuty', desc: 'Gestão de incidentes', status: 'disconnected', icon: '🚨', color: '#06AC38' },
  { name: 'Datadog', desc: 'Monitoramento e métricas', status: 'connected', icon: '📊', color: '#632CA6' },
  { name: 'Figma', desc: 'Designs e protótipos', status: 'disconnected', icon: '🎨', color: '#F24E1E' },
  { name: 'Google Calendar', desc: 'Sincronizar eventos', status: 'connected', icon: '📅', color: '#4285F4' },
  { name: 'Sentry', desc: 'Rastreamento de erros', status: 'connected', icon: '🐛', color: '#362D59' },
];

export default function IntegracoesPage() {
  return (
    <div className="ig-root">
      <div className="ig-hero"><div className="ig-hero-grid"/><div className="ig-hero-orb ig-hero-orb-1"/><div className="ig-hero-orb ig-hero-orb-2"/>
        <div className="ig-hero-content"><div className="ig-hero-left"><div className="ig-hero-icon"><Plug size={24} color="#fff"/></div><div><h1 className="ig-hero-title">Integrações</h1><p className="ig-hero-sub">Conexões e APIs externas</p></div></div>
          <div className="ig-pills"><div className="ig-pill-ok"><CheckCircle2 size={12}/> {integrations.filter(i=>i.status==='connected').length} conectadas</div><div className="ig-pill">{integrations.length} total</div></div></div>
      </div>
      <div className="ig-body"><div className="ig-main"><div className="ig-grid">
        {integrations.map(i=>(
          <div key={i.name} className="ig-card">
            <div className="ig-card-top"><span className="ig-card-emoji">{i.icon}</span>
              <div><p className="ig-card-name">{i.name}</p><p className="ig-card-desc">{i.desc}</p></div>
            </div>
            <div className="ig-card-bottom">
              <span className={`ig-status ${i.status}`}>{i.status==='connected'?<><CheckCircle2 size={11}/>Conectado</>:<><XCircle size={11}/>Desconectado</>}</span>
              <button className="ig-btn">{i.status==='connected'?'Configurar':'Conectar'}</button>
            </div>
          </div>
        ))}
      </div></div>
      <div className="ig-sidebar"><div className="ig-sb-section"><h3 className="ig-sb-title">Status</h3>
        <div className="ig-stats">{[{l:'Conectadas',v:integrations.filter(i=>i.status==='connected').length,c:'var(--accent-emerald)'},{l:'Desconectadas',v:integrations.filter(i=>i.status==='disconnected').length,c:'var(--accent-rose)'}].map(s=>(
          <div key={s.l} className="ig-stat"><span className="ig-stat-l">{s.l}</span><span className="ig-stat-v" style={{color:s.c}}>{s.v}</span></div>
        ))}</div>
      </div></div></div>
      <style jsx>{`
        .ig-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .ig-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0F1629 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .ig-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .ig-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .ig-hero-orb-1{width:250px;height:250px;background:rgba(6,182,212,.18);top:-80px;right:15%;animation:igO 8s ease-in-out infinite}
        .ig-hero-orb-2{width:180px;height:180px;background:rgba(59,130,246,.14);bottom:-60px;left:25%;animation:igO 11s ease-in-out infinite reverse}
        @keyframes igO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .ig-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .ig-hero-left{display:flex;align-items:center;gap:16px}
        .ig-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#06B6D4,#3B82F6);box-shadow:0 8px 28px rgba(6,182,212,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .ig-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.ig-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .ig-pills{display:flex;gap:8px}
        .ig-pill-ok{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15);color:#4ADE80;font-size:11px;font-weight:700}
        .ig-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .ig-body{flex:1;display:flex;overflow:hidden}.ig-main{flex:1;overflow-y:auto;padding:24px 28px}
        .ig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .ig-card{padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s;display:flex;flex-direction:column;gap:16px}
        .ig-card:hover{border-color:var(--border-primary);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .ig-card-top{display:flex;align-items:center;gap:12px}
        .ig-card-emoji{font-size:28px}
        .ig-card-name{font-size:14px;font-weight:700;color:var(--text-primary)}.ig-card-desc{font-size:11px;color:var(--text-tertiary);margin-top:1px}
        .ig-card-bottom{display:flex;align-items:center;justify-content:space-between}
        .ig-status{display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700}
        .ig-status.connected{color:var(--accent-emerald)}.ig-status.disconnected{color:var(--accent-rose)}
        .ig-btn{padding:6px 14px;border-radius:8px;font-size:10px;font-weight:700;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-secondary);cursor:pointer;transition:all .15s}
        .ig-btn:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
        .ig-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .ig-sb-section{padding:20px}.ig-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .ig-stats{display:flex;flex-direction:column;gap:12px}
        .ig-stat{display:flex;justify-content:space-between}.ig-stat-l{font-size:11px;color:var(--text-secondary)}.ig-stat-v{font-size:15px;font-weight:800}
      `}</style>
    </div>
  );
}
