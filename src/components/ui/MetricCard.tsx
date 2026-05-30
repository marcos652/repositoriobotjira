'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

// Animated count-up hook
function useCountUp(target: number, duration = 800, enabled = true) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) { setCount(target); return; }
    startTime.current = null;
    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [target, duration, enabled]);

  return count;
}

// Mini sparkline SVG component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const w = 80, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} className="sparkline-glow" style={{ color }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

// Skeleton loading state
function MetricSkeleton() {
  return (
    <div className="metric-card" style={{ minHeight: '160px' }}>
      <div className="flex items-start justify-between mb-6">
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: '50%', height: 36 }} />
      <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 20 }} />
    </div>
  );
}

export default function MetricCard({
  title, value, suffix, change, changeLabel, icon, accentColor, accentBg,
  index = 0, loading = false, sparklineData,
}: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const animatedValue = useCountUp(numericValue, 800, !loading && typeof value === 'number');
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  if (loading) return <MetricSkeleton />;

  return (
    <div
      className={`metric-card card-interactive animate-slide-up stagger-${index + 1} group`}
      style={{
        '--card-accent': accentColor,
        '--card-accent-bg': accentBg,
      } as React.CSSProperties}
    >
      {/* Icon & Title row */}
      <div className="flex items-start justify-between mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-tertiary)', lineHeight: '1.4' }}
        >
          {title}
        </p>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          style={{
            background: accentBg,
            color: accentColor,
            boxShadow: `0 0 0 0 ${accentColor}00`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value — big and bold with count-up */}
      <div className="flex items-baseline gap-2 mt-auto relative z-10">
        <span className="text-[2rem] font-extrabold metric-number tracking-tight animate-count-up"
          style={{ color: 'var(--text-primary)', lineHeight: '1' }}
        >
          {typeof value === 'number'
            ? animatedValue.toLocaleString('pt-BR')
            : value
          }
        </span>
        {suffix && (
          <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {suffix}
          </span>
        )}
      </div>

      {/* Sparkline + Change indicator */}
      <div className="flex items-center justify-between mt-5 pt-4 relative z-10"
        style={{ borderTop: '1px solid var(--border-primary)' }}>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} color={accentColor} />
        )}

        {/* Change indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{
                background: isPositive
                  ? 'var(--accent-emerald-light)'
                  : isNegative
                    ? 'var(--accent-rose-light)'
                    : 'rgba(100,116,139,0.1)',
                color: isPositive
                  ? 'var(--accent-emerald)'
                  : isNegative
                    ? 'var(--accent-rose)'
                    : 'var(--text-tertiary)',
              }}
            >
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              {isNeutral && <Minus size={12} />}
              {isPositive && '+'}{change}%
            </div>
            <span className="text-[11px] hidden xl:inline" style={{ color: 'var(--text-tertiary)' }}>
              {changeLabel || 'vs anterior'}
            </span>
          </div>
        )}

        {/* If no change and no sparkline, show empty space */}
        {change === undefined && !sparklineData && <div />}
      </div>
    </div>
  );
}
