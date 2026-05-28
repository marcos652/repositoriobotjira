'use client';

import React, { useState } from 'react';
import { ClipboardList, Search, Filter, ArrowUpDown } from 'lucide-react';
import IssueDetailPanel from '@/components/ui/IssueDetailPanel';

const mockBacklog = [
  { id: 'DSMM-142', title: 'Implementar autenticação SSO', type: 'Story', priority: 'Alta', status: 'To Do', assignee: 'Lucas S.' },
  { id: 'DSMM-139', title: 'Corrigir bug no envio de e-mails', type: 'Bug', priority: 'Crítica', status: 'To Do', assignee: 'Ana P.' },
  { id: 'DSMM-136', title: 'Adicionar filtros avançados no relatório', type: 'Story', priority: 'Média', status: 'Backlog', assignee: '—' },
  { id: 'DSMM-133', title: 'Atualizar dependências do projeto', type: 'Task', priority: 'Baixa', status: 'Backlog', assignee: '—' },
  { id: 'DSMM-130', title: 'Refatorar módulo de pagamentos', type: 'Story', priority: 'Alta', status: 'Backlog', assignee: 'Carlos M.' },
  { id: 'DSMM-128', title: 'Criar testes unitários para API', type: 'Task', priority: 'Média', status: 'Backlog', assignee: '—' },
  { id: 'DSMM-125', title: 'Melhorar performance da listagem', type: 'Story', priority: 'Alta', status: 'To Do', assignee: 'Julia R.' },
  { id: 'DSMM-122', title: 'Documentar endpoints da API v2', type: 'Task', priority: 'Baixa', status: 'Backlog', assignee: '—' },
];

const priorityStyle: Record<string, { bg: string; color: string }> = {
  'Crítica': { bg: '#FFEBE6', color: '#BF2600' },
  'Alta': { bg: '#FFF0B3', color: '#974F0C' },
  'Média': { bg: '#DEEBFF', color: '#0747A6' },
  'Baixa': { bg: '#E3FCEF', color: '#006644' },
};

const typeStyle: Record<string, { bg: string; color: string }> = {
  'Story': { bg: '#E3FCEF', color: '#006644' },
  'Bug': { bg: '#FFEBE6', color: '#BF2600' },
  'Task': { bg: '#DEEBFF', color: '#0747A6' },
};

export default function BacklogPage() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Backlog</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{mockBacklog.length} itens no backlog</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Buscar itens..." className="bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)', width: '180px' }} />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            <Filter size={13} /> Filtrar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            <ArrowUpDown size={13} /> Ordenar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Chave</th>
              <th>Resumo</th>
              <th>Tipo</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            {mockBacklog.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedIssue(item.id)}
                className="cursor-pointer"
              >
                <td className="font-semibold text-xs" style={{ color: 'var(--accent-blue)' }}>{item.id}</td>
                <td className="font-medium text-sm">{item.title}</td>
                <td>
                  <span className="badge" style={typeStyle[item.type]}>{item.type}</span>
                </td>
                <td>
                  <span className="badge" style={priorityStyle[item.priority]}>{item.priority}</span>
                </td>
                <td className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.status}</td>
                <td className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
