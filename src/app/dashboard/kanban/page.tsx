'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, WifiOff, RefreshCw, Trash2, Users, Calendar, ChevronDown
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import IssueDetailPanel from '@/components/ui/IssueDetailPanel';

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
  'Story': { bg: 'var(--accent-emerald-light)', color: 'var(--accent-green-soft)' },
  'Bug': { bg: 'var(--accent-rose-light)', color: 'var(--accent-rose-soft)' },
  'Task': { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue-soft)' },
  'Sub-task': { bg: 'var(--accent-violet-light)', color: 'var(--accent-violet-soft)' },
};

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [syncingJira, setSyncingJira] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<{ displayName: string; avatar: string }[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]   = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  // Card abre a demanda aqui mesmo, num painel sobreposto, em vez de trocar de tela.
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const fetchKanban = useCallback(async (isRefresh = false, overrideDateRange?: typeof dateRange, overrideStart?: string, overrideEnd?: string) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);

      const range   = overrideDateRange ?? dateRange;
      const start   = overrideStart    ?? customStart;
      const end     = overrideEnd      ?? customEnd;

      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const params = new URLSearchParams({ project: 'DSMM' });

      if (range !== 'all') {
        if (range === 'custom' && start) {
          params.set('dateFrom', start);
          if (end) params.set('dateTo', end);
        } else if (daysMap[range]) {
          const d = new Date();
          d.setDate(d.getDate() - daysMap[range]);
          params.set('dateFrom', d.toISOString().split('T')[0]);
        }
      }

      const res = await fetch(`/api/jira/issues?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const issues: JiraIssue[] = data.issues || [];
      setTotal(issues.length);

      const userMap = new Map<string, string>();
      for (const issue of issues) {
        const a = issue.fields.assignee;
        if (a && !userMap.has(a.displayName)) {
          userMap.set(a.displayName, a.avatarUrls?.['48x48'] || '');
        }
      }
      setUsers(Array.from(userMap.entries()).map(([displayName, avatar]) => ({ displayName, avatar })));

      const statusGroups = new Map<string, JiraIssue[]>();
      for (const issue of issues) {
        const status = issue.fields.status.name;
        if (!statusGroups.has(status)) statusGroups.set(status, []);
        statusGroups.get(status)!.push(issue);
      }

      const columnConfig: { title: string; color: string; bgColor: string; match: string[] }[] = [
        { title: 'Backlog', color: 'var(--text-secondary)', bgColor: 'var(--bg-secondary)', match: ['Backlog', 'Open'] },
        { title: 'To Do', color: 'var(--accent-indigo-soft)', bgColor: 'var(--accent-violet-light)', match: ['Para Fazer', 'To Do', 'A Fazer', 'Selected for Development'] },
        { title: 'In Progress', color: 'var(--accent-blue)', bgColor: 'var(--accent-blue-light)', match: ['Em Andamento', 'In Progress', 'Em andamento'] },
        { title: 'Refinamento', color: 'var(--accent-violet-soft)', bgColor: 'var(--accent-violet-light)', match: ['Refinamento', 'Refinement'] },
        { title: 'Code Review', color: 'var(--accent-amber)', bgColor: 'var(--accent-amber-light)', match: ['Code Review', 'Revisão', 'Review'] },
        { title: 'QA', color: 'var(--accent-orange)', bgColor: 'var(--accent-amber-light)', match: ['QA', 'Teste', 'Testing'] },
        { title: 'Done', color: 'var(--accent-green-soft)', bgColor: 'var(--accent-emerald-light)', match: ['Concluído', 'Done', 'Closed', 'Resolved', 'Concluido'] },
      ];

      const result: KanbanColumn[] = [];
      const used = new Set<string>();

      for (const config of columnConfig) {
        const items: JiraIssue[] = [];
        for (const match of config.match) {
          for (const [statusKey, group] of statusGroups.entries()) {
            if (statusKey.toLowerCase() === match.toLowerCase() && !used.has(statusKey)) {
              items.push(...group);
              used.add(statusKey);
            }
          }
        }
        // Remove items.length > 0 check to always show configured columns
        result.push({ ...config, id: config.title, statusCategory: config.title, items });
      }

      for (const [status, items] of statusGroups) {
        if (!used.has(status)) {
          result.push({ title: status, id: status, color: 'var(--accent-indigo-soft)', bgColor: 'var(--accent-violet-light)', statusCategory: status, items });
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
    const { destination, source, type } = result;

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

  useEffect(() => {
    // This effect synchronizes the board with Jira when the screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKanban();
  }, [fetchKanban]);

  // Re-fetch when date range changes (except custom — waits for user to confirm)
  useEffect(() => {
    if (dateRange !== 'custom') {
      // This effect synchronizes Jira data with the selected range.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchKanban(false, dateRange);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Fix hydration issues with dnd
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // DnD identifiers must only render after client hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 rounded-[24px] border" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando board do Jira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-full max-w-md space-y-5 rounded-[24px] border p-8 text-center" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--accent-rose-light)' }}>
            <WifiOff size={28} style={{ color: 'var(--accent-rose-soft)' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Erro ao carregar board</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={() => fetchKanban()} className="px-5 py-2.5 text-sm font-semibold" style={{ borderRadius: '8px', background: 'var(--accent-blue)', color: 'var(--text-inverse)', border: '1px solid var(--accent-blue)' }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '32px', lineHeight: '36px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Kanban Board
              {syncingJira && <Loader2 size={14} className="animate-spin text-indigo-400" />}
            </h1>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {total} issues • {columns.length} colunas • Jira DSMM
              {dateRange !== 'all' && (
                <span style={{ marginLeft: '6px', color: 'var(--accent-indigo-soft)', fontWeight: 700 }}>
                  • {dateRange === 'custom' ? `${customStart}${customEnd ? ` → ${customEnd}` : ''}` : dateRange}
                </span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Date filter */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '4px', overflowX: 'auto' }}>
              <Calendar size={13} style={{ color: 'var(--text-tertiary)', margin: '0 6px' }} />
              {([
                { value: 'all',  label: 'Todos' },
                { value: '7d',   label: '7 dias' },
                { value: '30d',  label: '30 dias' },
                { value: '90d',  label: '90 dias' },
                { value: 'custom', label: 'Personalizado' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setDateRange(opt.value);
                    if (opt.value === 'custom') setShowCustomPicker(p => !p);
                    else setShowCustomPicker(false);
                  }}
                  style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: dateRange === opt.value ? 'var(--accent-indigo)' : 'transparent', color: dateRange === opt.value ? 'var(--text-inverse)' : 'var(--text-tertiary)' }}
                >
                  {opt.label}
                  {opt.value === 'custom' && <ChevronDown size={11} style={{ transform: showCustomPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                </button>
              ))}
            </div>

            {/* Custom date picker dropdown */}
            {showCustomPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50, background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', margin: 0 }}>Período personalizado</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>De</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Até</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button
                  onClick={() => { if (customStart) { fetchKanban(false, 'custom', customStart, customEnd); setShowCustomPicker(false); } }}
                  disabled={!customStart}
                  style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${customStart ? 'var(--accent-indigo)' : 'var(--border-primary)'}`, cursor: customStart ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '12px', background: customStart ? 'var(--accent-indigo)' : 'var(--bg-secondary)', color: customStart ? 'var(--text-inverse)' : 'var(--text-tertiary)' }}
                >
                  Aplicar filtro
                </button>
              </div>
            )}
          </div>

          {/* User filter */}
          {users.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '6px 10px', overflowX: 'auto' }}>
              <Users size={13} style={{ color: 'var(--text-tertiary)' }} />
              <button
                onClick={() => setSelectedUser(null)}
                title="Todos"
                style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: selectedUser === null ? 'var(--accent-indigo)' : 'transparent', color: selectedUser === null ? 'var(--text-inverse)' : 'var(--text-tertiary)' }}
              >
                Todos
              </button>
              {users.map((u) => {
                const initials = u.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const isActive = selectedUser === u.displayName;
                return (
                  <button
                    key={u.displayName}
                    onClick={() => setSelectedUser(isActive ? null : u.displayName)}
                    title={u.displayName}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px 3px 4px', borderRadius: '8px', border: isActive ? '2px solid var(--accent-indigo)' : '2px solid transparent', cursor: 'pointer', background: isActive ? 'var(--accent-violet-light)' : 'transparent' }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.displayName} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: 'var(--text-inverse)' }}>{initials}</div>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent-indigo-soft)' : 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => fetchKanban(true)} disabled={refreshing || syncingJira} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', gap: '24px', overflowX: 'auto', flex: 1, paddingBottom: '12px' }}>
              {columns.map((col, index) => (
                <Draggable key={col.id} draggableId={col.id} index={index}>
                  {(providedCol) => (
                    <div ref={providedCol.innerRef} {...providedCol.draggableProps} {...providedCol.dragHandleProps}
                      style={{ ...providedCol.draggableProps.style, minWidth: '280px', maxWidth: '340px', flex: '1 0 280px', display: 'flex', flexDirection: 'column', borderRadius: '24px', background: col.bgColor, border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                      
                      {/* Column header */}
                      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.title}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-secondary)', color: col.color }}>
                          {selectedUser ? col.items.filter(i => i.fields.assignee?.displayName === selectedUser).length : col.items.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <Droppable droppableId={col.id} type="CARD">
                        {(providedCards) => {
                          const visibleItems = selectedUser
                            ? col.items.filter(i => i.fields.assignee?.displayName === selectedUser)
                            : col.items;
                          return (
                          <div ref={providedCards.innerRef} {...providedCards.droppableProps} style={{ padding: '10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '150px', maxHeight: 'calc(100vh - 250px)' }}>
                            {visibleItems.map((issue, cardIndex) => {
                              const tc = typeColor[issue.fields.issuetype.name] || typeColor['Task'];
                              return (
                                <Draggable key={issue.key} draggableId={issue.key} index={cardIndex}>
                                  {(providedCard, snapshot) => (
                                    <div ref={providedCard.innerRef} {...providedCard.draggableProps} {...providedCard.dragHandleProps} style={{ ...providedCard.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}>
                                      <div
                                        role="button"
                                        aria-label={`Abrir ${issue.key}`}
                                        onClick={() => setSelectedIssue(issue.key)}
                                        style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card-solid)', border: `1px solid ${snapshot.isDragging ? 'var(--accent-indigo)' : 'var(--border-primary)'}`, textDecoration: 'none', cursor: 'grab', display: 'block' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: 'var(--accent-indigo-soft)' }}>{issue.key}</span>
                                            <button onClick={(e) => handleDelete(e, issue.key)} disabled={deletingKey === issue.key} aria-label={`Excluir ${issue.key}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose-soft)', padding: 0, display: 'flex', opacity: deletingKey === issue.key ? 0.5 : 1 }}>
                                              {deletingKey === issue.key ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                          </div>
                                          <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', ...tc }}>{issue.fields.issuetype.name}</span>
                                        </div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{issue.fields.summary}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          {issue.fields.assignee ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: 'var(--text-inverse)' }}>
                                                {issue.fields.assignee.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                              </div>
                                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields.assignee.displayName}</span>
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Sem responsável</span>
                                          )}
                                          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-amber-light)', color: 'var(--accent-amber-soft)' }}>{issue.fields.priority.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {providedCards.placeholder}
                            {visibleItems.length === 0 && (
                              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600 }}>
                                {selectedUser ? 'Nenhuma issue para este usuário' : 'Arraste para cá'}
                              </div>
                            )}
                          </div>
                          );
                        }}
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

      {selectedIssue && (
        <IssueDetailPanel issueKey={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
    </div>
  );
}
