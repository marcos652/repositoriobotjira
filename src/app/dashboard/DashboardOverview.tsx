'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/ui/MetricCard';
import ChartCard from '@/components/charts/ChartCard';
import DraggableItem from '@/components/ui/DraggableItem';
import EditToolbar from '@/components/ui/EditToolbar';
import { useDragOrder } from '@/hooks/useDragOrder';
import { useFilters } from '@/contexts/FilterContext';
import {
  Headphones, Code2, Ticket, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, Target, Bug, Loader2, WifiOff, RefreshCw
} from 'lucide-react';

const DEFAULT_CARDS_ORDER = [
  'open', 'resolved', 'sla', 'avgtime', 'bugs', 'critical',
  'suporte_module', 'dev_module', 'chart_volume', 'chart_burndown'
];

const CARD_LABELS: Record<string, string> = {
  open: 'Overview: Total Aberto',
  resolved: 'Overview: Resolvidos (30d)',
  sla: 'Overview: SLA Cumprido',
  avgtime: 'Overview: Tempo Médio',
  bugs: 'Overview: Bugs Ativos',
  critical: 'Overview: Itens Críticos',
  suporte_module: 'Link: Atalho Suporte',
  dev_module: 'Link: Atalho Desenvolvimento',
  chart_volume: 'Overview Gráfico: Volume de Demandas',
  chart_burndown: 'Overview Gráfico: Sprint Burndown',
};

const DEFAULT_CARD_SIZES: Record<string, number> = {
  open: 2,
  resolved: 2,
  sla: 2,
  avgtime: 2,
  bugs: 2,
  critical: 2,
  suporte_module: 3,
  dev_module: 3,
  chart_volume: 3,
  chart_burndown: 3,
};

const SPAN_CLASSES: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

interface OverviewData {
  support: any;
  dev: any;
  lastUpdated: string;
}

export default function DashboardOverview() {
  const { filters } = useFilters();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const drag = useDragOrder('jiraops-overview-flat-order', DEFAULT_CARDS_ORDER);

  const [cardSizes, setCardSizes] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('jiraops-overview-card-sizes');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const updateCardSize = useCallback((id: string, newSize: number) => {
    setCardSizes(prev => {
      const updated = { ...prev, [id]: newSize };
      try { localStorage.setItem('jiraops-overview-card-sizes', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const resetSizes = useCallback(() => {
    setCardSizes({});
    try { localStorage.removeItem('jiraops-overview-card-sizes'); } catch {}
  }, []);

  const handleResetAll = () => {
    drag.reset();
    resetSizes();
  };

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      let queryParams = `?range=${filters.dateRange}`;
      if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
        queryParams += `&start=${filters.customStartDate}&end=${filters.customEndDate}`;
      }

      const [supportRes, devRes] = await Promise.all([
        fetch(`/api/metrics/support${queryParams}`),
        fetch(`/api/metrics/dev${queryParams}`)
      ]);

      if (!supportRes.ok) throw new Error(`Support API HTTP ${supportRes.status}`);
      if (!devRes.ok) throw new Error(`Dev API HTTP ${devRes.status}`);

      const supportJson = await supportRes.json();
      const devJson = await devRes.json();

      setData({
        support: supportJson,
        dev: devJson,
        lastUpdated: new Date().toISOString()
      });
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin text-gradient" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando dados da Visão Geral...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--accent-rose-light)' }}>
            <WifiOff size={28} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro de conexão</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{error || 'Não foi possível carregar os dados'}</p>
          </div>
          <button onClick={() => fetchData()} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const sM = data.support.metrics;
  const dM = data.dev.metrics;
  const currentSprint = data.dev.currentSprint;

  const totalOpen = sM.openCount + dM.todoCount + dM.inProgressCount;
  const totalResolved = sM.resolvedCount + dM.doneCount;
  const totalCritical = sM.criticalCount + dM.blockedCount;

  const renderCardContent = (cardId: string, i: number) => {
    switch (cardId) {
      case 'open':
        return <MetricCard title="Total Aberto" value={totalOpen} change={-8} icon={<Ticket size={20} />} accentColor="var(--accent-blue)" accentBg="var(--accent-blue-light)" index={editMode ? 0 : i} />;
      case 'resolved': {
        const rangeLabels: Record<string, string> = {
          today: 'Hoje',
          '7d': '7d',
          '30d': '30d',
          '90d': '90d',
          custom: 'Período',
        };
        const rangeLabel = rangeLabels[filters.dateRange] || '30d';
        return <MetricCard title={`Resolvidos (${rangeLabel})`} value={totalResolved} change={12} icon={<CheckCircle2 size={20} />} accentColor="var(--accent-emerald)" accentBg="var(--accent-emerald-light)" index={editMode ? 0 : i} />;
      }
      case 'sla':
        return <MetricCard title="SLA Cumprido" value={`${sM.slaMetPercentage}%`} change={3.2} icon={<Target size={20} />} accentColor="var(--accent-violet)" accentBg="var(--accent-violet-light)" index={editMode ? 0 : i} />;
      case 'avgtime':
        return <MetricCard title="Tempo Médio" value={formatMinutes(sM.avgResolutionTime)} change={-15} icon={<Clock size={20} />} accentColor="var(--accent-cyan)" accentBg="var(--accent-cyan-light)" index={editMode ? 0 : i} />;
      case 'bugs':
        return <MetricCard title="Bugs Ativos" value={dM.bugCount} change={22} icon={<Bug size={20} />} accentColor="var(--accent-amber)" accentBg="var(--accent-amber-light)" index={editMode ? 0 : i} />;
      case 'critical':
        return <MetricCard title="Itens Críticos" value={totalCritical} change={-5} icon={<AlertTriangle size={20} />} accentColor="var(--accent-rose)" accentBg="var(--accent-rose-light)" index={editMode ? 0 : i} />;

      case 'suporte_module':
        return (
          <Link href="/dashboard/suporte" className="block group h-full">
            <div className="rounded-2xl border transition-all duration-300 hover:shadow-xl overflow-hidden h-full flex flex-col justify-between"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-7 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}>
                    <Headphones size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Suporte</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Dashboard operacional de atendimento</p>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:translate-x-1"
                  style={{ background: 'var(--bg-secondary)' }}>
                  <ArrowRight size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 px-7 pb-7 mt-auto">
                {[
                  { label: 'Abertos', value: sM.openCount, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
                  { label: 'Em Andamento', value: sM.inProgressCount, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
                  { label: 'Resolvidos', value: sM.resolvedCount, color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)' },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 rounded-xl"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-2xl font-extrabold tabular-nums" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-[11px] font-medium mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        );
      case 'dev_module':
        return (
          <Link href="/dashboard/dev" className="block group h-full">
            <div className="rounded-2xl border transition-all duration-300 hover:shadow-xl overflow-hidden h-full flex flex-col justify-between"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-7 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-violet)' }}>
                    <Code2 size={26} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Desenvolvimento</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{currentSprint.name}</p>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:translate-x-1"
                  style={{ background: 'var(--bg-secondary)' }}>
                  <ArrowRight size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-5 px-7 pb-7 mt-auto">
                {[
                  { label: 'To Do', count: dM.todoCount, color: 'var(--text-secondary)' },
                  { label: 'Progress', count: dM.inProgressCount, color: 'var(--accent-blue)' },
                  { label: 'Review', count: dM.codeReviewCount, color: 'var(--accent-violet)' },
                  { label: 'QA', count: dM.qaCount, color: 'var(--accent-amber)' },
                  { label: 'Done', count: dM.doneCount, color: 'var(--accent-emerald)' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-xl"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-2xl font-extrabold tabular-nums" style={{ color: item.color }}>
                      {item.count}
                    </p>
                    <p className="text-[10px] font-semibold mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        );

      case 'chart_volume':
        return (
          <ChartCard
            title="Volume de Demandas"
            subtitle="Abertura vs Resolução"
            type="area"
            height={350}
            series={[
              { name: 'Abertas', data: sM.volumeByDate.map((d: any) => d.value) },
              { name: 'Resolvidas', data: sM.resolutionByDate.map((d: any) => d.value) },
            ]}
            options={{
              xaxis: {
                categories: sM.volumeByDate.map((d: any) =>
                  new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                ),
                labels: { show: true, rotate: 0, style: { fontSize: '10px' } },
                tickAmount: 10,
              },
              colors: ['#3B82F6', '#10B981'],
            }}
          />
        );
      case 'chart_burndown':
        return (
          <ChartCard
            title="Sprint Burndown"
            subtitle={currentSprint.name}
            type="line"
            height={350}
            series={[
              { name: 'Ideal', data: dM.burndownData.map((d: any) => d.ideal) },
              { name: 'Atual', data: dM.burndownData.map((d: any) => d.actual) },
            ]}
            options={{
              xaxis: {
                categories: dM.burndownData.map((d: any) =>
                  new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                ),
              },
              stroke: { width: [2, 3], dashArray: [5, 0], curve: 'smooth' },
              colors: ['#6B7280', '#8B5CF6'],
              fill: { type: 'none' },
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-16 animate-fade-in">

      {/* ═══ HEADER BAR (Jira-style, clean) ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          padding: '16px 20px',
          borderRadius: '4px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', margin: 0 }}>
            Visão Geral
          </h2>
          {totalCritical > 0 && (
            <span
              className="text-xs font-bold"
              style={{
                background: '#FFEBE6',
                color: '#BF2600',
                padding: '2px 8px',
                borderRadius: '3px',
              }}
            >
              {totalCritical} {totalCritical === 1 ? 'item crítico' : 'itens críticos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
            style={{
              padding: '6px 12px',
              borderRadius: '3px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <EditToolbar editMode={editMode} setEditMode={setEditMode} onReset={handleResetAll} />
        </div>
      </div>

      {/* Edit mode banner hint */}
      {editMode && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm animate-fade-in -mb-10"
          style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}>
          <ArrowRight className="animate-pulse" size={18} />
          <span><strong>Modo organização ativo</strong> — Arraste as alças para reordenar qualquer card no painel livremente. Clique em &quot;Concluir&quot; para salvar.</span>
        </div>
      )}

      {/* ═══════ FLAT CARD GRID (6 columns) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">
        {drag.order.map((cardId, i) => {
          const content = renderCardContent(cardId, i);
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
