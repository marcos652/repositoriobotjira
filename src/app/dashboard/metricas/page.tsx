'use client';

import React, { useEffect, useState } from 'react';
import { Target, Timer, Bug, Rocket, CheckCircle2, Loader2, WifiOff, RefreshCw, Ticket, Clock, Shield } from 'lucide-react';
import { Chart2, Danger, Timer1 } from 'iconsax-react';
import DataModeTag from '@/components/ui/DataModeTag';

interface MetricsData {
  support: {
    mode?: 'live' | 'cached' | 'demo';
    metrics?: {
      openCount?: number;
      inProgressCount?: number;
      resolvedCount?: number;
      slaMetPercentage?: number;
      avgResolutionTimeMinutes?: number;
    };
  };
  dev: {
    metrics?: {
      bugCount?: number;
      storyCount?: number;
      criticalCount?: number;
    };
  };
}

export default function MetricasPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [sRes, dRes] = await Promise.all([
        fetch('/api/metrics/support?range=30d'),
        fetch('/api/metrics/dev?range=30d'),
      ]);
      if (!sRes.ok || !dRes.ok) throw new Error('Falha ao buscar métricas');
      const support = await sRes.json();
      const dev = await dRes.json();
      setData({ support, dev });
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void fetchData());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando métricas do Jira...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-5 max-w-sm">
          <WifiOff size={28} style={{ color: '#FB7185' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar</p>
          <button onClick={() => fetchData()} style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  const sm = data.support?.metrics || {};
  const dm = data.dev?.metrics || {};

  const metrics = [
    { label: 'Chamados Abertos', value: sm.openCount ?? 0, unit: 'suporte', change: null, icon: Ticket, color: '#3B82F6' },
    { label: 'Em Andamento', value: sm.inProgressCount ?? 0, unit: 'suporte', change: null, icon: Clock, color: '#F59E0B' },
    { label: 'Resolvidos', value: sm.resolvedCount ?? 0, unit: 'últimos 30d', change: null, icon: CheckCircle2, color: '#22C55E' },
    { label: 'SLA Cumprido', value: `${sm.slaMetPercentage ?? 0}%`, unit: 'suporte', change: null, icon: Shield, color: '#8B5CF6' },
    { label: 'Bugs Dev', value: dm.bugCount ?? 0, unit: 'abertos', change: null, icon: Bug, color: '#F43F5E' },
    { label: 'Stories Dev', value: dm.storyCount ?? 0, unit: 'abertas', change: null, icon: Rocket, color: '#6366F1' },
    { label: 'Itens Críticos', value: dm.criticalCount ?? 0, unit: 'dev', change: null, icon: Target, color: '#EF4444' },
    { label: 'Tempo Médio', value: sm.avgResolutionTimeMinutes ? `${Math.round(sm.avgResolutionTimeMinutes / 60)}h` : '—', unit: 'resolução', change: null, icon: Timer, color: '#06B6D4' },
  ];

  // Health = percentage based on real data
  const slaHealth = sm.slaMetPercentage ?? 0;
  const resolvedRatio = sm.resolvedCount && sm.openCount ? Math.round((sm.resolvedCount / (sm.openCount + sm.resolvedCount)) * 100) : 0;
  const healthItems = [
    { label: 'SLA', pct: slaHealth, color: '#22C55E' },
    { label: 'Resolução', pct: resolvedRatio, color: '#6366F1' },
    { label: 'Suporte', pct: Math.min(100, 100 - (sm.openCount || 0) * 2), color: '#3B82F6' },
    { label: 'Dev', pct: Math.min(100, 100 - (dm.bugCount || 0) * 5), color: '#F59E0B' },
  ];

  return (
    <div className="met-root">
      <div className="met-page-header">
        <div className="met-header-content">
          <div className="met-header-left">
            <div>
              <h1 className="met-title">Métricas</h1>
              <p className="met-subtitle">Dados reais do Jira — <DataModeTag mode={data.support?.mode} /></p>
            </div>
          </div>
          <div className="met-header-actions">
            <button className="met-refresh" onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
            </button>
            <div className="met-pill"><Target size={13} /> <span>{metrics.length} KPIs</span></div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="met-body">
        <div className="met-main">
          <div className="met-grid">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="met-card">
                  <div className="met-card-header">
                    <div className="met-card-icon" style={{ background: `${m.color}12`, color: m.color }}><Icon size={16} /></div>
                    <span className="met-card-label">{m.label}</span>
                  </div>
                  <p className="met-card-value">{m.value}</p>
                  <div className="met-card-footer">
                    <span className="met-card-unit">{m.unit}</span>
                  </div>
                  <div className="met-bar-track">
                    <div className="met-bar-fill" style={{ width: `${Math.min(100, typeof m.value === 'number' ? m.value * 3 + 20 : 60)}%`, background: m.color }} />
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
            <h3 className="met-sb-title">Resumo</h3>
            <div className="met-highlights">
              <div className="met-highlight"><span className="met-highlight-icon"><Chart2 size={16} variant="Bold" color="#60A5FA" aria-hidden="true" /></span><p>Total suporte: {(sm.openCount || 0) + (sm.inProgressCount || 0) + (sm.resolvedCount || 0)} chamados</p></div>
              <div className="met-highlight"><span className="met-highlight-icon"><Danger size={16} variant="Bold" color="#FB7185" aria-hidden="true" /></span><p>{dm.bugCount || 0} bugs abertos no dev</p></div>
              <div className="met-highlight"><span className="met-highlight-icon"><Timer1 size={16} variant="Bold" color="#22D3EE" aria-hidden="true" /></span><p>Tempo médio de resolução: {sm.avgResolutionTimeMinutes ? `${Math.round(sm.avgResolutionTimeMinutes / 60)}h` : 'N/A'}</p></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .met-root { display:flex;flex-direction:column;gap:24px;min-width:0; }
        .met-page-header { flex-shrink:0; }
        .met-header-content { display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px; }
        .met-header-left { display:flex;align-items:center; }
        .met-title { font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-0.02em; }
        .met-subtitle { font-size:14px;color:var(--text-tertiary);margin-top:6px; }
        .met-header-actions { display:flex;align-items:center;gap:10px; }
        .met-refresh,.met-pill { min-height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600; }
        .met-refresh { cursor:pointer;font-family:inherit;transition:background .15s,color .15s; }
        .met-refresh:hover:not(:disabled) { background:var(--bg-secondary);color:var(--text-primary); }
        .met-refresh:disabled { opacity:.55;cursor:not-allowed; }

        .met-body { display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start; }
        .met-main { min-width:0; }
        .met-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px; }
        .met-card { padding:20px;border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);transition:border-color .15s; }
        .met-card:hover { border-color:var(--border-focus); }
        .met-card-header { display:flex;align-items:center;gap:8px;margin-bottom:12px; }
        .met-card-icon { width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .met-card-label { font-size:12px;font-weight:600;color:var(--text-secondary); }
        .met-card-value { font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);font-variant-numeric:tabular-nums;letter-spacing:-0.02em; }
        .met-card-footer { display:flex;align-items:center;gap:8px;margin-top:8px; }
        .met-card-unit { font-size:10px;color:var(--text-tertiary); }
        .met-bar-track { height:3px;border-radius:2px;background:var(--border-secondary);margin-top:14px;overflow:hidden; }
        .met-bar-fill { height:100%;border-radius:2px;transition:width 0.6s ease; }

        .met-sidebar { width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden; }
        .met-sb-section { padding:24px; }
        .met-sb-title { font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px; }
        .met-sb-divider { height:1px;margin:0 24px;background:var(--border-secondary); }
        .met-health { display:flex;flex-direction:column;gap:14px; }
        .met-health-item { }
        .met-health-header { display:flex;justify-content:space-between;margin-bottom:6px; }
        .met-health-label { font-size:11px;font-weight:600;color:var(--text-secondary); }
        .met-health-pct { font-size:11px;font-weight:800;font-variant-numeric:tabular-nums; }
        .met-health-track { height:4px;border-radius:2px;background:var(--border-secondary);overflow:hidden; }
        .met-health-fill { height:100%;border-radius:2px;transition:width 0.6s ease; }
        .met-highlights { display:flex;flex-direction:column;gap:10px; }
        .met-highlight { display:flex;gap:8px;align-items:flex-start; }
        .met-highlight-icon { display:flex;flex-shrink:0;margin-top:1px; }
        .met-highlight p { font-size:11px;color:var(--text-secondary);line-height:1.5; }
        @media (max-width:1100px){.met-body{grid-template-columns:1fr}.met-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.met-sb-divider{display:none}.met-sb-section+.met-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.met-header-actions{width:100%;flex-wrap:wrap}.met-body{display:block}.met-sidebar{display:block;margin-top:24px}.met-sb-section+.met-sb-section{border-left:0}.met-sb-divider{display:block}.met-grid{grid-template-columns:1fr}.met-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
