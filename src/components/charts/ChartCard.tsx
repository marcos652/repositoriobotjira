'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartSeries = any;

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
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);
  const [ready, setReady] = useState(false);

  const baseOptions: ApexOptions = {
    chart: {
      type,
      fontFamily: 'Inter, system-ui, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
      height,
      animations: {
        enabled: true,
        speed: 800,
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    theme: { mode: 'dark' },
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
      theme: 'dark',
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
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 100],
      },
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
          } catch (e) {
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
          } catch (e) {
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
        } catch (e) {
          // Ignore
        }
      }
      if (chartInstance.current) {
        try {
          chartInstance.current.destroy();
        } catch (e) {
          // Ignore
        }
        chartInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      className={`overflow-hidden transition-all duration-300 hover:shadow-xl group ${className}`}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div className="px-7 pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[1rem] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gradient Divider */}
      <div style={{
        height: '1px',
        margin: '0 1.75rem',
        background: 'linear-gradient(90deg, transparent 0%, var(--border-primary) 20%, var(--border-primary) 80%, transparent 100%)',
      }} />

      {/* Chart */}
      <div className="px-4 pt-2 pb-4">
        <div ref={chartRef} style={{ minHeight: `${height}px` }} />
      </div>
    </div>
  );
}
