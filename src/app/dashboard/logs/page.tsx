'use client';
import React from 'react';
import { ScrollText, User, Clock, Filter, AlertCircle, CheckCircle2, Settings } from 'lucide-react';

const logs = [
  { time: '14:32:05', user: 'Lucas Silva', action: 'Atualizou status', target: 'JIRA-1234', type: 'update', level: 'info' },
  { time: '14:28:12', user: 'Sistema', action: 'SLA violado', target: 'JIRA-1189', type: 'sla', level: 'warn' },
  { time: '14:25:00', user: 'Ana Pereira', action: 'Criou issue', target: 'JIRA-1290', type: 'create', level: 'info' },
  { time: '14:20:33', user: 'Bot Gemini', action: 'Auto-assign', target: 'JIRA-1288', type: 'automation', level: 'info' },
  { time: '14:15:45', user: 'Carlos Mendes', action: 'Deploy realizado', target: 'v2.4.1', type: 'deploy', level: 'success' },
  { time: '14:10:22', user: 'Sistema', action: 'Erro de integração', target: 'Slack webhook', type: 'error', level: 'error' },
  { time: '14:05:11', user: 'Pedro Santos', action: 'Resolveu bug', target: 'JIRA-1250', type: 'resolve', level: 'success' },
  { time: '13:58:00', user: 'Julia Ribeiro', action: 'Comentou em', target: 'JIRA-1230', type: 'comment', level: 'info' },
];

const levelColors: Record<string,{bg:string;fg:string}> = {
  info: { bg: 'var(--accent-blue-light)', fg: 'var(--accent-blue)' },
  warn: { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
  error: { bg: 'var(--accent-rose-light)', fg: 'var(--accent-rose)' },
  success: { bg: 'var(--accent-emerald-light)', fg: 'var(--accent-emerald)' },
};

export default function LogsPage() {
  return (
    <div className="lg-root">
      <div className="lg-hero"><div className="lg-hero-grid"/><div className="lg-hero-orb lg-hero-orb-1"/><div className="lg-hero-orb lg-hero-orb-2"/>
        <div className="lg-hero-content"><div className="lg-hero-left"><div className="lg-hero-icon"><ScrollText size={24} color="#fff"/></div><div><h1 className="lg-hero-title">Logs / Auditoria</h1><p className="lg-hero-sub">Histórico de ações e eventos</p></div></div>
          <div className="lg-pill">{logs.length} eventos recentes</div></div>
      </div>
      <div className="lg-body"><div className="lg-main">
        <div className="lg-table">
          <div className="lg-table-head"><span>Hora</span><span>Usuário</span><span>Ação</span><span>Alvo</span><span>Nível</span></div>
          {logs.map((l,i)=>{const c=levelColors[l.level];return(
            <div key={i} className="lg-row">
              <span className="lg-time">{l.time}</span>
              <span className="lg-user">{l.user}</span>
              <span className="lg-action">{l.action}</span>
              <span className="lg-target">{l.target}</span>
              <span className="lg-level" style={{background:c.bg,color:c.fg}}>{l.level}</span>
            </div>
          );})}
        </div>
      </div>
      <div className="lg-sidebar"><div className="lg-sb-section"><h3 className="lg-sb-title">Por Nível</h3>
        <div className="lg-levels">{Object.entries(levelColors).map(([k,c])=><div key={k} className="lg-level-item"><div className="lg-level-dot" style={{background:c.fg}}/><span className="lg-level-name">{k}</span><span className="lg-level-count">{logs.filter(l=>l.level===k).length}</span></div>)}</div>
      </div><div className="lg-sb-divider"/><div className="lg-sb-section"><h3 className="lg-sb-title">Filtros</h3>
        <div className="lg-filters">{['Todos','Info','Warning','Error','Success'].map(f=><button key={f} className="lg-filter-btn">{f}</button>)}</div>
      </div></div></div>
      <style jsx>{`
        .lg-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .lg-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0F1629 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .lg-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .lg-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .lg-hero-orb-1{width:250px;height:250px;background:rgba(100,116,139,.2);top:-80px;right:15%;animation:lgO 8s ease-in-out infinite}
        .lg-hero-orb-2{width:180px;height:180px;background:rgba(71,85,105,.14);bottom:-60px;left:25%;animation:lgO 11s ease-in-out infinite reverse}
        @keyframes lgO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .lg-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .lg-hero-left{display:flex;align-items:center;gap:16px}
        .lg-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#64748B,#475569);box-shadow:0 8px 28px rgba(100,116,139,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .lg-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.lg-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .lg-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .lg-body{flex:1;display:flex;overflow:hidden}.lg-main{flex:1;overflow-y:auto;padding:24px 28px}
        .lg-table{border-radius:14px;overflow:hidden;border:1px solid var(--border-secondary)}
        .lg-table-head{display:grid;grid-template-columns:80px 140px 1fr 120px 80px;padding:10px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);background:var(--bg-secondary);border-bottom:1px solid var(--border-secondary)}
        .lg-row{display:grid;grid-template-columns:80px 140px 1fr 120px 80px;padding:12px 16px;font-size:12px;border-bottom:1px solid var(--border-secondary);transition:background .1s}
        .lg-row:hover{background:var(--bg-secondary)}
        .lg-time{font-family:monospace;font-weight:600;color:var(--text-tertiary);font-size:11px}
        .lg-user{font-weight:600;color:var(--text-primary)}.lg-action{color:var(--text-secondary)}
        .lg-target{font-family:monospace;font-weight:600;color:var(--accent-blue);font-size:11px}
        .lg-level{font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px;text-align:center;width:fit-content;text-transform:uppercase}
        .lg-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .lg-sb-section{padding:20px}.lg-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .lg-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .lg-levels{display:flex;flex-direction:column;gap:8px}
        .lg-level-item{display:flex;align-items:center;gap:8px}.lg-level-dot{width:8px;height:8px;border-radius:3px;flex-shrink:0}
        .lg-level-name{flex:1;font-size:11px;color:var(--text-secondary);text-transform:capitalize}.lg-level-count{font-size:12px;font-weight:800;color:var(--text-primary)}
        .lg-filters{display:flex;flex-wrap:wrap;gap:6px}
        .lg-filter-btn{padding:6px 12px;border-radius:8px;font-size:10px;font-weight:600;border:1px solid var(--border-secondary);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;transition:all .15s}
        .lg-filter-btn:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
      `}</style>
    </div>
  );
}
