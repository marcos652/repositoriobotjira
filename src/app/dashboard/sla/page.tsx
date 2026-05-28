'use client';

import React from 'react';
import { Shield, CheckCircle2, AlertTriangle, Clock, Target } from 'lucide-react';

const slaData = [
  { name: 'Tempo de Primeira Resposta', target: '≤ 1h', actual: '45min', compliance: 94, status: 'ok' },
  { name: 'Tempo de Resolução (P1)', target: '≤ 4h', actual: '3.2h', compliance: 88, status: 'ok' },
  { name: 'Tempo de Resolução (P2)', target: '≤ 8h', actual: '6.5h', compliance: 91, status: 'ok' },
  { name: 'Tempo de Resolução (P3)', target: '≤ 24h', actual: '18h', compliance: 96, status: 'ok' },
  { name: 'Uptime do Sistema', target: '≥ 99.5%', actual: '99.7%', compliance: 100, status: 'ok' },
  { name: 'Satisfação do Cliente', target: '≥ 85%', actual: '78%', compliance: 78, status: 'warn' },
];

const compColor = (c: number) => c >= 90 ? { bg: 'var(--accent-emerald-light)', fg: 'var(--accent-emerald)' } : c >= 80 ? { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' } : { bg: 'var(--accent-rose-light)', fg: 'var(--accent-rose)' };

export default function SlaPage() {
  const avgCompliance = Math.round(slaData.reduce((s, d) => s + d.compliance, 0) / slaData.length);
  return (
    <div className="sla-root">
      <div className="sla-hero">
        <div className="sla-hero-grid" /><div className="sla-hero-orb sla-hero-orb-1" /><div className="sla-hero-orb sla-hero-orb-2" />
        <div className="sla-hero-content">
          <div className="sla-hero-left">
            <div className="sla-hero-icon"><Shield size={24} color="#fff" /></div>
            <div><h1 className="sla-hero-title">SLA / Contratos</h1><p className="sla-hero-sub">Monitoramento de níveis de serviço</p></div>
          </div>
          <div className="sla-pill">{avgCompliance}% média geral</div>
        </div>
      </div>
      <div className="sla-body">
        <div className="sla-main">
          {slaData.map((sla) => {
            const c = compColor(sla.compliance);
            return (
              <div key={sla.name} className="sla-card">
                <div className="sla-card-top">
                  <div className="sla-card-status">{sla.status === 'ok' ? <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--accent-amber)' }} />}</div>
                  <div className="sla-card-info"><p className="sla-card-name">{sla.name}</p>
                    <div className="sla-card-meta"><span><Clock size={10} /> Meta: <strong>{sla.target}</strong></span><span>Atual: <strong>{sla.actual}</strong></span></div>
                  </div>
                  <span className="sla-badge" style={{ background: c.bg, color: c.fg }}>{sla.compliance}%</span>
                </div>
                <div className="sla-bar"><div className="sla-bar-fill" style={{ width: `${sla.compliance}%`, background: c.fg }} /></div>
              </div>
            );
          })}
        </div>
        <div className="sla-sidebar">
          <div className="sla-sb-section"><h3 className="sla-sb-title">Saúde Geral</h3>
            <div className="sla-health-ring"><span className="sla-health-val" style={{ color: compColor(avgCompliance).fg }}>{avgCompliance}%</span><span className="sla-health-label">Compliance</span></div>
          </div>
          <div className="sla-sb-divider" />
          <div className="sla-sb-section"><h3 className="sla-sb-title">Alertas</h3>
            {slaData.filter(s => s.compliance < 90).map(s => (
              <div key={s.name} className="sla-alert"><AlertTriangle size={12} style={{ color: 'var(--accent-amber)' }} /><span>{s.name}: {s.compliance}%</span></div>
            ))}
            {slaData.filter(s => s.compliance < 90).length === 0 && <p className="sla-sb-empty">Todos os SLAs estão dentro da meta ✓</p>}
          </div>
        </div>
      </div>
      <style jsx>{`
        .sla-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .sla-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0D1F15 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .sla-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .sla-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .sla-hero-orb-1{width:250px;height:250px;background:rgba(16,185,129,.2);top:-80px;right:15%;animation:slaO 8s ease-in-out infinite}
        .sla-hero-orb-2{width:180px;height:180px;background:rgba(34,197,94,.14);bottom:-60px;left:25%;animation:slaO 11s ease-in-out infinite reverse}
        @keyframes slaO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .sla-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .sla-hero-left{display:flex;align-items:center;gap:16px}
        .sla-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#10B981,#22C55E);box-shadow:0 8px 28px rgba(16,185,129,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .sla-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.sla-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .sla-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .sla-body{flex:1;display:flex;overflow:hidden}.sla-main{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:10px}
        .sla-card{padding:18px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s}
        .sla-card:hover{border-color:var(--border-primary);box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-1px)}
        .sla-card-top{display:flex;align-items:center;gap:12px}
        .sla-card-status{flex-shrink:0}.sla-card-info{flex:1;min-width:0}
        .sla-card-name{font-size:14px;font-weight:700;color:var(--text-primary)}
        .sla-card-meta{display:flex;gap:16px;margin-top:4px;font-size:10px;color:var(--text-tertiary)}
        .sla-card-meta span{display:flex;align-items:center;gap:3px}
        .sla-badge{font-size:13px;font-weight:800;padding:4px 12px;border-radius:999px;flex-shrink:0}
        .sla-bar{height:4px;border-radius:2px;background:var(--border-secondary);margin-top:12px;overflow:hidden}
        .sla-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
        .sla-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .sla-sb-section{padding:20px}.sla-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .sla-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .sla-health-ring{text-align:center;padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary)}
        .sla-health-val{display:block;font-size:36px;font-weight:800;font-variant-numeric:tabular-nums}
        .sla-health-label{display:block;font-size:11px;color:var(--text-tertiary);margin-top:4px}
        .sla-alert{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-secondary);margin-bottom:8px}
        .sla-sb-empty{font-size:11px;color:var(--accent-emerald);font-weight:600}
      `}</style>
    </div>
  );
}
