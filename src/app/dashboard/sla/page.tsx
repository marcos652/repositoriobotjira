'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { TickCircle } from 'iconsax-react';
import DataModeTag from '@/components/ui/DataModeTag';

interface SlaItem { name: string; target: string; actual: string; compliance: number; status: string; }

const compColor = (c: number) => c >= 90 ? { bg: 'var(--accent-emerald-light)', fg: 'var(--accent-emerald)' } : c >= 80 ? { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' } : { bg: 'var(--accent-rose-light)', fg: 'var(--accent-rose)' };

function formatMins(mins: number) { return mins < 60 ? `${mins}min` : `${(mins / 60).toFixed(1)}h`; }

export default function SlaPage() {
  const [slaData, setSlaData] = useState<SlaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('');

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/metrics/support?range=30d');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMode(data.mode || 'demo');

      const m = data.metrics || {};
      // Build SLA items from real metrics
      const items: SlaItem[] = [
        {
          name: 'SLA Geral de Resolução',
          target: '≤ 8h',
          actual: m.avgResolutionTimeMinutes ? formatMins(m.avgResolutionTimeMinutes) : '—',
          compliance: m.slaMetPercentage ?? 0,
          status: (m.slaMetPercentage ?? 0) >= 80 ? 'ok' : 'warn',
        },
        {
          name: 'Chamados dentro do SLA',
          target: `${m.slaMetCount ?? 0} chamados`,
          actual: `${m.slaMetCount ?? 0} de ${(m.slaMetCount ?? 0) + (m.slaViolatedCount ?? 0)}`,
          compliance: m.slaMetPercentage ?? 0,
          status: (m.slaMetPercentage ?? 0) >= 80 ? 'ok' : 'warn',
        },
        {
          name: 'Chamados SLA Violado',
          target: '0 violações',
          actual: `${m.slaViolatedCount ?? 0} violações`,
          compliance: m.slaViolatedCount === 0 ? 100 : Math.max(0, 100 - (m.slaViolatedCount ?? 0) * 10),
          status: (m.slaViolatedCount ?? 0) === 0 ? 'ok' : 'warn',
        },
        {
          name: 'Aguardando Cliente',
          target: '≤ 5 tickets',
          actual: `${m.waitingClientCount ?? 0} tickets`,
          compliance: Math.max(0, 100 - (m.waitingClientCount ?? 0) * 10),
          status: (m.waitingClientCount ?? 0) <= 5 ? 'ok' : 'warn',
        },
        {
          name: 'Aguardando Terceiros',
          target: '≤ 3 tickets',
          actual: `${m.waitingThirdPartyCount ?? 0} tickets`,
          compliance: Math.max(0, 100 - (m.waitingThirdPartyCount ?? 0) * 15),
          status: (m.waitingThirdPartyCount ?? 0) <= 3 ? 'ok' : 'warn',
        },
      ];
      setSlaData(items);
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
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-emerald)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando dados de SLA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-5 max-w-sm">
          <WifiOff size={28} style={{ color: '#FB7185' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar SLA</p>
          <button onClick={() => fetchData()} style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent-emerald)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  const avgCompliance = slaData.length > 0 ? Math.round(slaData.reduce((s, d) => s + d.compliance, 0) / slaData.length) : 0;

  return (
    <div className="sla-root">
      <div className="sla-page-header">
        <div className="sla-header-content">
          <div className="sla-header-left">
            <div><h1 className="sla-title">SLA / Contratos</h1><p className="sla-subtitle">Dados reais do Jira — <DataModeTag mode={mode} /></p></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="sla-refresh" onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
            </button>
            <div className="sla-pill">{avgCompliance}% média geral</div>
          </div>
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
            {slaData.filter(s => s.compliance < 90).length === 0 && (
              <p className="sla-sb-empty" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TickCircle size={13} variant="Bold" color="#22C55E" aria-hidden="true" />
                Todos os SLAs estão dentro da meta
              </p>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .sla-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .sla-page-header{flex-shrink:0}
        .sla-header-content{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .sla-header-left{display:flex;align-items:center}
        .sla-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.sla-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .sla-refresh,.sla-pill{min-height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600}
        .sla-refresh{cursor:pointer;font-family:inherit;transition:background .15s,color .15s}.sla-refresh:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}.sla-refresh:disabled{opacity:.55;cursor:not-allowed}
        .sla-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.sla-main{min-width:0;display:flex;flex-direction:column;gap:12px}
        .sla-card{padding:20px;border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);transition:border-color .15s}
        .sla-card:hover{border-color:var(--border-focus)}
        .sla-card-top{display:flex;align-items:center;gap:12px}
        .sla-card-status{flex-shrink:0}.sla-card-info{flex:1;min-width:0}
        .sla-card-name{font-size:14px;font-weight:600;color:var(--text-primary)}
        .sla-card-meta{display:flex;gap:16px;margin-top:6px;font-size:11px;color:var(--text-tertiary);flex-wrap:wrap}
        .sla-card-meta span{display:flex;align-items:center;gap:3px}
        .sla-badge{font-size:13px;font-weight:700;padding:5px 10px;border-radius:8px;flex-shrink:0}
        .sla-bar{height:4px;border-radius:2px;background:var(--border-secondary);margin-top:12px;overflow:hidden}
        .sla-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
        .sla-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden}
        .sla-sb-section{padding:24px}.sla-sb-title{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        .sla-sb-divider{height:1px;margin:0 24px;background:var(--border-secondary)}
        .sla-health-ring{text-align:center;padding:20px;border-radius:8px;background:var(--bg-secondary);border:1px solid var(--border-secondary)}
        .sla-health-val{display:block;font-size:36px;font-weight:500;font-variant-numeric:tabular-nums}
        .sla-health-label{display:block;font-size:11px;color:var(--text-tertiary);margin-top:4px}
        .sla-alert{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-secondary);margin-bottom:8px}
        .sla-sb-empty{font-size:11px;color:var(--accent-emerald);font-weight:600}
        @media (max-width:960px){.sla-body{grid-template-columns:1fr}.sla-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.sla-sb-divider{display:none}.sla-sb-section+.sla-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.sla-header-content>div:last-child{width:100%;flex-wrap:wrap}.sla-sidebar{display:block}.sla-sb-section+.sla-sb-section{border-left:0}.sla-sb-divider{display:block}.sla-card-top{align-items:flex-start;flex-wrap:wrap}.sla-card-info{min-width:calc(100% - 32px)}.sla-badge{margin-left:28px}.sla-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
