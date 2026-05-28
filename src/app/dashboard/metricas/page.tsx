'use client';

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Activity, Target, Gauge, Timer, Bug, Rocket, CheckCircle2, ArrowUpRight } from 'lucide-react';

const metrics = [
  { label: 'Velocity', value: '42', unit: 'SP/Sprint', change: 8, icon: Rocket, color: '#6366F1' },
  { label: 'Lead Time', value: '3.2d', unit: 'dias', change: -12, icon: Timer, color: '#8B5CF6' },
  { label: 'Cycle Time', value: '1.8d', unit: 'dias', change: -5, icon: Gauge, color: '#06B6D4' },
  { label: 'Throughput', value: '18', unit: 'itens/sem', change: 15, icon: Activity, color: '#10B981' },
  { label: 'Bug Rate', value: '8.5%', unit: 'do total', change: 3, icon: Bug, color: '#F43F5E' },
  { label: 'Sprint Completion', value: '91%', unit: 'concluído', change: 4, icon: CheckCircle2, color: '#22C55E' },
  { label: 'Deploy Frequency', value: '4.2', unit: 'deploys/sem', change: 10, icon: Rocket, color: '#3B82F6' },
  { label: 'MTTR', value: '2.1h', unit: 'horas', change: -20, icon: Timer, color: '#F59E0B' },
];

const healthItems = [
  { label: 'Performance', pct: 92, color: '#22C55E' },
  { label: 'Qualidade', pct: 88, color: '#6366F1' },
  { label: 'Entrega', pct: 95, color: '#3B82F6' },
  { label: 'Colaboração', pct: 78, color: '#F59E0B' },
];

export default function MetricasPage() {
  return (
    <div className="met-root">
      {/* Hero */}
      <div className="met-hero">
        <div className="met-hero-grid" />
        <div className="met-hero-orb met-hero-orb-1" />
        <div className="met-hero-orb met-hero-orb-2" />
        <div className="met-hero-orb met-hero-orb-3" />
        <div className="met-hero-content">
          <div className="met-hero-left">
            <div className="met-hero-icon"><BarChart3 size={24} color="#fff" /></div>
            <div>
              <h1 className="met-hero-title">Métricas</h1>
              <p className="met-hero-sub">Indicadores de performance e produtividade do time</p>
            </div>
          </div>
          <div className="met-hero-right">
            <div className="met-pill"><Target size={13} /> <span>8 KPIs</span></div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="met-body">
        <div className="met-main">
          <div className="met-grid">
            {metrics.map((m) => {
              const isPos = m.change > 0;
              const isNeg = m.change < 0;
              const Icon = m.icon;
              return (
                <div key={m.label} className="met-card">
                  <div className="met-card-header">
                    <div className="met-card-icon" style={{ background: `${m.color}12`, color: m.color }}><Icon size={16} /></div>
                    <span className="met-card-label">{m.label}</span>
                  </div>
                  <p className="met-card-value">{m.value}</p>
                  <div className="met-card-footer">
                    <span className={`met-badge ${isPos ? 'pos' : isNeg ? 'neg' : 'neu'}`}>
                      {isPos && <TrendingUp size={11} />}{isNeg && <TrendingDown size={11} />}{!isPos && !isNeg && <Minus size={11} />}
                      {isPos && '+'}{m.change}%
                    </span>
                    <span className="met-card-unit">{m.unit}</span>
                  </div>
                  {/* Mini bar */}
                  <div className="met-bar-track">
                    <div className="met-bar-fill" style={{ width: `${Math.min(100, Math.abs(m.change) * 3 + 40)}%`, background: m.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="met-sidebar">
          <div className="met-sb-section">
            <h3 className="met-sb-title">Saúde do Time</h3>
            <div className="met-health">
              {healthItems.map((h) => (
                <div key={h.label} className="met-health-item">
                  <div className="met-health-header">
                    <span className="met-health-label">{h.label}</span>
                    <span className="met-health-pct" style={{ color: h.color }}>{h.pct}%</span>
                  </div>
                  <div className="met-health-track">
                    <div className="met-health-fill" style={{ width: `${h.pct}%`, background: h.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="met-sb-divider" />
          <div className="met-sb-section">
            <h3 className="met-sb-title">Destaques</h3>
            <div className="met-highlights">
              {[
                { icon: '🚀', text: 'Velocity acima da média dos últimos 3 sprints' },
                { icon: '⚡', text: 'MTTR reduziu 20% — resolução mais rápida' },
                { icon: '⚠️', text: 'Bug Rate subiu 3% — atenção à qualidade' },
              ].map((h, i) => (
                <div key={i} className="met-highlight">
                  <span>{h.icon}</span>
                  <p>{h.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .met-root { display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card); }
        .met-hero { position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18 0%,#0F1629 30%,#161340 60%,#0D0B22 100%);border-bottom:1px solid rgba(255,255,255,0.05);padding:28px 32px; }
        .met-hero-grid { position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px; }
        .met-hero-orb { position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none; }
        .met-hero-orb-1 { width:250px;height:250px;background:rgba(251,146,60,0.18);top:-80px;right:15%;animation:metOrb 8s ease-in-out infinite; }
        .met-hero-orb-2 { width:180px;height:180px;background:rgba(99,102,241,0.15);bottom:-60px;left:25%;animation:metOrb 11s ease-in-out infinite reverse; }
        .met-hero-orb-3 { width:120px;height:120px;background:rgba(59,130,246,0.1);top:30%;right:40%;animation:metOrb 14s ease-in-out infinite; }
        @keyframes metOrb { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-15px) scale(1.08);} }
        .met-hero-content { position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between; }
        .met-hero-left { display:flex;align-items:center;gap:16px; }
        .met-hero-icon { width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F59E0B,#F97316);box-shadow:0 8px 28px rgba(245,158,11,0.35),inset 0 1px 0 rgba(255,255,255,0.2); }
        .met-hero-title { font-size:20px;font-weight:800;color:#F1F5F9;letter-spacing:-0.02em; }
        .met-hero-sub { font-size:13px;color:rgba(148,163,184,0.65);margin-top:2px; }
        .met-hero-right { display:flex;align-items:center;gap:10px; }
        .met-pill { display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(148,163,184,0.6);font-size:11px;font-weight:600; }

        .met-body { flex:1;display:flex;overflow:hidden; }
        .met-main { flex:1;overflow-y:auto;padding:24px 28px; }
        .met-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px; }
        .met-card { padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all 0.2s; }
        .met-card:hover { border-color:var(--border-primary);box-shadow:0 4px 16px rgba(0,0,0,0.06);transform:translateY(-2px); }
        .met-card-header { display:flex;align-items:center;gap:8px;margin-bottom:12px; }
        .met-card-icon { width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .met-card-label { font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary); }
        .met-card-value { font-size:28px;font-weight:800;color:var(--text-primary);font-variant-numeric:tabular-nums;letter-spacing:-0.02em; }
        .met-card-footer { display:flex;align-items:center;gap:8px;margin-top:8px; }
        .met-badge { display:flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px; }
        .met-badge.pos { background:var(--accent-emerald-light);color:var(--accent-emerald); }
        .met-badge.neg { background:var(--accent-rose-light);color:var(--accent-rose); }
        .met-badge.neu { background:var(--bg-card);color:var(--text-tertiary); }
        .met-card-unit { font-size:10px;color:var(--text-tertiary); }
        .met-bar-track { height:3px;border-radius:2px;background:var(--border-secondary);margin-top:14px;overflow:hidden; }
        .met-bar-fill { height:100%;border-radius:2px;transition:width 0.6s ease; }

        .met-sidebar { width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto; }
        .met-sb-section { padding:20px; }
        .met-sb-title { font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-tertiary);margin-bottom:14px; }
        .met-sb-divider { height:1px;margin:0 20px;background:var(--border-secondary); }
        .met-health { display:flex;flex-direction:column;gap:14px; }
        .met-health-item { }
        .met-health-header { display:flex;justify-content:space-between;margin-bottom:6px; }
        .met-health-label { font-size:11px;font-weight:600;color:var(--text-secondary); }
        .met-health-pct { font-size:11px;font-weight:800;font-variant-numeric:tabular-nums; }
        .met-health-track { height:4px;border-radius:2px;background:var(--border-secondary);overflow:hidden; }
        .met-health-fill { height:100%;border-radius:2px;transition:width 0.6s ease; }
        .met-highlights { display:flex;flex-direction:column;gap:10px; }
        .met-highlight { display:flex;gap:8px;align-items:flex-start; }
        .met-highlight span { font-size:14px;flex-shrink:0;margin-top:1px; }
        .met-highlight p { font-size:11px;color:var(--text-secondary);line-height:1.5; }
      `}</style>
    </div>
  );
}
