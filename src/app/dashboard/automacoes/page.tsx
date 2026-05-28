'use client';
import React from 'react';
import { Zap, Play, Pause, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

const automations = [
  { name: 'Auto-assign por componente', trigger: 'Issue criada', action: 'Atribuir ao responsável', status: 'active', runs: 245, lastRun: '2min atrás', color: '#22C55E' },
  { name: 'Notificar SLA crítico', trigger: 'SLA < 2h', action: 'Enviar alerta Slack', status: 'active', runs: 89, lastRun: '15min atrás', color: '#F43F5E' },
  { name: 'Fechar tickets inativos', trigger: 'Sem resposta 7d', action: 'Mover para Fechado', status: 'active', runs: 156, lastRun: '1h atrás', color: '#3B82F6' },
  { name: 'Sprint auto-complete', trigger: 'Sprint finalizada', action: 'Gerar relatório', status: 'paused', runs: 12, lastRun: '3d atrás', color: '#F59E0B' },
  { name: 'Deploy notification', trigger: 'Release criada', action: 'Postar no canal #releases', status: 'active', runs: 34, lastRun: '5h atrás', color: '#8B5CF6' },
];

export default function AutomacoesPage() {
  return (
    <div className="at-root">
      <div className="at-hero"><div className="at-hero-grid"/><div className="at-hero-orb at-hero-orb-1"/><div className="at-hero-orb at-hero-orb-2"/>
        <div className="at-hero-content"><div className="at-hero-left"><div className="at-hero-icon"><Zap size={24} color="#fff"/></div><div><h1 className="at-hero-title">Automações</h1><p className="at-hero-sub">Regras e workflows automatizados</p></div></div>
          <div className="at-pills"><div className="at-pill-active"><Play size={11}/> {automations.filter(a=>a.status==='active').length} ativas</div><div className="at-pill">{automations.reduce((s,a)=>s+a.runs,0)} execuções</div></div></div>
      </div>
      <div className="at-body"><div className="at-main"><div className="at-list">
        {automations.map(a=>(
          <div key={a.name} className="at-card">
            <div className="at-card-left">
              <div className="at-card-icon" style={{background:`${a.color}12`,color:a.color}}><Zap size={16}/></div>
              <div><p className="at-card-name">{a.name}</p>
                <div className="at-card-flow"><span>{a.trigger}</span><ArrowRight size={10}/><span>{a.action}</span></div>
              </div>
            </div>
            <div className="at-card-right">
              <span className="at-card-runs">{a.runs} runs</span>
              <span className="at-card-last"><Clock size={10}/>{a.lastRun}</span>
              <span className={`at-status ${a.status}`}>{a.status==='active'?<><Play size={10}/>Ativa</>:<><Pause size={10}/>Pausada</>}</span>
            </div>
          </div>
        ))}
      </div></div>
      <div className="at-sidebar"><div className="at-sb-section"><h3 className="at-sb-title">Resumo</h3>
        <div className="at-summary">{[{l:'Ativas',v:automations.filter(a=>a.status==='active').length,c:'var(--accent-emerald)'},{l:'Pausadas',v:automations.filter(a=>a.status==='paused').length,c:'var(--accent-amber)'},{l:'Total execuções',v:automations.reduce((s,a)=>s+a.runs,0),c:'var(--accent-blue)'}].map(s=>(
          <div key={s.l} className="at-sum-item"><span className="at-sum-label">{s.l}</span><span className="at-sum-val" style={{color:s.c}}>{s.v}</span></div>
        ))}</div>
      </div></div></div>
      <style jsx>{`
        .at-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .at-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#1A1805 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .at-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .at-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .at-hero-orb-1{width:250px;height:250px;background:rgba(245,158,11,.18);top:-80px;right:15%;animation:atO 8s ease-in-out infinite}
        .at-hero-orb-2{width:180px;height:180px;background:rgba(234,179,8,.14);bottom:-60px;left:25%;animation:atO 11s ease-in-out infinite reverse}
        @keyframes atO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .at-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .at-hero-left{display:flex;align-items:center;gap:16px}
        .at-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F59E0B,#EAB308);box-shadow:0 8px 28px rgba(245,158,11,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .at-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.at-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .at-pills{display:flex;gap:8px}
        .at-pill-active{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15);color:#4ADE80;font-size:11px;font-weight:700}
        .at-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .at-body{flex:1;display:flex;overflow:hidden}.at-main{flex:1;overflow-y:auto;padding:24px 28px}
        .at-list{display:flex;flex-direction:column;gap:10px}
        .at-card{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s}
        .at-card:hover{border-color:var(--border-primary);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .at-card-left{display:flex;align-items:center;gap:12px}
        .at-card-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .at-card-name{font-size:14px;font-weight:700;color:var(--text-primary)}
        .at-card-flow{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:10px;color:var(--text-tertiary)}
        .at-card-right{display:flex;align-items:center;gap:12px}
        .at-card-runs{font-size:10px;font-weight:700;color:var(--text-secondary)}.at-card-last{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--text-tertiary)}
        .at-status{display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px}
        .at-status.active{background:var(--accent-emerald-light);color:var(--accent-emerald)}
        .at-status.paused{background:var(--accent-amber-light);color:var(--accent-amber)}
        .at-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .at-sb-section{padding:20px}.at-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .at-summary{display:flex;flex-direction:column;gap:12px}
        .at-sum-item{display:flex;justify-content:space-between}.at-sum-label{font-size:11px;color:var(--text-secondary)}.at-sum-val{font-size:15px;font-weight:800}
      `}</style>
    </div>
  );
}
