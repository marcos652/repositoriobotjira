'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import ChartCard from '@/components/charts/ChartCard';
import DraggableItem from '@/components/ui/DraggableItem';
import EditToolbar from '@/components/ui/EditToolbar';
import { useDragOrder } from '@/hooks/useDragOrder';
import { useFilters } from '@/contexts/FilterContext';
import { Sprint, DevMetrics, Issue, DeployRecord } from '@/types';
import {
  Clock, Gauge, Zap, Bug, ArrowUpRight, Timer, Ban, Eye, Rocket, GripVertical,
  Loader2, WifiOff, RefreshCw
} from 'lucide-react';

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

const statusColors: Record<string, string> = {
  'To Do': 'var(--text-secondary)',
  'In Progress': 'var(--accent-blue)',
  'Code Review': 'var(--accent-violet)',
  'QA': 'var(--accent-amber)',
  'Done': 'var(--accent-emerald)',
  'Blocked': 'var(--accent-rose)',
};

const SPAN_CLASSES: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
};

const DEFAULT_CARDS_ORDER = [
  'sprint_banner',
  'leadtime', 'cycletime', 'velocity', 'throughput', 'bugs', 'blocked',
  'chart_burndown', 'chart_velocity', 'chart_throughput', 'chart_bugs',
  'panel_devs', 'panel_productivity', 'panel_bottlenecks', 'panel_blocked_tasks', 'panel_deploy'
];

const CARD_LABELS: Record<string, string> = {
  sprint_banner: 'Dev: Sprint Banner',
  leadtime: 'Métrica: Lead Time',
  cycletime: 'Métrica: Cycle Time',
  velocity: 'Métrica: Velocidade',
  throughput: 'Métrica: Throughput',
  bugs: 'Métrica: Bugs Ativos',
  blocked: 'Métrica: Bloqueadas',
  chart_burndown: 'Gráfico: Burndown Chart',
  chart_velocity: 'Gráfico: Velocity Chart',
  chart_throughput: 'Gráfico: Throughput',
  chart_bugs: 'Gráfico: Bugs por Período',
  panel_devs: 'Painel: Atividade dos Devs',
  panel_productivity: 'Painel: Produtividade',
  panel_bottlenecks: 'Painel: Análise de Gargalos',
  panel_blocked_tasks: 'Painel: Tasks Bloqueadas',
  panel_deploy: 'Painel: Histórico de Deploys',
};

const DEFAULT_CARD_SIZES: Record<string, number> = {
  sprint_banner: 6,
  leadtime: 2,
  cycletime: 2,
  velocity: 2,
  throughput: 2,
  bugs: 2,
  blocked: 2,
  chart_burndown: 3,
  chart_velocity: 3,
  chart_throughput: 3,
  chart_bugs: 3,
  panel_devs: 4,
  panel_productivity: 2,
  panel_bottlenecks: 3,
  panel_blocked_tasks: 3,
  panel_deploy: 6,
};

interface DevData {
  metrics: DevMetrics;
  currentSprint: Sprint;
  blockedTasks: Issue[];
  deployHistory: DeployRecord[];
  bottleneckData: { status: string; count: number; avgTime: number }[];
  lastUpdated: string;
  mode: 'live' | 'cached' | 'demo';
}

export default function DevContent() {
  const { filters } = useFilters();
  const [data, setData] = useState<DevData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const drag = useDragOrder('jiraops-dev-flat-order', DEFAULT_CARDS_ORDER);

  const [cardSizes, setCardSizes] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('jiraops-dev-card-sizes');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const updateCardSize = useCallback((id: string, newSize: number) => {
    setCardSizes(prev => {
      const updated = { ...prev, [id]: newSize };
      try { localStorage.setItem('jiraops-dev-card-sizes', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const resetSizes = useCallback(() => {
    setCardSizes({});
    try { localStorage.removeItem('jiraops-dev-card-sizes'); } catch {}
  }, []);

  const handleResetAll = () => {
    drag.reset();
    resetSizes();
  };

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      let url = `/api/metrics/dev?range=${filters.dateRange}`;
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin text-gradient" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando dados do Jira...</p>
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

  const m = data.metrics;
  const sprint = data.currentSprint;
  const blockedTasks = data.blockedTasks;
  const deployHistory = data.deployHistory;
  const bottleneckData = data.bottleneckData;

  const sprintDaysTotal = Math.ceil(
    (new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / 86400000
  );
  const sprintDaysElapsed = Math.ceil(
    (Date.now() - new Date(sprint.startDate).getTime()) / 86400000
  );
  const sprintDaysRemaining = Math.max(0, sprintDaysTotal - sprintDaysElapsed);
  const sprintProgressPct = Math.round((sprint.completedPoints / sprint.committedPoints) * 100);

  const metricCardsConfig: Record<string, { title: string; value: string | number; change: number; icon: React.ReactNode; accentColor: string; accentBg: string; suffix?: string }> = {
    leadtime: { title: "Lead Time", value: formatMinutes(m.avgLeadTime), change: -8, icon: <Clock size={20} />, accentColor: "var(--accent-blue)", accentBg: "var(--accent-blue-light)" },
    cycletime: { title: "Cycle Time", value: formatMinutes(m.avgCycleTime), change: -12, icon: <Gauge size={20} />, accentColor: "var(--accent-violet)", accentBg: "var(--accent-violet-light)" },
    velocity: { title: "Velocidade", value: m.squadVelocity, suffix: "pts", change: 4, icon: <Zap size={20} />, accentColor: "var(--accent-emerald)", accentBg: "var(--accent-emerald-light)" },
    throughput: { title: "Throughput", value: m.throughput, suffix: "/sem", change: 7, icon: <ArrowUpRight size={20} />, accentColor: "var(--accent-cyan)", accentBg: "var(--accent-cyan-light)" },
    bugs: { title: "Bugs Ativos", value: m.bugCount, change: 15, icon: <Bug size={20} />, accentColor: "var(--accent-amber)", accentBg: "var(--accent-amber-light)" },
    blocked: { title: "Bloqueadas", value: m.blockedCount, change: -33, icon: <Ban size={20} />, accentColor: "var(--accent-rose)", accentBg: "var(--accent-rose-light)" }
  };

  const renderCardContent = (cardId: string, i: number) => {
    switch (cardId) {
      case 'sprint_banner':
        return (
          <div className="rounded-2xl border p-6 relative overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-blue">Sprint Ativa</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sprintDaysRemaining} dias restantes</span>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{sprint.name}</h2>
                {sprint.goal && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>🎯 {sprint.goal}</p>}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gradient">{isNaN(sprintProgressPct) ? 0 : sprintProgressPct}%</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sprint.completedPoints}/{sprint.committedPoints} pontos</p>
              </div>
            </div>
            <div className="w-full h-3 rounded-full" style={{ background: 'var(--border-primary)' }}>
              <div className="h-full rounded-full transition-all duration-1000 relative"
                style={{ width: `${isNaN(sprintProgressPct) ? 0 : sprintProgressPct}%`, background: 'var(--gradient-primary)' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white"
                  style={{ background: 'var(--accent-blue)' }} />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-6 mt-5">
              {[
                { label: 'To Do', count: m.todoCount, color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' },
                { label: 'In Progress', count: m.inProgressCount, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
                { label: 'Code Review', count: m.codeReviewCount, color: 'var(--accent-violet)', bg: 'var(--accent-violet-light)' },
                { label: 'QA', count: m.qaCount, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
                { label: 'Done', count: m.doneCount, color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-light)' },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-xl transition-transform hover:scale-105"
                  style={{ background: item.bg }}>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.count}</p>
                  <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'leadtime':
      case 'cycletime':
      case 'velocity':
      case 'throughput':
      case 'bugs':
      case 'blocked': {
        const card = metricCardsConfig[cardId];
        if (!card) return null;
        return (
          <MetricCard
            title={card.title}
            value={card.value}
            suffix={card.suffix}
            change={card.change}
            icon={card.icon}
            accentColor={card.accentColor}
            accentBg={card.accentBg}
            index={editMode ? 0 : i}
          />
        );
      }

      case 'chart_burndown':
        return (
          <ChartCard title="Burndown Chart" subtitle={sprint.name} type="line" height={300}
            series={[
              { name: 'Ideal', data: m.burndownData.map(d => d.ideal) },
              { name: 'Atual', data: m.burndownData.map(d => d.actual) },
            ]}
            options={{
              xaxis: { categories: m.burndownData.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) },
              stroke: { width: [2, 3], dashArray: [5, 0], curve: 'straight' },
              colors: ['#6B7280', '#8B5CF6'],
              fill: { type: 'none' },
              markers: { size: [0, 4], strokeWidth: 0 },
            }}
          />
        );

      case 'chart_velocity':
        return (
          <ChartCard title="Velocity Chart" subtitle="Últimas 6 sprints" type="bar" height={300}
            series={[
              { name: 'Committed', data: m.velocityData.map(d => d.committed) },
              { name: 'Completed', data: m.velocityData.map(d => d.completed) },
            ]}
            options={{
              xaxis: { categories: m.velocityData.map(d => d.sprint) },
              colors: ['#3B82F6', '#10B981'],
              plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
              fill: { type: 'solid', opacity: [0.3, 1] },
            }}
          />
        );

      case 'chart_throughput':
        return (
          <ChartCard title="Throughput" subtitle="Tasks por semana" type="area" height={260}
            series={[{ name: 'Tasks', data: m.throughputData.map(d => d.value) }]}
            options={{ xaxis: { categories: m.throughputData.map(d => d.date) }, colors: ['#06B6D4'] }}
          />
        );

      case 'chart_bugs': {
        const daysLimit = filters.dateRange === 'today' ? 1 : filters.dateRange === '7d' ? 7 : filters.dateRange === '90d' ? 90 : filters.dateRange === 'custom' ? m.bugsByDate.length : 30;
        const chartData = m.bugsByDate.slice(-daysLimit);
        const subtitleText = filters.dateRange === 'today' ? 'Hoje' : `Últimos ${daysLimit} dias`;
        return (
          <ChartCard title="Bugs por Período" subtitle={subtitleText} type="bar" height={260}
            series={[{ name: 'Bugs', data: chartData.map(d => d.value) }]}
            options={{
              xaxis: { categories: chartData.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) },
              colors: ['#EF4444'],
              plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
              fill: { type: 'solid' },
            }}
          />
        );
      }

      case 'panel_devs':
        return (
          <div className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Eye size={18} style={{ color: 'var(--accent-blue)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Atividade dos Devs</h3>
              <span className="badge badge-blue">{m.byAssignee.length} devs</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {m.byAssignee.map((dev) => {
                const task = dev.currentTask;
                const sColor = task ? (statusColors[task.status] || 'var(--text-secondary)') : 'var(--text-tertiary)';
                return (
                  <div key={dev.email} className="p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                        {dev.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{dev.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{dev.completedCount} completadas</p>
                      </div>
                    </div>
                    {task && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-blue)' }}>{task.jiraKey}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                            style={{ background: `${sColor}20`, color: sColor }}>{task.status}</span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{task.summary}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Timer size={10} style={{ color: 'var(--text-tertiary)' }} />
                          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{formatMinutes(task.timeInStatus)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'panel_productivity':
        return (
          <div className="rounded-2xl border p-5 h-full flex flex-col justify-between"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>🏆 Produtividade</h4>
              <div className="space-y-4">
                {[...m.byAssignee].sort((a, b) => b.completedCount - a.completedCount).slice(0, 4).map((dev, i) => (
                  <div key={dev.email} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-5 text-center font-bold" style={{ color: 'var(--text-tertiary)' }}>{['🥇', '🥈', '🥉', '4º'][i]}</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{dev.name}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-blue)' }}>{dev.completedCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'panel_bottlenecks':
        return (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🔍 Análise de Gargalos</h3>
            <div className="space-y-5">
              {[...bottleneckData].sort((a, b) => b.avgTime - a.avgTime).map((item) => {
                const maxTime = bottleneckData.reduce((mx, d) => Math.max(mx, d.avgTime), 0);
                const pct = (item.avgTime / maxTime) * 100;
                const isHigh = item.avgTime > 500;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="status-dot" style={{ background: statusColors[item.status] || 'var(--text-secondary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.status}</span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>({item.count})</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums"
                        style={{ color: isHigh ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>{formatMinutes(item.avgTime)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-primary)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, background: isHigh ? 'var(--accent-rose)' : 'var(--accent-blue)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'panel_blocked_tasks':
        return (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Ban size={18} style={{ color: 'var(--accent-rose)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks Bloqueadas</h3>
              <span className="badge badge-rose">{blockedTasks.length}</span>
            </div>
            <div className="space-y-5">
              {blockedTasks.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhuma tarefa bloqueada no momento.</p>
              ) : (
                blockedTasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-xl border-l-4"
                    style={{ background: 'var(--accent-rose-light)', borderLeftColor: 'var(--accent-rose)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent-rose)' }}>{task.jiraKey}</span>
                        <span className="badge badge-rose">Bloqueada</span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatMinutes(task.timeInStatus || 0)}</span>
                    </div>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{task.summary}</p>
                    <p className="text-xs" style={{ color: 'var(--accent-rose)' }}>⛔ {task.blockedReason}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>👤 {task.assignee}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'panel_deploy':
        return (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Rocket size={18} style={{ color: 'var(--accent-violet)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Histórico de Deploys</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Versão</th><th>Data</th><th>Ambiente</th><th>Status</th><th>Autor</th><th>Descrição</th><th>Issues</th></tr>
                </thead>
                <tbody>
                  {deployHistory.map((deploy) => (
                    <tr key={deploy.id}>
                      <td><span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-violet)' }}>{deploy.version}</span></td>
                      <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(deploy.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td><span className="badge badge-blue">{deploy.environment}</span></td>
                      <td>
                        <span className={`badge ${deploy.status === 'success' ? 'badge-emerald' : deploy.status === 'rollback' ? 'badge-amber' : 'badge-rose'}`}>
                          {deploy.status === 'success' ? '✓ Success' : deploy.status === 'rollback' ? '↩ Rollback' : '✗ Failed'}
                        </span>
                      </td>
                      <td className="text-sm">{deploy.author}</td>
                      <td className="text-sm max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{deploy.description}</td>
                      <td className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-blue)' }}>{deploy.issuesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-16 animate-fade-in">

      {/* ═══════ TOP BAR: Connection + Edit Mode ═══════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' }}>
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
