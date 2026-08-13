'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  index?: number;
  loading?: boolean;
  sparklineData?: number[];
}

function useCountUp(target: number, duration = 800, enabled = true) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) {
      rafId.current = requestAnimationFrame(() => setCount(target));
      return () => cancelAnimationFrame(rafId.current);
    }

    startTime.current = null;
    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [duration, enabled, target]);

  return count;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gradientId = useId().replace(/:/g, '');
  if (data.length < 2) return null;

  const width = 64;
  const height = 44;
  const maximum = Math.max(...data);
  const minimum = Math.min(...data);
  const range = maximum - minimum || 1;
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - minimum) / range) * (height - 4) - 2,
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} role="img" aria-label="Tendência recente">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricSkeleton() {
  return (
    <div className="metric-card" style={{ minHeight: 160 }} aria-label="Carregando métrica">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-title" style={{ width: '45%', height: 36, marginTop: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 40, height: 40 }} />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: 24 }} />
    </div>
  );
}

export default function MetricCard({
  title,
  value,
  suffix,
  change,
  changeLabel,
  icon,
  accentColor,
  accentBg,
  index = 0,
  loading = false,
  sparklineData,
}: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value)) || 0;
  const animatedValue = useCountUp(numericValue, 800, !loading && typeof value === 'number');
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (loading) return <MetricSkeleton />;

  const changeColor = isPositive
    ? 'var(--accent-emerald)'
    : isNegative
      ? 'var(--accent-rose)'
      : 'var(--text-tertiary)';

  return (
    <article
      className={`metric-card animate-slide-up stagger-${index + 1}`}
      style={{ '--card-accent': accentColor } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-5" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-[32px] font-medium leading-9 metric-number tracking-tight animate-count-up" style={{ color: 'var(--text-primary)' }}>
              {typeof value === 'number' ? animatedValue.toLocaleString('pt-BR') : value}
            </strong>
            {suffix && <span className="text-[15px] leading-6" style={{ color: 'var(--text-tertiary)' }}>{suffix}</span>}
          </div>
        </div>
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, color: accentColor }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 mt-4 min-h-11">
        {sparklineData && sparklineData.length > 1 ? <Sparkline data={sparklineData} color={accentColor} /> : <span />}
        {change !== undefined && (
          <div className="flex items-center gap-1 ml-auto text-[15px] leading-6">
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: changeColor }}>
              {isPositive ? <TrendingUp size={15} /> : isNegative ? <TrendingDown size={15} /> : <Minus size={15} />}
              {isPositive && '+'}{change}%
            </span>
            <span className="hidden xl:inline" style={{ color: 'var(--text-secondary)' }}>
              {changeLabel || 'vs período anterior'}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
