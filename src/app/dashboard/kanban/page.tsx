'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Kanban, Loader2, WifiOff, RefreshCw, Trash2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    priority: { name: string };
    issuetype: { name: string };
    assignee?: { displayName: string; avatarUrls?: Record<string, string> };
  };
}

interface KanbanColumn {
  id: string; // unique string id needed for DnD
  title: string;
  color: string;
  bgColor: string;
  statusCategory: string;
  items: JiraIssue[];
}

const typeColor: Record<string, { bg: string; color: string }> = {
  'Story': { bg: 'rgba(34,197,94,0.1)', color: '#4ADE80' },
  'Bug': { bg: 'rgba(244,63,94,0.1)', color: '#FB7185' },
  'Task': { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA' },
  'Sub-task': { bg: 'rgba(139,92,246,0.1)', color: '#A78BFA' },
};

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [syncingJira, setSyncingJira] = useState(false);

  const fetchKanban = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);

      const res = await fetch('/api/jira/issues?project=DSMM');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const issues: JiraIssue[] = data.issues || [];
      setTotal(issues.length);

      const statusGroups = new Map<string, JiraIssue[]>();
      for (const issue of issues) {
        const status = issue.fields.status.name;
        if (!statusGroups.has(status)) statusGroups.set(status, []);
        statusGroups.get(status)!.push(issue);
      }

      const columnConfig: { title: string; color: string; bgColor: string; match: string[] }[] = [
        { title: 'Backlog', color: '#94A3B8', bgColor: 'rgba(100,116,139,0.06)', match: ['Backlog', 'Open'] },
        { title: 'To Do', color: '#818CF8', bgColor: 'rgba(99,102,241,0.06)', match: ['Para Fazer', 'To Do', 'A Fazer', 'Selected for Development'] },
        { title: 'In Progress', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.06)', match: ['Em Andamento', 'In Progress', 'Em andamento'] },
        { title: 'Refinamento', color: '#A78BFA', bgColor: 'rgba(139,92,246,0.06)', match: ['Refinamento', 'Refinement'] },
        { title: 'Code Review', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.06)', match: ['Code Review', 'Revisão', 'Review'] },
        { title: 'QA', color: '#F97316', bgColor: 'rgba(249,115,22,0.06)', match: ['QA', 'Teste', 'Testing'] },
        { title: 'Done', color: '#4ADE80', bgColor: 'rgba(34,197,94,0.06)', match: ['Concluído', 'Done', 'Closed', 'Resolved', 'Concluido'] },
      ];

      const result: KanbanColumn[] = [];
      const used = new Set<string>();

      for (const config of columnConfig) {
        const items: JiraIssue[] = [];
        for (const match of config.match) {
          const group = statusGroups.get(match);
          if (group) {
            items.push(...group);
            used.add(match);
          }
        }
        // Remove items.length > 0 check to always show configured columns
        result.push({ ...config, id: config.title, statusCategory: config.title, items });
      }

      for (const [status, items] of statusGroups) {
        if (!used.has(status)) {
          result.push({ title: status, id: status, color: '#818CF8', bgColor: 'rgba(99,102,241,0.06)', statusCategory: status, items });
        }
      }

      const savedOrderStr = localStorage.getItem('jiraops_kanban_col_order');
      if (savedOrderStr) {
        try {
          const savedOrder: string[] = JSON.parse(savedOrderStr);
          result.sort((a, b) => {
            let idxA = savedOrder.indexOf(a.title);
            let idxB = savedOrder.indexOf(b.title);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
          });
        } catch {}
      }

      setColumns(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir a demanda ${key}? Esta ação não pode ser desfeita.`)) return;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/demanda/${key}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKanban();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Erro ao excluir');
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setDeletingKey(null);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'COLUMN') {
      const newCols = Array.from(columns);
      const [removed] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, removed);
      
      setColumns(newCols);
      localStorage.setItem('jiraops_kanban_col_order', JSON.stringify(newCols.map(c => c.title)));
      return;
    }

    if (type === 'CARD') {
      const sourceColIndex = columns.findIndex(col => col.id === source.droppableId);
      const destColIndex = columns.findIndex(col => col.id === destination.droppableId);

      if (sourceColIndex === -1 || destColIndex === -1) return;

      const sourceCol = columns[sourceColIndex];
      const destCol = columns[destColIndex];

      const newSourceItems = Array.from(sourceCol.items);
      const newDestItems = source.droppableId === destination.droppableId ? newSourceItems : Array.from(destCol.items);

      const [movedItem] = newSourceItems.splice(source.index, 1);
      newDestItems.splice(destination.index, 0, movedItem);

      const newCols = [...columns];
      newCols[sourceColIndex] = { ...sourceCol, items: newSourceItems };
      if (source.droppableId !== destination.droppableId) {
        newCols[destColIndex] = { ...destCol, items: newDestItems };
      }

      setColumns(newCols);
      setSyncingJira(true);

      try {
        if (source.droppableId === destination.droppableId) {
          // Reorder within the same column (Rank)
          const rankBeforeItem = destination.index < newDestItems.length - 1 ? newDestItems[destination.index + 1] : null;
          const rankAfterItem = destination.index > 0 ? newDestItems[destination.index - 1] : null;
          
          await fetch('/api/jira/rank', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              issueKey: movedItem.key,
              rankBeforeIssue: rankBeforeItem?.key,
              rankAfterIssue: rankAfterItem?.key,
            })
          });
        } else {
          // Move between columns (Transition + Rank optionally, mas transição é mais importante)
          const targetStatusCategory = destCol.statusCategory;
          await fetch('/api/jira/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              issueKey: movedItem.key,
              targetStatusCategory
            })
          });
        }
      } catch (e) {
        console.error('Erro ao sincronizar com Jira', e);
        fetchKanban(); // Revert on error
      } finally {
        setSyncingJira(false);
      }
    }
  };

  useEffect(() => { fetchKanban(); }, [fetchKanban]);

  // Fix hydration issues with dnd
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando board do Jira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.08)' }}>
            <WifiOff size={28} style={{ color: '#FB7185' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar board</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={() => fetchKanban()} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff' }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}>
            <Kanban size={20} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Kanban Board
              {syncingJira && <Loader2 size={14} className="animate-spin text-indigo-400" />}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{total} issues • {columns.length} colunas • Jira DSMM</p>
          </div>
        </div>
        <button onClick={() => fetchKanban(true)} disabled={refreshing || syncingJira} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', gap: '14px', overflowX: 'auto', flex: 1, paddingBottom: '12px' }}>
              {columns.map((col, index) => (
                <Draggable key={col.id} draggableId={col.id} index={index}>
                  {(providedCol) => (
                    <div ref={providedCol.innerRef} {...providedCol.draggableProps} {...providedCol.dragHandleProps}
                      style={{ ...providedCol.draggableProps.style, minWidth: '280px', maxWidth: '320px', flex: '1 0 280px', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: col.bgColor, border: '1px solid var(--border-secondary)', overflow: 'hidden' }}>
                      
                      {/* Column header */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${col.color}20` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.title}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: `${col.color}15`, color: col.color }}>{col.items.length}</span>
                      </div>

                      {/* Cards */}
                      <Droppable droppableId={col.id} type="CARD">
                        {(providedCards) => (
                          <div ref={providedCards.innerRef} {...providedCards.droppableProps} style={{ padding: '10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '150px', maxHeight: 'calc(100vh - 250px)' }}>
                            {col.items.map((issue, cardIndex) => {
                              const tc = typeColor[issue.fields.issuetype.name] || typeColor['Task'];
                              return (
                                <Draggable key={issue.key} draggableId={issue.key} index={cardIndex}>
                                  {(providedCard, snapshot) => (
                                    <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps} style={{ ...providedCard.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}>
                                      <Link href={`/dashboard/consultar-demanda?key=${issue.key}`}
                                        style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', textDecoration: 'none', transition: 'box-shadow 0.15s', cursor: 'grab', display: 'block', boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: '#818CF8' }}>{issue.key}</span>
                                            <button onClick={(e) => handleDelete(e, issue.key)} disabled={deletingKey === issue.key} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FB7185', padding: 0, display: 'flex', opacity: deletingKey === issue.key ? 0.5 : 1 }}>
                                              {deletingKey === issue.key ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                          </div>
                                          <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', ...tc }}>{issue.fields.issuetype.name}</span>
                                        </div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{issue.fields.summary}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          {issue.fields.assignee ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff' }}>
                                                {issue.fields.assignee.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                              </div>
                                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.assignee.displayName}</span>
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Sem responsável</span>
                                          )}
                                          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.08)', color: '#FBBF24' }}>{issue.fields.priority.name}</span>
                                        </div>
                                      </Link>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {providedCards.placeholder}
                            {col.items.length === 0 && (
                              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600 }}>Arraste para cá</div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
