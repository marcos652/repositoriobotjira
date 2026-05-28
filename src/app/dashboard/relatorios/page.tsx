'use client';

import React from 'react';
import { FileBarChart, Download, Eye, Clock, FileText, PieChart, BarChart3, TrendingUp } from 'lucide-react';

const reports = [
  { name: 'Relatório Mensal de SLA', type: 'SLA', date: '28/05/2026', status: 'ready', icon: PieChart, color: '#6366F1' },
  { name: 'Performance do Time - Maio', type: 'Performance', date: '27/05/2026', status: 'ready', icon: TrendingUp, color: '#22C55E' },
  { name: 'Análise de Bugs Q2', type: 'Qualidade', date: '25/05/2026', status: 'ready', icon: BarChart3, color: '#F43F5E' },
  { name: 'Throughput Semanal', type: 'Produtividade', date: '26/05/2026', status: 'generating', icon: FileBarChart, color: '#F59E0B' },
  { name: 'Relatório de Sprint 12', type: 'Sprint', date: '20/05/2026', status: 'ready', icon: FileText, color: '#3B82F6' },
  { name: 'Análise de Incidentes', type: 'Incidentes', date: '18/05/2026', status: 'ready', icon: BarChart3, color: '#8B5CF6' },
];

export default function RelatoriosPage() {
  return (
    <div className="rel-root">
      <div className="rel-hero">
        <div className="rel-hero-grid" />
        <div className="rel-hero-orb rel-hero-orb-1" />
        <div className="rel-hero-orb rel-hero-orb-2" />
        <div className="rel-hero-content">
          <div className="rel-hero-left">
            <div className="rel-hero-icon"><FileBarChart size={24} color="#fff" /></div>
            <div>
              <h1 className="rel-hero-title">Relatórios</h1>
              <p className="rel-hero-sub">Reports e exportações de dados</p>
            </div>
          </div>
          <div className="rel-pill">{reports.filter(r => r.status === 'ready').length} disponíveis</div>
        </div>
      </div>

      <div className="rel-body">
        <div className="rel-main">
          <div className="rel-list">
            {reports.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.name} className="rel-card">
                  <div className="rel-card-icon" style={{ background: `${r.color}12`, color: r.color }}><Icon size={18} /></div>
                  <div className="rel-card-info">
                    <p className="rel-card-name">{r.name}</p>
                    <div className="rel-card-meta">
                      <span className="rel-card-type">{r.type}</span>
                      <span className="rel-card-date"><Clock size={10} /> {r.date}</span>
                    </div>
                  </div>
                  <div className="rel-card-actions">
                    {r.status === 'ready' ? (
                      <>
                        <button className="rel-btn"><Eye size={14} /> Visualizar</button>
                        <button className="rel-btn primary"><Download size={14} /> PDF</button>
                      </>
                    ) : (
                      <span className="rel-generating">⏳ Gerando...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rel-sidebar">
          <div className="rel-sb-section">
            <h3 className="rel-sb-title">Tipos</h3>
            <div className="rel-types">
              {['SLA', 'Performance', 'Qualidade', 'Sprint', 'Incidentes'].map(t => (
                <div key={t} className="rel-type-item"><span>{t}</span></div>
              ))}
            </div>
          </div>
          <div className="rel-sb-divider" />
          <div className="rel-sb-section">
            <h3 className="rel-sb-title">Exportação rápida</h3>
            <p className="rel-sb-desc">Selecione um relatório e exporte em PDF, CSV ou JSON.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rel-root { display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card); }
        .rel-hero { position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18 0%,#0F1629 30%,#0D2137 60%,#0D0B22 100%);border-bottom:1px solid rgba(255,255,255,0.05);padding:28px 32px; }
        .rel-hero-grid { position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px; }
        .rel-hero-orb { position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none; }
        .rel-hero-orb-1 { width:250px;height:250px;background:rgba(59,130,246,0.18);top:-80px;right:15%;animation:relOrb 8s ease-in-out infinite; }
        .rel-hero-orb-2 { width:180px;height:180px;background:rgba(99,102,241,0.14);bottom:-60px;left:25%;animation:relOrb 11s ease-in-out infinite reverse; }
        @keyframes relOrb { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-15px) scale(1.08);} }
        .rel-hero-content { position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between; }
        .rel-hero-left { display:flex;align-items:center;gap:16px; }
        .rel-hero-icon { width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3B82F6,#6366F1);box-shadow:0 8px 28px rgba(59,130,246,0.35),inset 0 1px 0 rgba(255,255,255,0.2); }
        .rel-hero-title { font-size:20px;font-weight:800;color:#F1F5F9; }
        .rel-hero-sub { font-size:13px;color:rgba(148,163,184,0.65);margin-top:2px; }
        .rel-pill { padding:7px 14px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(148,163,184,0.6);font-size:11px;font-weight:600; }

        .rel-body { flex:1;display:flex;overflow:hidden; }
        .rel-main { flex:1;overflow-y:auto;padding:24px 28px; }
        .rel-list { display:flex;flex-direction:column;gap:10px; }
        .rel-card { display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all 0.2s; }
        .rel-card:hover { border-color:var(--border-primary);box-shadow:0 4px 16px rgba(0,0,0,0.06);transform:translateY(-1px); }
        .rel-card-icon { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .rel-card-info { flex:1;min-width:0; }
        .rel-card-name { font-size:14px;font-weight:700;color:var(--text-primary); }
        .rel-card-meta { display:flex;gap:12px;margin-top:4px; }
        .rel-card-type { font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--bg-card);color:var(--text-tertiary); }
        .rel-card-date { display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-tertiary); }
        .rel-card-actions { display:flex;gap:6px;flex-shrink:0; }
        .rel-btn { display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-secondary);cursor:pointer;transition:all 0.15s; }
        .rel-btn:hover { border-color:var(--accent-blue);color:var(--accent-blue); }
        .rel-btn.primary { background:var(--accent-blue);color:#fff;border-color:var(--accent-blue); }
        .rel-btn.primary:hover { opacity:0.9; }
        .rel-generating { font-size:11px;color:var(--text-tertiary);font-weight:600; }

        .rel-sidebar { width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto; }
        .rel-sb-section { padding:20px; }
        .rel-sb-title { font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-tertiary);margin-bottom:14px; }
        .rel-sb-divider { height:1px;margin:0 20px;background:var(--border-secondary); }
        .rel-types { display:flex;flex-wrap:wrap;gap:6px; }
        .rel-type-item { padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-secondary);cursor:pointer;transition:all 0.15s; }
        .rel-type-item:hover { border-color:var(--accent-blue);color:var(--accent-blue); }
        .rel-sb-desc { font-size:11px;color:var(--text-tertiary);line-height:1.6; }
      `}</style>
    </div>
  );
}
