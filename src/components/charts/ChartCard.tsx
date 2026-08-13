'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';
import { useTheme } from '@/contexts/ThemeContext';

type ChartSeries = ApexAxisChartSeries | ApexNonAxisChartSeries;

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'area' | 'bar' | 'line' | 'donut' | 'radialBar' | 'heatmap' | 'pie';
  series: ChartSeries;
  options?: ApexOptions;
  height?: number;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  type,
  series,
  options = {},
  height = 320,
  className = '',
}: ChartCardProps) {
  const { theme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);
  const [ready, setReady] = useState(false);
  const documentTheme = theme === 'light' ? 'light' : 'dark';

  const baseOptions: ApexOptions = {
    chart: {
      type,
      fontFamily: 'DM Sans, system-ui, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
      height,
      animations: { enabled: false },
    },
    theme: { mode: documentTheme },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.06)',
      strokeDashArray: 3,
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      labels: {
        style: {
          colors: 'var(--text-tertiary)',
          fontSize: '11px',
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--text-tertiary)',
          fontSize: '11px',
        },
      },
    },
    tooltip: {
      theme: documentTheme,
      style: { fontSize: '12px' },
    },
    legend: {
      labels: { colors: 'var(--text-secondary)' },
      fontSize: '12px',
      fontWeight: 500,
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'solid',
      opacity: type === 'area' ? 0.18 : 1,
    },
    colors: [
      '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
      '#F43F5E', '#06B6D4', '#EC4899', '#6366F1',
    ],
    series,
    ...options,
  };

  // Mount chart
  useEffect(() => {
    let isCancelled = false;
    let chart: ApexCharts | null = null;

    async function init() {
      if (isCancelled || !chartRef.current) return;

      try {
        const ApexCharts = (await import('apexcharts')).default;
        if (isCancelled || !chartRef.current) return;

        // Destroy previous instance if it exists
        if (chartInstance.current) {
          try {
            chartInstance.current.destroy();
          } catch {
            // Ignore
          }
          chartInstance.current = null;
        }

        chart = new ApexCharts(chartRef.current, { ...baseOptions, series });
        chartInstance.current = chart;
        await chart.render();

        if (isCancelled) {
          try {
            chart.destroy();
          } catch {
            // Ignore
          }
          if (chartInstance.current === chart) {
            chartInstance.current = null;
          }
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("Failed to initialize chart:", err);
      }
    }

    init();

    return () => {
      isCancelled = true;
      setReady(false);
      if (chart) {
        try {
          chart.destroy();
        } catch {
          // Ignore
        }
      }
      if (chartInstance.current) {
        try {
          chartInstance.current.destroy();
        } catch {
          // Ignore
        }
        chartInstance.current = null;
      }
    };
    // The chart is rebuilt only when its color mode changes; series use the update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentTheme]);

  // Update data when series changes
  useEffect(() => {
    if (chartInstance.current && ready) {
      try {
        chartInstance.current.updateSeries(series, true);
      } catch { /* */ }
    }
  }, [series, ready]);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-surface)',
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[24px] leading-8 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[15px] leading-6 mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{
        height: '1px',
        background: 'var(--border-primary)',
      }} />

      {/* Chart */}
      <div className="px-4 pt-2 pb-4">
        <div
          ref={chartRef}
          role="img"
          aria-label={`${title}. ${subtitle ? `${subtitle}. ` : ''}Gráfico ${type} com ${series.length} ${series.length === 1 ? 'série' : 'séries'}.`}
          style={{ minHeight: `${height}px` }}
        />
      </div>
    </div>
  );
}
