'use client';

import React from 'react';
// Alias: `Record` cru sombrearia o utilitário de tipo `Record<K, V>` do TS aqui.
import { Record as RecordDot } from 'iconsax-react';

const MODES = {
  live: { label: 'Live', color: '#22C55E' },
  cached: { label: 'Cache', color: '#60A5FA' },
  demo: { label: 'Demo', color: '#FBBF24' },
} as const;

/** Indicador da origem dos dados (Jira ao vivo, cache ou demo). */
export default function DataModeTag({ mode }: { mode?: string }) {
  const info = MODES[mode as keyof typeof MODES] ?? MODES.demo;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: info.color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <RecordDot size={10} variant="Bold" color={info.color} aria-hidden="true" />
      {info.label}
    </span>
  );
}
