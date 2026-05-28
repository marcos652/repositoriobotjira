'use client';
import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, Clock, Trash2 } from 'lucide-react';

const notifications = [
  { title: 'SLA prestes a ser violado', desc: 'JIRA-1189 está a 30min do limite de resolução', time: '2min atrás', type: 'warn', read: false },
  { title: 'Deploy v2.4.1 concluído', desc: 'Todos os serviços estão operacionais', time: '15min atrás', type: 'success', read: false },
  { title: 'Nova issue atribuída a você', desc: 'JIRA-1290 — Bug no módulo de autenticação', time: '30min atrás', type: 'info', read: false },
  { title: 'Sprint 12 finalizada', desc: '91% de conclusão — relatório disponível', time: '1h atrás', type: 'info', read: true },
  { title: 'Erro de integração Slack', desc: 'Webhook retornando 503 — tentando reconexão', time: '2h atrás', type: 'error', read: true },
  { title: 'Novo membro na equipe', desc: 'Julia Ribeiro foi adicionada ao projeto', time: '3h atrás', type: 'info', read: true },
  { title: 'Release v2.4.0 aprovada', desc: 'QA finalizou todos os testes com sucesso', time: '5h atrás', type: 'success', read: true },
];

const typeMap: Record<string,{icon:any;color:string;bg:string}> = {
  warn: { icon: AlertTriangle, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
  success: { icon: CheckCircle2, color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)' },
  info: { icon: Info, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
  error: { icon: AlertTriangle, color: 'var(--accent-rose)', bg: 'var(--accent-rose-light)' },
};

export default function NotificacoesPage() {
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div className="nt-root">
      <div className="nt-hero"><div className="nt-hero-grid"/><div className="nt-hero-orb nt-hero-orb-1"/><div className="nt-hero-orb nt-hero-orb-2"/>
        <div className="nt-hero-content"><div className="nt-hero-left"><div className="nt-hero-icon"><Bell size={24} color="#fff"/></div><div><h1 className="nt-hero-title">Notificações</h1><p className="nt-hero-sub">Central de alertas e avisos</p></div></div>
          <div className="nt-pills">{unread > 0 && <div className="nt-pill-unread">{unread} não lidas</div>}<div className="nt-pill">{notifications.length} total</div></div></div>
      </div>
      <div className="nt-body"><div className="nt-main"><div className="nt-list">
        {notifications.map((n,i)=>{const t=typeMap[n.type];const Icon=t.icon;return(
          <div key={i} className={`nt-card ${!n.read?'unread':''}`}>
            <div className="nt-card-icon" style={{background:t.bg,color:t.color}}><Icon size={16}/></div>
            <div className="nt-card-info"><p className="nt-card-title">{n.title}</p><p className="nt-card-desc">{n.desc}</p>
              <span className="nt-card-time"><Clock size={10}/>{n.time}</span>
            </div>
            {!n.read && <div className="nt-unread-dot"/>}
          </div>
        );})}
      </div></div>
      <div className="nt-sidebar"><div className="nt-sb-section"><h3 className="nt-sb-title">Resumo</h3>
        <div className="nt-summary">{[{l:'Não lidas',v:unread,c:'var(--accent-blue)'},{l:'Alertas',v:notifications.filter(n=>n.type==='warn'||n.type==='error').length,c:'var(--accent-amber)'},{l:'Sucesso',v:notifications.filter(n=>n.type==='success').length,c:'var(--accent-emerald)'}].map(s=>(
          <div key={s.l} className="nt-sum-item"><span className="nt-sum-label">{s.l}</span><span className="nt-sum-val" style={{color:s.c}}>{s.v}</span></div>
        ))}</div>
      </div><div className="nt-sb-divider"/><div className="nt-sb-section"><h3 className="nt-sb-title">Ações</h3>
        <button className="nt-action-btn">Marcar todas como lidas</button>
        <button className="nt-action-btn danger">Limpar notificações</button>
      </div></div></div>
      <style jsx>{`
        .nt-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .nt-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#1A0F25 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .nt-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .nt-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .nt-hero-orb-1{width:250px;height:250px;background:rgba(244,63,94,.16);top:-80px;right:15%;animation:ntO 8s ease-in-out infinite}
        .nt-hero-orb-2{width:180px;height:180px;background:rgba(251,146,60,.12);bottom:-60px;left:25%;animation:ntO 11s ease-in-out infinite reverse}
        @keyframes ntO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .nt-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .nt-hero-left{display:flex;align-items:center;gap:16px}
        .nt-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F43F5E,#FB923C);box-shadow:0 8px 28px rgba(244,63,94,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .nt-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.nt-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .nt-pills{display:flex;gap:8px}
        .nt-pill-unread{padding:7px 14px;border-radius:999px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.15);color:#60A5FA;font-size:11px;font-weight:700}
        .nt-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .nt-body{flex:1;display:flex;overflow:hidden}.nt-main{flex:1;overflow-y:auto;padding:24px 28px}
        .nt-list{display:flex;flex-direction:column;gap:8px}
        .nt-card{display:flex;align-items:flex-start;gap:14px;padding:16px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s;position:relative}
        .nt-card.unread{background:var(--bg-card);border-color:var(--border-primary)}
        .nt-card:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .nt-card-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nt-card-info{flex:1}.nt-card-title{font-size:13px;font-weight:700;color:var(--text-primary)}.nt-card-desc{font-size:11px;color:var(--text-tertiary);margin-top:2px;line-height:1.5}
        .nt-card-time{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-tertiary);margin-top:6px}
        .nt-unread-dot{width:8px;height:8px;border-radius:50%;background:var(--accent-blue);flex-shrink:0;margin-top:4px}
        .nt-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .nt-sb-section{padding:20px}.nt-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .nt-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .nt-summary{display:flex;flex-direction:column;gap:10px}
        .nt-sum-item{display:flex;justify-content:space-between}.nt-sum-label{font-size:11px;color:var(--text-secondary)}.nt-sum-val{font-size:14px;font-weight:800}
        .nt-action-btn{display:block;width:100%;padding:9px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border-primary);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;margin-bottom:8px;transition:all .15s}
        .nt-action-btn:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
        .nt-action-btn.danger:hover{border-color:var(--accent-rose);color:var(--accent-rose)}
      `}</style>
    </div>
  );
}
