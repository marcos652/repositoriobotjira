'use client';

import React from 'react';
import { Construction, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ComingSoonProps {
  pageName: string;
  description?: string;
}

export default function ComingSoon({ pageName, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md animate-fade-in-up">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.12) 100%)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Construction size={40} style={{ color: 'var(--accent-violet)' }} />
          </div>
          {/* Floating sparkles */}
          <div className="absolute -top-2 -right-2">
            <Sparkles size={16} style={{ color: 'var(--accent-amber)', opacity: 0.6 }} />
          </div>
        </div>

        <h3 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          {pageName}
        </h3>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-tertiary)' }}>
          {description || 'Esta funcionalidade está em desenvolvimento e estará disponível em breve. Fique atento às próximas atualizações!'}
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1.5 mx-auto rounded-full mb-8 overflow-hidden"
          style={{ background: 'rgba(148,163,184,0.08)' }}>
          <div className="h-full rounded-full"
            style={{
              width: '35%',
              background: 'var(--gradient-primary)',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }} />
        </div>

        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}>
          <ArrowLeft size={14} />
          Voltar ao Overview
        </Link>
      </div>
    </div>
  );
}
