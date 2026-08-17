'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import ChartCard from '@/components/charts/ChartCard';
import DraggableItem from '@/components/ui/DraggableItem';
import EditToolbar from '@/components/ui/EditToolbar';
import { useDragOrder } from '@/hooks/useDragOrder';
import { useFilters } from '@/contexts/FilterContext';
import { SupportMetrics, LiveAttendance, Issue } from '@/types';
import { Cup, Medal } from 'iconsax-react';
import {
  Ticket, CheckCircle2, Clock, AlertTriangle,
  AlertCircle,
  Timer, Shield, Loader2, WifiOff, Wifi, RefreshCw, UserCheck, ExternalLink, GripVertical
} from 'lucide-react';

// ─── Helpers ───
function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: 'var(--accent-rose)', bg: 'var(--accent-rose-light)', label: 'Crítico' },
  high: { color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)', label: 'Alto' },
  medium: { color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)', label: 'Médio' },
  low: { color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', label: 'Baixo' },
};

const SPAN_CLASSES: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
};

interface SupportData {
  metrics: SupportMetrics;
  liveAttendance: LiveAttendance[];
  criticalTickets: Issue[];
  overdueTickets: Issue[];
  lastUpdated: string;
  mode: 'live' | 'cached' | 'demo';
}

function SectionHeader({ icon, title, badge, children }: {
  icon: React.ReactNode; title: string; badge?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)' }}>
          {icon}
        </div>
        <h3 className="text-2xl leading-8 font-medium" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

const DEFAULT_CARDS_ORDER = [
  'open', 'inprogress', 'resolved', 'sla', 'waiting_client', 'waiting_third',
  'chart_volume', 'chart_category', 'chart_priority', 'chart_client',
  'panel_sla', 'panel_live', 'panel_ranking', 'panel_critical', 'panel_overdue'
];

const CARD_LABELS: Record<string, string> = {
  open: 'Chamados Abertos',
  inprogress: 'Chamados Em Andamento',
  resolved: 'Chamados Resolvidos',
  sla: 'SLA Cumprido',
  waiting_client: 'Aguardando Cliente',
  waiting_third: 'Aguardando Terceiros',
  chart_volume: 'Gráfico: Volume de Chamados',
  chart_category: 'Gráfico: Distribuição por Categoria',
  chart_priority: 'Gráfico: Distribuição por Prioridade',
  chart_client: 'Gráfico: Chamados por Solicitante',
  panel_sla: 'Painel: Monitoramento SLA',
  panel_live: 'Painel: Atendimento em Tempo Real',
  panel_ranking: 'Painel: Ranking de Atendentes',
  panel_critical: 'Painel: Tickets Críticos',
  panel_overdue: 'Painel: Tickets Atrasados',
};

const DEFAULT_CARD_SIZES: Record<string, number> = {
  open: 2,
  inprogress: 2,
  resolved: 2,
  sla: 2,
  waiting_client: 2,
  waiting_third: 2,
  chart_volume: 4,
  chart_category: 2,
  chart_priority: 3,
  chart_client: 3,
  panel_sla: 6,
  panel_live: 6,
  panel_ranking: 6,
  panel_critical: 3,
  panel_overdue: 3,
};

export default function SuporteContent() {
  const { filters } = useFilters();
  const [data, setData] = useState<SupportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Flat drag hook
  const drag = useDragOrder('jiraops-suporte-flat-order', DEFAULT_CARDS_ORDER);

  // Flat sizes state
  // Vazio no primeiro render, igual ao servidor; os tamanhos salvos entram depois de montar.
  // Ler o localStorage no inicializador do useState fazia o servidor emitir uma largura e o
  // cliente outra no mesmo style — hydration mismatch.
  const [cardSizes, setCardSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jiraops-suporte-card-sizes');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tamanhos ficam no navegador, indisponíveis no servidor
      if (saved) setCardSizes(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const updateCardSize = useCallback((id: string, newSize: number) => {
    setCardSizes(prev => {
      const updated = { ...prev, [id]: newSize };
      try { localStorage.setItem('jiraops-suporte-card-sizes', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const resetSizes = useCallback(() => {
    setCardSizes({});
    try { localStorage.removeItem('jiraops-suporte-card-sizes'); } catch {}
  }, []);

  const handleResetAll = () => {
    drag.reset();
    resetSizes();
  };

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      let url = `/api/metrics/support?range=${filters.dateRange}`;
      if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
        url += `&start=${filters.customStartDate}&end=${filters.customEndDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void fetchData());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4" role="status">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando dados do Jira...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="ui-surface text-center space-y-5 max-w-sm p-8" role="alert">
          <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'var(--accent-rose-light)' }}>
            <WifiOff size={28} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro de conexão</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{error || 'Não foi possível carregar os dados'}</p>
          </div>
          <button onClick={() => fetchData()} className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const m = data.metrics;
  const { liveAttendance, criticalTickets, overdueTickets } = data;

  const renderCardContent = (cardId: string) => {
    switch (cardId) {
      case 'open':
        return <MetricCard title="Abertos" value={m.openCount} icon={<Ticket size={20} />} accentColor="var(--accent-blue)" accentBg="var(--accent-blue-light)" />;
      case 'inprogress':
        return <MetricCard title="Em Andamento" value={m.inProgressCount} icon={<Clock size={20} />} accentColor="var(--accent-amber)" accentBg="var(--accent-amber-light)" />;
      case 'resolved':
        return <MetricCard title="Resolvidos" value={m.resolvedCount} icon={<CheckCircle2 size={20} />} accentColor="var(--accent-emerald)" accentBg="var(--accent-emerald-light)" />;
      case 'sla':
        return <MetricCard title="SLA Cumprido" value={`${m.slaMetPercentage}%`} icon={<Shield size={20} />} accentColor="var(--accent-violet)" accentBg="var(--accent-violet-light)" />;
      case 'waiting_client':
        return <MetricCard title="Aguardando Cliente" value={m.waitingClientCount} icon={<UserCheck size={20} />} accentColor="var(--accent-amber)" accentBg="var(--accent-amber-light)" />;
      case 'waiting_third':
        return <MetricCard title="Aguardando Terceiros" value={m.waitingThirdPartyCount} icon={<ExternalLink size={20} />} accentColor="var(--accent-violet)" accentBg="var(--accent-violet-light)" />;

      case 'chart_volume': {
        const rangeSubtitles: Record<string, string> = {
          today: 'Abertura vs Resolução — Hoje',
          '7d': 'Abertura vs Resolução — últimos 7 dias',
          '30d': 'Abertura vs Resolução — últimos 30 dias',
          '90d': 'Abertura vs Resolução — últimos 90 dias',
          custom: 'Abertura vs Resolução — período personalizado',
        };
        return (
          <ChartCard title="Volume de Chamados" subtitle={rangeSubtitles[filters.dateRange] || rangeSubtitles['30d']} type="area" height={300}
            series={[
              { name: 'Abertos', data: m.volumeByDate.map(d => d.value) },
              { name: 'Resolvidos', data: m.resolutionByDate.map(d => d.value) },
            ]}
            options={{
              xaxis: { categories: m.volumeByDate.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), tickAmount: 8, labels: { rotate: 0, style: { fontSize: '10px' } } },
              colors: ['#3B82F6', '#10B981'],
            }}
          />
        );
      }
      case 'chart_category':
        return (
          <ChartCard title="Por Categoria" subtitle="Distribuição geral" type="donut" height={300}
            series={Object.values(m.byCategory)}
            options={{
              labels: Object.keys(m.byCategory),
              colors: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'],
              plotOptions: { pie: { donut: { size: '72%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px', fontWeight: '700' } } } } },
              legend: { position: 'bottom', fontSize: '11px', horizontalAlign: 'center' },
              fill: { type: 'solid' },
            }}
          />
        );
      case 'chart_priority':
        return (
          <ChartCard title="Chamados por Prioridade" subtitle="Distribuição atual" type="bar" height={260}
            series={[{ name: 'Chamados', data: Object.values(m.byPriority) }]}
            options={{
              xaxis: { categories: ['Crítico', 'Alto', 'Médio', 'Baixo'] },
              colors: ['#EF4444', '#F59E0B', '#3B82F6', '#6B7280'],
              plotOptions: { bar: { borderRadius: 8, horizontal: true, distributed: true, barHeight: '55%' } },
              fill: { type: 'solid' }, legend: { show: false },
            }}
          />
        );
      case 'chart_client':
        if (Object.keys(m.byClient).length === 0) return null;
        return (
          <ChartCard title="Chamados por Solicitante" subtitle="Top solicitantes" type="bar" height={260}
            series={[{ name: 'Chamados', data: Object.values(m.byClient) }]}
            options={{
              xaxis: { categories: Object.keys(m.byClient).map(n => { const p = n.split(' '); return p.length > 2 ? `${p[0]} ${p[1]}...` : n; }) },
              colors: ['#8B5CF6'],
              plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
              fill: { type: 'solid' },
            }}
          />
        );

      case 'panel_sla':
        return (
          <div className="rounded-[24px] border overflow-hidden" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
            <div className="p-6">
              <SectionHeader icon={<Shield size={18} style={{ color: 'var(--accent-violet)' }} />} title="Monitoramento de SLA">
                <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>Meta: 8 horas</span>
              </SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cumprimento Geral</span>
                    <span className="text-2xl font-bold tabular-nums" style={{ color: m.slaMetPercentage >= 80 ? 'var(--accent-emerald)' : m.slaMetPercentage >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{m.slaMetPercentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full mb-4" style={{ background: 'var(--border-primary)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${m.slaMetPercentage}%`, background: m.slaMetPercentage >= 80 ? 'var(--accent-emerald)' : m.slaMetPercentage >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)' }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-emerald)' }} /><span style={{ color: 'var(--text-secondary)' }}><b style={{ color: 'var(--accent-emerald)' }}>{m.slaMetCount}</b> dentro</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-rose)' }} /><span style={{ color: 'var(--text-secondary)' }}><b style={{ color: 'var(--accent-rose)' }}>{m.slaViolatedCount}</b> violados</span></div>
                  </div>
                </div>
                <div className="p-5 rounded-2xl flex flex-col justify-between" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2.5 mb-3"><UserCheck size={18} style={{ color: 'var(--accent-amber)' }} /><span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aguardando Cliente</span></div>
                  <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--accent-amber)' }}>{m.waitingClientCount}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>tickets aguardando retorno</p>
                </div>
                <div className="p-5 rounded-2xl flex flex-col justify-between" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2.5 mb-3"><ExternalLink size={18} style={{ color: 'var(--accent-violet)' }} /><span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aguardando Terceiros</span></div>
                  <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--accent-violet)' }}>{m.waitingThirdPartyCount}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>tickets com fornecedores</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'panel_live':
        if (liveAttendance.length === 0) return null;
        return (
          <div className="rounded-[24px] border overflow-hidden" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
            <div className="p-6">
              <SectionHeader icon={<Wifi size={18} style={{ color: 'var(--accent-blue)' }} />} title="Atendimento em Tempo Real"
                badge={<span className="badge badge-blue">{liveAttendance.length} ativos</span>} />
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr>
                  <th style={{ paddingLeft: '1.75rem' }}>Atendente</th><th>Ticket</th><th>Resumo</th><th>Status</th><th>Prioridade</th><th>Solicitante</th><th style={{ paddingRight: '1.75rem' }}>Tempo</th>
                </tr></thead>
                <tbody>
                  {liveAttendance.map((item, i) => {
                    const pC = priorityConfig[item.priority] || priorityConfig.medium;
                    const warn = item.timeInStatus > 60;
                    return (
                      <tr key={i}>
                        <td style={{ paddingLeft: '1.75rem' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent-indigo)', color: '#fff' }}>
                              {item.assignee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium text-sm whitespace-nowrap">{item.assignee}</span>
                          </div>
                        </td>
                        <td><span className="font-mono text-xs font-bold px-2 py-1 rounded-md" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{item.issueKey}</span></td>
                        <td><span className="text-sm block max-w-[280px] truncate">{item.issueSummary}</span></td>
                        <td><span className="badge badge-blue">{item.status}</span></td>
                        <td><span className="badge" style={{ background: pC.bg, color: pC.color }}>{pC.label}</span></td>
                        <td><span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{(item.client || '').split(' ').slice(0, 2).join(' ')}</span></td>
                        <td style={{ paddingRight: '1.75rem' }}>
                          <div className="flex items-center gap-2">
                            <Timer size={14} style={{ color: warn ? 'var(--accent-rose)' : 'var(--text-tertiary)' }} />
                            <span className="text-sm font-bold tabular-nums" style={{ color: warn ? 'var(--accent-rose)' : 'var(--text-primary)' }}>{formatMinutes(item.timeInStatus)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'panel_ranking':
        if (m.byAssignee.length === 0) return null;
        return (
          <div className="rounded-[24px] border overflow-hidden" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
            <div className="p-6">
              <SectionHeader icon={<Cup size={18} variant="Bold" color="#FBBF24" aria-hidden="true" />} title="Ranking de Atendentes" badge={<span className="badge badge-blue">{m.byAssignee.length} atendentes</span>} />
              <div className="space-y-6">
                {m.byAssignee.map((agent, i) => {
                  const max = m.byAssignee[0]?.completedCount || 1;
                  const pct = (agent.completedCount / max) * 100;
                  const medalColors = ['#FBBF24', '#CBD5E1', '#D08C5A'];
                  return (
                    <div key={agent.email || agent.name} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: i === 0 ? 'var(--accent-blue-light)' : 'transparent' }}>
                      <span className="w-8 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {medalColors[i]
                          ? <Medal size={22} variant="Bold" color={medalColors[i]} aria-label={`${i + 1}º lugar`} />
                          : `${i + 1}º`}
                      </span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent-indigo)', color: '#fff' }}>{agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
                          <span className="text-base font-bold tabular-nums ml-3" style={{ color: 'var(--accent-blue)' }}>{agent.completedCount}</span>
                        </div>
                        <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-primary)' }}>
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'var(--accent-blue)', opacity: 1 - (i * 0.12) }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 'panel_critical':
        return (
          <div className="rounded-[24px] border overflow-hidden" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
            <div className="p-6">
              <SectionHeader 
                icon={<AlertCircle size={18} className="animate-pulse" style={{ color: 'var(--accent-rose)' }} />} 
                title="Tickets Críticos" 
                badge={<span className="badge badge-rose">{criticalTickets.length} Ativos</span>}
              />
              <div className="space-y-4">
                {criticalTickets.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-secondary)' }}>
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'var(--accent-emerald-light)' }}>
                      <CheckCircle2 size={24} style={{ color: 'var(--accent-emerald)' }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tudo tranquilo por aqui</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Nenhum ticket crítico aberto no momento.</p>
                  </div>
                ) : criticalTickets.map(t => (
                  <div 
                    key={t.id} 
                    className="group relative p-5 rounded-xl border-l-[3px] transition-all duration-200 cursor-pointer overflow-hidden" 
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      borderLeftColor: 'var(--accent-rose)',
                      borderTop: '1px solid var(--border-secondary)',
                      borderRight: '1px solid var(--border-secondary)',
                      borderBottom: '1px solid var(--border-secondary)',
                    }}
                  >
                    <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--accent-rose)', color: '#fff', letterSpacing: '0.05em' }}>
                            {t.jiraKey}
                          </span>
                          {t.isSLAViolated && (
                            <span className="badge badge-amber flex items-center gap-1">
                              <AlertTriangle size={10} /> SLA Estourado
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {t.summary}
                        </p>
                      </div>
                      
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                          <Timer size={14} className={t.isSLAViolated ? 'animate-pulse' : ''} style={{ color: t.isSLAViolated ? 'var(--accent-rose)' : 'var(--text-tertiary)' }} />
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: t.isSLAViolated ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                            {t.timeInStatus ? formatMinutes(t.timeInStatus) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white" style={{ background: 'var(--accent-violet)' }}>
                            {t.assignee.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[100px]">{t.assignee}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'panel_overdue':
        return (
          <div className="rounded-[24px] border overflow-hidden" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
            <div className="p-6">
              <SectionHeader icon={<Clock size={18} style={{ color: 'var(--accent-amber)' }} />} title="Tickets Atrasados" badge={<span className="badge badge-amber">{overdueTickets.length}</span>} />
              <div className="space-y-5">
                {overdueTickets.length === 0 ? (
                  <div className="text-center py-8"><CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: 'var(--accent-emerald)' }} /><p className="text-sm font-medium" style={{ color: 'var(--accent-emerald)' }}>Nenhum ticket atrasado</p></div>
                ) : overdueTickets.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--accent-amber-light)', color: 'var(--accent-amber)' }}>{t.jiraKey}</span>
                      <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.summary}</span>
                    </div>
                    <span className="text-xs font-bold flex-shrink-0 ml-3" style={{ color: 'var(--accent-rose)' }}>{t.timeInStatus ? formatMinutes(t.timeInStatus) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">Suporte</h1>
          <p className="ui-page-description">Operação de atendimento, SLA e volume de chamados.</p>
        </div>
      </div>

      {/* ═══════ TOP BAR: Connection + Edit Mode ═══════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
          style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)' }}>
          <span className="live-dot" style={{
            background: data.mode === 'live' ? 'var(--accent-emerald)' : data.mode === 'cached' ? 'var(--accent-blue)' : 'var(--accent-amber)',
            boxShadow: data.mode === 'live' ? '0 0 0 0 rgba(16, 185, 129, 0.4)' : data.mode === 'cached' ? '0 0 0 0 rgba(59, 130, 246, 0.4)' : '0 0 0 0 rgba(245, 158, 11, 0.4)',
          }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {data.mode === 'live' ? 'Conectado ao Jira' : data.mode === 'cached' ? 'Sincronizado (Firebase DB)' : 'Modo demonstração'}
          </span>
          <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>
            · {new Date(data.lastUpdated).toLocaleTimeString('pt-BR')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <EditToolbar editMode={editMode} setEditMode={setEditMode} onReset={handleResetAll} />
        </div>
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm animate-fade-in"
          style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}>
          <GripVertical size={18} />
          <span><strong>Modo organização ativo</strong> — Arraste as alças para reordenar qualquer card no painel livremente. Clique em &quot;Concluir&quot; para salvar.</span>
        </div>
      )}

      {/* ═══════ FLAT CARD GRID (6 columns) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {drag.order.map((cardId) => {
          const content = renderCardContent(cardId);
          if (!content) return null;

          const currentSize = cardSizes[cardId] || DEFAULT_CARD_SIZES[cardId] || 2;
          const spanClass = SPAN_CLASSES[currentSize] || 'lg:col-span-2';

          return (
            <DraggableItem
              key={cardId}
              id={cardId}
              editMode={editMode}
              label={CARD_LABELS[cardId] || cardId}
              draggingId={drag.draggingId}
              dragOverId={drag.dragOverId}
              onDragStart={drag.onDragStart}
              onDragEnter={drag.onDragEnter}
              onDragEnd={drag.onDragEnd}
              className={spanClass}
              currentSize={currentSize}
              minSize={1}
              maxSize={6}
              onResizeDirect={(newSize) => updateCardSize(cardId, newSize)}
            >
              {content}
            </DraggableItem>
          );
        })}
      </div>
    </div>
  );
}
