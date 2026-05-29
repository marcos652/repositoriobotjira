'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  change?: number; // percentage change
  changeLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  index?: number;
}

export default function MetricCard({
  title, value, suffix, change, changeLabel, icon, accentColor, accentBg, index = 0,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  return (
    <div
      className="metric-card animate-fade-in-up group"
      style={{
        animationDelay: `${index * 0.08}s`,
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

      {/* Value — big and bold */}
      <div className="flex items-baseline gap-2 mt-auto relative z-10">
        <span className="text-[2rem] font-extrabold tabular-nums tracking-tight"
          style={{ color: 'var(--text-primary)', lineHeight: '1' }}
        >
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </span>
        {suffix && (
          <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {suffix}
          </span>
        )}
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-2.5 mt-5 pt-4 relative z-10"
          style={{ borderTop: '1px solid var(--border-primary)' }}>
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
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {changeLabel || 'vs anterior'}
          </span>
        </div>
      )}
    </div>
  );
}
