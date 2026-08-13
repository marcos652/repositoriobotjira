'use client';

import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ComingSoonProps {
  pageName: string;
  description?: string;
}

export default function ComingSoon({ pageName, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <section className="ui-surface text-center max-w-md p-8 animate-fade-in-up" aria-labelledby="coming-soon-title">
        <div className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-violet-light)' }}>
            <Construction size={40} style={{ color: 'var(--accent-violet)' }} />
        </div>

        <h2 id="coming-soon-title" className="text-2xl leading-8 font-medium tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          {pageName}
        </h2>

        <p className="text-[15px] leading-6 mb-8" style={{ color: 'var(--text-tertiary)' }}>
          {description || 'Esta funcionalidade está em desenvolvimento e estará disponível em breve. Fique atento às próximas atualizações!'}
        </p>

        <div className="w-48 h-1.5 mx-auto rounded-full mb-8 overflow-hidden" aria-label="Desenvolvimento em andamento"
          style={{ background: 'var(--border-primary)' }}>
          <div className="h-full rounded-full"
            style={{
              width: '35%',
              background: 'var(--accent-blue)',
            }} />
        </div>

        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}>
          <ArrowLeft size={14} />
          Voltar ao Overview
        </Link>
      </section>
    </div>
  );
}
