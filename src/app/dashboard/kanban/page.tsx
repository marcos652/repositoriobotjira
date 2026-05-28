'use client';

import React, { useState } from 'react';
import { Kanban, Plus } from 'lucide-react';
import IssueDetailPanel from '@/components/ui/IssueDetailPanel';

const columns = [
  {
    title: 'TO DO', color: '#6B7280', bgColor: 'rgba(107,114,128,0.08)',
    items: [
      { id: 'DSMM-142', title: 'Implementar autenticação SSO', type: 'Story', assignee: 'LS' },
      { id: 'DSMM-139', title: 'Corrigir bug no envio de e-mails', type: 'Bug', assignee: 'AP' },
      { id: 'DSMM-125', title: 'Melhorar performance da listagem', type: 'Story', assignee: 'JR' },
    ],
  },
  {
    title: 'IN PROGRESS', color: '#0052CC', bgColor: 'rgba(0,82,204,0.06)',
    items: [
      { id: 'DSMM-118', title: 'Migração para TypeScript 5', type: 'Task', assignee: 'CM' },
      { id: 'DSMM-115', title: 'Redesign da tela de login', type: 'Story', assignee: 'MV' },
    ],
  },
  {
    title: 'CODE REVIEW', color: '#5243AA', bgColor: 'rgba(82,67,170,0.06)',
    items: [
      { id: 'DSMM-110', title: 'Feature de exportação CSV', type: 'Story', assignee: 'AP' },
    ],
  },
  {
    title: 'QA', color: '#FF991F', bgColor: 'rgba(255,153,31,0.06)',
    items: [
      { id: 'DSMM-108', title: 'Validação de formulário de cadastro', type: 'Bug', assignee: 'JR' },
      { id: 'DSMM-105', title: 'Integração com gateway de pagamento', type: 'Story', assignee: 'LS' },
    ],
  },
  {
    title: 'DONE', color: '#00875A', bgColor: 'rgba(0,135,90,0.06)',
    items: [
      { id: 'DSMM-100', title: 'Configuração de CI/CD', type: 'Task', assignee: 'CM' },
      { id: 'DSMM-98', title: 'Setup de monitoramento', type: 'Task', assignee: 'MV' },
      { id: 'DSMM-95', title: 'Hotfix timeout na API', type: 'Bug', assignee: 'AP' },
    ],
  },
];

const typeColors: Record<string, { bg: string; color: string }> = {
  Story: { bg: '#E3FCEF', color: '#006644' },
  Bug: { bg: '#FFEBE6', color: '#BF2600' },
  Task: { bg: '#DEEBFF', color: '#0747A6' },
};

export default function KanbanPage() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-violet-light)', color: 'var(--accent-violet)' }}>
            <Kanban size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kanban Board</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sprint 12 — DSMM</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '65vh' }}>
        {columns.map((col) => (
          <div key={col.title} className="flex-shrink-0 flex flex-col rounded-xl"
            style={{ width: '280px', background: col.bgColor, border: '1px solid var(--border-secondary)' }}>
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: col.color }}>
                  {col.title}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>
                  {col.items.length}
                </span>
              </div>
              <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/50"
                style={{ color: 'var(--text-tertiary)' }}>
                <Plus size={14} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 px-3 pb-3 space-y-2">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedIssue(item.id)}
                  className="p-3 rounded-lg cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
                >
                  <span className="badge text-[10px]" style={typeColors[item.type]}>{item.type}</span>
                  <p className="text-sm font-medium mt-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--accent-blue)' }}>{item.id}</span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}>
                      {item.assignee}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <IssueDetailPanel
          issueKey={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
