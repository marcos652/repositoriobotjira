'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, any>[];
  filename?: string;
  columns?: { key: string; label: string }[];
}

export default function ExportButton({ data, filename = 'export', columns }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportCSV = () => {
    if (!data.length) return;
    const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
    const header = cols.map(c => c.label).join(',');
    const rows = data.map(row =>
      cols.map(c => {
        const val = String(row[c.key] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        className="ripple-container"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          transition: 'all 0.2s',
        }}
      >
        <Download size={14} />
        Exportar
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="animate-modal" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          minWidth: 160, background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', zIndex: 50,
        }}>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-primary)',
            fontSize: 12, fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-blue-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Table size={14} style={{ color: 'var(--accent-emerald)' }} />
            Exportar CSV
          </button>
          <button onClick={exportJSON} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-primary)',
            fontSize: 12, fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-blue-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <FileText size={14} style={{ color: 'var(--accent-blue)' }} />
            Exportar JSON
          </button>
        </div>
      )}
    </div>
  );
}
